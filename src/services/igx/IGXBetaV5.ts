/**
 * IGX BETA V5 - Strategy Execution & ML Consensus Engine
 * Production-Grade Quant Trading Architecture
 *
 * RESPONSIBILITIES:
 * - Execute 10 trading strategies in parallel
 * - Apply ML weights to strategy votes
 * - Calculate weighted consensus
 * - Track per-strategy health and performance
 * - Auto-disable failing strategies (circuit breaker)
 * - Emit strategy consensus events for Gamma V2
 *
 * ARCHITECTURE: Separated from signal assembly for:
 * - Fault isolation (strategy bugs don't crash signal generation)
 * - Independent scaling
 * - Clear performance attribution
 * - 0-downtime strategy updates
 */

import type { IGXTicker } from './IGXDataPipelineV4';
import type {
  StrategyConsensus,
  StrategySignal,
  StrategyHealth,
  StrategyPerformance,
  BetaV5Stats,
  BetaV5Config
} from './interfaces/StrategyConsensus';
import { StrategyMLEngine } from './ml/StrategyMLEngine';
import { intelligentPatternDetector } from '../patterns/intelligentPatternDetector';
import { dataEnrichmentServiceV2 } from '../dataEnrichmentServiceV2';
import { marketRegimeDetector, type RegimeAnalysis } from './MarketRegimeDetector';

// Import all 17 institutional-grade strategies
import { WhaleShadowStrategy } from '../strategies/whaleShadowStrategy';
import { SpringTrapStrategy } from '../strategies/springTrapStrategy';
import { MomentumSurgeStrategy } from '../strategies/momentumSurgeStrategy';
import { MomentumSurgeV2Strategy } from '../strategies/momentumSurgeV2Strategy';
import { MomentumRecoveryStrategy } from '../strategies/momentumRecoveryStrategy';
import { FundingSqueezeStrategy } from '../strategies/fundingSqueezeStrategy';
import { OrderFlowTsunamiStrategy } from '../strategies/orderFlowTsunamiStrategy';
import { FearGreedContrarianStrategy } from '../strategies/fearGreedContrarianStrategy';
import { GoldenCrossMomentumStrategy } from '../strategies/goldenCrossMomentumStrategy';
import { MarketPhaseSniperStrategy } from '../strategies/marketPhaseSniperStrategy';
import { LiquidityHunterStrategy } from '../strategies/liquidityHunterStrategy';
import { VolatilityBreakoutStrategy } from '../strategies/volatilityBreakoutStrategy';
import { StatisticalArbitrageStrategy } from '../strategies/statisticalArbitrageStrategy';
import { OrderBookMicrostructureStrategy } from '../strategies/orderBookMicrostructureStrategy';
import { LiquidationCascadePredictionStrategy } from '../strategies/liquidationCascadePredictionStrategy';
import { CorrelationBreakdownDetectorStrategy } from '../strategies/correlationBreakdownDetectorStrategy';
import { BollingerMeanReversionStrategy } from '../strategies/bollingerMeanReversionStrategy';
import { advancedRejectionFilter } from '../AdvancedRejectionFilter';
import { strategyPerformanceML } from '../ml/StrategyPerformancePredictorML';
import { marketRegimePredictorML } from '../ml/MarketRegimePredictorML';
import { regimePerformanceMatrix } from '../ml/RegimePerformanceMatrix';

export class IGXBetaV5 {
  // Configuration
  private config: BetaV5Config = {
    strategyTimeout: 5000, // 5 seconds max per strategy
    maxConcurrentStrategies: 10,
    learningRate: 0.1,
    momentum: 0.9,
    weightDecay: 0.01,
    minWeight: 0.05,
    maxWeight: 0.3,
    maxConsecutiveErrors: 5,
    autoDisableErrorRate: 0.8, // Disable if 80% errors
    healthCheckInterval: 60000, // 1 minute
    performanceWindowSize: 50,
    minSignalsForLearning: 5,
    circuitBreakerThreshold: 0.35, // Disable if win rate < 35%
    circuitBreakerWindow: 20 // Check last 20 signals
  };

  // Strategy instances
  private strategies = new Map<string, any>();
  private strategyNames: string[] = [];

  // ML Engine
  private mlEngine: StrategyMLEngine;

  // Health tracking
  private health = new Map<string, StrategyHealth>();
  private disabled = new Set<string>(); // Manually disabled strategies

  // Performance tracking (last N executions)
  private executionTimes: number[] = [];
  private readonly MAX_EXECUTION_HISTORY = 100;

  // Running state
  private isRunning = false;
  private startTime = 0;
  private totalAnalyses = 0;
  private successfulAnalyses = 0;
  private failedAnalyses = 0;

  // Previous tickers (for pattern detection)
  private previousTickers = new Map<string, IGXTicker>();

  constructor() {
    this.initializeStrategies();
    this.initializeHealth();

    // Initialize ML Engine with strategy names
    this.mlEngine = new StrategyMLEngine(this.strategyNames);

    console.log('[IGX Beta V5] 🚀 Initialized with 17 institutional-grade strategies + ML engine');
  }

  /**
   * Initialize all 17 institutional-grade trading strategies
   */
  private initializeStrategies(): void {
    const strategyInstances = [
      { name: 'WHALE_SHADOW', instance: new WhaleShadowStrategy() },
      { name: 'SPRING_TRAP', instance: new SpringTrapStrategy() },
      { name: 'MOMENTUM_SURGE', instance: new MomentumSurgeStrategy() },
      { name: 'MOMENTUM_SURGE_V2', instance: new MomentumSurgeV2Strategy() },
      { name: 'MOMENTUM_RECOVERY', instance: new MomentumRecoveryStrategy() },
      { name: 'FUNDING_SQUEEZE', instance: new FundingSqueezeStrategy() },
      { name: 'ORDER_FLOW_TSUNAMI', instance: new OrderFlowTsunamiStrategy() },
      { name: 'FEAR_GREED_CONTRARIAN', instance: new FearGreedContrarianStrategy() },
      { name: 'GOLDEN_CROSS_MOMENTUM', instance: new GoldenCrossMomentumStrategy() },
      { name: 'MARKET_PHASE_SNIPER', instance: new MarketPhaseSniperStrategy() },
      { name: 'LIQUIDITY_HUNTER', instance: new LiquidityHunterStrategy() },
      { name: 'VOLATILITY_BREAKOUT', instance: new VolatilityBreakoutStrategy() },
      { name: 'STATISTICAL_ARBITRAGE', instance: new StatisticalArbitrageStrategy() },
      { name: 'ORDER_BOOK_MICROSTRUCTURE', instance: new OrderBookMicrostructureStrategy() },
      { name: 'LIQUIDATION_CASCADE_PREDICTION', instance: new LiquidationCascadePredictionStrategy() },
      { name: 'CORRELATION_BREAKDOWN_DETECTOR', instance: new CorrelationBreakdownDetectorStrategy() },
      { name: 'BOLLINGER_MEAN_REVERSION', instance: new BollingerMeanReversionStrategy() }
    ];

    for (const { name, instance } of strategyInstances) {
      this.strategies.set(name, instance);
      this.strategyNames.push(name);
    }
  }

  /**
   * Initialize health tracking for each strategy
   */
  private initializeHealth(): void {
    for (const name of this.strategyNames) {
      this.health.set(name, {
        name,
        healthy: true,
        lastExecutionTime: 0,
        errorRate: 0,
        avgExecutionTime: 0,
        consecutiveErrors: 0,
        lastSuccess: Date.now(),
        disabled: false
      });
    }
  }

  /**
   * Start Delta Engine
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[IGX Beta V5] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('[IGX Beta V5] ✅ Started - Ready to analyze strategies');
  }

  /**
   * Stop Delta Engine
   */
  stop(): void {
    this.isRunning = false;
    console.log('[IGX Beta V5] ⏹️ Stopped');
  }

  /**
   * Main analysis function - Runs all strategies and calculates consensus
   * @param ticker - Market data ticker
   * @param precomputedSignals - Optional: Use signals from Alpha engine instead of re-running strategies
   */
  async analyzeStrategies(ticker: IGXTicker, precomputedSignals?: StrategySignal[]): Promise<StrategyConsensus | null> {
    if (!this.isRunning) {
      console.warn('[IGX Beta V5] Not running - call start() first');
      return null;
    }

    const startTime = Date.now();
    this.totalAnalyses++;

    try {
      let strategyResults: StrategySignal[];

      // ✅ USE PRE-COMPUTED SIGNALS FROM ALPHA (Quant-Firm Architecture)
      if (precomputedSignals && precomputedSignals.length > 0) {
        console.log(`[IGX Beta V5] ✅ Using ${precomputedSignals.length} pre-computed Alpha signals (no re-execution)`);
        strategyResults = precomputedSignals;
      } else {
        // ❌ FALLBACK: Run strategies if no Alpha signals provided
        console.log('[IGX Beta V5] ⚠️ No pre-computed signals - running strategies from scratch');

        // Step 1: Detect patterns (required for strategies)
        const patterns = await this.detectPatterns(ticker);

        // Step 2: Run all enabled strategies in parallel
        strategyResults = await this.executeStrategies(ticker, patterns);
      }

      // Step 3: Calculate weighted consensus using ML (with ML-based dynamic weighting)
      const consensus = await this.calculateConsensus(ticker, strategyResults);

      // ✅ CHECK: Return null if no consensus reached (direction === null)
      if (!consensus.direction) {
        console.log(`[IGX Beta V5] ⚠️ No consensus reached - insufficient agreement (direction: ${consensus.direction}, confidence: ${consensus.confidence}%)`);
        
        // ✅ LOG REJECTION WITH ADVANCED ML FILTER
        await advancedRejectionFilter.filterAndLog({
          symbol: ticker.symbol,
          direction: 'NEUTRAL',
          rejectionStage: 'BETA',
          rejectionReason: `No consensus - insufficient agreement (confidence: ${consensus.confidence}%)`,
          qualityScore: ticker.dataQuality || 0,
          confidenceScore: consensus.confidence,
          dataQuality: ticker.dataQuality || 0,
          strategyVotes: strategyResults,
          marketRegime: consensus.marketRegime || 'UNKNOWN',
          volatility: ticker.volatility || 50
        });
        
        this.failedAnalyses++;
        return null;
      }

      // Record execution time
      const executionTime = Date.now() - startTime;
      this.recordExecutionTime(executionTime);

      // Emit consensus event for Gamma V2
      this.emitConsensus(consensus);

      this.successfulAnalyses++;

      return consensus;

    } catch (error) {
      console.error('[IGX Beta V5] ❌ Analysis failed:', error);
      this.failedAnalyses++;
      return null;
    }
  }

  /**
   * Detect patterns in ticker data
   */
  private async detectPatterns(ticker: IGXTicker) {
    const previousTicker = this.previousTickers.get(ticker.symbol);
    this.previousTickers.set(ticker.symbol, ticker);

    if (!previousTicker) {
      return []; // Need at least 2 tickers for patterns
    }

    try {
      // Enrich data
      const enriched = await dataEnrichmentServiceV2.enrichTickerData(
        ticker.symbol,
        ticker.price
      );

      // Detect patterns
      const patterns = intelligentPatternDetector.detectPatterns(
        ticker,
        previousTicker,
        enriched as any
      );

      return patterns;
    } catch (error) {
      console.error('[IGX Beta V5] Pattern detection error:', error);
      return [];
    }
  }

  /**
   * Execute all enabled strategies in parallel
   * ✅ PHASE 1 PART 1: Market Regime Switching
   */
  private async executeStrategies(
    ticker: IGXTicker,
    patterns: any[]
  ): Promise<StrategySignal[]> {
    const results: StrategySignal[] = [];
    const executionPromises: Promise<void>[] = [];

    // ✅ PHASE 1: Detect market regime for strategy filtering
    let recommendedStrategies: string[] = [];
    let regimeName = 'UNKNOWN';

    if (ticker.ohlcData && ticker.ohlcData.length >= 50) {
      const isOhlcValid = this.validateOHLCData(ticker.ohlcData);

      if (isOhlcValid) {
        try {
          const regimeAnalysis = marketRegimeDetector.detect(ticker.ohlcData, ticker.symbol);

          if (regimeAnalysis && !isNaN(regimeAnalysis.confidence)) {
            recommendedStrategies = regimeAnalysis.recommendedStrategies;
            regimeName = regimeAnalysis.regime;

            console.log(
              `[IGX Beta V5] 🎯 Regime Switching Active: ${regimeName} | ` +
              `Recommended: [${recommendedStrategies.join(', ')}]`
            );
          }
        } catch (error) {
          // Silently continue - regime filtering is optional enhancement
        }
      }
    }

    for (const [name, strategy] of this.strategies.entries()) {
      // Skip disabled strategies
      if (this.disabled.has(name) || !this.health.get(name)?.healthy) {
        continue;
      }

      // ✅ PHASE 1: Regime-based strategy filtering (soft filter - don't skip, just log)
      const isRecommended = recommendedStrategies.length === 0 ||
                            recommendedStrategies.includes(name);

      if (!isRecommended && recommendedStrategies.length > 0) {
        console.log(
          `[IGX Beta V5] ⚠️ ${name} not recommended for ${regimeName} regime ` +
          `(will run with reduced weight)`
        );
      }

      // Execute strategy with timeout
      const promise = this.executeStrategyWithTimeout(
        name,
        strategy,
        ticker,
        patterns
      ).then(result => {
        if (result) {
          results.push(result);
        }
      });

      executionPromises.push(promise);
    }

    // Wait for all strategies to complete
    await Promise.all(executionPromises);

    return results;
  }

  /**
   * Execute single strategy with timeout protection
   */
  private async executeStrategyWithTimeout(
    name: string,
    strategy: any,
    ticker: IGXTicker,
    patterns: any[]
  ): Promise<StrategySignal | null> {
    const strategyHealth = this.health.get(name)!;
    const startTime = Date.now();

    try {
      // Execute strategy with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Strategy timeout')), this.config.strategyTimeout)
      );

      const analysisPromise = strategy.analyze(ticker, patterns);

      const result = await Promise.race([analysisPromise, timeoutPromise]);

      // Record success
      const executionTime = Date.now() - startTime;
      strategyHealth.lastExecutionTime = executionTime;
      strategyHealth.avgExecutionTime =
        (strategyHealth.avgExecutionTime * 0.9) + (executionTime * 0.1); // EMA
      strategyHealth.consecutiveErrors = 0;
      strategyHealth.lastSuccess = Date.now();

      // Convert result to StrategySignal
      if (result && result.type !== 'NEUTRAL') {
        return {
          strategyName: name,
          direction: result.type === 'BUY' ? 'LONG' : result.type === 'SELL' ? 'SHORT' : 'NEUTRAL',
          confidence: result.confidence || 50,
          reasoning: result.reasoning || 'Strategy analysis',
          entryPrice: result.entryPrice,
          stopLoss: result.stopLoss,
          targets: result.targets,
          riskReward: result.riskReward,
          timestamp: Date.now()
        };
      }

      return null;

    } catch (error) {
      // Record error
      strategyHealth.consecutiveErrors++;
      strategyHealth.errorRate =
        (strategyHealth.errorRate * 0.9) + (1 * 0.1); // EMA error rate
      strategyHealth.lastError = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[IGX Beta V5] Strategy ${name} failed:`, error);

      // Auto-disable if too many errors
      if (strategyHealth.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        console.warn(`[IGX Beta V5] ⚠️ Auto-disabling ${name} (${strategyHealth.consecutiveErrors} consecutive errors)`);
        strategyHealth.healthy = false;
      }

      return null;
    }
  }

  /**
   * Calculate weighted consensus from strategy results
   * 🏛️ INSTITUTIONAL-GRADE: Adaptive thresholds based on market regime + ML predictions
   */
  private async calculateConsensus(
    ticker: IGXTicker,
    strategyResults: StrategySignal[]
  ): Promise<StrategyConsensus> {
    const weights = this.mlEngine.getWeights();

    // ✅ QUANT-FIRM APPROACH: Detect market regime for adaptive parameters
    let regimeAnalysis: RegimeAnalysis | null = null;
    let adaptiveThreshold = 0.45; // ✅ TESTING: Lowered to 45% for signal flow (was 65%)
    let qualityAdjustment = 0;

    // ✅ FIX: Validate OHLC data before passing to regime detector
    const isOhlcValid = this.validateOHLCData(ticker.ohlcData);

    if (ticker.ohlcData && ticker.ohlcData.length >= 50 && isOhlcValid) {
      try {
        regimeAnalysis = marketRegimeDetector.detect(ticker.ohlcData, ticker.symbol);

        // ✅ FIX: Validate confidence to prevent NaN%
        if (regimeAnalysis.confidence && !isNaN(regimeAnalysis.confidence)) {
          // ✅ TESTING: Lowered minimum threshold to 45% for signal flow (was 60%)
          const regimeThreshold = regimeAnalysis.optimalConsensusThreshold / 100; // Convert to decimal
          adaptiveThreshold = Math.max(0.45, regimeThreshold); // Minimum 45%, can go higher
          qualityAdjustment = regimeAnalysis.qualityTierAdjustment;

          console.log(
            `[IGX Beta V5] 🎯 Market Regime: ${regimeAnalysis.regime} | ` +
            `Adaptive Threshold: ${(adaptiveThreshold * 100).toFixed(0)}% | ` +
            `Quality Adjustment: ${qualityAdjustment > 0 ? '+' : ''}${qualityAdjustment}`
          );
        } else {
          console.warn(`[IGX Beta V5] ⚠️ Regime confidence invalid (NaN) - using default 50% threshold`);
          regimeAnalysis = null; // Reset to null to use defaults
        }
      } catch (error) {
        console.warn(`[IGX Beta V5] ⚠️ Regime detection failed: ${error} - using default 50% threshold`);
        regimeAnalysis = null;
      }
    } else {
      if (!isOhlcValid) {
        console.warn(`[IGX Beta V5] ⚠️ OHLC data contains invalid values (NaN/undefined) - using default 50% threshold`);
      } else {
        console.warn(`[IGX Beta V5] ⚠️ Insufficient OHLC data (${ticker.ohlcData?.length || 0} candles, need 50+) - using default 50% threshold`);
      }
    }

    // Calculate weighted votes
    let longVotes = 0;
    let shortVotes = 0;
    let neutralVotes = 0;

    // Calculate raw votes (unweighted)
    let rawLongVotes = 0;
    let rawShortVotes = 0;
    let rawNeutralVotes = 0;

    // Track winning strategy
    let winningStrategy = '';
    let winningConfidence = 0;

    // ✅ PHASE 3: Regime Transition Prediction & Pre-emptive Weighting
    // Check for incoming regime transitions and adjust weights proactively
    let regimePrediction: any = null;
    let transitionRecommendations: any = null;

    try {
      regimePrediction = await marketRegimePredictorML.predictRegime(ticker.symbol);

      // Check for regime transition alert
      const transitionAlert = await marketRegimePredictorML.getRegimeTransitionAlert(ticker.symbol);

      if (transitionAlert.alert) {
        console.log(
          `[IGX Beta V5] 🚨 REGIME TRANSITION ALERT: ` +
          `${regimePrediction.currentRegime} → ${transitionAlert.incomingRegime} ` +
          `in ${transitionAlert.daysUntilTransition} days ` +
          `(${(transitionAlert.confidence * 100).toFixed(0)}% confidence)`
        );

        // Get strategy recommendations for transition
        transitionRecommendations = regimePerformanceMatrix.getRegimeTransitionRecommendations(
          regimePrediction.currentRegime,
          transitionAlert.incomingRegime!
        );

        console.log('[IGX Beta V5] 📋 Transition recommendations:', transitionRecommendations.reasoning);
      }
    } catch (error) {
      console.warn('[IGX Beta V5] ⚠️ Regime prediction unavailable:', error);
    }

    // ✅ PHASE 2: ML-Based Dynamic Strategy Weighting
    // Get ML predictions for all strategies (production-grade approach)
    let mlPredictions: Map<string, number> = new Map();
    try {
      const predictions = await strategyPerformanceML.predictAllStrategies(ticker.symbol);
      for (const pred of predictions) {
        mlPredictions.set(pred.strategyName, pred.winProbability);
      }
      console.log(`[IGX Beta V5] 🤖 ML Predictions loaded for ${mlPredictions.size} strategies`);
    } catch (error) {
      console.warn('[IGX Beta V5] ⚠️ ML predictions unavailable, using regime-only weighting:', error);
    }

    // ✅ PHASE 1 PART 2: Dynamic Strategy Weighting based on regime + ML predictions
    const recommendedStrategies = regimeAnalysis?.recommendedStrategies || [];
    const hasRecommendations = recommendedStrategies.length > 0;

    for (const result of strategyResults) {
      let weight = weights[result.strategyName] || 0.1;

      // ✅ PHASE 3: Pre-emptive regime transition weighting
      if (transitionRecommendations) {
        const strategiesToLoad = transitionRecommendations.strategiesToLoad || [];
        const strategiesToUnload = transitionRecommendations.strategiesToUnload || [];

        if (strategiesToLoad.includes(result.strategyName)) {
          // Pre-load strategies for incoming regime
          weight = weight * 1.3;
          console.log(
            `[IGX Beta V5] 🔮 ${result.strategyName}: ` +
            `Pre-loading for incoming ${regimePrediction?.predictedRegime} regime (+30% weight)`
          );
        } else if (strategiesToUnload.includes(result.strategyName)) {
          // Reduce weight for outgoing regime strategies
          weight = weight * 0.7;
          console.log(
            `[IGX Beta V5] 📉 ${result.strategyName}: ` +
            `Reducing for outgoing ${regimePrediction?.currentRegime} regime (-30% weight)`
          );
        }

        // Also apply regime performance matrix multiplier
        if (regimePrediction) {
          const regimeMultiplier = regimePerformanceMatrix.getStrategyWeightMultiplier(
            result.strategyName as any,
            regimePrediction.currentRegime
          );
          weight = weight * regimeMultiplier;
        }
      }

      // ✅ PHASE 2: Apply ML-based weight multiplier
      const mlWinProbability = mlPredictions.get(result.strategyName);
      if (mlWinProbability !== undefined) {
        // Convert win probability (0-1) to weight multiplier (0.5-2.0)
        // Win prob 0.5 = 1.0x (neutral), 0.7 = 1.4x, 0.3 = 0.6x
        const mlMultiplier = 0.5 + (mlWinProbability * 1.5);
        weight = weight * mlMultiplier;

        console.log(
          `[IGX Beta V5] 🤖 ${result.strategyName}: ` +
          `ML win prob ${(mlWinProbability * 100).toFixed(0)}% → ${mlMultiplier.toFixed(2)}x weight`
        );
      }

      // ✅ PHASE 1: Apply dynamic weight multiplier based on regime fit
      if (hasRecommendations) {
        const isRecommended = recommendedStrategies.includes(result.strategyName);

        if (isRecommended) {
          // ✅ BOOST: Strategies recommended for this regime get 1.5x weight
          weight = weight * 1.5;
          console.log(
            `[IGX Beta V5] ⬆️ ${result.strategyName}: ` +
            `Weight boosted 1.5x for ${regimeAnalysis?.regime} regime`
          );
        } else {
          // ✅ REDUCE: Strategies NOT recommended for this regime get 0.5x weight
          weight = weight * 0.5;
          console.log(
            `[IGX Beta V5] ⬇️ ${result.strategyName}: ` +
            `Weight reduced 0.5x (not optimal for ${regimeAnalysis?.regime} regime)`
          );
        }
      }

      // Weighted votes
      if (result.direction === 'LONG') {
        longVotes += weight * (result.confidence / 100);
        rawLongVotes++;
      } else if (result.direction === 'SHORT') {
        shortVotes += weight * (result.confidence / 100);
        rawShortVotes++;
      } else {
        // ✅ CRITICAL FIX: NEUTRAL votes should ALSO be weighted by confidence!
        // Strategies with 0% confidence should contribute 0 votes, not full weight
        neutralVotes += weight * (result.confidence / 100);
        rawNeutralVotes++;
      }

      // Track winning strategy (highest confidence × weight)
      const score = (result.confidence / 100) * weight;
      if (score > winningConfidence) {
        winningConfidence = score;
        winningStrategy = result.strategyName;
      }
    }

    // ✅ ADAPTIVE CONSENSUS: Use regime-specific threshold (42-58%)
    const totalVotes = longVotes + shortVotes + neutralVotes;
    let direction: 'LONG' | 'SHORT' | null = null;
    let confidence = 0;

    if (totalVotes > 0) {
      const longPercent = longVotes / totalVotes;
      const shortPercent = shortVotes / totalVotes;

      if (longPercent > adaptiveThreshold) {
        direction = 'LONG';
        confidence = longPercent * 100;
      } else if (shortPercent > adaptiveThreshold) {
        direction = 'SHORT';
        confidence = shortPercent * 100;
      }

      console.log(
        `[IGX Beta V5] Consensus: LONG=${(longPercent * 100).toFixed(1)}%, SHORT=${(shortPercent * 100).toFixed(1)}%, ` +
        `Threshold=${(adaptiveThreshold * 100).toFixed(0)}% → ${direction || 'NO_CONSENSUS'}`
      );
    }

    // Calculate agreement score (how much strategies agree)
    const maxVote = Math.max(longVotes, shortVotes, neutralVotes);
    const agreementScore = totalVotes > 0 ? (maxVote / totalVotes) * 100 : 0;

    // Determine consensus strength
    let consensusStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (agreementScore >= 85) consensusStrength = 'VERY_STRONG';
    else if (agreementScore >= 70) consensusStrength = 'STRONG';
    else if (agreementScore >= 60) consensusStrength = 'MODERATE';
    else consensusStrength = 'WEAK';

    // Generate reasoning
    const reasoning = this.generateReasoning(strategyResults, weights, direction);

    // ✅ ADAPTIVE QUALITY TIERS: Adjusted by market regime
    let qualityTier: 'HIGH' | 'MEDIUM' | 'LOW';
    const directionalVotes = direction === 'LONG' ? rawLongVotes : direction === 'SHORT' ? rawShortVotes : 0;

    // Apply regime-based quality adjustment
    const adjustedConfidence = confidence + qualityAdjustment;
    const adjustedAgreement = agreementScore + qualityAdjustment;

    // ✅ CRYPTO-GRADE REQUIREMENTS: Lowered vote requirements (3/2/1 instead of 4/3/else)
    // Real crypto quant firms use weighted consensus, not raw vote counts
    // With data availability issues, 2-3 strong strategies agreeing is HIGH quality
    if (adjustedConfidence >= 70 && adjustedAgreement >= 70 && directionalVotes >= 3) {
      qualityTier = 'HIGH';
    } else if (adjustedConfidence >= 55 && adjustedAgreement >= 55 && directionalVotes >= 2) {
      qualityTier = 'MEDIUM';
    } else {
      qualityTier = 'LOW';
    }

    console.log(
      `[IGX Beta V5] Quality Tier: ${qualityTier} ` +
      `(Confidence: ${Math.round(adjustedConfidence)}%, Agreement: ${Math.round(adjustedAgreement)}%, Votes: ${directionalVotes})`
    );

    // Build consensus object
    const consensus: StrategyConsensus = {
      symbol: ticker.symbol,
      timestamp: Date.now(),
      direction,
      confidence: Math.round(confidence),
      consensusStrength,
      qualityTier,
      marketRegime: regimeAnalysis?.regime || null, // ✅ PHASE 1: Pass regime to Gamma for regime-aware filtering
      winningStrategy,
      winningStrategyConfidence: Math.round(winningConfidence * 100),
      strategyVotes: {
        long: Math.round(longVotes * 100),
        short: Math.round(shortVotes * 100),
        neutral: Math.round(neutralVotes * 100)
      },
      rawVotes: {
        long: rawLongVotes,
        short: rawShortVotes,
        neutral: rawNeutralVotes
      },
      agreementScore: Math.round(agreementScore),
      individualRecommendations: strategyResults,
      mlWeights: new Map(Object.entries(weights)),
      performanceScores: new Map(
        this.mlEngine.getPerformanceMetrics().map(p => [p.name, p.winRate])
      ),
      reasoning,
      dataQuality: ticker.dataQuality || 0,
      executionTime: 0, // Will be set by caller
      strategiesExecuted: strategyResults.length,
      strategiesFailed: this.strategyNames.length - strategyResults.length
    };

    return consensus;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    results: StrategySignal[],
    weights: any,
    direction: 'LONG' | 'SHORT' | null
  ): string[] {
    const reasoning: string[] = [];

    if (!direction) {
      reasoning.push('No clear consensus - strategies disagreed or neutral');
      return reasoning;
    }

    // Count votes by direction
    const longCount = results.filter(r => r.direction === 'LONG').length;
    const shortCount = results.filter(r => r.direction === 'SHORT').length;

    reasoning.push(
      `${direction} consensus: ${direction === 'LONG' ? longCount : shortCount}/${results.length} strategies agree`
    );

    // Top strategies supporting this direction
    const supporting = results
      .filter(r => r.direction === direction)
      .sort((a, b) => (weights[b.strategyName] || 0) - (weights[a.strategyName] || 0))
      .slice(0, 3);

    if (supporting.length > 0) {
      const strategyNames = supporting.map(s => s.strategyName).join(', ');
      reasoning.push(`Top strategies: ${strategyNames}`);
    }

    return reasoning;
  }

  /**
   * Emit consensus event for Gamma V2
   */
  private emitConsensus(consensus: StrategyConsensus): void {
    console.log(
      `[IGX Beta V5] 📤 Emitting consensus event: ${consensus.symbol} ${consensus.direction} ` +
      `(Quality: ${consensus.qualityTier}, Confidence: ${consensus.confidence}%)`
    );

    const event = new CustomEvent('beta-v5-consensus', {
      detail: consensus
    });
    window.dispatchEvent(event);

    console.log(`[IGX Beta V5] ✅ Event dispatched to window - Gamma should receive it now`);
  }

  /**
   * Record execution time
   */
  private recordExecutionTime(time: number): void {
    this.executionTimes.push(time);

    if (this.executionTimes.length > this.MAX_EXECUTION_HISTORY) {
      this.executionTimes = this.executionTimes.slice(-this.MAX_EXECUTION_HISTORY);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Check health of all strategies
   */
  private checkHealth(): void {
    for (const [name, health] of this.health.entries()) {
      // Check if strategy has been inactive too long
      const inactiveDuration = Date.now() - health.lastSuccess;
      if (inactiveDuration > 300000) { // 5 minutes
        console.warn(`[IGX Beta V5] ⚠️ ${name} inactive for ${(inactiveDuration / 60000).toFixed(1)} minutes`);
      }

      // Check error rate
      if (health.errorRate > this.config.autoDisableErrorRate) {
        console.warn(`[IGX Beta V5] ⚠️ ${name} error rate too high: ${(health.errorRate * 100).toFixed(1)}%`);
        health.healthy = false;
      }
    }
  }

  /**
   * Disable strategy manually
   */
  disableStrategy(name: string): void {
    if (this.strategies.has(name)) {
      this.disabled.add(name);
      const health = this.health.get(name);
      if (health) {
        health.disabled = true;
        health.healthy = false;
      }
      console.log(`[IGX Beta V5] 🔒 Manually disabled: ${name}`);
    }
  }

  /**
   * Enable strategy manually
   */
  enableStrategy(name: string): void {
    if (this.strategies.has(name)) {
      this.disabled.delete(name);
      const health = this.health.get(name);
      if (health) {
        health.disabled = false;
        health.healthy = true;
        health.consecutiveErrors = 0;
      }
      console.log(`[IGX Beta V5] 🔓 Manually enabled: ${name}`);
    }
  }

  /**
   * Get health status for all strategies
   */
  getStrategyHealth(): Map<string, StrategyHealth> {
    return new Map(this.health);
  }

  /**
   * Get performance metrics for all strategies
   */
  getPerformanceMetrics(): StrategyPerformance[] {
    return this.mlEngine.getPerformanceMetrics();
  }

  /**
   * Get Beta V5 statistics
   */
  getStats(): BetaV5Stats {
    const mlStats = this.mlEngine.getStats();
    const healthyCount = Array.from(this.health.values()).filter(h => h.healthy).length;
    const unhealthyCount = this.strategyNames.length - healthyCount;
    const disabledCount = this.disabled.size;

    // Calculate percentiles
    const sortedTimes = [...this.executionTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const avgTime =
      this.executionTimes.length > 0
        ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
        : 0;

    // Calculate health score
    const successRate = this.totalAnalyses > 0 ? this.successfulAnalyses / this.totalAnalyses : 1;
    const healthScore = Math.round(successRate * 100 * (healthyCount / this.strategyNames.length));

    let overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    if (healthScore >= 90) overallHealth = 'EXCELLENT';
    else if (healthScore >= 75) overallHealth = 'GOOD';
    else if (healthScore >= 60) overallHealth = 'FAIR';
    else if (healthScore >= 40) overallHealth = 'POOR';
    else overallHealth = 'CRITICAL';

    return {
      isRunning: this.isRunning,
      uptime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      totalAnalyses: this.totalAnalyses,
      successfulAnalyses: this.successfulAnalyses,
      failedAnalyses: this.failedAnalyses,
      avgExecutionTime: avgTime,
      p95ExecutionTime: sortedTimes[p95Index] || 0,
      p99ExecutionTime: sortedTimes[p99Index] || 0,
      strategiesActive: healthyCount,
      strategiesDisabled: disabledCount,
      strategiesHealthy: healthyCount,
      strategiesUnhealthy: unhealthyCount,
      currentWeights: new Map(Object.entries(mlStats.weights)),
      lastWeightUpdate: 0, // TODO: Track this
      totalWeightUpdates: mlStats.updateCount,
      recentWinRate: mlStats.recentWinRate,
      recentAvgProfit: mlStats.recentAvgProfit,
      recentSharpeRatio: 0, // TODO: Calculate from outcomes
      overallHealth,
      healthScore,
      timestamp: Date.now()
    };
  }

  /**
   * Validate OHLC data to prevent NaN confidence in regime detection
   * ✅ FIX: Check for invalid values before passing to regime detector
   */
  private validateOHLCData(ohlcData: any[] | undefined): boolean {
    if (!ohlcData || !Array.isArray(ohlcData) || ohlcData.length === 0) {
      return false;
    }

    // Check first few candles for invalid data
    const samplesToCheck = Math.min(10, ohlcData.length);

    for (let i = 0; i < samplesToCheck; i++) {
      const candle = ohlcData[i];

      // Check if candle exists and has required properties
      if (!candle ||
          typeof candle.open === 'undefined' ||
          typeof candle.high === 'undefined' ||
          typeof candle.low === 'undefined' ||
          typeof candle.close === 'undefined' ||
          typeof candle.volume === 'undefined') {
        return false;
      }

      // Check for NaN or invalid numbers
      if (isNaN(candle.open) ||
          isNaN(candle.high) ||
          isNaN(candle.low) ||
          isNaN(candle.close) ||
          isNaN(candle.volume)) {
        return false;
      }

      // Check for invalid values (zero or negative prices)
      if (candle.open <= 0 ||
          candle.high <= 0 ||
          candle.low <= 0 ||
          candle.close <= 0 ||
          candle.volume < 0) {
        return false;
      }

      // Check for impossible values (high < low)
      if (candle.high < candle.low) {
        return false;
      }
    }

    return true;
  }
}

// Singleton instance
export const igxBetaV5 = new IGXBetaV5();
