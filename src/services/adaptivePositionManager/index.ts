/**
 * ADAPTIVE POSITION MANAGER - Main Orchestrator
 *
 * Central coordinator for all adaptive position management.
 * This is the main entry point that integrates with arenaQuantEngine.
 *
 * PHILOSOPHY: Survival first, optimization later
 *
 * EVALUATION ORDER:
 * 1. Kill switch check (can we trade at all?)
 * 2. Stop loss check (are we being stopped out?)
 * 3. Break-even check (can we lock in guaranteed profit?)
 * 4. Trailing stop update (should we move our stop?)
 * 5. Take profit check (should we take partial/full profits?)
 * 6. Timeout check (has position been open too long?)
 * 7. Regime change check (has market context changed?)
 */

import {
  AdaptivePosition,
  PositionAction,
  PositionEvaluationResult,
  MarketRegime,
  WyckoffPhase,
  ATRData,
  TradingStats,
  AdaptivePositionEvent,
  AdaptivePositionEventListener,
  TrailingStopState,
  BreakEvenState,
  TakeProfitTarget,
  PartialExit,
  RegimeTrackingState,
  PerformanceState,
  AgentRiskProfile,
  DEFAULT_FEE_PERCENT,
} from './types';

import { REGIME_CONFIGS, WYCKOFF_CONFIGS, getEffectiveConfig } from './regimeTradeRules';
import { TrailingStopEngine, trailingStopEngine, createATRData } from './trailingStopEngine';
import { BreakEvenManager, breakEvenManager, createInitialBreakEvenState } from './breakEvenManager';
import { KillSwitch, killSwitch, canTrade, calculateTradingStats } from './killSwitch';

// Phase 2 imports
import { PartialExitManager, partialExitManager } from './partialExitManager';
import { DynamicTakeProfitEngine, dynamicTakeProfitEngine } from './dynamicTakeProfitEngine';
import { SmartTimeoutManager, smartTimeoutManager, shouldTimeout } from './smartTimeoutManager';

// Phase 3 imports
import { RegimeChangeHandler, regimeChangeHandler } from './regimeChangeHandler';
import { WyckoffPhaseManager, wyckoffPhaseManager, isPhaseCompatible } from './wyckoffPhaseManager';

// Re-export all types
export * from './types';
export * from './regimeTradeRules';

// Phase 1 exports
export { trailingStopEngine, TrailingStopEngine, createATRData } from './trailingStopEngine';
export { breakEvenManager, BreakEvenManager, createInitialBreakEvenState } from './breakEvenManager';
export { killSwitch, KillSwitch, canTrade, calculateTradingStats } from './killSwitch';

// Phase 2 exports
export { partialExitManager, PartialExitManager } from './partialExitManager';
export { dynamicTakeProfitEngine, DynamicTakeProfitEngine } from './dynamicTakeProfitEngine';
export { smartTimeoutManager, SmartTimeoutManager, shouldTimeout } from './smartTimeoutManager';

// Phase 3 exports
export { regimeChangeHandler, RegimeChangeHandler } from './regimeChangeHandler';
export { wyckoffPhaseManager, WyckoffPhaseManager, isPhaseCompatible } from './wyckoffPhaseManager';

// Arena Integration exports (lazy loaded to avoid circular deps)
export {
  arenaIntegrationBridge,
  ArenaIntegrationBridge,
  evaluateArenaPosition,
  canTrade as canTradeArena,
  recordTrade,
  getCurrentRegime,
  getCurrentWyckoff,
} from './arenaIntegration';

// ============================================================================
// ADAPTIVE POSITION MANAGER
// ============================================================================

export class AdaptivePositionManager {
  private positions: Map<string, AdaptivePosition> = new Map();
  private eventListeners: AdaptivePositionEventListener[] = [];

  // Phase 1 component references
  private trailingStop: TrailingStopEngine;
  private breakEven: BreakEvenManager;
  private killSwitchRef: KillSwitch;

  // Phase 2 component references
  private partialExit: PartialExitManager;
  private dynamicTP: DynamicTakeProfitEngine;
  private smartTimeout: SmartTimeoutManager;

  // Phase 3 component references
  private regimeChange: RegimeChangeHandler;
  private wyckoff: WyckoffPhaseManager;

  constructor() {
    // Phase 1
    this.trailingStop = trailingStopEngine;
    this.breakEven = breakEvenManager;
    this.killSwitchRef = killSwitch;

    // Phase 2
    this.partialExit = partialExitManager;
    this.dynamicTP = dynamicTakeProfitEngine;
    this.smartTimeout = smartTimeoutManager;

    // Phase 3
    this.regimeChange = regimeChangeHandler;
    this.wyckoff = wyckoffPhaseManager;

    // Subscribe to kill switch events
    this.killSwitchRef.onEvent((event) => {
      if (event.type === 'HALT') {
        this.emitEvent({
          type: 'KILL_SWITCH_ACTIVATED',
          reason: event.reason,
          stats: event.stats,
        });
      } else if (event.type === 'RESUME') {
        this.emitEvent({
          type: 'KILL_SWITCH_DEACTIVATED',
          cooldownComplete: true,
        });
      }
    });

    console.log('[AdaptivePositionManager] Initialized with all Phase 1-3 components');
  }

  // ============================================================================
  // POSITION LIFECYCLE
  // ============================================================================

  /**
   * Create a new adaptive position from a basic trade
   */
  createPosition(params: {
    id: string;
    agentId: string;
    agentRiskProfile: AgentRiskProfile;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    leverage: number;
    originalStopLoss: number;
    originalTakeProfit: number;
    signalConfidence: number;
    strategyName: string;
    currentRegime: MarketRegime;
    currentWyckoff: WyckoffPhase;
  }): AdaptivePosition {
    const now = Date.now();

    // Calculate initial take profit targets based on regime
    const regimeConfig = REGIME_CONFIGS[params.currentRegime];
    const takeProfitTargets = this.calculateInitialTakeProfits(
      params.entryPrice,
      params.direction,
      regimeConfig
    );

    // Create initial trailing stop state
    const trailingStopState: TrailingStopState = {
      isActive: false,
      currentStopPrice: params.originalStopLoss,
      initialStopPrice: params.originalStopLoss,
      distancePercent: 0,
      distanceATR: 0,
      highWaterMark: params.entryPrice,
      lastUpdatedAt: now,
      accelerationActive: false,
    };

    // Create initial break-even state
    const breakEvenState = createInitialBreakEvenState(
      params.entryPrice,
      params.originalStopLoss,
      params.direction
    );

    // Create regime tracking state
    const regimeTracking: RegimeTrackingState = {
      regimeAtEntry: params.currentRegime,
      currentRegime: params.currentRegime,
      wyckoffAtEntry: params.currentWyckoff,
      currentWyckoff: params.currentWyckoff,
      regimeChangeCount: 0,
      adverseChangeCount: 0,
    };

    // Create performance state
    const performance: PerformanceState = {
      unrealizedPnlPercent: 0,
      unrealizedPnlDollar: 0,
      realizedPnlDollar: 0,
      highWaterMarkPnl: 0,
      maxDrawdownFromPeak: 0,
      timeInProfitMs: 0,
      lastPriceUpdateAt: now,
    };

    const position: AdaptivePosition = {
      id: params.id,
      agentId: params.agentId,
      agentRiskProfile: params.agentRiskProfile,
      symbol: params.symbol,
      direction: params.direction,
      entryPrice: params.entryPrice,
      quantity: params.quantity,
      remainingQuantity: params.quantity,
      leverage: params.leverage,
      openedAt: now,
      originalStopLoss: params.originalStopLoss,
      originalTakeProfit: params.originalTakeProfit,
      trailingStop: trailingStopState,
      breakEven: breakEvenState,
      takeProfitTargets,
      partialExits: [],
      regimeTracking,
      performance,
      currentStopLoss: params.originalStopLoss,
      signalConfidence: params.signalConfidence,
      strategyName: params.strategyName,
      lastUpdatedAt: now,
    };

    this.positions.set(params.id, position);

    console.log(
      `[AdaptivePositionManager] Created position ${params.id}: ` +
      `${params.direction} ${params.symbol} @ $${params.entryPrice.toFixed(2)} ` +
      `(Regime: ${params.currentRegime}, Wyckoff: ${params.currentWyckoff})`
    );

    return position;
  }

  /**
   * Evaluate a position and determine what action to take
   * FULL EVALUATION ORDER (Survival First, then Optimization)
   */
  evaluatePosition(
    positionId: string,
    currentPrice: number,
    atr: ATRData,
    currentRegime: MarketRegime,
    currentWyckoff: WyckoffPhase,
    tradingStats: TradingStats
  ): PositionEvaluationResult {
    const position = this.positions.get(positionId);

    if (!position) {
      return {
        action: 'HOLD',
        reason: 'Position not found',
        diagnostics: {
          currentPrice,
          pnlPercent: 0,
          hoursOpen: 0,
          regime: currentRegime,
          wyckoff: currentWyckoff,
          trailingStopDistance: 0,
        },
      };
    }

    // Calculate P&L
    const pnlPercent = this.calculatePnLPercent(position, currentPrice);
    const hoursOpen = (Date.now() - position.openedAt) / (1000 * 60 * 60);

    // Build diagnostics
    const diagnostics = {
      currentPrice,
      pnlPercent,
      hoursOpen,
      regime: currentRegime,
      wyckoff: currentWyckoff,
      trailingStopDistance: position.trailingStop.distancePercent,
    };

    // =========================================================
    // PHASE 1: SURVIVAL CHECKS
    // =========================================================

    // 1. KILL SWITCH CHECK
    if (this.killSwitchRef.checkConditions(tradingStats)) {
      return {
        action: 'KILL_SWITCH_EXIT',
        exitPrice: currentPrice,
        exitQuantity: position.remainingQuantity,
        reason: `Kill switch activated: ${this.killSwitchRef.getHaltReason()}`,
        diagnostics,
      };
    }

    // 2. STOP LOSS CHECK
    const stopLossResult = this.checkStopLoss(position, currentPrice);
    if (stopLossResult.isHit) {
      return {
        action: 'STOP_LOSS_HIT',
        exitPrice: stopLossResult.exitPrice,
        exitQuantity: position.remainingQuantity,
        reason: stopLossResult.reason,
        diagnostics,
      };
    }

    // 3. TRAILING STOP HIT CHECK
    const trailingResult = this.trailingStop.isTrailingStopHit(position, currentPrice);
    if (trailingResult.isHit) {
      return {
        action: 'TRAILING_STOP_HIT',
        exitPrice: trailingResult.exitPrice,
        exitQuantity: position.remainingQuantity,
        reason: trailingResult.reason,
        diagnostics,
      };
    }

    // =========================================================
    // PHASE 3: REGIME CHANGE CHECK (before profit taking)
    // =========================================================

    // 4. REGIME CHANGE CHECK
    const oldRegime = position.regimeTracking.currentRegime;
    if (oldRegime !== currentRegime) {
      const regimeResult = this.regimeChange.handleRegimeChange(
        position,
        oldRegime,
        currentRegime,
        currentPrice
      );

      if (regimeResult.action === 'FULL_EXIT') {
        return {
          action: 'REGIME_CHANGE_EXIT',
          exitPrice: currentPrice,
          exitQuantity: position.remainingQuantity,
          reason: regimeResult.reason,
          diagnostics,
        };
      }

      if (regimeResult.action === 'PARTIAL_EXIT') {
        const { updatedPosition, partialExit } = this.regimeChange.applyRegimeChange(
          position,
          regimeResult,
          currentPrice
        );

        this.positions.set(positionId, updatedPosition);

        if (partialExit) {
          this.emitEvent({
            type: 'PARTIAL_EXIT_EXECUTED',
            position: updatedPosition,
            exit: partialExit,
          });
        }

        this.emitEvent({
          type: 'REGIME_CHANGE_DETECTED',
          position: updatedPosition,
          oldRegime,
          newRegime: currentRegime,
        });

        return {
          action: 'REGIME_CHANGE_EXIT',
          exitPrice: currentPrice,
          exitQuantity: partialExit?.quantity || 0,
          reason: regimeResult.reason,
          updatedPosition,
          diagnostics,
        };
      }

      // TIGHTEN_STOP action - apply and continue evaluation
      if (regimeResult.action === 'TIGHTEN_STOP') {
        const { updatedPosition } = this.regimeChange.applyRegimeChange(
          position,
          regimeResult,
          currentPrice
        );
        this.positions.set(positionId, updatedPosition);
      }
    }

    // =========================================================
    // PHASE 2: PROFIT CAPTURE
    // =========================================================

    // Get current position (may have been updated)
    let currentPosition = this.positions.get(positionId) || position;

    // 5. UPDATE TRAILING STOP (if in profit)
    const trailingUpdated = this.trailingStop.updatePositionTrailingStop(currentPosition, currentPrice, atr);
    if (trailingUpdated.trailingStop.currentStopPrice !== currentPosition.trailingStop.currentStopPrice) {
      this.positions.set(positionId, trailingUpdated);
      currentPosition = trailingUpdated;

      this.emitEvent({
        type: 'TRAILING_STOP_UPDATED',
        position: trailingUpdated,
        newStopPrice: trailingUpdated.trailingStop.currentStopPrice,
      });
    }

    // 6. BREAK-EVEN CHECK
    const breakEvenUpdated = this.breakEven.updatePositionBreakEven(currentPosition, currentPrice);
    if (breakEvenUpdated.breakEven.isActivated && !currentPosition.breakEven.isActivated) {
      this.positions.set(positionId, breakEvenUpdated);
      currentPosition = breakEvenUpdated;

      this.emitEvent({
        type: 'BREAK_EVEN_ACTIVATED',
        position: breakEvenUpdated,
      });
    }

    // 7. PARTIAL EXIT / TAKE PROFIT CHECK
    const partialResult = this.partialExit.checkPartialExits(
      currentPosition,
      currentPrice,
      currentRegime,
      currentWyckoff
    );

    if (partialResult) {
      const executionResult = this.partialExit.executePartialExit(currentPosition, partialResult);

      if (executionResult.success) {
        this.positions.set(positionId, executionResult.updatedPosition);

        this.emitEvent({
          type: 'PARTIAL_EXIT_EXECUTED',
          position: executionResult.updatedPosition,
          exit: executionResult.partialExit,
        });

        const action: PositionAction = `PARTIAL_EXIT_TP${partialResult.level}` as PositionAction;

        return {
          action,
          exitPrice: partialResult.exitPrice,
          exitQuantity: partialResult.exitQuantity,
          reason: partialResult.reason,
          updatedPosition: executionResult.updatedPosition,
          diagnostics,
        };
      }
    }

    // 8. SMART TIMEOUT CHECK
    const timeoutResult = this.smartTimeout.shouldTimeoutPosition(
      currentPosition,
      currentPrice,
      currentRegime
    );

    if (timeoutResult.shouldTimeout) {
      return {
        action: 'SMART_TIMEOUT',
        exitPrice: currentPrice,
        exitQuantity: currentPosition.remainingQuantity,
        reason: timeoutResult.reason,
        diagnostics,
      };
    }

    // =========================================================
    // PHASE 3: WYCKOFF PHASE ADJUSTMENTS
    // =========================================================

    // 9. WYCKOFF PHASE UPDATE
    const oldWyckoff = currentPosition.regimeTracking.currentWyckoff;
    if (oldWyckoff !== currentWyckoff) {
      const wyckoffUpdated = this.wyckoff.applyPhaseAdjustments(
        currentPosition,
        currentWyckoff,
        currentPrice,
        atr.atr
      );
      this.positions.set(positionId, wyckoffUpdated);
      currentPosition = wyckoffUpdated;
    }

    // 10. Update regime tracking
    this.updateRegimeTracking(positionId, currentRegime, currentWyckoff);

    // 11. Update performance metrics
    this.updatePerformanceMetrics(positionId, currentPrice);

    // No action needed - position is healthy
    const finalPosition = this.positions.get(positionId);

    return {
      action: 'HOLD',
      reason: `Monitoring - P&L: ${pnlPercent.toFixed(2)}%, Hours: ${hoursOpen.toFixed(1)}, ` +
              `Regime: ${currentRegime}, Wyckoff: ${currentWyckoff}`,
      updatedPosition: finalPosition,
      diagnostics,
    };
  }

  /**
   * Close position and record final state
   */
  closePosition(
    positionId: string,
    exitPrice: number,
    reason: string
  ): AdaptivePosition | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    // Calculate final P&L
    const finalPnl = this.calculatePnLDollar(position, exitPrice);

    // Emit close event
    this.emitEvent({
      type: 'POSITION_CLOSED',
      position,
      reason,
      finalPnl,
    });

    // Remove from active positions
    this.positions.delete(positionId);

    console.log(
      `[AdaptivePositionManager] Closed position ${positionId}: ` +
      `${reason} | Final P&L: $${finalPnl.toFixed(2)}`
    );

    return position;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Calculate initial take profit targets
   */
  private calculateInitialTakeProfits(
    entryPrice: number,
    direction: 'LONG' | 'SHORT',
    regimeConfig: typeof REGIME_CONFIGS[MarketRegime]
  ): TakeProfitTarget[] {
    const targets: TakeProfitTarget[] = [];

    const tpLevels = [
      { level: 1, percent: regimeConfig.tp1Percent, exit: regimeConfig.tp1ExitPercent },
      { level: 2, percent: regimeConfig.tp2Percent, exit: regimeConfig.tp2ExitPercent },
      { level: 3, percent: regimeConfig.tp3Percent, exit: regimeConfig.tp3ExitPercent },
    ];

    for (const tp of tpLevels) {
      const priceTarget = direction === 'LONG'
        ? entryPrice * (1 + tp.percent / 100)
        : entryPrice * (1 - tp.percent / 100);

      targets.push({
        level: tp.level as 1 | 2 | 3,
        priceTarget,
        percentOfPosition: tp.exit,
        triggered: false,
      });
    }

    return targets;
  }

  /**
   * Check if stop loss is hit
   */
  private checkStopLoss(
    position: AdaptivePosition,
    currentPrice: number
  ): { isHit: boolean; exitPrice: number; reason: string } {
    const stopPrice = position.currentStopLoss;

    if (position.direction === 'LONG') {
      if (currentPrice <= stopPrice) {
        return {
          isHit: true,
          exitPrice: stopPrice,
          reason: `Stop loss hit at $${stopPrice.toFixed(2)}`,
        };
      }
    } else {
      if (currentPrice >= stopPrice) {
        return {
          isHit: true,
          exitPrice: stopPrice,
          reason: `Stop loss hit at $${stopPrice.toFixed(2)}`,
        };
      }
    }

    return { isHit: false, exitPrice: 0, reason: '' };
  }

  /**
   * Check take profit levels (basic implementation - Phase 2 will enhance)
   */
  private checkTakeProfits(
    position: AdaptivePosition,
    currentPrice: number
  ): Partial<PositionEvaluationResult> {
    // Find first untriggered TP level
    for (const tp of position.takeProfitTargets) {
      if (tp.triggered) continue;

      const isHit = position.direction === 'LONG'
        ? currentPrice >= tp.priceTarget
        : currentPrice <= tp.priceTarget;

      if (isHit) {
        // Mark as triggered
        tp.triggered = true;
        tp.triggeredAt = Date.now();
        tp.triggeredPrice = currentPrice;

        // Calculate exit quantity
        const exitQuantity = position.remainingQuantity * (tp.percentOfPosition / 100);

        const action: PositionAction = `PARTIAL_EXIT_TP${tp.level}` as PositionAction;

        return {
          action,
          exitPrice: currentPrice,
          exitQuantity,
          reason: `TP${tp.level} hit at $${currentPrice.toFixed(2)} (${tp.percentOfPosition}% exit)`,
        };
      }
    }

    return { action: 'HOLD' };
  }

  /**
   * Update regime tracking for position
   */
  private updateRegimeTracking(
    positionId: string,
    newRegime: MarketRegime,
    newWyckoff: WyckoffPhase
  ): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    const oldRegime = position.regimeTracking.currentRegime;
    const oldWyckoff = position.regimeTracking.currentWyckoff;

    if (oldRegime !== newRegime || oldWyckoff !== newWyckoff) {
      position.regimeTracking.currentRegime = newRegime;
      position.regimeTracking.currentWyckoff = newWyckoff;
      position.regimeTracking.regimeChangeCount++;
      position.regimeTracking.lastRegimeChangeAt = Date.now();

      if (oldRegime !== newRegime) {
        this.emitEvent({
          type: 'REGIME_CHANGE_DETECTED',
          position,
          oldRegime,
          newRegime,
        });
      }

      this.positions.set(positionId, position);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(positionId: string, currentPrice: number): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    const pnlPercent = this.calculatePnLPercent(position, currentPrice);
    const pnlDollar = this.calculatePnLDollar(position, currentPrice);

    const now = Date.now();
    const timeDelta = now - position.performance.lastPriceUpdateAt;

    // Update high water mark
    if (pnlPercent > position.performance.highWaterMarkPnl) {
      position.performance.highWaterMarkPnl = pnlPercent;
    }

    // Update max drawdown from peak
    const drawdown = position.performance.highWaterMarkPnl - pnlPercent;
    if (drawdown > position.performance.maxDrawdownFromPeak) {
      position.performance.maxDrawdownFromPeak = drawdown;
    }

    // Update time in profit
    if (pnlPercent > 0) {
      position.performance.timeInProfitMs += timeDelta;
    }

    position.performance.unrealizedPnlPercent = pnlPercent;
    position.performance.unrealizedPnlDollar = pnlDollar;
    position.performance.lastPriceUpdateAt = now;

    this.positions.set(positionId, position);
  }

  /**
   * Calculate P&L percentage
   */
  private calculatePnLPercent(position: AdaptivePosition, currentPrice: number): number {
    if (position.direction === 'LONG') {
      return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    } else {
      return ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
    }
  }

  /**
   * Calculate P&L in dollars
   */
  private calculatePnLDollar(position: AdaptivePosition, currentPrice: number): number {
    const pnlPercent = this.calculatePnLPercent(position, currentPrice);
    const notionalValue = position.entryPrice * position.remainingQuantity;
    return (pnlPercent / 100) * notionalValue * position.leverage;
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  /**
   * Get position by ID
   */
  getPosition(positionId: string): AdaptivePosition | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Get all positions
   */
  getAllPositions(): AdaptivePosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get positions by agent
   */
  getPositionsByAgent(agentId: string): AdaptivePosition[] {
    return this.getAllPositions().filter(p => p.agentId === agentId);
  }

  /**
   * Check if trading is allowed
   */
  canOpenNewPosition(tradingStats: TradingStats): { allowed: boolean; reason: string } {
    if (this.killSwitchRef.isHalted()) {
      return {
        allowed: false,
        reason: `Kill switch active: ${this.killSwitchRef.getHaltReason()}`,
      };
    }

    // Check conditions
    this.killSwitchRef.checkConditions(tradingStats);

    if (this.killSwitchRef.isHalted()) {
      return {
        allowed: false,
        reason: `Kill switch triggered: ${this.killSwitchRef.getHaltReason()}`,
      };
    }

    return { allowed: true, reason: '' };
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: AdaptivePositionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: AdaptivePositionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: AdaptivePositionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[AdaptivePositionManager] Event listener error:', error);
      }
    });
  }

  // ============================================================================
  // STATUS & DEBUGGING
  // ============================================================================

  /**
   * Get system status
   */
  getStatus(): string {
    const positions = this.getAllPositions();
    const killSwitchStatus = this.killSwitchRef.isHalted() ? '🚨 HALTED' : '✅ ACTIVE';

    let status = `
╔═══════════════════════════════════════════════════════════════════╗
║              ADAPTIVE POSITION MANAGER STATUS                      ║
╠═══════════════════════════════════════════════════════════════════╣
║  Kill Switch: ${killSwitchStatus.padEnd(52)}║
║  Active Positions: ${positions.length.toString().padEnd(48)}║
`;

    if (positions.length > 0) {
      status += `╠═══════════════════════════════════════════════════════════════════╣\n`;
      for (const pos of positions) {
        const pnl = pos.performance.unrealizedPnlPercent.toFixed(2);
        const pnlSign = pos.performance.unrealizedPnlPercent >= 0 ? '+' : '';
        status += `║  ${pos.symbol.padEnd(8)} ${pos.direction.padEnd(6)} ${pnlSign}${pnl}% | SL: $${pos.currentStopLoss.toFixed(2).padEnd(25)}║\n`;
      }
    }

    status += `╚═══════════════════════════════════════════════════════════════════╝`;

    return status;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const adaptivePositionManager = new AdaptivePositionManager();

// Default export
export default adaptivePositionManager;
