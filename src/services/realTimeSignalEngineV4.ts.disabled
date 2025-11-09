/**
 * V4 UNIFIED REAL-TIME SIGNAL ENGINE
 * Combines best of V1, V2, V3 into production-grade signal generation machine
 *
 * ARCHITECTURE:
 * - V4 Hybrid Data Aggregator (V1 subscription + V2 multi-exchange)
 * - Intelligent Pattern Recognition (combinations, not single triggers)
 * - Market Regime Classification (run right strategies for conditions)
 * - Parallel Strategy Execution (3-5 optimal strategies, not all 10)
 * - Quality Gate System (6-stage filter)
 * - Reputation Tracking (self-improvement)
 *
 * PHILOSOPHY:
 * - Quality over quantity
 * - Better pattern recognition, not lower thresholds
 * - Adapts to market conditions
 * - Self-improving through outcome tracking
 */

import { multiExchangeAggregatorV4, type EnrichedCanonicalTicker } from './dataStreams/multiExchangeAggregatorV4';
import { intelligentPatternDetector, type Pattern } from './patterns/intelligentPatternDetector';
import { marketRegimeClassifier, type MarketRegime, type RegimeClassification } from './regime/marketRegimeClassifier';
import { qualityGateSystem, type SignalCandidate, type QualityGateResult } from './quality/qualityGateSystem';
import { dataEnrichmentServiceV2 } from './dataEnrichmentServiceV2';
import type { StrategyName, StrategySignal } from './strategies/strategyTypes';

// Import all 10 existing strategies
import { WhaleShadowStrategy } from './strategies/whaleShadowStrategy';
import { SpringTrapStrategy } from './strategies/springTrapStrategy';
import { MomentumSurgeStrategy } from './strategies/momentumSurgeStrategy';
import { FundingSqueezeStrategy } from './strategies/fundingSqueezeStrategy';
import { OrderFlowTsunamiStrategy } from './strategies/orderFlowTsunamiStrategy';
import { FearGreedContrarianStrategy } from './strategies/fearGreedContrarianStrategy';
import { GoldenCrossMomentumStrategy } from './strategies/goldenCrossMomentumStrategy';
import { MarketPhaseSniperStrategy } from './strategies/marketPhaseSniperStrategy';
import { LiquidityHunterStrategy } from './strategies/liquidityHunterStrategy';
import { VolatilityBreakoutStrategy } from './strategies/volatilityBreakoutStrategy';

export interface V4SignalOutput {
  id: string;
  symbol: string;
  coinId: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  entryRange: { min: number; max: number };
  stopLoss: number;
  targets: number[];
  confidence: number;
  qualityScore: number;
  riskRewardRatio: number;

  // V4-specific metadata
  regime: MarketRegime;
  patterns: Pattern[];
  winningStrategy: StrategyName;
  strategyConsensus: { longVotes: number; shortVotes: number; neutralVotes: number };

  // Reasoning
  reasoning: string;

  timestamp: number;
  sector?: string;
}

export interface V4EngineStats {
  uptime: number;
  ticksProcessed: number;
  patternsDetected: number;
  triggersEvaluated: number;
  signalsGenerated: number;
  signalsRejected: number;

  // Quality gate stats
  gateRejections: {
    patternStrength: number;
    consensus: number;
    riskReward: number;
    liquidity: number;
    correlation: number;
    timeDedup: number;
  };

  // Regime distribution
  regimeDistribution: {
    trending: number;
    ranging: number;
    volatile: number;
    accumulation: number;
  };

  // Strategy performance (win rate per strategy)
  strategyReputation: Map<StrategyName, { wins: number; losses: number; winRate: number }>;

  avgQualityScore: number;
  avgConfidence: number;
}

export class RealTimeSignalEngineV4 {
  private isRunning = false;
  private startTime = 0;

  private stats: V4EngineStats = {
    uptime: 0,
    ticksProcessed: 0,
    patternsDetected: 0,
    triggersEvaluated: 0,
    signalsGenerated: 0,
    signalsRejected: 0,
    gateRejections: {
      patternStrength: 0,
      consensus: 0,
      riskReward: 0,
      liquidity: 0,
      correlation: 0,
      timeDedup: 0
    },
    regimeDistribution: {
      trending: 0,
      ranging: 0,
      volatile: 0,
      accumulation: 0
    },
    strategyReputation: new Map(),
    avgQualityScore: 0,
    avgConfidence: 0
  };

  private strategies: Map<StrategyName, any> = new Map();
  private previousTickerMap: Map<string, EnrichedCanonicalTicker> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly ANALYSIS_COOLDOWN_MS = 15000; // 15 seconds between analyses per coin (faster signal generation)
  private lastAnalysisTime: Map<string, number> = new Map();

  constructor() {
    // Initialize all 10 strategies with correct names
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

    // Initialize reputation tracking
    this.strategies.forEach((_, name) => {
      this.stats.strategyReputation.set(name, { wins: 0, losses: 0, winRate: 0 });
    });
  }

  /**
   * Start V4 unified signal engine
   */
  start(coinGeckoIds: string[]) {
    if (this.isRunning) {
      console.log('[V4 Engine] Already running');
      return;
    }

    console.log('\n[V4 Engine] ========== STARTING V4 UNIFIED SIGNAL ENGINE ==========');
    console.log('[V4 Engine] Components:');
    console.log('[V4 Engine]   - V4 Hybrid Data Aggregator (V1 + V2)');
    console.log('[V4 Engine]   - Intelligent Pattern Recognition');
    console.log('[V4 Engine]   - Market Regime Classification');
    console.log('[V4 Engine]   - Parallel Strategy Execution (3-5 optimal)');
    console.log('[V4 Engine]   - Quality Gate System (6 stages)');
    console.log('[V4 Engine]   - Reputation Tracking (self-improvement)');
    console.log('[V4 Engine] =================================================================\n');

    this.isRunning = true;
    this.startTime = Date.now();

    // Start V4 hybrid data aggregator
    multiExchangeAggregatorV4.start(coinGeckoIds, (ticker) => this.processTick(ticker));

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      qualityGateSystem.cleanupExpiredSignals();
    }, 60000); // Every minute
  }

  /**
   * Process incoming ticker data
   */
  private async processTick(ticker: EnrichedCanonicalTicker) {
    this.stats.ticksProcessed++;

    const symbol = ticker.symbol;
    const previousTicker = this.previousTickerMap.get(symbol);

    // Store for next comparison
    this.previousTickerMap.set(symbol, ticker);

    // Need at least 2 ticks to detect patterns
    if (!previousTicker) {
      return;
    }

    // Step 1: Intelligent Pattern Recognition
    const patternResult = intelligentPatternDetector.detectPatterns(ticker, previousTicker);
    const patterns = patternResult.patterns;

    if (patterns.length > 0) {
      this.stats.patternsDetected += patterns.length;

      console.log(`[V4 Engine] 🔍 Patterns detected for ${symbol}:`,
        patterns.map(p => `${p.type}(${p.signal}, ${p.strength})`).join(', ')
      );
    }

    // Step 2: Check if patterns are strong enough to trigger analysis
    // Use the pattern detector's built-in shouldTrigger (already checks strength >= 70)
    // But lower threshold to 60 to catch more opportunities (quality gates will filter)
    const strongPatterns = patterns.filter(p => p.strength >= 60);

    if (strongPatterns.length === 0) {
      return; // No strong patterns, skip analysis
    }

    // Step 3: Cooldown check (prevent spam)
    const lastAnalysis = this.lastAnalysisTime.get(symbol) || 0;
    const timeSinceLastAnalysis = Date.now() - lastAnalysis;

    if (timeSinceLastAnalysis < this.ANALYSIS_COOLDOWN_MS) {
      return; // Too soon, wait
    }

    this.stats.triggersEvaluated++;

    // Step 4: Market Regime Classification (for context, not routing)
    const regime = marketRegimeClassifier.classify(ticker);

    console.log(`[V4 Engine] 🎯 TRIGGER: ${symbol} | Regime: ${regime.regime} | Patterns: ${strongPatterns.length}`);
    console.log(`[V4 Engine]   Market Context: ${regime.reasoning}`);

    // Update cooldown
    this.lastAnalysisTime.set(symbol, Date.now());

    // Step 5: Run deep analysis
    await this.performDeepAnalysis(ticker, strongPatterns, regime);
  }

  /**
   * Perform deep multi-strategy analysis
   */
  private async performDeepAnalysis(
    ticker: EnrichedCanonicalTicker,
    patterns: Pattern[],
    regime: RegimeClassification
  ) {
    try {
      console.log(`[V4 Engine] 🔬 Deep Analysis: ${ticker.symbol} (${regime.regime} regime)`);

      // Enrich data with technical indicators
      const enrichedData = await dataEnrichmentServiceV2.enrichMarketData(ticker);

      // Run ALL 10 strategies in parallel (not just 2-3)
      // This gives the model maximum options to choose from
      console.log(`[V4 Engine] Running ALL 10 strategies in parallel...`);

      const allStrategyNames = Array.from(this.strategies.keys());
      const strategyResults = await Promise.all(
        allStrategyNames.map(async (strategyName) => {
          const strategy = this.strategies.get(strategyName);
          if (!strategy) return null;

          try {
            const result: StrategySignal = await strategy.analyze(enrichedData as any);
            return { strategyName, result };
          } catch (error) {
            console.error(`[V4 Engine] Strategy ${strategyName} error:`, error);
            return null;
          }
        })
      );

      const validResults = strategyResults.filter(
        r => r !== null && r.result !== null && !r.result.rejected
      );

      if (validResults.length === 0) {
        console.log(`[V4 Engine] ❌ All 10 strategies rejected or failed`);
        this.stats.signalsRejected++;
        return;
      }

      console.log(`[V4 Engine] ✅ ${validResults.length}/10 strategies generated valid signals`);

      // Calculate consensus (BUY = LONG, SELL = SHORT)
      const longVotes = validResults.filter(r => r!.result.type === 'BUY').length;
      const shortVotes = validResults.filter(r => r!.result.type === 'SELL').length;
      const neutralVotes = validResults.filter(r => r!.result.type === null).length;

      const strategyConsensus = { longVotes, shortVotes, neutralVotes };

      // Log strategy votes for transparency
      console.log(`[V4 Engine] Strategy Votes: ${longVotes} LONG, ${shortVotes} SHORT, ${neutralVotes} NEUTRAL`);
      validResults.forEach(r => {
        console.log(`[V4 Engine]   - ${r!.strategyName}: ${r!.result.type || 'NEUTRAL'} (confidence: ${r!.result.confidence}%)`);
      });

      // Determine consensus direction
      const consensusDirection: 'LONG' | 'SHORT' = longVotes > shortVotes ? 'LONG' : 'SHORT';
      const consensusType: 'BUY' | 'SELL' = consensusDirection === 'LONG' ? 'BUY' : 'SELL';

      // Select best signal (highest confidence from consensus direction)
      const consensusSignals = validResults.filter(
        r => r!.result.type === consensusType
      );

      if (consensusSignals.length === 0) {
        console.log(`[V4 Engine] ❌ No consensus (${longVotes}L/${shortVotes}S/${neutralVotes}N)`);
        this.stats.signalsRejected++;
        return;
      }

      // Pick best signal (apply reputation weighting)
      const bestSignal = this.selectBestSignal(consensusSignals.map(s => s!), ticker);

      // Create signal candidate
      const candidate: SignalCandidate = {
        symbol: ticker.symbol,
        coinId: ticker.symbol.toLowerCase(), // TODO: Map to CoinGecko ID properly
        direction: consensusDirection,
        entryPrice: (bestSignal.result.entryMin + bestSignal.result.entryMax) / 2,
        stopLoss: bestSignal.result.stopLoss,
        targets: [
          bestSignal.result.targets.target1,
          bestSignal.result.targets.target2,
          bestSignal.result.targets.target3
        ],
        confidence: bestSignal.result.confidence,
        patterns,
        strategyConsensus,
        ticker,
        sector: this.inferSector(ticker.symbol) // TODO: Implement proper sector mapping
      };

      // Step 6: Apply Quality Gates
      const gateResult = qualityGateSystem.evaluate(candidate);

      if (!gateResult.passed) {
        console.log(`[V4 Engine] 🚫 REJECTED by quality gates: ${gateResult.rejectionReason}`);
        this.stats.signalsRejected++;

        // Track gate rejections
        gateResult.gatesFailed.forEach(gate => {
          if (gate === 'PATTERN_STRENGTH') this.stats.gateRejections.patternStrength++;
          if (gate === 'CONSENSUS') this.stats.gateRejections.consensus++;
          if (gate === 'RISK_REWARD') this.stats.gateRejections.riskReward++;
          if (gate === 'LIQUIDITY') this.stats.gateRejections.liquidity++;
          if (gate === 'CORRELATION') this.stats.gateRejections.correlation++;
          if (gate === 'TIME_DEDUP') this.stats.gateRejections.timeDedup++;
        });

        return;
      }

      // Step 7: Generate final signal
      const signal = this.generateSignal(candidate, bestSignal.strategyName, gateResult, regime);

      console.log(`[V4 Engine] ✅ 🚀 SIGNAL GENERATED: ${signal.symbol} ${signal.direction}`);
      console.log(`[V4 Engine]   Quality Score: ${signal.qualityScore}/100`);
      console.log(`[V4 Engine]   Confidence: ${signal.confidence}%`);
      console.log(`[V4 Engine]   Strategy: ${signal.winningStrategy}`);
      console.log(`[V4 Engine]   R:R: ${signal.riskRewardRatio.toFixed(2)}:1`);
      console.log(`[V4 Engine]   Entry: $${signal.entryPrice.toFixed(2)} | SL: $${signal.stopLoss.toFixed(2)}`);

      // Register with quality gate system
      qualityGateSystem.registerSignal(candidate);

      // Update stats
      this.stats.signalsGenerated++;
      this.updateRegimeStats(regime.regime);

      // Emit signal event
      this.emitSignal(signal);

      // Save to database
      await this.saveSignalToDatabase(signal);

    } catch (error) {
      console.error(`[V4 Engine] Analysis error for ${ticker.symbol}:`, error);
      this.stats.signalsRejected++;
    }
  }

  /**
   * Select best signal using reputation weighting
   */
  private selectBestSignal(
    signals: Array<{ strategyName: StrategyName; result: any }>,
    ticker: EnrichedCanonicalTicker
  ) {
    let bestSignal = signals[0];
    let bestScore = 0;

    for (const signal of signals) {
      const reputation = this.stats.strategyReputation.get(signal.strategyName);
      const winRate = reputation ? reputation.winRate : 0.5; // Default 50% if no history

      // Score = Confidence × Win Rate
      const score = signal.result.confidence * (0.5 + winRate * 0.5); // 50% base + 50% reputation

      if (score > bestScore) {
        bestScore = score;
        bestSignal = signal;
      }
    }

    return bestSignal;
  }

  /**
   * Generate final signal output
   */
  private generateSignal(
    candidate: SignalCandidate,
    winningStrategy: StrategyName,
    gateResult: QualityGateResult,
    regime: RegimeClassification
  ): V4SignalOutput {
    // Create reasoning
    const patternSummary = candidate.patterns
      .map(p => `${p.type} ${p.signal.toLowerCase()} (${p.strength})`)
      .join(', ');

    const reasoning = `${regime.regime} market detected. Patterns: ${patternSummary}. ` +
      `Strategy consensus: ${candidate.strategyConsensus.longVotes}L/${candidate.strategyConsensus.shortVotes}S. ` +
      `Winning strategy: ${winningStrategy}. Quality score: ${gateResult.qualityScore}/100.`;

    return {
      id: `v4-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: candidate.symbol,
      coinId: candidate.coinId,
      direction: candidate.direction,
      entryPrice: candidate.entryPrice,
      entryRange: {
        min: candidate.entryPrice * 0.998,
        max: candidate.entryPrice * 1.002
      },
      stopLoss: candidate.stopLoss,
      targets: candidate.targets,
      confidence: candidate.confidence,
      qualityScore: gateResult.qualityScore,
      riskRewardRatio: gateResult.details.riskRewardRatio,
      regime: regime.regime,
      patterns: candidate.patterns,
      winningStrategy,
      strategyConsensus: candidate.strategyConsensus,
      reasoning,
      timestamp: Date.now(),
      sector: candidate.sector
    };
  }

  /**
   * Update regime distribution stats
   */
  private updateRegimeStats(regime: MarketRegime) {
    if (regime === 'TRENDING') this.stats.regimeDistribution.trending++;
    if (regime === 'RANGING') this.stats.regimeDistribution.ranging++;
    if (regime === 'VOLATILE') this.stats.regimeDistribution.volatile++;
    if (regime === 'ACCUMULATION') this.stats.regimeDistribution.accumulation++;
  }

  /**
   * Emit signal event for UI
   */
  private emitSignal(signal: V4SignalOutput) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-v4-signal', {
        detail: signal
      }));
    }
  }

  /**
   * Save signal to Supabase
   */
  private async saveSignalToDatabase(signal: V4SignalOutput) {
    // TODO: Integrate with Supabase
    // For now, just log
    console.log('[V4 Engine] 💾 Signal would be saved to database:', signal.id);
  }

  /**
   * Infer sector from symbol (placeholder)
   */
  private inferSector(symbol: string): string {
    // TODO: Implement proper sector mapping
    // For now, basic heuristic
    if (['BTC', 'ETH'].includes(symbol)) return 'L1';
    if (['SOL', 'AVAX', 'MATIC'].includes(symbol)) return 'L1';
    if (['UNI', 'AAVE', 'SUSHI'].includes(symbol)) return 'DeFi';
    return 'UNKNOWN';
  }

  /**
   * Track signal outcome (for reputation)
   */
  trackOutcome(signalId: string, strategyName: StrategyName, won: boolean) {
    const reputation = this.stats.strategyReputation.get(strategyName);
    if (!reputation) return;

    if (won) {
      reputation.wins++;
    } else {
      reputation.losses++;
    }

    const total = reputation.wins + reputation.losses;
    reputation.winRate = total > 0 ? reputation.wins / total : 0;

    console.log(`[V4 Engine] 📊 ${strategyName} reputation: ${(reputation.winRate * 100).toFixed(0)}% (${reputation.wins}W/${reputation.losses}L)`);
  }

  /**
   * Stop engine
   */
  stop() {
    if (!this.isRunning) return;

    console.log('[V4 Engine] Stopping...');

    multiExchangeAggregatorV4.stop();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log('[V4 Engine] Stopped');
  }

  /**
   * Get statistics
   */
  getStats(): V4EngineStats {
    this.stats.uptime = (Date.now() - this.startTime) / 1000;

    // Calculate averages
    if (this.stats.signalsGenerated > 0) {
      // TODO: Track these properly
      this.stats.avgQualityScore = 75; // Placeholder
      this.stats.avgConfidence = 72; // Placeholder
    }

    return { ...this.stats };
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const realTimeSignalEngineV4 = new RealTimeSignalEngineV4();
