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
import { advancedRejectionFilter } from '../AdvancedRejectionFilter';
import { signalDeduplicationCache } from '../SignalDeduplicationCache';

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

  // ✅ P0.1: INSTITUTIONAL-GRADE DEDUPLICATION
  // Callback to get active signals from globalHubService (one signal per coin discipline)
  private getActiveSignals: (() => any[]) | null = null;

  // ✅ CONFIGURABLE TIER FILTERING
  // Beta V5 only generates: HIGH, MEDIUM, LOW (no PREMIUM tier exists)
  private tierConfig = {
    acceptHigh: true,    // Default: accept HIGH tier signals
    acceptMedium: true,  // Default: accept MEDIUM tier signals (changed to true)
    acceptLow: true,     // ✅ TESTING: Accept LOW tier for signal flow (was always rejected)
    highPriority: 'HIGH' as 'HIGH' | 'MEDIUM' // Priority for HIGH tier signals
  };

  constructor() {
    console.log('[IGX Gamma V2] 🎯 Initialized - Adaptive Market Condition Matcher');
    this.loadTierConfig();
  }

  /**
   * ✅ P0.1: Set active signals provider for deduplication
   * Called by globalHubService to enable "one signal per coin" enforcement
   */
  setActiveSignalsProvider(provider: () => any[]): void {
    this.getActiveSignals = provider;
    console.log('[IGX Gamma V2] 🔒 Deduplication enabled - One signal per coin enforced');
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
      
      // ✅ LOG REJECTION WITH ADVANCED ML FILTER
      advancedRejectionFilter.filterAndLog({
        symbol: consensus.symbol,
        direction: consensus.direction || 'NEUTRAL',
        rejectionStage: 'GAMMA',
        rejectionReason: decision.reason || 'Failed market condition matching',
        qualityScore: consensus.dataQuality,
        confidenceScore: consensus.confidence,
        dataQuality: consensus.dataQuality,
        strategyVotes: consensus.individualRecommendations,
        marketRegime: decision.marketCondition.regime,
        volatility: decision.dataMetrics.volatility * 100
      });
    }
  }

  /**
   * Main matching logic: Determine if signal quality matches current market conditions
   */
  matchToMarketConditions(consensus: StrategyConsensus): GammaFilterDecision {
    const startTime = performance.now();
    this.stats.totalProcessed++;

    // ✅ SMART DEDUPLICATION CHECK (2-hour rolling window)
    // Prevents same coin+direction within 2 hours, allows different directions
    // Example: BTC LONG blocked for 2h, but BTC SHORT allowed immediately
    const isDuplicate = signalDeduplicationCache.isDuplicate(
      consensus.symbol,
      consensus.direction
    );

    if (isDuplicate) {
      const timeRemaining = signalDeduplicationCache.getTimeRemainingFormatted(
        consensus.symbol,
        consensus.direction
      );

      const reason = `DUPLICATE REJECTED: ${consensus.symbol} ${consensus.direction} ` +
        `already sent within last 2 hours (${timeRemaining} remaining)`;

      this.stats.totalRejected++;
      const rejectionKey = '2-Hour Duplicate (Same Coin+Direction)';
      this.stats.rejectionReasons.set(
        rejectionKey,
        (this.stats.rejectionReasons.get(rejectionKey) || 0) + 1
      );

      console.log(
        `\n[IGX Gamma V2] 🔒 DUPLICATE REJECTED: ${consensus.symbol} ${consensus.direction}\n` +
        `├─ Time Remaining: ${timeRemaining}\n` +
        `├─ Different Direction: ${consensus.direction === 'LONG' ? 'SHORT' : 'LONG'} would be allowed ✅\n` +
        `├─ Rule: ONE SIGNAL PER COIN+DIRECTION per 2 hours\n` +
        `└─ Confidence: ${consensus.confidence}% (Quality: ${consensus.qualityTier})\n`
      );

      const marketCondition = this.alphaMarketCondition || this.getDefaultMarketCondition();
      const dataMetrics = this.dataEngineMetrics || this.getDefaultDataMetrics();

      return {
        passed: false,
        priority: 'REJECT',
        reason,
        consensus,
        marketCondition,
        dataMetrics,
        timestamp: Date.now()
      };
    }

    console.log(
      `\n[IGX Gamma V2] 🧪 COMPLETE BYPASS MODE: ${consensus.symbol} ${consensus.direction} ` +
      `(Quality Tier: ${consensus.qualityTier}, Confidence: ${consensus.confidence}%)`
    );

    // Default to moderate conditions if no market data yet
    const marketCondition = this.alphaMarketCondition || this.getDefaultMarketCondition();
    const dataMetrics = this.dataEngineMetrics || this.getDefaultDataMetrics();

    // ✅ SIMPLIFIED TIER-BASED FILTERING - Trust Beta's consensus, focus on deduplication
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[IGX Gamma V2] 📊 EVALUATING: ${consensus.symbol} ${consensus.direction}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏆 Quality Tier: ${consensus.qualityTier}`);
    console.log(`📈 Confidence: ${consensus.confidence}%`);
    console.log(`⚙️  Tier Config: HIGH=${this.tierConfig.acceptHigh}, MEDIUM=${this.tierConfig.acceptMedium}, LOW=${this.tierConfig.acceptLow}`);

    let passed = false;
    let priority: 'HIGH' | 'MEDIUM' | 'REJECT' = 'REJECT';
    let reason = '';

    // Simplified tier-based filtering (Beta V5 only generates: HIGH, MEDIUM, LOW)
    if (consensus.qualityTier === 'HIGH' && this.tierConfig.acceptHigh) {
      passed = true;
      priority = this.tierConfig.highPriority;
      reason = `HIGH tier (${consensus.confidence}% confidence) - Priority: ${priority}`;
      console.log(`✅ PASS: ${reason}`);
    } else if (consensus.qualityTier === 'MEDIUM' && this.tierConfig.acceptMedium) {
      passed = true;
      priority = 'MEDIUM';
      reason = `MEDIUM tier (${consensus.confidence}% confidence)`;
      console.log(`✅ PASS: ${reason}`);
    } else if (consensus.qualityTier === 'LOW' && this.tierConfig.acceptLow) {
      passed = true;
      priority = 'MEDIUM'; // Treat LOW as MEDIUM priority for now
      reason = `LOW tier accepted for testing (${consensus.confidence}% confidence)`;
      console.log(`✅ PASS: ${reason}`);
    } else if (consensus.qualityTier === 'LOW' && !this.tierConfig.acceptLow) {
      passed = false;
      priority = 'REJECT';
      reason = `LOW tier disabled in config`;
      console.log(`❌ REJECT: ${reason}`);
    } else if (consensus.qualityTier === 'HIGH' && !this.tierConfig.acceptHigh) {
      passed = false;
      priority = 'REJECT';
      reason = `HIGH tier disabled in config`;
      console.log(`❌ REJECT: ${reason} (Enable in Control Center)`);
    } else if (consensus.qualityTier === 'MEDIUM' && !this.tierConfig.acceptMedium) {
      passed = false;
      priority = 'REJECT';
      reason = `MEDIUM tier disabled in config`;
      console.log(`❌ REJECT: ${reason} (Enable in Control Center)`);
    } else {
      passed = false;
      priority = 'REJECT';
      reason = `Unknown quality tier: ${consensus.qualityTier}`;
      console.log(`❌ REJECT: ${reason}`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
      console.log(`[IGX Gamma V2] ❌ REJECTED: ${reason} (confidence: ${consensus.confidence}%)`);
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

    // ✅ RECORD APPROVED SIGNAL IN DEDUP CACHE (if passed)
    // This prevents duplicate signals for same coin+direction within 2 hours
    if (passed) {
      signalDeduplicationCache.recordSignal(consensus.symbol, consensus.direction);
      console.log(
        `[IGX Gamma V2] 📝 Signal recorded in dedup cache: ${consensus.symbol} ${consensus.direction} ` +
        `(valid until ${new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()})`
      );
    }

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

  /**
   * Load tier configuration from localStorage
   */
  private loadTierConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('igx_gamma_tier_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.tierConfig = { ...this.tierConfig, ...parsed };
          console.log('[IGX Gamma V2] 📂 Loaded tier config from localStorage:', this.tierConfig);
        }
      } catch (error) {
        console.warn('[IGX Gamma V2] Could not load tier config:', error);
      }
    }
  }

  /**
   * Get current tier configuration
   */
  getTierConfig() {
    return { ...this.tierConfig };
  }

  /**
   * Update tier configuration
   */
  setTierConfig(config: Partial<typeof this.tierConfig>): void {
    this.tierConfig = { ...this.tierConfig, ...config };

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('igx_gamma_tier_config', JSON.stringify(this.tierConfig));
        console.log('[IGX Gamma V2] 💾 Tier config saved:', this.tierConfig);
      } catch (error) {
        console.warn('[IGX Gamma V2] Could not save tier config:', error);
      }
    }
  }
}

// Singleton instance
export const igxGammaV2 = new IGXGammaV2();
