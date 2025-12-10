/**
 * IGX BETA V2
 * Advanced strategy matching and signal generation engine
 *
 * WHAT'S NEW IN V2:
 * - Integrated with Streaming Alpha V3 for real-time insights
 * - Dynamic thresholds from Alpha (not fixed)
 * - Regime-aware strategy execution
 * - Rich context in generated signals
 *
 * RESPONSIBILITIES:
 * - Receive enriched data from IGX Data Pipeline
 * - Read Alpha V3 insights for market context
 * - Run all 10 strategies in parallel
 * - Apply machine learning for strategy selection
 * - Generate high-probability signals with Alpha context
 * - Track strategy performance and adapt weights
 */

import type { IGXTicker } from './IGXDataPipelineV4';
import type { Pattern } from '../patterns/intelligentPatternDetector';
import { intelligentPatternDetector } from '../patterns/intelligentPatternDetector';
import { dataEnrichmentServiceV2 } from '../dataEnrichmentServiceV2';
import { streamingAlphaV3 } from './StreamingAlphaV3';
import type { AlphaInsights } from './AlphaInsightsProvider';

// Import all strategies
import { WhaleShadowStrategy } from '../strategies/whaleShadowStrategy';
import { SpringTrapStrategy } from '../strategies/springTrapStrategy';
import { MomentumSurgeStrategy } from '../strategies/momentumSurgeStrategy';
import { FundingSqueezeStrategy } from '../strategies/fundingSqueezeStrategy';
import { OrderFlowTsunamiStrategy } from '../strategies/orderFlowTsunamiStrategy';
import { FearGreedContrarianStrategy } from '../strategies/fearGreedContrarianStrategy';
import { GoldenCrossMomentumStrategy } from '../strategies/goldenCrossMomentumStrategy';
import { MarketPhaseSniperStrategy } from '../strategies/marketPhaseSniperStrategy';
import { LiquidityHunterStrategy } from '../strategies/liquidityHunterStrategy';
import { VolatilityBreakoutStrategy } from '../strategies/volatilityBreakoutStrategy';

export interface IGXSignal {
  id: string;
  timestamp: number;
  symbol: string;
  direction: 'LONG' | 'SHORT';

  // Entry/Exit
  entryPrice: number;
  entryRange: { min: number; max: number };
  stopLoss: number;
  targets: number[];

  // Metadata
  confidence: number;
  qualityScore: number;
  expectedProfit: number;
  riskRewardRatio: number;

  // Strategy info
  winningStrategy: string;
  strategyVotes: {
    long: number;
    short: number;
    neutral: number;
  };

  // Pattern info
  patterns: Pattern[];
  marketConditions: {
    volatility: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    volume: 'LOW' | 'NORMAL' | 'HIGH';
    liquidity: number;
  };

  // Data quality
  dataQuality: number;
  exchangeSources: string[];

  // Alpha V3 insights (NEW IN V2!)
  alphaInsights?: {
    regime: string;
    riskLevel: string;
    marketCondition: string;
    confidence: number;
  };
}

interface StrategyPerformance {
  name: string;
  totalSignals: number;
  successfulSignals: number;
  winRate: number;
  avgProfit: number;
  weight: number; // Dynamic weight based on performance
  lastUpdate: number;
}

export class IGXBetaV2 {
  private strategies = new Map<string, any>();
  private strategyPerformance = new Map<string, StrategyPerformance>();
  private previousTickers = new Map<string, IGXTicker>();
  private signalHistory: IGXSignal[] = [];
  private isRunning = false;

  // Machine learning parameters
  private readonly LEARNING_RATE = 0.1;
  private readonly MOMENTUM = 0.9;
  private readonly MIN_WEIGHT = 0.05;
  private readonly MAX_WEIGHT = 0.3;

  // Pattern detection parameters
  private readonly MIN_PATTERN_STRENGTH = 30; // Lowered for more signals (Alpha will adjust)
  private readonly PATTERN_BONUS_MULTIPLIER = 1.3; // Increased bonus for multiple patterns

  // Signal generation stats
  private stats = {
    tickersAnalyzed: 0,
    patternsDetected: 0,
    signalsGenerated: 0,
    signalsRejected: 0,
    avgConfidence: 0,
    avgQuality: 0
  };

  constructor() {
    this.initializeStrategies();
    this.initializePerformanceTracking();
  }

  /**
   * Initialize all 10 strategies
   */
  private initializeStrategies() {
    this.strategies.set('WHALE_SHADOW', new WhaleShadowStrategy());
    this.strategies.set('SPRING_TRAP', new SpringTrapStrategy());
    this.strategies.set('MOMENTUM_SURGE', new MomentumSurgeStrategy());
    this.strategies.set('FUNDING_SQUEEZE', new FundingSqueezeStrategy());
    this.strategies.set('ORDER_FLOW_TSUNAMI', new OrderFlowTsunamiStrategy());
    this.strategies.set('FEAR_GREED_CONTRARIAN', new FearGreedContrarianStrategy());
    this.strategies.set('GOLDEN_CROSS_MOMENTUM', new GoldenCrossMomentumStrategy());
    this.strategies.set('MARKET_PHASE_SNIPER', new MarketPhaseSniperStrategy());
    this.strategies.set('LIQUIDITY_HUNTER', new LiquidityHunterStrategy());
    this.strategies.set('VOLATILITY_BREAKOUT', new VolatilityBreakoutStrategy());

    console.log('[IGX Beta V2] ✅ Initialized 10 strategies');
  }

  /**
   * Initialize performance tracking for each strategy
   */
  private initializePerformanceTracking() {
    for (const name of this.strategies.keys()) {
      this.strategyPerformance.set(name, {
        name,
        totalSignals: 0,
        successfulSignals: 0,
        winRate: 0.5, // Start with neutral assumption
        avgProfit: 0,
        weight: 0.1, // Equal weights initially
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * Start the Beta model
   */
  start() {
    if (this.isRunning) {
      console.log('[IGX Beta V2] Already running');
      return;
    }

    console.log('\n🧠 ========== STARTING IGX BETA MODEL ==========');
    console.log('📊 Strategy Engine: 10 parallel strategies');
    console.log('🔬 Pattern Recognition: Intelligent combinations');
    console.log('🎯 Machine Learning: Adaptive strategy weights');
    console.log('================================================\n');

    this.isRunning = true;

    // Listen for ticker updates from Data Pipeline
    if (typeof window !== 'undefined') {
      window.addEventListener('igx-ticker-update', this.handleTickerUpdate.bind(this));
    }
  }

  /**
   * Handle ticker update from Data Pipeline
   */
  private async handleTickerUpdate(event: CustomEvent) {
    const ticker: IGXTicker = event.detail;

    if (!ticker || !this.isRunning) {
      console.log('[IGX Beta V2] ⚠️ Ticker ignored:', ticker ? 'System not running' : 'Empty ticker');
      return;
    }

    this.stats.tickersAnalyzed++;
    console.log(`[IGX Beta V2] 📥 Received ticker #${this.stats.tickersAnalyzed}: ${ticker.symbol} @ $${ticker.price.toFixed(2)}`);

    // Get previous ticker for comparison
    const previousTicker = this.previousTickers.get(ticker.symbol);
    this.previousTickers.set(ticker.symbol, ticker);

    if (!previousTicker) {
      console.log(`[IGX Beta V2] ⏳ Waiting for second ticker for ${ticker.symbol} (need 2 for pattern detection)`);
      return; // Need at least 2 tickers for pattern detection
    }

    // Step 1: Pattern Recognition
    const patterns = await this.detectPatterns(ticker, previousTicker);

    if (patterns.length === 0) {
      console.log(`[IGX Beta V2] ❌ No patterns detected for ${ticker.symbol}`);
      return; // No patterns, skip
    }

    // Step 2: Check if patterns are strong enough
    const strongPatterns = this.filterStrongPatterns(patterns);

    if (strongPatterns.length === 0) {
      console.log(`[IGX Beta V2] ⚠️ Patterns too weak for ${ticker.symbol} (${patterns.length} detected, 0 strong enough)`);
      return; // Patterns too weak
    }

    console.log(`[IGX Beta V2] ✅ Strong patterns found for ${ticker.symbol}: ${strongPatterns.length}/${patterns.length}`);

    // Step 3: Run strategy analysis
    const signal = await this.analyzeWithStrategies(ticker, strongPatterns);

    if (signal) {
      this.signalHistory.push(signal);
      this.stats.signalsGenerated++;
      this.emitSignal(signal);
    } else {
      this.stats.signalsRejected++;
      console.log(`[IGX Beta V2] ❌ Signal rejected after strategy analysis for ${ticker.symbol}`);
    }
  }

  /**
   * Detect patterns using intelligent pattern detector
   */
  private async detectPatterns(
    current: IGXTicker,
    previous: IGXTicker
  ): Promise<Pattern[]> {
    try {
      // Convert to format expected by pattern detector
      const currentTicker = {
        symbol: current.symbol,
        price: current.price,
        volume24h: current.volume24h,
        change24h: current.change24h,
        timestamp: current.timestamp,
        bid: current.bid,
        ask: current.ask,
        high24h: current.high24h,
        low24h: current.low24h,
        orderBookDepth: current.microstructure ? {
          bidDepth: current.microstructure.liquidityScore * 1000000, // Estimate
          askDepth: current.microstructure.liquidityScore * 1000000,
          imbalance: current.microstructure.orderBookImbalance
        } : undefined,
        institutionalFlow: {
          coinbaseVolume: current.volumeDistribution?.get('coinbase') || 0,
          binanceVolume: current.volumeDistribution?.get('binance') || 0,
          ratio: current.smartMoneyFlow
        }
      };

      const previousTicker = {
        symbol: previous.symbol,
        price: previous.price,
        volume24h: previous.volume24h,
        change24h: previous.change24h,
        timestamp: previous.timestamp,
        bid: previous.bid,
        ask: previous.ask,
        high24h: previous.high24h,
        low24h: previous.low24h
      };

      const result = intelligentPatternDetector.detectPatterns(
        currentTicker as any,
        previousTicker as any
      );

      this.stats.patternsDetected += result.patterns.length;

      if (result.patterns.length > 0) {
        console.log(`[IGX Beta V2] 🔍 Patterns detected for ${current.symbol}:`,
          result.patterns.map(p => `${p.type}(${p.signal}, ${p.strength})`).join(', ')
        );
      }

      return result.patterns;
    } catch (error) {
      console.error('[IGX Beta V2] Pattern detection error:', error);
      return [];
    }
  }

  /**
   * Filter patterns based on strength (adjusted by Alpha model)
   */
  private filterStrongPatterns(patterns: Pattern[]): Pattern[] {
    // Get dynamic threshold from Alpha model
    const alphaThreshold = this.getAlphaThreshold();

    const strongPatterns = patterns.filter(p => p.strength >= alphaThreshold);

    // Apply bonus for multiple patterns
    if (strongPatterns.length >= 2) {
      strongPatterns.forEach(p => {
        p.strength = Math.min(p.strength * this.PATTERN_BONUS_MULTIPLIER, 100);
      });
    }

    return strongPatterns;
  }

  /**
   * Get threshold from Alpha V3 (dynamic!)
   */
  private getAlphaThreshold(): number {
    // Get insights from Alpha V3 hot cache (<10ms)
    const insights = streamingAlphaV3.getInsights();

    if (insights) {
      // Use dynamic threshold from Alpha
      console.log(`[IGX Beta V2] 📊 Using Alpha threshold: ${insights.minPatternStrength} (regime: ${insights.currentRegime.regime})`);
      return insights.minPatternStrength;
    }

    // Fallback to base threshold if Alpha not ready
    console.log(`[IGX Beta V2] ⚠️ Alpha not ready, using fallback threshold: ${this.MIN_PATTERN_STRENGTH}`);
    return this.MIN_PATTERN_STRENGTH;
  }

  /**
   * Get Alpha insights to include in signal (NEW IN V2!)
   */
  private getAlphaInsightsForSignal() {
    const insights = streamingAlphaV3.getInsights();

    if (!insights) {
      return undefined;
    }

    return {
      regime: insights.currentRegime.regime,
      riskLevel: insights.riskLevel,
      marketCondition: insights.marketCondition,
      confidence: insights.confidence
    };
  }

  /**
   * Analyze with all strategies and generate signal
   */
  private async analyzeWithStrategies(
    ticker: IGXTicker,
    patterns: Pattern[]
  ): Promise<IGXSignal | null> {
    console.log(`[IGX Beta V2] 🔬 Analyzing ${ticker.symbol} with 10 strategies...`);

    // Enrich data for strategies
    const enrichedData = await this.enrichTickerData(ticker);

    // Run all strategies in parallel
    const strategyResults = await Promise.all(
      Array.from(this.strategies.entries()).map(async ([name, strategy]) => {
        try {
          const result = await strategy.analyze(enrichedData);
          return { name, result };
        } catch (error) {
          console.error(`[IGX Beta V2] Strategy ${name} error:`, error);
          return null;
        }
      })
    );

    // Filter valid results
    const validResults = strategyResults.filter(
      r => r && r.result && !r.result.rejected
    );

    if (validResults.length === 0) {
      console.log('[IGX Beta V2] ❌ All strategies rejected');
      return null;
    }

    // Calculate consensus
    const consensus = this.calculateConsensus(validResults);

    console.log(`[IGX Beta V2] 📊 Strategy votes: ${consensus.long}L / ${consensus.short}S / ${consensus.neutral}N`);

    // Select best signal using ML weights
    const bestSignal = this.selectBestSignal(validResults, consensus);

    if (!bestSignal) {
      console.log('[IGX Beta V2] ❌ No consensus reached');
      return null;
    }

    // Create IGX signal
    return this.createSignal(ticker, bestSignal, patterns, consensus);
  }

  /**
   * Enrich ticker data for strategy analysis
   */
  private async enrichTickerData(ticker: IGXTicker): Promise<any> {
    try {
      // Convert to format expected by enrichment service
      const canonicalTicker = {
        symbol: ticker.symbol,
        price: ticker.price,
        volume24h: ticker.volume24h,
        change24h: ticker.change24h,
        timestamp: ticker.timestamp,
        bid: ticker.bid,
        ask: ticker.ask,
        high24h: ticker.high24h,
        low24h: ticker.low24h
      };

      return await dataEnrichmentServiceV2.enrichMarketData(canonicalTicker as any);
    } catch (error) {
      console.error('[IGX Beta V2] Enrichment error:', error);
      // Return basic data if enrichment fails
      return ticker;
    }
  }

  /**
   * Calculate strategy consensus
   */
  private calculateConsensus(results: any[]): { long: number; short: number; neutral: number } {
    let long = 0, short = 0, neutral = 0;

    for (const { name, result } of results) {
      // Apply ML weight to votes
      const performance = this.strategyPerformance.get(name);
      const weight = performance?.weight || 0.1;

      if (result.type === 'BUY') {
        long += weight;
      } else if (result.type === 'SELL') {
        short += weight;
      } else {
        neutral += weight;
      }
    }

    return { long, short, neutral };
  }

  /**
   * Select best signal using ML-weighted scoring
   */
  private selectBestSignal(results: any[], consensus: any): any {
    const direction = consensus.long > consensus.short ? 'BUY' : 'SELL';

    // Filter signals matching consensus direction
    const consensusSignals = results.filter(r => r.result.type === direction);

    if (consensusSignals.length === 0) return null;

    // Score each signal
    const scoredSignals = consensusSignals.map(({ name, result }) => {
      const performance = this.strategyPerformance.get(name);
      const weight = performance?.weight || 0.1;
      const winRate = performance?.winRate || 0.5;

      // Combined score: confidence * weight * historical win rate
      const score = result.confidence * weight * winRate;

      return { name, result, score };
    });

    // Sort by score and pick best
    scoredSignals.sort((a, b) => b.score - a.score);

    const best = scoredSignals[0];

    console.log(`[IGX Beta V2] 🏆 Best strategy: ${best.name} (score: ${best.score.toFixed(2)})`);

    return best;
  }

  /**
   * Create IGX signal
   */
  private createSignal(
    ticker: IGXTicker,
    bestSignal: any,
    patterns: Pattern[],
    consensus: any
  ): IGXSignal {
    const { name: strategy, result } = bestSignal;

    const signal: IGXSignal = {
      id: `IGX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      symbol: ticker.symbol,
      direction: result.type === 'BUY' ? 'LONG' : 'SHORT',

      // Entry/Exit
      entryPrice: (result.entryMin + result.entryMax) / 2,
      entryRange: { min: result.entryMin, max: result.entryMax },
      stopLoss: result.stopLoss,
      targets: [
        result.targets.target1,
        result.targets.target2,
        result.targets.target3
      ],

      // Metadata
      confidence: result.confidence,
      qualityScore: this.calculateQualityScore(ticker, result, patterns),
      expectedProfit: this.calculateExpectedProfit(result),
      riskRewardRatio: this.calculateRiskReward(result),

      // Strategy info
      winningStrategy: strategy,
      strategyVotes: {
        long: Math.round(consensus.long * 10),
        short: Math.round(consensus.short * 10),
        neutral: Math.round(consensus.neutral * 10)
      },

      // Pattern info
      patterns,
      marketConditions: {
        volatility: this.calculateVolatility(ticker),
        trend: this.determineTrend(ticker),
        volume: this.classifyVolume(ticker),
        liquidity: ticker.microstructure?.liquidityScore || 50
      },

      // Data quality
      dataQuality: ticker.dataQuality,
      exchangeSources: ticker.exchangeSources,

      // Alpha V3 insights (NEW IN V2!)
      alphaInsights: this.getAlphaInsightsForSignal()
    };

    // Update stats
    this.updateStats(signal);

    console.log(`\n[IGX Beta V2] ✅ 🚀 SIGNAL GENERATED: ${signal.symbol} ${signal.direction}`);
    console.log(`  📊 Strategy: ${signal.winningStrategy}`);
    console.log(`  🎯 Confidence: ${signal.confidence.toFixed(0)}%`);
    console.log(`  ✨ Quality: ${signal.qualityScore.toFixed(0)}/100`);
    console.log(`  💰 Expected Profit: ${signal.expectedProfit.toFixed(2)}%`);
    console.log(`  📈 R:R Ratio: ${signal.riskRewardRatio.toFixed(2)}:1\n`);

    return signal;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(ticker: IGXTicker, result: any, patterns: Pattern[]): number {
    let score = 50; // Base score

    // Data quality component
    score += (ticker.dataQuality / 100) * 20;

    // Pattern strength component
    const avgPatternStrength = patterns.reduce((sum, p) => sum + p.strength, 0) / patterns.length;
    score += (avgPatternStrength / 100) * 15;

    // Confidence component
    score += (result.confidence / 100) * 15;

    return Math.min(score, 100);
  }

  /**
   * Calculate expected profit
   */
  private calculateExpectedProfit(result: any): number {
    const entry = (result.entryMin + result.entryMax) / 2;
    const target = result.targets.target1; // Conservative estimate

    return ((target - entry) / entry) * 100;
  }

  /**
   * Calculate risk/reward ratio
   */
  private calculateRiskReward(result: any): number {
    const entry = (result.entryMin + result.entryMax) / 2;
    const risk = Math.abs(entry - result.stopLoss);
    const reward = Math.abs(result.targets.target1 - entry);

    return reward / risk;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(ticker: IGXTicker): number {
    // Simple calculation based on high/low range
    if (!ticker.high24h || !ticker.low24h) return 0;

    return ((ticker.high24h - ticker.low24h) / ticker.price) * 100;
  }

  /**
   * Determine trend
   */
  private determineTrend(ticker: IGXTicker): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (ticker.change24h > 1) return 'BULLISH';
    if (ticker.change24h < -1) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Classify volume
   */
  private classifyVolume(ticker: IGXTicker): 'LOW' | 'NORMAL' | 'HIGH' {
    // Would need historical average for proper classification
    if ((ticker.volume24h || 0) > 100000000) return 'HIGH';
    if ((ticker.volume24h || 0) < 10000000) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Update statistics
   */
  private updateStats(signal: IGXSignal) {
    const currentAvgConfidence = this.stats.avgConfidence;
    const currentAvgQuality = this.stats.avgQuality;
    const n = this.stats.signalsGenerated;

    this.stats.avgConfidence = (currentAvgConfidence * n + signal.confidence) / (n + 1);
    this.stats.avgQuality = (currentAvgQuality * n + signal.qualityScore) / (n + 1);
  }

  /**
   * Emit signal to Quality Checker
   */
  private emitSignal(signal: IGXSignal) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-signal-generated', {
        detail: signal
      }));
    }
  }

  /**
   * Update strategy performance (called after trade outcome)
   */
  updateStrategyPerformance(
    strategyName: string,
    success: boolean,
    profit: number
  ) {
    const performance = this.strategyPerformance.get(strategyName);
    if (!performance) return;

    // Update statistics
    performance.totalSignals++;
    if (success) {
      performance.successfulSignals++;
    }

    // Update win rate (exponential moving average)
    const alpha = 0.1; // Learning rate
    const currentWinRate = success ? 1 : 0;
    performance.winRate = performance.winRate * (1 - alpha) + currentWinRate * alpha;

    // Update average profit
    performance.avgProfit = (performance.avgProfit * (performance.totalSignals - 1) + profit) /
                           performance.totalSignals;

    // Update weight using gradient ascent
    this.updateStrategyWeight(performance, success);

    performance.lastUpdate = Date.now();

    console.log(`[IGX Beta V2] Strategy ${strategyName} updated: WR=${(performance.winRate * 100).toFixed(1)}% Weight=${performance.weight.toFixed(3)}`);
  }

  /**
   * Update strategy weight using machine learning
   */
  private updateStrategyWeight(performance: StrategyPerformance, success: boolean) {
    // Simple gradient ascent based on success
    const gradient = success ? 1 : -1;
    const adjustment = this.LEARNING_RATE * gradient;

    // Apply momentum
    const momentum = performance.weight * this.MOMENTUM;
    performance.weight = momentum + adjustment * (1 - this.MOMENTUM);

    // Clamp to bounds
    performance.weight = Math.max(this.MIN_WEIGHT, Math.min(this.MAX_WEIGHT, performance.weight));

    // Normalize weights
    this.normalizeWeights();
  }

  /**
   * Normalize all strategy weights to sum to 1
   */
  private normalizeWeights() {
    const totalWeight = Array.from(this.strategyPerformance.values())
      .reduce((sum, p) => sum + p.weight, 0);

    if (totalWeight === 0) return;

    for (const performance of this.strategyPerformance.values()) {
      performance.weight = performance.weight / totalWeight;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const strategies = Array.from(this.strategyPerformance.values())
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5); // Top 5

    return {
      tickersAnalyzed: this.stats.tickersAnalyzed,
      patternsDetected: this.stats.patternsDetected,
      signalsGenerated: this.stats.signalsGenerated,
      signalsRejected: this.stats.signalsRejected,
      avgConfidence: this.stats.avgConfidence.toFixed(1),
      avgQuality: this.stats.avgQuality.toFixed(1),
      topStrategies: strategies.map(s => ({
        name: s.name,
        winRate: `${(s.winRate * 100).toFixed(1)}%`,
        weight: `${(s.weight * 100).toFixed(1)}%`
      }))
    };
  }

  /**
   * Stop the Beta model
   */
  stop() {
    console.log('[IGX Beta V2] Stopping...');
    this.isRunning = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('igx-ticker-update', this.handleTickerUpdate.bind(this));
    }

    console.log('[IGX Beta V2] ✅ Stopped successfully');
  }
}

// Singleton instance
export const igxBetaV2 = new IGXBetaV2();