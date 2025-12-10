/**
 * ARENA DEMO ENGINE - Direct Signal Injection for Arena Agents
 *
 * CRITICAL: This engine BYPASSES ALL quality filters to ensure agents trade
 *
 * Purpose:
 * - Generate realistic signals directly from live Binance prices
 * - Force signals to Arena agents every 30-60 seconds
 * - Make Arena "always alive" with trading activity
 * - Convert visitors through visible agent activity
 *
 * This is NOT for user signals - only for Arena demo agents
 */

import { globalHubService, type HubSignal } from './globalHubService';

// Binance API for live prices
const BINANCE_TICKER_API = 'https://api.binance.com/api/v3/ticker/24hr';

// Top trading pairs for demo signals
const DEMO_PAIRS = [
  { symbol: 'BTCUSDT', displaySymbol: 'BTC/USD', coinGeckoId: 'bitcoin' },
  { symbol: 'ETHUSDT', displaySymbol: 'ETH/USD', coinGeckoId: 'ethereum' },
  { symbol: 'SOLUSDT', displaySymbol: 'SOL/USD', coinGeckoId: 'solana' },
  { symbol: 'BNBUSDT', displaySymbol: 'BNB/USD', coinGeckoId: 'binancecoin' },
  { symbol: 'XRPUSDT', displaySymbol: 'XRP/USD', coinGeckoId: 'ripple' },
  { symbol: 'DOGEUSDT', displaySymbol: 'DOGE/USD', coinGeckoId: 'dogecoin' },
  { symbol: 'AVAXUSDT', displaySymbol: 'AVAX/USD', coinGeckoId: 'avalanche-2' },
  { symbol: 'LINKUSDT', displaySymbol: 'LINK/USD', coinGeckoId: 'chainlink' },
  { symbol: 'ADAUSDT', displaySymbol: 'ADA/USD', coinGeckoId: 'cardano' },
  { symbol: 'MATICUSDT', displaySymbol: 'MATIC/USD', coinGeckoId: 'matic-network' }
];

// Strategy names mapped to agents
const AGENT_STRATEGIES = {
  quantumx: [
    'FUNDING_SQUEEZE',
    'LIQUIDATION_CASCADE_PREDICTION',
    'ORDER_FLOW_TSUNAMI'
  ],
  phoenix: [
    'WHALE_SHADOW',
    'CORRELATION_BREAKDOWN_DETECTOR',
    'STATISTICAL_ARBITRAGE'
  ],
  neurax: [
    'MOMENTUM_SURGE_V2',
    'VOLATILITY_BREAKOUT',
    'BOLLINGER_MEAN_REVERSION'
  ]
};

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

class ArenaDemoEngine {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSignals: Map<string, number> = new Map(); // Track last signal time per agent
  private signalCounter = 0;

  // Signal generation frequency
  private readonly MIN_INTERVAL = 25 * 1000;  // Minimum 25 seconds between signals per agent
  private readonly MAX_INTERVAL = 45 * 1000;  // Maximum 45 seconds between signals per agent
  private readonly CHECK_INTERVAL = 5 * 1000; // Check every 5 seconds

  /**
   * Start the Arena Demo Engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[ArenaDemoEngine] Already running');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎪 ARENA DEMO ENGINE - STARTING');
    console.log('='.repeat(60));
    console.log('📊 Mode: DEMO (bypasses all quality filters)');
    console.log('⚡ Signal frequency: 25-45 seconds per agent');
    console.log('🎯 Purpose: Keep Arena agents actively trading');
    console.log('='.repeat(60) + '\n');

    this.isRunning = true;

    // Generate immediate first signals
    await this.generateDemoSignals();

    // Start continuous signal generation
    this.interval = setInterval(async () => {
      await this.generateDemoSignals();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Generate demo signals for Arena agents
   */
  private async generateDemoSignals(): Promise<void> {
    try {
      // Fetch live prices from Binance
      const prices = await this.fetchBinancePrices();

      if (!prices || prices.length === 0) {
        console.log('[ArenaDemoEngine] Could not fetch Binance prices, using fallback...');
        await this.generateFallbackSignals();
        return;
      }

      // Get agents that need new signals
      const agentIds = ['quantumx', 'phoenix', 'neurax'];
      const now = Date.now();

      for (const agentId of agentIds) {
        const lastSignalTime = this.lastSignals.get(agentId) || 0;
        const timeSinceLastSignal = now - lastSignalTime;

        // Random interval between MIN and MAX
        const targetInterval = this.MIN_INTERVAL + Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL);

        if (timeSinceLastSignal >= targetInterval) {
          await this.generateSignalForAgent(agentId, prices);
          this.lastSignals.set(agentId, now);
        }
      }
    } catch (error) {
      console.error('[ArenaDemoEngine] Error generating signals:', error);
    }
  }

  /**
   * Generate a signal for a specific agent
   */
  private async generateSignalForAgent(agentId: string, prices: BinanceTicker[]): Promise<void> {
    // Pick a random pair
    const pairIndex = Math.floor(Math.random() * DEMO_PAIRS.length);
    const pair = DEMO_PAIRS[pairIndex];

    // Find price data for this pair
    const priceData = prices.find(p => p.symbol === pair.symbol);
    if (!priceData) {
      console.log(`[ArenaDemoEngine] No price data for ${pair.symbol}`);
      return;
    }

    // Parse price data
    const currentPrice = parseFloat(priceData.lastPrice);
    const priceChange = parseFloat(priceData.priceChangePercent);
    const high = parseFloat(priceData.highPrice);
    const low = parseFloat(priceData.lowPrice);

    // Determine direction based on market momentum + randomness
    // More likely to go with the trend, but can counter-trend for variety
    const trendBias = priceChange > 0 ? 0.65 : 0.35; // 65% chance to follow trend
    const direction: 'LONG' | 'SHORT' = Math.random() < trendBias ? 'LONG' : 'SHORT';

    // Generate confidence based on price action
    // Higher confidence when trend is strong
    const baseConfidence = 60 + Math.random() * 25; // 60-85%
    const trendStrength = Math.abs(priceChange);
    const confidenceBoost = Math.min(trendStrength * 2, 10); // Up to +10% for strong trends
    const confidence = Math.min(95, baseConfidence + confidenceBoost);

    // Get strategy for this agent
    const strategies = AGENT_STRATEGIES[agentId as keyof typeof AGENT_STRATEGIES] || ['MOMENTUM_SURGE_V2'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    // Calculate entry, stop loss, and targets
    const atrEstimate = (high - low) * 0.5; // Estimate ATR from daily range
    const atrPercent = (atrEstimate / currentPrice) * 100;

    const entry = currentPrice;
    const stopLoss = direction === 'LONG'
      ? currentPrice * (1 - atrPercent * 0.015) // 1.5x ATR stop
      : currentPrice * (1 + atrPercent * 0.015);

    const targets = direction === 'LONG'
      ? [
          currentPrice * (1 + atrPercent * 0.01),  // TP1: 1x ATR
          currentPrice * (1 + atrPercent * 0.02),  // TP2: 2x ATR
          currentPrice * (1 + atrPercent * 0.03)   // TP3: 3x ATR
        ]
      : [
          currentPrice * (1 - atrPercent * 0.01),
          currentPrice * (1 - atrPercent * 0.02),
          currentPrice * (1 - atrPercent * 0.03)
        ];

    this.signalCounter++;

    // Create the signal
    const signal: HubSignal = {
      id: `arena-demo-${agentId}-${this.signalCounter}-${Date.now()}`,
      symbol: pair.displaySymbol,
      direction,
      confidence,
      strategy: strategy as any,
      strategyName: strategy,
      qualityScore: confidence,
      mlProbability: confidence / 100,
      marketRegime: priceChange > 2 ? 'TRENDING' : priceChange < -2 ? 'VOLATILE' : 'RANGING',
      timestamp: Date.now(),
      entry,
      stopLoss,
      targets,
      riskRewardRatio: Math.abs(targets[1] - entry) / Math.abs(stopLoss - entry),
      atrBased: true,
      atrValue: atrEstimate,
      atrPercent,
      coinGeckoId: pair.coinGeckoId,
      timeLimit: 15 * 60 * 1000, // 15 minute time limit
      expiresAt: Date.now() + 15 * 60 * 1000
    };

    // Log the signal
    console.log('\n' + '─'.repeat(50));
    console.log(`🎪 ARENA DEMO SIGNAL → ${agentId.toUpperCase()}`);
    console.log('─'.repeat(50));
    console.log(`📊 ${signal.symbol} ${signal.direction} @ $${entry.toFixed(2)}`);
    console.log(`🎯 Confidence: ${confidence.toFixed(1)}%`);
    console.log(`📈 Strategy: ${strategy}`);
    console.log(`🛡️ SL: $${stopLoss.toFixed(2)} | TP1: $${targets[0].toFixed(2)}`);
    console.log('─'.repeat(50) + '\n');

    // CRITICAL: Emit signal directly to Arena
    // This bypasses ALL quality filters
    globalHubService.emit('signal:new', signal);

    // Also add to activeSignals for getActiveSignals() calls
    this.injectSignalToHub(signal);
  }

  /**
   * Inject signal directly into globalHubService activeSignals
   */
  private injectSignalToHub(signal: HubSignal): void {
    try {
      // Access the internal state and inject signal
      // This ensures getActiveSignals() returns our demo signals
      const currentSignals = globalHubService.getActiveSignals();

      // Remove expired signals
      const now = Date.now();
      const validSignals = currentSignals.filter(s => !s.expiresAt || s.expiresAt > now);

      // Check if we already have a signal for this symbol/direction
      const existingIndex = validSignals.findIndex(s =>
        s.symbol === signal.symbol && s.direction === signal.direction
      );

      if (existingIndex >= 0) {
        // Replace existing signal
        validSignals[existingIndex] = signal;
      } else {
        // Add new signal
        validSignals.push(signal);
      }

      // Keep only top 10 signals by confidence
      const topSignals = validSignals
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 10);

      // Use the public injectSignal method if available
      if (typeof (globalHubService as any).injectSignal === 'function') {
        (globalHubService as any).injectSignal(signal);
      }
    } catch (error) {
      console.warn('[ArenaDemoEngine] Could not inject signal to hub:', error);
    }
  }

  /**
   * Fetch prices from Binance
   */
  private async fetchBinancePrices(): Promise<BinanceTicker[]> {
    try {
      const symbols = DEMO_PAIRS.map(p => p.symbol);
      const responses = await Promise.all(
        symbols.map(symbol =>
          fetch(`${BINANCE_TICKER_API}?symbol=${symbol}`)
            .then(res => res.json())
            .catch(() => null)
        )
      );

      return responses.filter(r => r !== null);
    } catch (error) {
      console.error('[ArenaDemoEngine] Binance fetch error:', error);
      return [];
    }
  }

  /**
   * Generate fallback signals when Binance is unavailable
   */
  private async generateFallbackSignals(): Promise<void> {
    const fallbackPrices: Record<string, number> = {
      'BTC/USD': 95000,
      'ETH/USD': 3500,
      'SOL/USD': 150,
      'BNB/USD': 600,
      'XRP/USD': 0.65,
      'DOGE/USD': 0.12
    };

    const agentIds = ['quantumx', 'phoenix', 'neurax'];
    const now = Date.now();

    for (const agentId of agentIds) {
      const lastSignalTime = this.lastSignals.get(agentId) || 0;
      const timeSinceLastSignal = now - lastSignalTime;

      if (timeSinceLastSignal >= this.MIN_INTERVAL) {
        const pairs = Object.keys(fallbackPrices);
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const basePrice = fallbackPrices[pair];

        // Add some variance
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        const direction: 'LONG' | 'SHORT' = Math.random() > 0.5 ? 'LONG' : 'SHORT';
        const confidence = 65 + Math.random() * 20;

        const strategies = AGENT_STRATEGIES[agentId as keyof typeof AGENT_STRATEGIES] || ['MOMENTUM_SURGE_V2'];
        const strategy = strategies[Math.floor(Math.random() * strategies.length)];

        this.signalCounter++;

        const signal: HubSignal = {
          id: `arena-fallback-${agentId}-${this.signalCounter}-${now}`,
          symbol: pair,
          direction,
          confidence,
          strategy: strategy as any,
          strategyName: strategy,
          qualityScore: confidence,
          timestamp: now,
          entry: price,
          stopLoss: direction === 'LONG' ? price * 0.98 : price * 1.02,
          targets: direction === 'LONG'
            ? [price * 1.01, price * 1.02, price * 1.03]
            : [price * 0.99, price * 0.98, price * 0.97],
          timeLimit: 15 * 60 * 1000,
          expiresAt: now + 15 * 60 * 1000
        };

        console.log(`[ArenaDemoEngine] Fallback signal for ${agentId}: ${pair} ${direction}`);
        globalHubService.emit('signal:new', signal);
        this.lastSignals.set(agentId, now);
      }
    }
  }

  /**
   * Stop the engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[ArenaDemoEngine] Stopping...');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    this.lastSignals.clear();
    console.log('[ArenaDemoEngine] Stopped');
  }

  /**
   * Check if engine is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton
export const arenaDemoEngine = new ArenaDemoEngine();
export default arenaDemoEngine;
