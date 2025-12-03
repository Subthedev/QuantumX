/**
 * ADAPTIVE POSITION MANAGER - Type Definitions
 *
 * Core interfaces for the regime-aware position management system.
 * Designed for real-world crypto trading with survival-first philosophy.
 */

// ============================================================================
// MARKET REGIMES
// ============================================================================

/**
 * 5 Market Regimes for STRATEGY SELECTION
 * Determines WHAT to trade
 */
export type MarketRegime =
  | 'BULLISH_HIGH_VOL'   // Strong uptrend, high volatility - momentum plays
  | 'BULLISH_LOW_VOL'    // Steady uptrend, low volatility - trend following
  | 'BEARISH_HIGH_VOL'   // Strong downtrend, high volatility - short momentum
  | 'BEARISH_LOW_VOL'    // Steady downtrend, low volatility - careful shorts
  | 'RANGEBOUND';        // Sideways, mean reversion plays

/**
 * Wyckoff 4 Phases for POSITION MANAGEMENT
 * Determines HOW to trade (position sizing, stop width, hold time)
 */
export type WyckoffPhase =
  | 'ACCUMULATION'   // Smart money loading - wide stops, patient
  | 'MARKUP'         // Uptrend confirmed - let profits run
  | 'DISTRIBUTION'   // Smart money selling - take profits early
  | 'MARKDOWN';      // Downtrend confirmed - tight stops

/**
 * Agent risk profiles
 */
export type AgentRiskProfile = 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';

/**
 * Position direction
 */
export type PositionDirection = 'LONG' | 'SHORT';

// ============================================================================
// REGIME CONFIGURATION
// ============================================================================

/**
 * Configuration for each market regime
 */
export interface RegimeConfig {
  // Trailing Stop Configuration
  trailingStopATRMultiplier: number;  // Base distance as ATR multiple
  trailingStopActivation: number;     // % profit to activate trailing
  trailingStopAcceleration: number;   // % profit to tighten trailing

  // Take Profit Targets
  tp1Percent: number;
  tp2Percent: number;
  tp3Percent: number;

  // Partial Exit Splits (must sum to 100)
  tp1ExitPercent: number;   // % of position to exit at TP1
  tp2ExitPercent: number;   // % of position to exit at TP2
  tp3ExitPercent: number;   // % of remaining position at TP3

  // Break-Even Configuration
  breakEvenActivation: number;  // % profit to move SL to entry

  // Timeout Configuration
  maxHoldHours: number;           // Max hours before timeout check
  profitableMaxHoldHours: number; // Max hours for profitable positions

  // Risk Configuration
  minConfidence: number;          // Minimum signal confidence
  maxPositionSizePercent: number; // Max % of balance per position

  // Regime Change Behavior
  forceExitOnDirectionFlip: boolean;
  regimeChangeTolerance: number;  // How many adverse changes before action
}

/**
 * Configuration for Wyckoff phase position management
 */
export interface WyckoffConfig {
  positionSizeMultiplier: number;  // Kelly fraction multiplier
  stopWidthATRMultiplier: number;  // ATR multiple for stop distance
  holdTimeMultiplier: number;      // Multiplier for max hold time
  tpExtensionFactor: number;       // Extend/contract TP targets
}

// ============================================================================
// POSITION STATE
// ============================================================================

/**
 * Take profit target state
 */
export interface TakeProfitTarget {
  level: 1 | 2 | 3;
  priceTarget: number;
  percentOfPosition: number;  // What % to exit at this level
  triggered: boolean;
  triggeredAt?: number;       // Timestamp when triggered
  triggeredPrice?: number;    // Actual exit price
}

/**
 * Partial exit record
 */
export interface PartialExit {
  level: 1 | 2 | 3 | 'TRAILING' | 'REGIME_CHANGE' | 'TIMEOUT';
  quantity: number;
  exitPrice: number;
  pnlPercent: number;
  pnlDollar: number;
  timestamp: number;
  reason: string;
}

/**
 * Trailing stop state
 */
export interface TrailingStopState {
  isActive: boolean;
  currentStopPrice: number;
  initialStopPrice: number;
  distancePercent: number;      // Current distance from price
  distanceATR: number;          // Distance in ATR units
  highWaterMark: number;        // Highest favorable price reached
  lastUpdatedAt: number;
  accelerationActive: boolean;  // Using tighter stop
}

/**
 * Break-even state
 */
export interface BreakEvenState {
  isActivated: boolean;
  activatedAt?: number;
  breakEvenPrice: number;       // Entry + fees
  originalStopPrice: number;    // SL before break-even
}

/**
 * Regime tracking state
 */
export interface RegimeTrackingState {
  regimeAtEntry: MarketRegime;
  currentRegime: MarketRegime;
  wyckoffAtEntry: WyckoffPhase;
  currentWyckoff: WyckoffPhase;
  regimeChangeCount: number;
  adverseChangeCount: number;
  lastRegimeChangeAt?: number;
}

/**
 * Performance tracking state
 */
export interface PerformanceState {
  unrealizedPnlPercent: number;
  unrealizedPnlDollar: number;
  realizedPnlDollar: number;      // From partial exits
  highWaterMarkPnl: number;       // Best unrealized P&L achieved
  maxDrawdownFromPeak: number;    // Worst drawdown from high water mark
  timeInProfitMs: number;         // Total time position was profitable
  lastPriceUpdateAt: number;
}

/**
 * Enhanced adaptive position interface
 * Extends base position with all adaptive state
 */
export interface AdaptivePosition {
  // Core position data (from existing system)
  id: string;
  agentId: string;
  agentRiskProfile: AgentRiskProfile;
  symbol: string;
  direction: PositionDirection;
  entryPrice: number;
  quantity: number;
  remainingQuantity: number;      // After partial exits
  leverage: number;
  openedAt: number;               // Timestamp

  // Original targets (calculated at entry)
  originalStopLoss: number;
  originalTakeProfit: number;

  // Adaptive state
  trailingStop: TrailingStopState;
  breakEven: BreakEvenState;
  takeProfitTargets: TakeProfitTarget[];
  partialExits: PartialExit[];
  regimeTracking: RegimeTrackingState;
  performance: PerformanceState;

  // Current effective levels
  currentStopLoss: number;        // May differ from original after trailing/break-even

  // Metadata
  signalConfidence: number;
  strategyName: string;
  lastUpdatedAt: number;
}

// ============================================================================
// POSITION EVALUATION
// ============================================================================

/**
 * Actions the position manager can take
 */
export type PositionAction =
  | 'HOLD'                    // No action needed
  | 'UPDATE_TRAILING_STOP'    // Move trailing stop
  | 'ACTIVATE_BREAK_EVEN'     // Move SL to entry
  | 'PARTIAL_EXIT_TP1'        // Exit portion at TP1
  | 'PARTIAL_EXIT_TP2'        // Exit portion at TP2
  | 'PARTIAL_EXIT_TP3'        // Exit portion at TP3
  | 'TRAILING_STOP_HIT'       // Exit remaining at trailing stop
  | 'STOP_LOSS_HIT'           // Exit at stop loss
  | 'REGIME_CHANGE_EXIT'      // Exit due to adverse regime change
  | 'SMART_TIMEOUT'           // Exit due to smart timeout
  | 'KILL_SWITCH_EXIT';       // Emergency exit

/**
 * Result of position evaluation
 */
export interface PositionEvaluationResult {
  action: PositionAction;
  exitPrice?: number;
  exitQuantity?: number;        // For partial exits
  reason: string;
  updatedPosition?: AdaptivePosition;

  // Diagnostic info
  diagnostics: {
    currentPrice: number;
    pnlPercent: number;
    hoursOpen: number;
    regime: MarketRegime;
    wyckoff: WyckoffPhase;
    trailingStopDistance: number;
  };
}

// ============================================================================
// KILL SWITCH
// ============================================================================

/**
 * Kill switch configuration
 */
export interface KillSwitchConfig {
  maxDailyLossPct: number;      // Max daily loss before halt (e.g., 3%)
  minWinRateLast20: number;     // Min win rate over last 20 trades (e.g., 35%)
  maxDrawdownPct: number;       // Max drawdown before halt (e.g., 8%)
  cooldownMinutes: number;      // Minutes to wait before restart
  maxConsecutiveLosses: number; // Max losing streak before halt
}

/**
 * Kill switch state
 */
export interface KillSwitchState {
  isHalted: boolean;
  haltedAt?: number;
  haltReason?: string;
  canResumeAt?: number;

  // Current metrics
  dailyPnlPercent: number;
  currentDrawdownPercent: number;
  winRateLast20: number;
  consecutiveLosses: number;

  // History
  haltHistory: Array<{
    timestamp: number;
    reason: string;
    duration: number;
  }>;
}

/**
 * Trading statistics for kill switch evaluation
 */
export interface TradingStats {
  dailyPnLPct: number;
  winRateLast20: number;
  maxDrawdownPct: number;
  consecutiveLosses: number;
  totalTradestoday: number;
  winsToday: number;
  lossesToday: number;
}

// ============================================================================
// ATR & VOLATILITY
// ============================================================================

/**
 * ATR (Average True Range) data
 */
export interface ATRData {
  symbol: string;
  atr: number;              // Current ATR value
  atrPercent: number;       // ATR as % of price
  period: number;           // ATR period (typically 14)
  lastUpdatedAt: number;
}

/**
 * Volatility classification
 */
export type VolatilityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

/**
 * Market volatility state
 */
export interface VolatilityState {
  level: VolatilityLevel;
  atrPercent: number;
  hourlyVolatility: number;
  dailyVolatility: number;
  isExpanding: boolean;     // Volatility increasing
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Events emitted by the adaptive position manager
 */
export type AdaptivePositionEvent =
  | { type: 'TRAILING_STOP_UPDATED'; position: AdaptivePosition; newStopPrice: number }
  | { type: 'BREAK_EVEN_ACTIVATED'; position: AdaptivePosition }
  | { type: 'PARTIAL_EXIT_EXECUTED'; position: AdaptivePosition; exit: PartialExit }
  | { type: 'POSITION_CLOSED'; position: AdaptivePosition; reason: string; finalPnl: number }
  | { type: 'REGIME_CHANGE_DETECTED'; position: AdaptivePosition; oldRegime: MarketRegime; newRegime: MarketRegime }
  | { type: 'KILL_SWITCH_ACTIVATED'; reason: string; stats: TradingStats }
  | { type: 'KILL_SWITCH_DEACTIVATED'; cooldownComplete: boolean };

/**
 * Event listener type
 */
export type AdaptivePositionEventListener = (event: AdaptivePositionEvent) => void;

// ============================================================================
// AGENT-SPECIFIC CONFIGURATION
// ============================================================================

/**
 * Agent-specific multipliers
 */
export interface AgentMultipliers {
  trailingStopMultiplier: number;   // AlphaX: 1.5, BetaX: 2.0, GammaX: 2.5
  positionSizeMultiplier: number;   // Relative to base size
  tpExtensionMultiplier: number;    // Extend/contract TP targets
  riskTolerance: number;            // 0-1 scale
}

/**
 * Get agent multipliers by risk profile
 */
export const AGENT_MULTIPLIERS: Record<AgentRiskProfile, AgentMultipliers> = {
  AGGRESSIVE: {
    trailingStopMultiplier: 1.5,    // Tighter trailing = more aggressive profit lock
    positionSizeMultiplier: 1.5,
    tpExtensionMultiplier: 1.2,     // Extended targets
    riskTolerance: 0.8
  },
  BALANCED: {
    trailingStopMultiplier: 2.0,    // Standard trailing
    positionSizeMultiplier: 1.0,
    tpExtensionMultiplier: 1.0,
    riskTolerance: 0.5
  },
  CONSERVATIVE: {
    trailingStopMultiplier: 2.5,    // Wider trailing = more room
    positionSizeMultiplier: 0.7,
    tpExtensionMultiplier: 0.85,    // Tighter targets, take profits early
    riskTolerance: 0.3
  }
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default fee assumption (round-trip)
 */
export const DEFAULT_FEE_PERCENT = 0.1;

/**
 * Minimum trailing stop distance (prevents whipsaw)
 */
export const MIN_TRAILING_STOP_PERCENT = 0.5;

/**
 * Maximum position hold time (hard cap for capital efficiency)
 */
export const MAX_POSITION_HOLD_HOURS = 72;

/**
 * ATR calculation period
 */
export const ATR_PERIOD = 14;
