/**
 * ARENA INTEGRATION BRIDGE
 *
 * Connects the Adaptive Position Manager with the existing Arena system.
 * This bridge translates between the two systems without requiring major
 * modifications to the existing arenaQuantEngine.
 *
 * RESPONSIBILITIES:
 * 1. Convert QuantPosition ↔ AdaptivePosition
 * 2. Provide regime/Wyckoff data from market state
 * 3. Calculate ATR from price data
 * 4. Handle trading stats for kill switch
 * 5. Emit events to arena system
 */

import {
  AdaptivePosition,
  MarketRegime,
  WyckoffPhase,
  ATRData,
  TradingStats,
  PositionEvaluationResult,
  AgentRiskProfile,
  PartialExit,
} from './types';

import { adaptivePositionManager } from './index';
import { createATRData, calculateATR } from './trailingStopEngine';

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Existing QuantPosition interface (from arenaQuantEngine)
 */
interface QuantPosition {
  id: string;
  symbol: string;
  displaySymbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  strategy: string;
  marketStateAtEntry: any;
  progressPercent: number;
}

/**
 * Arena agent profile mapping
 */
const ARENA_TO_ADAPTIVE_PROFILE: Record<string, AgentRiskProfile> = {
  'alpha-x': 'AGGRESSIVE',
  'beta-x': 'BALANCED',
  'gamma-x': 'CONSERVATIVE',
};

// ============================================================================
// ARENA INTEGRATION BRIDGE
// ============================================================================

export class ArenaIntegrationBridge {
  private priceHistory: Map<string, number[]> = new Map();
  private atrCache: Map<string, ATRData> = new Map();
  private tradingStatsCache: TradingStats = this.createEmptyStats();

  /**
   * Create an adaptive position from arena position
   */
  createAdaptiveFromArena(
    quantPos: QuantPosition,
    agentId: string,
    signalConfidence: number,
    currentRegime: MarketRegime,
    currentWyckoff: WyckoffPhase
  ): AdaptivePosition {
    const agentProfile = ARENA_TO_ADAPTIVE_PROFILE[agentId] || 'BALANCED';

    return adaptivePositionManager.createPosition({
      id: quantPos.id,
      agentId,
      agentRiskProfile: agentProfile,
      symbol: quantPos.symbol,
      direction: quantPos.direction,
      entryPrice: quantPos.entryPrice,
      quantity: quantPos.quantity,
      leverage: 1, // Arena uses 1x leverage for mock trading
      originalStopLoss: quantPos.stopLossPrice,
      originalTakeProfit: quantPos.takeProfitPrice,
      signalConfidence,
      strategyName: quantPos.strategy,
      currentRegime,
      currentWyckoff,
    });
  }

  /**
   * Evaluate an arena position using adaptive system
   */
  evaluateArenaPosition(
    positionId: string,
    currentPrice: number,
    symbol: string,
    currentRegime: MarketRegime,
    currentWyckoff: WyckoffPhase
  ): PositionEvaluationResult {
    // Update price history for ATR calculation
    this.updatePriceHistory(symbol, currentPrice);

    // Get or calculate ATR
    const atr = this.getATR(symbol, currentPrice);

    // Evaluate position
    return adaptivePositionManager.evaluatePosition(
      positionId,
      currentPrice,
      atr,
      currentRegime,
      currentWyckoff,
      this.tradingStatsCache
    );
  }

  /**
   * Update trading stats (called after each trade)
   */
  updateTradingStats(stats: Partial<TradingStats>): void {
    this.tradingStatsCache = {
      ...this.tradingStatsCache,
      ...stats,
    };
  }

  /**
   * Record trade outcome for stats tracking
   */
  recordTradeOutcome(
    pnlPercent: number,
    isWin: boolean,
    agentId: string
  ): void {
    const stats = this.tradingStatsCache;

    // Update daily P&L
    stats.dailyPnLPct += pnlPercent;

    // Update wins/losses
    if (isWin) {
      stats.winsToday++;
      stats.consecutiveLosses = 0;
    } else {
      stats.lossesToday++;
      stats.consecutiveLosses++;
    }

    stats.totalTradestoday++;

    // Update win rate
    const last20Trades = stats.totalTradestoday >= 20
      ? (stats.winsToday / stats.totalTradestoday) * 100
      : 50; // Default to 50% if not enough trades
    stats.winRateLast20 = last20Trades;
  }

  /**
   * Check if new positions can be opened
   */
  canOpenNewPosition(): { allowed: boolean; reason: string } {
    return adaptivePositionManager.canOpenNewPosition(this.tradingStatsCache);
  }

  /**
   * Map market state to regime
   */
  mapMarketStateToRegime(marketState: any): MarketRegime {
    if (!marketState) return 'RANGEBOUND';

    const { trend, volatility, momentum } = marketState;

    // Determine direction
    const isBullish = trend === 'BULLISH' || momentum > 0;
    const isBearish = trend === 'BEARISH' || momentum < 0;

    // Determine volatility
    const isHighVol = volatility === 'HIGH' || volatility === 'EXTREME';

    // Map to regime
    if (isBullish && isHighVol) return 'BULLISH_HIGH_VOL';
    if (isBullish && !isHighVol) return 'BULLISH_LOW_VOL';
    if (isBearish && isHighVol) return 'BEARISH_HIGH_VOL';
    if (isBearish && !isHighVol) return 'BEARISH_LOW_VOL';

    return 'RANGEBOUND';
  }

  /**
   * Map market phase to Wyckoff
   */
  mapMarketPhaseToWyckoff(marketState: any): WyckoffPhase {
    if (!marketState) return 'MARKUP';

    const { phase, trend, momentum } = marketState;

    // If phase is explicitly provided
    if (phase) {
      const phaseMap: Record<string, WyckoffPhase> = {
        'ACCUMULATION': 'ACCUMULATION',
        'MARKUP': 'MARKUP',
        'DISTRIBUTION': 'DISTRIBUTION',
        'MARKDOWN': 'MARKDOWN',
        'BULLISH': 'MARKUP',
        'BEARISH': 'MARKDOWN',
        'NEUTRAL': 'ACCUMULATION',
      };
      return phaseMap[phase] || 'MARKUP';
    }

    // Infer from trend and momentum
    if (trend === 'BULLISH' && momentum > 0) return 'MARKUP';
    if (trend === 'BULLISH' && momentum <= 0) return 'DISTRIBUTION';
    if (trend === 'BEARISH' && momentum < 0) return 'MARKDOWN';
    if (trend === 'BEARISH' && momentum >= 0) return 'ACCUMULATION';

    return 'MARKUP';
  }

  /**
   * Get regime and Wyckoff from market detector
   */
  getMarketContext(marketState: any): {
    regime: MarketRegime;
    wyckoff: WyckoffPhase;
  } {
    return {
      regime: this.mapMarketStateToRegime(marketState),
      wyckoff: this.mapMarketPhaseToWyckoff(marketState),
    };
  }

  /**
   * Convert evaluation result to arena action
   */
  convertToArenaAction(result: PositionEvaluationResult): {
    shouldClose: boolean;
    isPartialExit: boolean;
    exitQuantityPercent: number;
    reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE' | 'TRAILING' | 'PARTIAL';
    newStopLoss?: number;
  } {
    const { action, exitQuantity, updatedPosition } = result;

    switch (action) {
      case 'STOP_LOSS_HIT':
        return {
          shouldClose: true,
          isPartialExit: false,
          exitQuantityPercent: 100,
          reason: 'SL',
        };

      case 'TRAILING_STOP_HIT':
        return {
          shouldClose: true,
          isPartialExit: false,
          exitQuantityPercent: 100,
          reason: 'TRAILING',
        };

      case 'PARTIAL_EXIT_TP1':
      case 'PARTIAL_EXIT_TP2':
      case 'PARTIAL_EXIT_TP3':
        const position = updatedPosition;
        const exitPct = position
          ? ((exitQuantity || 0) / (position.quantity)) * 100
          : 50;
        return {
          shouldClose: false,
          isPartialExit: true,
          exitQuantityPercent: exitPct,
          reason: 'PARTIAL',
          newStopLoss: position?.currentStopLoss,
        };

      case 'REGIME_CHANGE_EXIT':
        return {
          shouldClose: true,
          isPartialExit: false,
          exitQuantityPercent: 100,
          reason: 'REGIME_CHANGE',
        };

      case 'SMART_TIMEOUT':
        return {
          shouldClose: true,
          isPartialExit: false,
          exitQuantityPercent: 100,
          reason: 'TIMEOUT',
        };

      case 'KILL_SWITCH_EXIT':
        return {
          shouldClose: true,
          isPartialExit: false,
          exitQuantityPercent: 100,
          reason: 'SL', // Map to SL for arena compatibility
        };

      case 'UPDATE_TRAILING_STOP':
      case 'ACTIVATE_BREAK_EVEN':
        return {
          shouldClose: false,
          isPartialExit: false,
          exitQuantityPercent: 0,
          reason: 'TP',
          newStopLoss: updatedPosition?.currentStopLoss,
        };

      default:
        return {
          shouldClose: false,
          isPartialExit: false,
          exitQuantityPercent: 0,
          reason: 'TP',
        };
    }
  }

  /**
   * Close position in adaptive system
   */
  closeAdaptivePosition(positionId: string, exitPrice: number, reason: string): void {
    adaptivePositionManager.closePosition(positionId, exitPrice, reason);
  }

  /**
   * Get position from adaptive system
   */
  getAdaptivePosition(positionId: string): AdaptivePosition | undefined {
    return adaptivePositionManager.getPosition(positionId);
  }

  /**
   * Get all positions for an agent
   */
  getAgentPositions(agentId: string): AdaptivePosition[] {
    return adaptivePositionManager.getPositionsByAgent(agentId);
  }

  /**
   * Get system status
   */
  getStatus(): string {
    return adaptivePositionManager.getStatus();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Update price history for ATR calculation
   */
  private updatePriceHistory(symbol: string, price: number): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(price);

    // Keep last 100 prices
    if (history.length > 100) {
      history.shift();
    }

    this.priceHistory.set(symbol, history);
  }

  /**
   * Get ATR for symbol
   */
  private getATR(symbol: string, currentPrice: number): ATRData {
    const cached = this.atrCache.get(symbol);
    const now = Date.now();

    // Return cached if fresh (less than 5 minutes old)
    if (cached && now - cached.lastUpdatedAt < 300000) {
      return cached;
    }

    // Calculate from price history
    const history = this.priceHistory.get(symbol) || [];

    if (history.length < 14) {
      // Not enough data - use approximate ATR (2% of price)
      const approximateATR = currentPrice * 0.02;
      const atrData = createATRData(symbol, approximateATR, currentPrice, 14);
      this.atrCache.set(symbol, atrData);
      return atrData;
    }

    // Calculate true range from price history
    // Simulate OHLC from prices (rough approximation)
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];

    for (let i = 0; i < history.length; i++) {
      const price = history[i];
      // Estimate high/low as +/- 0.5% from price
      highs.push(price * 1.005);
      lows.push(price * 0.995);
      closes.push(price);
    }

    const atr = calculateATR(highs, lows, closes, 14);
    const atrData = createATRData(symbol, atr, currentPrice, 14);
    this.atrCache.set(symbol, atrData);

    return atrData;
  }

  /**
   * Create empty trading stats
   */
  private createEmptyStats(): TradingStats {
    return {
      dailyPnLPct: 0,
      winRateLast20: 50,
      maxDrawdownPct: 0,
      consecutiveLosses: 0,
      totalTradestoday: 0,
      winsToday: 0,
      lossesToday: 0,
    };
  }

  /**
   * Reset daily stats (call at midnight)
   */
  resetDailyStats(): void {
    this.tradingStatsCache = this.createEmptyStats();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const arenaIntegrationBridge = new ArenaIntegrationBridge();

// ============================================================================
// CONVENIENCE FUNCTIONS FOR ARENA
// ============================================================================

/**
 * Quick evaluation of arena position
 */
export function evaluateArenaPosition(
  positionId: string,
  currentPrice: number,
  symbol: string,
  marketState: any
): {
  shouldClose: boolean;
  isPartialExit: boolean;
  exitQuantityPercent: number;
  reason: 'TP' | 'SL' | 'TIMEOUT' | 'REGIME_CHANGE' | 'TRAILING' | 'PARTIAL';
  newStopLoss?: number;
} {
  const { regime, wyckoff } = arenaIntegrationBridge.getMarketContext(marketState);

  const result = arenaIntegrationBridge.evaluateArenaPosition(
    positionId,
    currentPrice,
    symbol,
    regime,
    wyckoff
  );

  return arenaIntegrationBridge.convertToArenaAction(result);
}

/**
 * Check if trading is allowed
 */
export function canTrade(): boolean {
  return arenaIntegrationBridge.canOpenNewPosition().allowed;
}

/**
 * Record trade for stats
 */
export function recordTrade(pnlPercent: number, isWin: boolean, agentId: string): void {
  arenaIntegrationBridge.recordTradeOutcome(pnlPercent, isWin, agentId);
}

/**
 * Get current regime from market state
 */
export function getCurrentRegime(marketState: any): MarketRegime {
  return arenaIntegrationBridge.mapMarketStateToRegime(marketState);
}

/**
 * Get current Wyckoff phase from market state
 */
export function getCurrentWyckoff(marketState: any): WyckoffPhase {
  return arenaIntegrationBridge.mapMarketPhaseToWyckoff(marketState);
}
