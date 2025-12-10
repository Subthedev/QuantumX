/**
 * TELEGRAM SIGNAL PUBLISHER - Autonomous Signal Pipeline
 *
 * Connects to Arena agents and publishes all trading signals to Telegram.
 * Runs autonomously without manual intervention.
 *
 * Flow:
 * 1. Subscribe to arenaQuantEngine trade events
 * 2. Format signals for Telegram
 * 3. Send to telegram-signal Edge Function
 * 4. Edge Function delivers to t.me/agentquantumx
 */

import { arenaQuantEngine, type TradeEvent, type QuantAgent, type QuantPosition } from './arenaQuantEngine';
import { MarketState } from './marketStateDetectionEngine';
import { supabase } from '@/integrations/supabase/client';

// ===================== CONFIGURATION =====================

const CONFIG = {
  // Supabase Edge Function URL
  edgeFunctionUrl: `${import.meta.env.VITE_SUPABASE_URL || 'https://cnpwwctdqrszwxgwewns.supabase.co'}/functions/v1/telegram-signal`,

  // Minimum confidence to publish signal
  minConfidence: 60,

  // Rate limiting: min time between signals (ms)
  minSignalIntervalMs: 30000, // 30 seconds

  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 2000,

  // Enable/disable publishing
  enabled: true,

  // Debug logging
  debug: true
};

// ===================== STATE =====================

interface PublisherState {
  isActive: boolean;
  lastSignalTime: number;
  signalsSent: number;
  signalsFailed: number;
  unsubscribe: (() => void) | null;
}

const state: PublisherState = {
  isActive: false,
  lastSignalTime: 0,
  signalsSent: 0,
  signalsFailed: 0,
  unsubscribe: null
};

// ===================== SIGNAL FORMATTING =====================

interface TelegramSignal {
  agentName: string;
  agentId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  takeProfit: number[];
  stopLoss: number;
  strategy: string;
  confidence: number;
  marketState?: string;
  timestamp: string;
  type: 'ENTRY' | 'EXIT';
  pnlPercent?: number;
  reason?: string;
}

function formatMarketState(state: MarketState | null): string {
  if (!state) return '';

  const stateLabels: Record<MarketState, string> = {
    [MarketState.BULLISH_HIGH_VOL]: 'Bullish High Vol',
    [MarketState.BULLISH_LOW_VOL]: 'Bullish Low Vol',
    [MarketState.BEARISH_HIGH_VOL]: 'Bearish High Vol',
    [MarketState.BEARISH_LOW_VOL]: 'Bearish Low Vol',
    [MarketState.RANGEBOUND]: 'Rangebound'
  };

  return stateLabels[state] || '';
}

function calculateConfidence(agent: QuantAgent, position: QuantPosition): number {
  // Base confidence from strategy suitability
  let confidence = 70;

  // Adjust based on agent win rate
  if (agent.winRate > 65) confidence += 10;
  else if (agent.winRate > 60) confidence += 5;
  else if (agent.winRate < 55) confidence -= 5;

  // Adjust based on streak
  if (agent.streakType === 'WIN' && agent.streakCount >= 3) confidence += 5;
  if (agent.streakType === 'LOSS' && agent.streakCount >= 3) confidence -= 10;

  // Clamp between 50-95
  return Math.max(50, Math.min(95, confidence));
}

function tradeEventToTelegramSignal(event: TradeEvent): TelegramSignal {
  const { agent, position, type, pnlPercent, reason } = event;

  // Calculate TP2 as 2x the TP1 distance
  const tp1Distance = Math.abs(position.takeProfitPrice - position.entryPrice);
  const tp2 = position.direction === 'LONG'
    ? position.takeProfitPrice + tp1Distance
    : position.takeProfitPrice - tp1Distance;

  return {
    agentName: agent.name,
    agentId: agent.id,
    symbol: position.displaySymbol,
    direction: position.direction,
    entryPrice: position.entryPrice,
    takeProfit: [position.takeProfitPrice, tp2],
    stopLoss: position.stopLossPrice,
    strategy: position.strategy,
    confidence: calculateConfidence(agent, position),
    marketState: formatMarketState(position.marketStateAtEntry),
    timestamp: new Date().toISOString(),
    type: type === 'open' ? 'ENTRY' : 'EXIT',
    pnlPercent: pnlPercent,
    reason: reason ? reasonToString(reason) : undefined
  };
}

function reasonToString(reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE'): string {
  const reasons: Record<string, string> = {
    'TP': 'Take Profit Hit',
    'SL': 'Stop Loss Hit',
    'TIMEOUT': 'Time Limit Reached',
    'REGIME_CHANGE': 'Market Regime Changed'
  };
  return reasons[reason] || reason;
}

// ===================== PUBLISHING =====================

async function publishSignal(signal: TelegramSignal): Promise<boolean> {
  if (!CONFIG.enabled) {
    log('Publishing disabled, skipping signal');
    return false;
  }

  // Rate limiting check
  const now = Date.now();
  if (now - state.lastSignalTime < CONFIG.minSignalIntervalMs) {
    log(`Rate limited: ${Math.ceil((CONFIG.minSignalIntervalMs - (now - state.lastSignalTime)) / 1000)}s remaining`);
    return false;
  }

  // Confidence check
  if (signal.confidence < CONFIG.minConfidence) {
    log(`Low confidence (${signal.confidence}%), skipping signal`);
    return false;
  }

  log(`Publishing ${signal.type} signal: ${signal.agentName} ${signal.direction} ${signal.symbol}`);

  // Get Supabase anon key for auth
  const { data: { session } } = await supabase.auth.getSession();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNucHd3Y3RkcXJzend4Z3dld25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgzNDU2MDUsImV4cCI6MjA0MzkyMTYwNX0.KxNYJwxr7jSZGCGJTU7RChwkW5W8aOAWV3vRLV6AWGE';

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(CONFIG.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        body: JSON.stringify(signal)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const result = await response.json();

      if (result.success) {
        state.lastSignalTime = now;
        state.signalsSent++;
        log(`✅ Signal published successfully (total: ${state.signalsSent})`);
        return true;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      logError(`Attempt ${attempt}/${CONFIG.maxRetries} failed:`, error);

      if (attempt < CONFIG.maxRetries) {
        await delay(CONFIG.retryDelayMs * attempt);
      }
    }
  }

  state.signalsFailed++;
  logError(`Failed to publish signal after ${CONFIG.maxRetries} attempts`);
  return false;
}

// ===================== EVENT HANDLERS =====================

function handleTradeEvent(event: TradeEvent): void {
  log(`Trade event received: ${event.type} - ${event.agent.name} ${event.position.displaySymbol}`);

  const signal = tradeEventToTelegramSignal(event);

  // Publish asynchronously (don't block the engine)
  publishSignal(signal).catch(err => {
    logError('Error publishing signal:', err);
  });
}

// ===================== LIFECYCLE =====================

/**
 * Start the autonomous signal publisher
 * Subscribes to Arena engine trade events
 */
export function startSignalPublisher(): void {
  if (state.isActive) {
    log('Publisher already active');
    return;
  }

  log('🚀 Starting Telegram Signal Publisher...');

  // Subscribe to trade events
  state.unsubscribe = arenaQuantEngine.onTradeEvent(handleTradeEvent);
  state.isActive = true;

  log('✅ Signal Publisher active - listening for trade events');
  log(`   Edge Function URL: ${CONFIG.edgeFunctionUrl}`);
  log(`   Min confidence: ${CONFIG.minConfidence}%`);
  log(`   Rate limit: ${CONFIG.minSignalIntervalMs / 1000}s between signals`);
}

/**
 * Stop the signal publisher
 */
export function stopSignalPublisher(): void {
  if (!state.isActive) {
    log('Publisher already stopped');
    return;
  }

  log('Stopping Signal Publisher...');

  if (state.unsubscribe) {
    state.unsubscribe();
    state.unsubscribe = null;
  }

  state.isActive = false;
  log('✅ Signal Publisher stopped');
}

/**
 * Get publisher statistics
 */
export function getPublisherStats(): {
  isActive: boolean;
  signalsSent: number;
  signalsFailed: number;
  lastSignalTime: number;
} {
  return {
    isActive: state.isActive,
    signalsSent: state.signalsSent,
    signalsFailed: state.signalsFailed,
    lastSignalTime: state.lastSignalTime
  };
}

/**
 * Check if publisher is active
 */
export function isPublisherActive(): boolean {
  return state.isActive;
}

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<typeof CONFIG>): void {
  Object.assign(CONFIG, updates);
  log('Configuration updated:', CONFIG);
}

// ===================== UTILITIES =====================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(...args: any[]): void {
  if (CONFIG.debug) {
    console.log('[Telegram Publisher]', ...args);
  }
}

function logError(...args: any[]): void {
  console.error('[Telegram Publisher]', ...args);
}

// ===================== EXPORTS =====================

export const telegramSignalPublisher = {
  start: startSignalPublisher,
  stop: stopSignalPublisher,
  getStats: getPublisherStats,
  isActive: isPublisherActive,
  updateConfig
};

export default telegramSignalPublisher;
