/**
 * IGX Enhanced System - TypeScript Interfaces
 * Advanced goal-oriented signal generation system
 */

// ============================================================================
// MARKET CONDITION ANALYSIS
// ============================================================================

export interface MarketMetrics {
  volatilityScore: number;      // 0-100: Price velocity + range
  volumeScore: number;           // 0-100: Volume change + distribution
  sentimentScore: number;        // 0-100: Fear & Greed Index
  whaleScore: number;            // 0-100: Accumulation/Distribution
  fundingScore: number;          // 0-100: Perpetual contract pressure
  orderbookScore: number;        // 0-100: Buy/sell imbalance
  qualityScore: number;          // 0-100: Data reliability
  compositeScore: number;        // 0-100: Weighted average
  timestamp: number;
}

export type MarketRegime =
  | 'BULL_TRENDING'      // Strong uptrend
  | 'BEAR_TRENDING'      // Strong downtrend
  | 'RANGING'            // Sideways movement
  | 'HIGH_VOLATILITY'    // Extreme price swings
  | 'LOW_VOLATILITY'     // Stable, low movement
  | 'UNKNOWN';           // Insufficient data

export interface RegimeCharacteristics {
  regime: MarketRegime;
  confidence: number;              // 0-100: How confident we are
  duration: number;                // How long in this regime (ms)
  expectedDuration: number;        // Expected remaining duration (ms)
  description: string;             // Human-readable description
}

// ============================================================================
// STATISTICAL THRESHOLD CALCULATION
// ============================================================================

export interface ThresholdWindow {
  period: '7d' | '30d' | '90d';
  mean: number;
  median: number;
  stdDev: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  sampleSize: number;
}

export interface DynamicThreshold {
  metric: string;                  // e.g., "patternStrength"
  baseValue: number;               // Static baseline
  adjustedValue: number;           // Dynamic value after adjustments
  stdDevMultiplier: number;        // How many std devs to add
  marketConditionMultiplier: number; // Market-based adjustment
  regimeMultiplier: number;        // Regime-based adjustment
  goalProgressMultiplier: number;  // Goal-based adjustment
  finalValue: number;              // Composite final threshold
  windows: {
    short: ThresholdWindow;        // 7 days
    medium: ThresholdWindow;       // 30 days
    long: ThresholdWindow;         // 90 days
  };
  lastUpdated: number;
}

export interface ThresholdSet {
  patternStrength: DynamicThreshold;
  consensusThreshold: DynamicThreshold;
  riskReward: DynamicThreshold;
  liquidityMin: DynamicThreshold;
  dataQualityMin: DynamicThreshold;
  timestamp: number;
}

// ============================================================================
// GOAL ACHIEVEMENT SYSTEM
// ============================================================================

export interface MonthlyTarget {
  targetReturn: number;            // Target % (25)
  currentReturn: number;           // Actual % so far
  daysElapsed: number;             // Days since month start
  daysRemaining: number;           // Days until month end
  requiredDailyReturn: number;     // What we need per day
  actualDailyReturn: number;       // What we're averaging
  onTrack: boolean;                // Are we on pace?
  deviation: number;               // % ahead/behind
  projectedReturn: number;         // Where we'll end if trend continues
  confidence: number;              // 0-100: How confident in projection
  timestamp: number;
}

export interface WeeklyCheckpoint {
  week: number;                    // Week number (1-5)
  targetReturn: number;            // Target for this week
  actualReturn: number;            // Actual for this week
  passed: boolean;                 // Did we meet target?
  adjustment: 'NONE' | 'MINOR' | 'MODERATE' | 'AGGRESSIVE';
}

export interface DailyPerformance {
  date: string;                    // YYYY-MM-DD
  trades: number;                  // Trades taken
  wins: number;                    // Winning trades
  losses: number;                  // Losing trades
  winRate: number;                 // Win percentage
  profit: number;                  // Net profit %
  returnOnDay: number;             // % return for the day
  cumulativeReturn: number;        // Running total
}

export interface GoalProgress {
  monthly: MonthlyTarget;
  weekly: WeeklyCheckpoint[];
  daily: DailyPerformance[];
  lastUpdated: number;
}

// ============================================================================
// ALPHA → GAMMA COMMUNICATION
// ============================================================================

export type GammaMode = 'FLOOD' | 'SELECTIVE' | 'STRICT';

export interface GammaCommand {
  mode: GammaMode;
  adjustments: {
    patternStrengthMultiplier: number;     // 0.7 - 1.3
    consensusThresholdAdjust: number;      // -10% to +10%
    riskRewardMultiplier: number;          // 0.8 - 1.2
    maxSignalsPerSector: number;           // 3 - 7
    dedupWindowMinutes: number;            // 60 - 180
  };
  reason: string;                          // Human-readable explanation
  duration: number;                        // How long to maintain (ms)
  expiresAt: number;                       // Timestamp when to revert
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issuedBy: 'ALPHA_MODEL' | 'MANUAL' | 'EMERGENCY';
  timestamp: number;
}

export interface GammaStats {
  currentMode: GammaMode;
  passRate: number;                        // % of signals approved
  approvedToday: number;                   // Count of approved signals
  rejectedToday: number;                   // Count of rejected signals
  averageQualityScore: number;             // 0-100: Average quality
  estimatedSignalsPerDay: number;          // Projected daily output
  rejectionReasons: Map<string, number>;   // Reason → count
  activeCommand: GammaCommand | null;      // Current command
  lastUpdated: number;
}

// ============================================================================
// ALPHA MODEL V2 CONFIGURATION
// ============================================================================

export type AlphaModeV2 = 'ULTRA_QUALITY' | 'HIGH_QUALITY' | 'BALANCED' | 'VOLUME' | 'FLOOD';

export interface AlphaStrategyV2 {
  mode: AlphaModeV2;
  thresholds: {
    patternStrength: number;
    consensusThreshold: number;
    riskReward: number;
    liquidityMin: number;
    dataQualityMin: number;
  };
  targets: {
    signalsPerDay: number;
    minWinRate: number;
    targetReturnPerTrade: number;
  };
  gammaCommand: GammaMode;
  description: string;
}

export interface AlphaDecision {
  mode: AlphaModeV2;
  reasoning: string[];                     // Why this mode was chosen
  thresholds: ThresholdSet;                // Dynamic thresholds
  gammaCommand: GammaCommand;              // Command to Gamma
  marketCondition: MarketMetrics;          // Current market state
  goalProgress: GoalProgress;              // Goal tracking
  confidence: number;                      // 0-100: Decision confidence
  validUntil: number;                      // When to re-evaluate
  timestamp: number;
}

export interface AlphaPerformance {
  totalDecisions: number;
  modeHistory: Array<{
    mode: AlphaModeV2;
    startTime: number;
    endTime: number;
    tradesGenerated: number;
    winRate: number;
    profitGenerated: number;
  }>;
  averageDecisionLatency: number;          // ms
  thresholdAdjustments: number;            // Count
  gammaCommandsIssued: number;             // Count
  goalsMet: number;                        // Count of successful months
  goalsMissed: number;                     // Count of failed months
}

// ============================================================================
// EVENT SYSTEM
// ============================================================================

export interface AlphaEvent {
  type: 'DECISION_MADE' | 'MODE_CHANGED' | 'THRESHOLD_ADJUSTED' | 'COMMAND_ISSUED';
  data: AlphaDecision | GammaCommand | ThresholdSet;
  timestamp: number;
}

export interface GammaEvent {
  type: 'COMMAND_RECEIVED' | 'MODE_CHANGED' | 'STATS_UPDATE';
  data: GammaCommand | GammaStats;
  timestamp: number;
}

export interface MarketEvent {
  type: 'MARKET_UPDATE' | 'REGIME_CHANGE';
  data: MarketMetrics | RegimeCharacteristics;
  timestamp: number;
}

// ============================================================================
// SYSTEM STATUS
// ============================================================================

export interface IGXSystemStatus {
  dataEngine: {
    status: 'RUNNING' | 'STOPPED' | 'ERROR';
    sourcesActive: number;
    sourcesTotal: number;
    dataQuality: number;
    uptime: number;
  };
  alphaModel: {
    status: 'RUNNING' | 'STOPPED' | 'ERROR';
    currentMode: AlphaModeV2;
    lastDecision: AlphaDecision | null;
    performance: AlphaPerformance;
  };
  betaModel: {
    status: 'RUNNING' | 'STOPPED' | 'ERROR';
    tickersAnalyzed: number;
    patternsDetected: number;
    signalsGenerated: number;
  };
  gammaEngine: {
    status: 'RUNNING' | 'STOPPED' | 'ERROR';
    currentMode: GammaMode;
    stats: GammaStats;
  };
  goalProgress: GoalProgress;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  timestamp: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
}

export interface StatisticalSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface CorrelationResult {
  metricA: string;
  metricB: string;
  correlation: number;              // -1 to 1
  pValue: number;                   // Statistical significance
  sampleSize: number;
  isSignificant: boolean;
}
