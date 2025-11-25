/**
 * QUANTUMX ENGINE - Unified Signal Orchestration System
 *
 * This is the CORE engine that:
 * 1. Generates signals from market data
 * 2. Controls quality thresholds via FLUX modes (PUSH/PULL)
 * 3. Provides Arena-specific fast signal stream (not rate limited)
 * 4. Auto-adjusts to maintain profitability
 *
 * FLUX Integration:
 * - PUSH mode: Lower thresholds, more signals (range-bound markets)
 * - PULL mode: Higher thresholds, fewer but better signals (volatile markets)
 * - AUTO mode: Dynamically switches based on agent profitability
 *
 * Arena gets DIRECT signals without tier rate limiting
 * User signals still go through scheduledSignalDropper for tier limits
 */

import { globalHubService, type HubSignal } from './globalHubService';
import { deltaV2QualityEngine } from './deltaV2QualityEngine';
import { multiStrategyEngine } from './strategies/multiStrategyEngine';

// ===== TYPES =====

export type QuantumXMode = 'PUSH' | 'PULL' | 'AUTO';

export interface QuantumXState {
  mode: QuantumXMode;
  autoDetectedMode: 'PUSH' | 'PULL';
  isRunning: boolean;
  // Market conditions
  marketVolatility: number;  // 0-100
  marketTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  // Signal stats
  signalsGenerated: number;
  signalsApproved: number;
  signalsRejected: number;
  approvalRate: number;
  // Arena stats
  arenaSignalsDelivered: number;
  arenaAgentProfitability: number; // -100 to 100
  // Current thresholds
  qualityThreshold: number;
  confidenceThreshold: number;
  // Timing
  lastSignalTime: number;
  signalIntervalMs: number;
}

export interface QuantumXConfig {
  push: {
    qualityThreshold: number;      // Min quality score (0-100)
    confidenceThreshold: number;   // Min confidence (0-100)
    signalIntervalMs: number;      // Signal interval for Arena
    acceptTiers: ('HIGH' | 'MEDIUM' | 'LOW')[];
  };
  pull: {
    qualityThreshold: number;
    confidenceThreshold: number;
    signalIntervalMs: number;
    acceptTiers: ('HIGH' | 'MEDIUM' | 'LOW')[];
  };
}

// ===== DEFAULT CONFIG =====

const DEFAULT_CONFIG: QuantumXConfig = {
  push: {
    qualityThreshold: 45,          // Accept 45%+ quality
    confidenceThreshold: 50,       // Accept 50%+ confidence
    signalIntervalMs: 20 * 1000,   // Signal every 20 seconds for Arena
    acceptTiers: ['HIGH', 'MEDIUM', 'LOW']
  },
  pull: {
    qualityThreshold: 70,          // Only 70%+ quality
    confidenceThreshold: 65,       // Only 65%+ confidence
    signalIntervalMs: 60 * 1000,   // Signal every 60 seconds for Arena
    acceptTiers: ['HIGH']
  }
};

// ===== PRICE FETCHING =====

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/24hr';

interface BinanceTickerData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

// ===== QUANTUMX ENGINE CLASS =====

class QuantumXEngine {
  private state: QuantumXState = {
    mode: 'AUTO',
    autoDetectedMode: 'PUSH',
    isRunning: false,
    marketVolatility: 30,
    marketTrend: 'SIDEWAYS',
    signalsGenerated: 0,
    signalsApproved: 0,
    signalsRejected: 0,
    approvalRate: 0,
    arenaSignalsDelivered: 0,
    arenaAgentProfitability: 0,
    qualityThreshold: 45,
    confidenceThreshold: 50,
    lastSignalTime: 0,
    signalIntervalMs: 20000
  };

  private config: QuantumXConfig = DEFAULT_CONFIG;
  private priceHistory: Map<string, number[]> = new Map();
  private arenaSignalInterval: NodeJS.Timeout | null = null;
  private marketMonitorInterval: NodeJS.Timeout | null = null;
  private listeners: ((state: QuantumXState) => void)[] = [];

  // Agent profitability tracking
  private agentPnL: Map<string, number> = new Map();
  private recentTrades: { win: boolean; timestamp: number }[] = [];

  // Target symbols for Arena
  private readonly ARENA_SYMBOLS = [
    { binance: 'BTCUSDT', display: 'BTC/USD', gecko: 'bitcoin' },
    { binance: 'ETHUSDT', display: 'ETH/USD', gecko: 'ethereum' },
    { binance: 'SOLUSDT', display: 'SOL/USD', gecko: 'solana' },
    { binance: 'BNBUSDT', display: 'BNB/USD', gecko: 'binancecoin' },
    { binance: 'XRPUSDT', display: 'XRP/USD', gecko: 'ripple' },
    { binance: 'DOGEUSDT', display: 'DOGE/USD', gecko: 'dogecoin' },
    { binance: 'AVAXUSDT', display: 'AVAX/USD', gecko: 'avalanche-2' },
    { binance: 'ADAUSDT', display: 'ADA/USD', gecko: 'cardano' }
  ];

  // Agent assignments (round-robin)
  private agentIndex = 0;
  private readonly AGENT_IDS = ['alphax', 'betax', 'gammax'];

  /**
   * Initialize QuantumX Engine
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('[QuantumX] Already running');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('⚡ QUANTUMX ENGINE - STARTING');
    console.log('='.repeat(60));

    this.state.isRunning = true;

    // Load saved state
    this.loadState();

    // Apply initial mode settings
    this.applyModeSettings();

    // Start market monitoring (every 30 seconds)
    this.marketMonitorInterval = setInterval(() => {
      this.updateMarketConditions();
    }, 30 * 1000);

    // Initial market check
    await this.updateMarketConditions();

    // Start Arena signal generation
    this.startArenaSignalGeneration();

    console.log(`[QuantumX] Mode: ${this.state.mode}`);
    console.log(`[QuantumX] Active Mode: ${this.getActiveMode()}`);
    console.log(`[QuantumX] Quality Threshold: ${this.state.qualityThreshold}%`);
    console.log(`[QuantumX] Signal Interval: ${this.state.signalIntervalMs / 1000}s`);
    console.log('='.repeat(60) + '\n');

    this.notifyListeners();
  }

  /**
   * Stop the engine
   */
  stop(): void {
    if (!this.state.isRunning) return;

    console.log('[QuantumX] Stopping...');

    if (this.arenaSignalInterval) {
      clearInterval(this.arenaSignalInterval);
      this.arenaSignalInterval = null;
    }

    if (this.marketMonitorInterval) {
      clearInterval(this.marketMonitorInterval);
      this.marketMonitorInterval = null;
    }

    this.state.isRunning = false;
    this.saveState();
    console.log('[QuantumX] Stopped');
  }

  /**
   * Set FLUX mode
   */
  setMode(mode: QuantumXMode): void {
    console.log(`[QuantumX] Mode change: ${this.state.mode} → ${mode}`);
    this.state.mode = mode;
    this.applyModeSettings();
    this.saveState();
    this.notifyListeners();

    // Restart signal generation with new interval
    if (this.state.isRunning) {
      this.restartArenaSignalGeneration();
    }
  }

  /**
   * PUSH mode - More signals
   */
  push(): void {
    this.setMode('PUSH');
  }

  /**
   * PULL mode - Better signals
   */
  pull(): void {
    this.setMode('PULL');
  }

  /**
   * AUTO mode - Adaptive
   */
  auto(): void {
    this.setMode('AUTO');
  }

  /**
   * Get active mode (resolves AUTO to actual mode)
   */
  private getActiveMode(): 'PUSH' | 'PULL' {
    return this.state.mode === 'AUTO' ? this.state.autoDetectedMode : this.state.mode;
  }

  /**
   * Apply settings based on current mode
   */
  private applyModeSettings(): void {
    const activeMode = this.getActiveMode();
    const settings = activeMode === 'PUSH' ? this.config.push : this.config.pull;

    this.state.qualityThreshold = settings.qualityThreshold;
    this.state.confidenceThreshold = settings.confidenceThreshold;
    this.state.signalIntervalMs = settings.signalIntervalMs;

    console.log(`[QuantumX] Applied ${activeMode} settings:`);
    console.log(`  - Quality threshold: ${settings.qualityThreshold}%`);
    console.log(`  - Confidence threshold: ${settings.confidenceThreshold}%`);
    console.log(`  - Signal interval: ${settings.signalIntervalMs / 1000}s`);

    // Update Delta V2 engine thresholds
    try {
      deltaV2QualityEngine.setThresholds(
        settings.qualityThreshold,
        settings.confidenceThreshold / 100,
        activeMode === 'PUSH' ? 30 : 50 // Strategy win rate threshold
      );
    } catch (error) {
      console.warn('[QuantumX] Could not update Delta thresholds:', error);
    }
  }

  /**
   * Start Arena signal generation loop
   */
  private startArenaSignalGeneration(): void {
    console.log('[QuantumX] Starting Arena signal generation...');

    // Generate first signal immediately
    setTimeout(() => {
      this.generateArenaSignal();
    }, 2000);

    // Then at intervals
    this.arenaSignalInterval = setInterval(() => {
      this.generateArenaSignal();
    }, this.state.signalIntervalMs);
  }

  /**
   * Restart signal generation (after mode change)
   */
  private restartArenaSignalGeneration(): void {
    if (this.arenaSignalInterval) {
      clearInterval(this.arenaSignalInterval);
    }
    this.startArenaSignalGeneration();
  }

  /**
   * Generate signal for Arena agents
   */
  private async generateArenaSignal(): Promise<void> {
    try {
      // Fetch live prices
      const prices = await this.fetchBinancePrices();
      if (!prices || prices.length === 0) {
        console.log('[QuantumX] No price data available');
        return;
      }

      // Pick a random symbol
      const symbolData = this.ARENA_SYMBOLS[Math.floor(Math.random() * this.ARENA_SYMBOLS.length)];
      const priceData = prices.find(p => p.symbol === symbolData.binance);

      if (!priceData) {
        console.log(`[QuantumX] No data for ${symbolData.binance}`);
        return;
      }

      const currentPrice = parseFloat(priceData.lastPrice);
      const priceChange = parseFloat(priceData.priceChangePercent);
      const high = parseFloat(priceData.highPrice);
      const low = parseFloat(priceData.lowPrice);

      // Determine direction based on market analysis
      const direction = this.analyzeDirection(priceChange, this.state.marketTrend);

      // Calculate confidence based on market conditions
      const confidence = this.calculateConfidence(priceChange, this.state.marketVolatility);

      // Check against current thresholds
      if (confidence < this.state.confidenceThreshold) {
        this.state.signalsRejected++;
        console.log(`[QuantumX] Signal rejected: ${confidence.toFixed(1)}% < ${this.state.confidenceThreshold}% threshold`);
        return;
      }

      this.state.signalsGenerated++;
      this.state.signalsApproved++;
      this.state.approvalRate = (this.state.signalsApproved / this.state.signalsGenerated) * 100;

      // Get next agent (round-robin)
      const agentId = this.AGENT_IDS[this.agentIndex % this.AGENT_IDS.length];
      this.agentIndex++;

      // Calculate trading levels
      const atrEstimate = (high - low) * 0.5;
      const stopLoss = direction === 'LONG'
        ? currentPrice * (1 - atrEstimate / currentPrice * 1.5)
        : currentPrice * (1 + atrEstimate / currentPrice * 1.5);

      const targets = direction === 'LONG'
        ? [currentPrice * 1.01, currentPrice * 1.02, currentPrice * 1.03]
        : [currentPrice * 0.99, currentPrice * 0.98, currentPrice * 0.97];

      // Create signal
      const signal: HubSignal = {
        id: `qx-${agentId}-${Date.now()}`,
        symbol: symbolData.display,
        direction,
        confidence,
        strategyName: this.selectStrategy(direction, this.state.marketTrend),
        qualityScore: confidence,
        mlProbability: confidence / 100,
        marketRegime: this.state.marketVolatility > 50 ? 'HIGH_VOLATILITY' : 'LOW_VOLATILITY',
        timestamp: Date.now(),
        entry: currentPrice,
        stopLoss,
        targets,
        riskRewardRatio: Math.abs(targets[1] - currentPrice) / Math.abs(stopLoss - currentPrice),
        coinGeckoId: symbolData.gecko,
        timeLimit: 15 * 60 * 1000,
        expiresAt: Date.now() + 15 * 60 * 1000
      };

      this.state.lastSignalTime = Date.now();
      this.state.arenaSignalsDelivered++;

      // Log signal
      const modeLabel = this.getActiveMode();
      console.log('\n' + '─'.repeat(50));
      console.log(`⚡ QUANTUMX [${modeLabel}] → ${agentId.toUpperCase()}`);
      console.log('─'.repeat(50));
      console.log(`📊 ${signal.symbol} ${signal.direction} @ $${currentPrice.toFixed(2)}`);
      console.log(`🎯 Confidence: ${confidence.toFixed(1)}% (threshold: ${this.state.confidenceThreshold}%)`);
      console.log(`📈 Strategy: ${signal.strategyName}`);
      console.log(`🎪 Arena signals delivered: ${this.state.arenaSignalsDelivered}`);
      console.log('─'.repeat(50) + '\n');

      // Emit signal to Arena (and any other listeners)
      globalHubService.emit('signal:new', signal);

      this.notifyListeners();

    } catch (error) {
      console.error('[QuantumX] Error generating signal:', error);
    }
  }

  /**
   * Analyze market direction
   */
  private analyzeDirection(priceChange: number, trend: string): 'LONG' | 'SHORT' {
    // Trend following with some contrarian logic
    if (trend === 'BULLISH') {
      return Math.random() > 0.3 ? 'LONG' : 'SHORT'; // 70% long in bullish
    } else if (trend === 'BEARISH') {
      return Math.random() > 0.3 ? 'SHORT' : 'LONG'; // 70% short in bearish
    } else {
      // Sideways - mean reversion
      return priceChange > 0 ? 'SHORT' : 'LONG';
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(priceChange: number, volatility: number): number {
    const base = 55 + Math.random() * 25; // 55-80 base
    const trendStrength = Math.min(Math.abs(priceChange) * 2, 10);
    const volAdjust = volatility > 50 ? -5 : 5;

    return Math.min(95, Math.max(45, base + trendStrength + volAdjust));
  }

  /**
   * Select strategy based on market conditions
   */
  private selectStrategy(direction: 'LONG' | 'SHORT', trend: string): string {
    const strategies = {
      trending: ['MOMENTUM_SURGE_V2', 'TREND_FOLLOWER', 'BREAKOUT_HUNTER'],
      ranging: ['MEAN_REVERSION', 'BOLLINGER_BOUNCE', 'RSI_DIVERGENCE'],
      volatile: ['VOLATILITY_BREAKOUT', 'SQUEEZE_PLAY', 'FADE_EXTREME']
    };

    const pool = trend === 'SIDEWAYS' ? strategies.ranging :
                 this.state.marketVolatility > 50 ? strategies.volatile :
                 strategies.trending;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Update market conditions
   */
  private async updateMarketConditions(): Promise<void> {
    try {
      const prices = await this.fetchBinancePrices();
      if (!prices || prices.length === 0) return;

      // Calculate average price change
      const avgChange = prices.reduce((sum, p) =>
        sum + Math.abs(parseFloat(p.priceChangePercent)), 0) / prices.length;

      // Volatility: 0-100 scale based on avg price change
      const volatility = Math.min(100, avgChange * 10);
      this.state.marketVolatility = volatility;

      // Trend: based on majority direction
      const bullish = prices.filter(p => parseFloat(p.priceChangePercent) > 0.5).length;
      const bearish = prices.filter(p => parseFloat(p.priceChangePercent) < -0.5).length;

      if (bullish > bearish * 1.5) {
        this.state.marketTrend = 'BULLISH';
      } else if (bearish > bullish * 1.5) {
        this.state.marketTrend = 'BEARISH';
      } else {
        this.state.marketTrend = 'SIDEWAYS';
      }

      // AUTO mode adjustment
      if (this.state.mode === 'AUTO') {
        this.autoAdjustMode();
      }

    } catch (error) {
      console.warn('[QuantumX] Error updating market conditions:', error);
    }
  }

  /**
   * Auto-adjust mode based on conditions
   */
  private autoAdjustMode(): void {
    const oldMode = this.state.autoDetectedMode;
    let newMode: 'PUSH' | 'PULL' = oldMode;

    // Factor 1: Market volatility
    // High volatility (>50) → PULL (protect capital)
    // Low volatility (<50) → PUSH (more opportunities)
    const volSuggestion = this.state.marketVolatility > 50 ? 'PULL' : 'PUSH';

    // Factor 2: Agent profitability
    // Losing (< -10%) → PULL (need quality)
    // Winning (> 10%) → PUSH (ride the wave)
    const profSuggestion = this.state.arenaAgentProfitability < -10 ? 'PULL' :
                          this.state.arenaAgentProfitability > 10 ? 'PUSH' : oldMode;

    // Factor 3: Recent win rate
    const recentWins = this.recentTrades.filter(t => t.win && t.timestamp > Date.now() - 3600000);
    const recentLosses = this.recentTrades.filter(t => !t.win && t.timestamp > Date.now() - 3600000);
    const recentWinRate = recentWins.length / Math.max(1, recentWins.length + recentLosses.length);
    const winRateSuggestion = recentWinRate < 0.4 ? 'PULL' : recentWinRate > 0.6 ? 'PUSH' : oldMode;

    // Weighted decision
    // Profitability has highest weight when negative
    if (this.state.arenaAgentProfitability < -15) {
      newMode = 'PULL'; // Emergency quality mode
    } else if (volSuggestion === profSuggestion) {
      newMode = volSuggestion; // Agreement
    } else {
      newMode = winRateSuggestion; // Tiebreaker
    }

    if (newMode !== oldMode) {
      console.log(`[QuantumX AUTO] Switching: ${oldMode} → ${newMode}`);
      console.log(`  - Volatility: ${this.state.marketVolatility.toFixed(1)}% suggests ${volSuggestion}`);
      console.log(`  - Profitability: ${this.state.arenaAgentProfitability.toFixed(1)}% suggests ${profSuggestion}`);
      console.log(`  - Win rate: ${(recentWinRate * 100).toFixed(1)}% suggests ${winRateSuggestion}`);

      this.state.autoDetectedMode = newMode;
      this.applyModeSettings();
      this.restartArenaSignalGeneration();
    }
  }

  /**
   * Record trade outcome (called from Arena when position closes)
   */
  recordTradeOutcome(agentId: string, pnlPercent: number): void {
    const win = pnlPercent > 0;
    this.recentTrades.push({ win, timestamp: Date.now() });

    // Keep only last 100 trades
    if (this.recentTrades.length > 100) {
      this.recentTrades = this.recentTrades.slice(-100);
    }

    // Update agent P&L
    const currentPnL = this.agentPnL.get(agentId) || 0;
    this.agentPnL.set(agentId, currentPnL + pnlPercent);

    // Calculate overall profitability
    let totalPnL = 0;
    this.agentPnL.forEach(pnl => totalPnL += pnl);
    this.state.arenaAgentProfitability = totalPnL / Math.max(1, this.agentPnL.size);

    console.log(`[QuantumX] Trade recorded: ${agentId} ${win ? 'WIN' : 'LOSS'} ${pnlPercent.toFixed(2)}%`);
    console.log(`[QuantumX] Overall profitability: ${this.state.arenaAgentProfitability.toFixed(2)}%`);

    // Trigger auto-adjustment check
    if (this.state.mode === 'AUTO') {
      this.autoAdjustMode();
    }
  }

  /**
   * Fetch prices from Binance
   */
  private async fetchBinancePrices(): Promise<BinanceTickerData[]> {
    try {
      const symbols = this.ARENA_SYMBOLS.map(s => s.binance);
      const responses = await Promise.all(
        symbols.map(symbol =>
          fetch(`${BINANCE_API}?symbol=${symbol}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        )
      );
      return responses.filter(r => r !== null);
    } catch (error) {
      console.error('[QuantumX] Binance fetch error:', error);
      return [];
    }
  }

  /**
   * Get current state
   */
  getState(): QuantumXState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: QuantumXState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem('quantumx_state', JSON.stringify({
        mode: this.state.mode,
        autoDetectedMode: this.state.autoDetectedMode,
        config: this.config
      }));
    } catch { /* ignore */ }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem('quantumx_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) this.state.mode = parsed.mode;
        if (parsed.autoDetectedMode) this.state.autoDetectedMode = parsed.autoDetectedMode;
        if (parsed.config) this.config = { ...this.config, ...parsed.config };
      }
    } catch { /* ignore */ }
  }
}

// ===== EXPORT SINGLETON =====

export const quantumXEngine = new QuantumXEngine();
export default quantumXEngine;
