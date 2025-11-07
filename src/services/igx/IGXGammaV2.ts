/**
 * IGX GAMMA V2 - ADAPTIVE MARKET CONDITION MATCHER
 * Intelligent gatekeeper that dynamically filters signals based on real-time market conditions
 *
 * NEW PURPOSE: Match signal quality tiers to current market conditions
 *
 * ARCHITECTURE:
 * Data Engine V4 (volatility, liquidity) ↔ GAMMA V2 (market matcher) ↔ Alpha V3 (regime, confidence)
 *                                                  ↑
 *                                             BETA V5 (quality tier)
 *                                                  ↓
 *                                          PRIORITY QUEUE (HIGH/MEDIUM)
 *                                                  ↓
 *                                             DELTA V2 (ML filter)
 *
 * RESPONSIBILITIES:
 * 1. Subscribe to Alpha V3 regime updates (market conditions)
 * 2. Subscribe to Data Engine metrics (volatility, liquidity)
 * 3. Receive Beta V5 consensus with quality tier
 * 4. Apply adaptive filtering rules:
 *    - High volatility → Only HIGH quality passes
 *    - Low volatility + strong trend → HIGH & MEDIUM pass
 *    - Uncertain regime → Only HIGH quality passes
 *    - Clear conditions + low volatility → HIGH & MEDIUM pass
 * 5. Emit filtered signals with priority to queue
 *
 * This creates an intelligent adaptive system that adjusts filtering based on market state
 */

import type { StrategyConsensus } from './interfaces/StrategyConsensus';
import { rejectionLogger } from '../RejectionLoggerService';

/**
 * Market condition data from Alpha V3
 */
export interface AlphaMarketCondition {
  regime: 'BULLISH_TREND' | 'BEARISH_TREND' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
  confidence: number; // 0-100
  trend: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
  momentum: 'ACCELERATING' | 'STEADY' | 'DECELERATING';
  timestamp: number;
}

/**
 * Data Engine metrics
 */
export interface DataEngineMetrics {
  volatility: number; // 0-1 (0.05 = 5%)
  liquidity: number; // 0-100 score
  dataQuality: number; // 0-100 score
  spread: number; // bid-ask spread %
  timestamp: number;
}

/**
 * Filtering decision
 */
export interface GammaFilterDecision {
  passed: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'REJECT';
  reason: string;
  consensus: StrategyConsensus;
  marketCondition: AlphaMarketCondition;
  dataMetrics: DataEngineMetrics;
  timestamp: number;
}

/**
 * Gamma V2 statistics
 */
export interface GammaV2Stats {
  isRunning: boolean;
  uptime: number;

  // Filtering stats
  totalProcessed: number;
  highPriorityPassed: number;
  mediumPriorityPassed: number;
  totalRejected: number;

  // Rejection breakdown
  rejectionReasons: Map<string, number>;

  // Current state
  currentMarketCondition: AlphaMarketCondition | null;
  currentDataMetrics: DataEngineMetrics | null;

  // Performance
  avgProcessingTime: number;

  timestamp: number;
}

export class IGXGammaV2 {
  private stats: GammaV2Stats = {
    isRunning: false,
    uptime: 0,
    totalProcessed: 0,
    highPriorityPassed: 0,
    mediumPriorityPassed: 0,
    totalRejected: 0,
    rejectionReasons: new Map(),
    currentMarketCondition: null,
    currentDataMetrics: null,
    avgProcessingTime: 0,
    timestamp: Date.now()
  };

  private startTime = 0;
  private processingTimes: number[] = [];
  private readonly MAX_PROCESSING_HISTORY = 100;

  // Current market state (updated by Alpha and Data Engine)
  private alphaMarketCondition: AlphaMarketCondition | null = null;
  private dataEngineMetrics: DataEngineMetrics | null = null;

  constructor() {
    console.log('[IGX Gamma V2] 🎯 Initialized - Adaptive Market Condition Matcher');
  }

  /**
   * Start Gamma V2
   */
  start(): void {
    if (this.stats.isRunning) {
      console.warn('[IGX Gamma V2] Already running');
      return;
    }

    this.stats.isRunning = true;
    this.startTime = Date.now();

    // Listen for Beta V5 consensus events
    window.addEventListener('beta-v5-consensus', this.handleBetaConsensus.bind(this));

    // Listen for Alpha regime updates
    window.addEventListener('alpha-regime-update', this.handleAlphaRegimeUpdate.bind(this));

    // Listen for Data Engine metrics
    window.addEventListener('data-engine-metrics', this.handleDataEngineMetrics.bind(this));

    console.log('[IGX Gamma V2] ✅ Started - Listening for market conditions and Beta consensus');
    console.log('[IGX Gamma V2] 📊 Adaptive filtering: Quality tier + Market conditions');
  }

  /**
   * Stop Gamma V2
   */
  stop(): void {
    this.stats.isRunning = false;
    window.removeEventListener('beta-v5-consensus', this.handleBetaConsensus.bind(this));
    window.removeEventListener('alpha-regime-update', this.handleAlphaRegimeUpdate.bind(this));
    window.removeEventListener('data-engine-metrics', this.handleDataEngineMetrics.bind(this));
    console.log('[IGX Gamma V2] ⏹️ Stopped');
  }

  /**
   * Handle Alpha regime update
   */
  private handleAlphaRegimeUpdate(event: CustomEvent): void {
    this.alphaMarketCondition = event.detail;
    this.stats.currentMarketCondition = this.alphaMarketCondition;
    console.log(
      `[IGX Gamma V2] 📊 Alpha Update: ${this.alphaMarketCondition.regime} ` +
      `(Confidence: ${this.alphaMarketCondition.confidence}%, Trend: ${this.alphaMarketCondition.trend})`
    );
  }

  /**
   * Handle Data Engine metrics update
   */
  private handleDataEngineMetrics(event: CustomEvent): void {
    this.dataEngineMetrics = event.detail;
    this.stats.currentDataMetrics = this.dataEngineMetrics;
    console.log(
      `[IGX Gamma V2] 📈 Data Engine Update: Volatility ${(this.dataEngineMetrics.volatility * 100).toFixed(2)}%, ` +
      `Liquidity ${this.dataEngineMetrics.liquidity.toFixed(0)}`
    );
  }

  /**
   * Handle Beta V5 consensus event
   */
  private handleBetaConsensus(event: CustomEvent): void {
    const consensus: StrategyConsensus = event.detail;

    console.log(`[IGX Gamma V2] 📥 Received Beta consensus event: ${consensus.symbol} ${consensus.direction}`);

    if (!consensus.direction) {
      // Beta already rejected (no direction) - early exit before Gamma
      console.log(`[IGX Gamma V2] ⚠️ Skipping - no direction (Beta rejection)`);
      return;
    }

    const decision = this.matchToMarketConditions(consensus);

    if (decision.passed) {
      // Emit filtered signal with priority
      this.emitFilteredSignal(decision);
    } else {
      console.log(`[IGX Gamma V2] ❌ Signal rejected - will NOT emit to queue`);
      
      // ✅ LOG REJECTION
      rejectionLogger.logRejection({
        symbol: consensus.symbol,
        direction: consensus.direction || 'NEUTRAL',
        rejectionStage: 'GAMMA',
        rejectionReason: decision.reason || 'Failed market condition matching',
        qualityScore: consensus.dataQuality,
        confidenceScore: consensus.confidence,
        dataQuality: consensus.dataQuality,
        strategyVotes: Array.from(consensus.individualRecommendations || []),
        marketRegime: consensus.marketRegime || undefined
      });
    }
  }

  /**
   * Main matching logic: Determine if signal quality matches current market conditions
   */
  matchToMarketConditions(consensus: StrategyConsensus): GammaFilterDecision {
    const startTime = performance.now();
    this.stats.totalProcessed++;

    console.log(
      `\n[IGX Gamma V2] 🎯 Matching: ${consensus.symbol} ${consensus.direction} ` +
      `(Quality Tier: ${consensus.qualityTier}, Confidence: ${consensus.confidence}%)`
    );

    // Default to moderate conditions if no market data yet
    const marketCondition = this.alphaMarketCondition || this.getDefaultMarketCondition();
    const dataMetrics = this.dataEngineMetrics || this.getDefaultDataMetrics();

    let passed = false;
    let priority: 'HIGH' | 'MEDIUM' | 'REJECT' = 'REJECT';
    let reason = '';

    // ADAPTIVE FILTERING RULES

    // ✅ PHASE 1: Rule 0 - REGIME-AWARE QUALITY FILTERING (Highest Priority)
    // Use Beta's market regime detection for intelligent quality acceptance
    const betaRegime = consensus.marketRegime;

    if (betaRegime) {
      // 📊 ACCUMULATION/RANGE MARKETS → Accept HIGH + MEDIUM quality
      // These are consolidation markets where MEDIUM quality signals are appropriate
      if (betaRegime === 'ACCUMULATION' || betaRegime === 'BULL_RANGE' || betaRegime === 'BEAR_RANGE') {
        if (consensus.qualityTier === 'HIGH') {
          passed = true;
          priority = 'HIGH';
          reason = `HIGH quality + ${betaRegime} market → HIGH priority (regime-aware)`;
        } else if (consensus.qualityTier === 'MEDIUM' && consensus.confidence >= 50) {
          passed = true;
          priority = 'MEDIUM';
          reason = `MEDIUM quality + ${betaRegime} market → MEDIUM priority (regime-aware filtering)`;
        } else if (consensus.qualityTier === 'MEDIUM') {
          reason = `Rejected MEDIUM quality: Confidence ${consensus.confidence}% too low (need 50%+ in ${betaRegime})`;
        } else {
          reason = `Rejected LOW quality: ${betaRegime} market accepts HIGH/MEDIUM only`;
        }

        console.log(`[IGX Gamma V2] 🎯 Regime-Aware Filter: ${betaRegime} | Accepting: HIGH, MEDIUM (50%+)`);
      }
      // 🚀 TRENDING MARKETS → Only HIGH quality passes
      // Strong trends need highest confidence signals
      else if (betaRegime === 'BULL_MOMENTUM' || betaRegime === 'BEAR_MOMENTUM' || betaRegime === 'VOLATILE_BREAKOUT') {
        if (consensus.qualityTier === 'HIGH') {
          passed = true;
          priority = 'HIGH';
          reason = `HIGH quality + ${betaRegime} market → HIGH priority (strong trend requires HIGH quality)`;
        } else {
          reason = `Rejected ${consensus.qualityTier} quality: ${betaRegime} requires HIGH quality (strong directional market)`;
        }

        console.log(`[IGX Gamma V2] 🎯 Regime-Aware Filter: ${betaRegime} | Accepting: HIGH only`);
      }
      // 🌊 CHOPPY MARKETS → Only HIGH quality passes
      // Choppy markets are dangerous, need highest confidence
      else if (betaRegime === 'CHOPPY') {
        if (consensus.qualityTier === 'HIGH') {
          passed = true;
          priority = 'HIGH';
          reason = `HIGH quality + ${betaRegime} market → HIGH priority (choppy market requires HIGH quality)`;
        } else {
          reason = `Rejected ${consensus.qualityTier} quality: ${betaRegime} is dangerous, requires HIGH quality`;
        }

        console.log(`[IGX Gamma V2] 🎯 Regime-Aware Filter: ${betaRegime} | Accepting: HIGH only (dangerous conditions)`);
      }
    }

    // If regime-based rule made a decision, skip volatility-based rules
    // Otherwise, fall through to existing volatility-based rules as backup
    if (!passed && betaRegime) {
      // Regime-based rejection is final - no fallback to volatility rules
      console.log(`[IGX Gamma V2] ❌ Regime-based rejection: ${reason}`);
    }
    // Rule 1: HIGH volatility → Only HIGH quality passes (BACKUP if no regime data)
    else if (dataMetrics.volatility > 0.05) {
      if (consensus.qualityTier === 'HIGH') {
        passed = true;
        priority = 'HIGH';
        reason = 'HIGH quality + High volatility market → HIGH priority';
      } else {
        reason = `Rejected ${consensus.qualityTier} quality: High volatility (${(dataMetrics.volatility * 100).toFixed(1)}%) requires HIGH quality`;
      }
    }
    // Rule 2: Uncertain regime (low confidence) → Only HIGH quality
    else if (marketCondition.confidence < 60) {
      if (consensus.qualityTier === 'HIGH') {
        passed = true;
        priority = 'HIGH';
        reason = 'HIGH quality + Uncertain regime → HIGH priority';
      } else {
        reason = `Rejected ${consensus.qualityTier} quality: Uncertain regime (${marketCondition.confidence}% confidence) requires HIGH quality`;
      }
    }
    // Rule 3: LOW volatility + STRONG trend → HIGH & MEDIUM pass, LOW gets chance
    else if (dataMetrics.volatility < 0.02 && marketCondition.trend === 'STRONG') {
      if (consensus.qualityTier === 'HIGH') {
        passed = true;
        priority = 'HIGH';
        reason = 'HIGH quality + Low vol + Strong trend → HIGH priority';
      } else if (consensus.qualityTier === 'MEDIUM') {
        passed = true;
        priority = 'MEDIUM';
        reason = 'MEDIUM quality + Low vol + Strong trend → MEDIUM priority';
      } else if (consensus.confidence >= 55) {
        // ✅ Give LOW quality a chance in VERY favorable conditions if confidence is decent
        passed = true;
        priority = 'MEDIUM';
        reason = 'LOW quality BUT favorable conditions (low vol + strong trend) + decent confidence → MEDIUM priority';
      } else {
        reason = 'Rejected LOW quality: Confidence too low even in favorable conditions';
      }
    }
    // Rule 4: Moderate volatility + Moderate/Strong trend → HIGH & MEDIUM pass, LOW might pass
    else if (dataMetrics.volatility >= 0.02 && dataMetrics.volatility <= 0.05 &&
             (marketCondition.trend === 'STRONG' || marketCondition.trend === 'MODERATE')) {
      if (consensus.qualityTier === 'HIGH') {
        passed = true;
        priority = 'HIGH';
        reason = 'HIGH quality + Moderate conditions → HIGH priority';
      } else if (consensus.qualityTier === 'MEDIUM') {
        passed = true;
        priority = 'MEDIUM';
        reason = 'MEDIUM quality + Moderate conditions → MEDIUM priority';
      } else if (consensus.confidence >= 50 && marketCondition.trend === 'STRONG') {
        // ✅ LOW quality gets chance in moderate conditions IF strong trend + decent confidence
        passed = true;
        priority = 'MEDIUM';
        reason = 'LOW quality BUT strong trend + moderate vol + decent confidence → MEDIUM priority';
      } else {
        reason = 'Rejected LOW quality: Insufficient confidence or weak trend';
      }
    }
    // Rule 5: Default - Only HIGH quality in unclear conditions
    else {
      if (consensus.qualityTier === 'HIGH') {
        passed = true;
        priority = 'HIGH';
        reason = 'HIGH quality → HIGH priority (default filtering)';
      } else {
        reason = `Rejected ${consensus.qualityTier} quality: Default requires HIGH quality`;
      }
    }

    // Record stats
    if (passed) {
      if (priority === 'HIGH') {
        this.stats.highPriorityPassed++;
      } else {
        this.stats.mediumPriorityPassed++;
      }
      console.log(`[IGX Gamma V2] ✅ PASSED: ${priority} priority - ${reason}`);
    } else {
      this.stats.totalRejected++;
      const rejectionCount = this.stats.rejectionReasons.get(reason) || 0;
      this.stats.rejectionReasons.set(reason, rejectionCount + 1);
      console.log(`[IGX Gamma V2] ❌ REJECTED: ${reason}`);
    }

    // Record processing time
    const processingTime = performance.now() - startTime;
    this.recordProcessingTime(processingTime);

    const decision: GammaFilterDecision = {
      passed,
      priority,
      reason,
      consensus,
      marketCondition,
      dataMetrics,
      timestamp: Date.now()
    };

    return decision;
  }

  /**
   * Emit filtered signal with priority
   */
  private emitFilteredSignal(decision: GammaFilterDecision): void {
    const event = new CustomEvent('gamma-filtered-signal', {
      detail: decision
    });
    window.dispatchEvent(event);

    console.log(
      `[IGX Gamma V2] 🚀 Emitting: ${decision.consensus.symbol} ${decision.consensus.direction} ` +
      `with ${decision.priority} priority`
    );
  }

  /**
   * Record processing time
   */
  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time);

    if (this.processingTimes.length > this.MAX_PROCESSING_HISTORY) {
      this.processingTimes = this.processingTimes.slice(-this.MAX_PROCESSING_HISTORY);
    }

    this.stats.avgProcessingTime =
      this.processingTimes.reduce((sum, t) => sum + t, 0) / this.processingTimes.length;
  }

  /**
   * Get default market condition (if Alpha hasn't provided data yet)
   */
  private getDefaultMarketCondition(): AlphaMarketCondition {
    return {
      regime: 'SIDEWAYS',
      confidence: 50,
      trend: 'MODERATE',
      momentum: 'STEADY',
      timestamp: Date.now()
    };
  }

  /**
   * Get default data metrics (if Data Engine hasn't provided data yet)
   */
  private getDefaultDataMetrics(): DataEngineMetrics {
    return {
      volatility: 0.03, // 3% default volatility
      liquidity: 70,
      dataQuality: 80,
      spread: 0.1,
      timestamp: Date.now()
    };
  }

  /**
   * Get statistics
   */
  getStats(): GammaV2Stats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      rejectionReasons: new Map(this.stats.rejectionReasons),
      timestamp: Date.now()
    };
  }

  /**
   * Manual method for testing/debugging
   */
  testMatch(consensus: StrategyConsensus): GammaFilterDecision {
    return this.matchToMarketConditions(consensus);
  }
}

// Singleton instance
export const igxGammaV2 = new IGXGammaV2();
