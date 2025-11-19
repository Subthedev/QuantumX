/**
 * Triple Barrier Method - Multi-Class Outcome Monitoring
 *
 * Implements the institutional "Triple Barrier Method" for trade outcome classification.
 * Solves the problem of TIMEOUT confusion in ML training.
 *
 * Three Barriers:
 * 1. Upper Barrier (Take Profit) → WIN outcomes
 * 2. Lower Barrier (Stop Loss) → LOSS outcomes
 * 3. Time Barrier (Expiry) → TIMEOUT outcomes (with detailed classification)
 *
 * Key Innovation: TIMEOUT is not a single class. We classify it into:
 * - TIMEOUT_STAGNATION: Price barely moved (signal was premature)
 * - TIMEOUT_WRONG: Price moved against position (signal was incorrect)
 * - TIMEOUT_LOWVOL: Not enough volatility to reach target (market sleeping)
 * - TIMEOUT_VALID: Moving correctly but ran out of time (signal was good)
 *
 * ML models learn from these distinct patterns instead of treating all timeouts the same.
 *
 * Research: Academic standard for financial ML, used by institutional quant firms
 */

import type { HubSignal } from './globalHubService';
import { multiExchangeAggregatorV4 } from './dataStreams/multiExchangeAggregatorV4';

// ===== OUTCOME CLASSIFICATION =====

/**
 * Detailed outcome classification for ML training
 *
 * Unlike binary WIN/LOSS, this provides nuanced feedback:
 * - Which target was hit? (TP1/TP2/TP3 have different quality implications)
 * - Was stop hit cleanly or with some profit? (LOSS vs LOSS_PARTIAL)
 * - Why did it timeout? (4 different timeout reasons)
 */
export type MLOutcomeClass =
  | 'WIN_TP1'              // Hit first target (smallest win, quick profit)
  | 'WIN_TP2'              // Hit second target (medium win, primary target)
  | 'WIN_TP3'              // Hit third target (home run, exceptional)
  | 'LOSS_SL'              // Hit stop loss (clean loss, signal was wrong)
  | 'LOSS_PARTIAL'         // Stopped out with some profit (moved right then wrong)
  | 'TIMEOUT_STAGNATION'   // Price barely moved (signal premature, market not ready)
  | 'TIMEOUT_WRONG'        // Price moved wrong direction significantly (bad signal)
  | 'TIMEOUT_LOWVOL'       // Not enough volatility to reach target (market sleeping)
  | 'TIMEOUT_VALID';       // Moving correctly but ran out of time (signal good, needs more time)

/**
 * Convert MLOutcomeClass to binary for backward compatibility
 */
export function getOutcomeBinary(outcome: MLOutcomeClass): 'WIN' | 'LOSS' | 'TIMEOUT' {
  if (outcome.startsWith('WIN_')) return 'WIN';
  if (outcome.startsWith('LOSS_')) return 'LOSS';
  return 'TIMEOUT';
}

/**
 * Convert MLOutcomeClass to training value (0.0 - 1.0)
 * Used by ML models to weight outcomes
 */
export function getOutcomeTrainingValue(outcome: MLOutcomeClass): number {
  const values: Record<MLOutcomeClass, number> = {
    WIN_TP3: 1.0,              // Exceptional win
    WIN_TP2: 0.85,             // Good win
    WIN_TP1: 0.6,              // Modest win
    TIMEOUT_VALID: 0.5,        // Signal was correct, just needed more time
    TIMEOUT_LOWVOL: 0.4,       // Signal OK, market not volatile enough
    LOSS_PARTIAL: 0.3,         // Moved right then wrong
    TIMEOUT_STAGNATION: 0.2,   // Signal premature
    LOSS_SL: 0.0,              // Clean loss
    TIMEOUT_WRONG: 0.0         // Bad signal
  };

  return values[outcome];
}

// ===== BARRIER DEFINITIONS =====

export interface TripleBarrier {
  upperBarrier: number;      // Take profit threshold (price must reach/exceed)
  lowerBarrier: number;      // Stop loss threshold (price must reach/fall below)
  timeBarrier: number;       // Expiry timestamp (milliseconds)

  // Multiple targets for graduated wins
  target1: number;
  target2: number;
  target3: number;
}

export interface BarrierOutcome {
  outcome: MLOutcomeClass;
  exitPrice: number;
  exitTime: number;
  returnPct: number;
  holdDuration: number;
  reason: string;
  priceMovement: number;      // How much price moved (%)
  expectedMovement: number;   // How much we expected it to move (%)
  highestPrice?: number;      // Highest price reached during monitoring
  lowestPrice?: number;       // Lowest price reached during monitoring
}

// ===== PRICE DATA INTERFACE =====

/**
 * Interface for fetching current prices
 * Can be implemented by different data sources (CoinGecko, Binance, etc.)
 */
export interface PriceProvider {
  getCurrentPrice(symbol: string): Promise<number>;
}

// ===== TRIPLE BARRIER MONITOR =====

export class TripleBarrierMonitor {
  private priceProvider: PriceProvider;
  private readonly CHECK_INTERVAL_MS = 5000; // Check price every 5 seconds
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor(priceProvider: PriceProvider) {
    this.priceProvider = priceProvider;
  }

  /**
   * Monitor a signal against three barriers
   *
   * Returns as soon as ANY barrier is touched:
   * - Upper barrier (TP) → WIN_TP1/2/3
   * - Lower barrier (SL) → LOSS_SL/PARTIAL
   * - Time barrier → TIMEOUT_STAGNATION/WRONG/LOWVOL/VALID
   *
   * @param signal - The trading signal to monitor
   * @param barriers - The three barriers defining outcomes
   * @returns Promise resolving to detailed outcome classification
   */
  async monitorSignal(
    signal: HubSignal,
    barriers: TripleBarrier
  ): Promise<BarrierOutcome> {
    console.log(
      `[Triple Barrier] Monitoring ${signal.symbol} ${signal.direction} | ` +
      `Entry: $${signal.entry?.toFixed(2)} | ` +
      `SL: $${barriers.lowerBarrier.toFixed(2)} | ` +
      `TP1: $${barriers.target1.toFixed(2)} | ` +
      `Expiry: ${new Date(barriers.timeBarrier).toISOString()}`
    );

    let highestPrice = signal.entry || 0;
    let lowestPrice = signal.entry || 0;
    const startTime = Date.now();

    while (Date.now() < barriers.timeBarrier) {
      try {
        // Fetch current price
        const currentPrice = await this.priceProvider.getCurrentPrice(signal.symbol);

        // Update price extremes
        highestPrice = Math.max(highestPrice, currentPrice);
        lowestPrice = Math.min(lowestPrice, currentPrice);

        // Check upper barrier (TAKE PROFIT)
        if (this.touchedTakeProfit(currentPrice, signal.direction!, barriers)) {
          const targetLevel = this.determineTargetLevel(currentPrice, signal.direction!, barriers);
          return this.createWinOutcome(
            signal,
            currentPrice,
            targetLevel,
            highestPrice,
            lowestPrice,
            startTime
          );
        }

        // Check lower barrier (STOP LOSS)
        if (this.touchedStopLoss(currentPrice, signal.direction!, barriers)) {
          return this.createLossOutcome(
            signal,
            currentPrice,
            barriers,
            highestPrice,
            lowestPrice,
            startTime
          );
        }

        // Wait before next check
        await this.sleep(this.CHECK_INTERVAL_MS);

      } catch (error) {
        console.error(`[Triple Barrier] Error monitoring ${signal.symbol}:`, error);
        // Continue monitoring despite errors
        await this.sleep(this.CHECK_INTERVAL_MS);
      }
    }

    // Time barrier reached (TIMEOUT)
    const finalPrice = await this.priceProvider.getCurrentPrice(signal.symbol);
    return this.createTimeoutOutcome(
      signal,
      finalPrice,
      barriers,
      highestPrice,
      lowestPrice,
      startTime
    );
  }

  /**
   * Check if take profit barrier was touched
   */
  private touchedTakeProfit(
    currentPrice: number,
    direction: 'LONG' | 'SHORT',
    barriers: TripleBarrier
  ): boolean {
    if (direction === 'LONG') {
      return currentPrice >= barriers.target1; // Price reached or exceeded target
    } else {
      return currentPrice <= barriers.target1; // Price fell to or below target
    }
  }

  /**
   * Determine which target level was hit (TP1, TP2, or TP3)
   */
  private determineTargetLevel(
    currentPrice: number,
    direction: 'LONG' | 'SHORT',
    barriers: TripleBarrier
  ): 1 | 2 | 3 {
    if (direction === 'LONG') {
      if (currentPrice >= barriers.target3) return 3;
      if (currentPrice >= barriers.target2) return 2;
      return 1;
    } else {
      if (currentPrice <= barriers.target3) return 3;
      if (currentPrice <= barriers.target2) return 2;
      return 1;
    }
  }

  /**
   * Check if stop loss barrier was touched
   */
  private touchedStopLoss(
    currentPrice: number,
    direction: 'LONG' | 'SHORT',
    barriers: TripleBarrier
  ): boolean {
    if (direction === 'LONG') {
      return currentPrice <= barriers.lowerBarrier; // Price fell to or below stop
    } else {
      return currentPrice >= barriers.lowerBarrier; // Price rose to or above stop
    }
  }

  /**
   * Create WIN outcome when take profit is hit
   */
  private createWinOutcome(
    signal: HubSignal,
    exitPrice: number,
    targetLevel: 1 | 2 | 3,
    highestPrice: number,
    lowestPrice: number,
    startTime: number
  ): BarrierOutcome {
    const entryPrice = signal.entry || exitPrice;
    const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    const holdDuration = Date.now() - startTime;
    const exitTime = Date.now();

    const outcomes: Record<1 | 2 | 3, MLOutcomeClass> = {
      1: 'WIN_TP1',
      2: 'WIN_TP2',
      3: 'WIN_TP3'
    };

    const outcome = outcomes[targetLevel];
    const targetNames = { 1: 'TP1', 2: 'TP2', 3: 'TP3' };

    console.log(
      `[Triple Barrier] ✅ ${outcome} | ${signal.symbol} | ` +
      `Return: ${returnPct.toFixed(2)}% | Duration: ${Math.round(holdDuration / 1000)}s`
    );

    return {
      outcome,
      exitPrice,
      exitTime,
      returnPct: signal.direction === 'SHORT' ? -returnPct : returnPct,
      holdDuration,
      reason: `Take profit ${targetNames[targetLevel]} reached`,
      priceMovement: returnPct,
      expectedMovement: ((signal.targets?.[0] || exitPrice) - entryPrice) / entryPrice * 100,
      highestPrice,
      lowestPrice
    };
  }

  /**
   * Create LOSS outcome when stop loss is hit
   */
  private createLossOutcome(
    signal: HubSignal,
    exitPrice: number,
    barriers: TripleBarrier,
    highestPrice: number,
    lowestPrice: number,
    startTime: number
  ): BarrierOutcome {
    const entryPrice = signal.entry || exitPrice;
    const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    const holdDuration = Date.now() - startTime;
    const exitTime = Date.now();

    // Check if we had some profit before hitting stop (PARTIAL LOSS)
    const direction = signal.direction!;
    const hadProfit = direction === 'LONG'
      ? highestPrice > entryPrice * 1.005  // Was up >0.5% at some point
      : lowestPrice < entryPrice * 0.995;  // Was down >0.5% at some point

    const outcome: MLOutcomeClass = hadProfit ? 'LOSS_PARTIAL' : 'LOSS_SL';

    console.log(
      `[Triple Barrier] ❌ ${outcome} | ${signal.symbol} | ` +
      `Return: ${returnPct.toFixed(2)}% | Duration: ${Math.round(holdDuration / 1000)}s`
    );

    return {
      outcome,
      exitPrice,
      exitTime,
      returnPct: signal.direction === 'SHORT' ? -returnPct : returnPct,
      holdDuration,
      reason: hadProfit
        ? 'Stop loss hit after being in profit'
        : 'Stop loss hit',
      priceMovement: returnPct,
      expectedMovement: ((signal.targets?.[0] || exitPrice) - entryPrice) / entryPrice * 100,
      highestPrice,
      lowestPrice
    };
  }

  /**
   * Create TIMEOUT outcome when time barrier is reached
   *
   * This is the KEY INNOVATION: Classify timeout into 4 distinct types
   * so ML models can learn different patterns.
   */
  private createTimeoutOutcome(
    signal: HubSignal,
    exitPrice: number,
    barriers: TripleBarrier,
    highestPrice: number,
    lowestPrice: number,
    startTime: number
  ): BarrierOutcome {
    const entryPrice = signal.entry || exitPrice;
    const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    const holdDuration = Date.now() - startTime;
    const exitTime = Date.now();

    const expectedMovePct = ((signal.targets?.[0] || exitPrice) - entryPrice) / entryPrice * 100;
    const direction = signal.direction!;

    // Adjust sign for SHORT positions
    const actualMovePct = direction === 'SHORT' ? -returnPct : returnPct;
    const expectedSignedMovePct = direction === 'SHORT' ? -expectedMovePct : expectedMovePct;

    let outcome: MLOutcomeClass;
    let reason: string;

    // CLASSIFICATION LOGIC:

    // 1. WRONG_DIRECTION: Moved significantly AGAINST position
    if (Math.sign(actualMovePct) !== Math.sign(expectedSignedMovePct) &&
        Math.abs(actualMovePct) > 0.5) {
      outcome = 'TIMEOUT_WRONG';
      reason = `Price moved ${actualMovePct.toFixed(2)}% in wrong direction (expected ${expectedSignedMovePct.toFixed(2)}%)`;
    }
    // 2. STAGNATION: Barely moved at all (<0.2%)
    else if (Math.abs(actualMovePct) < 0.2) {
      outcome = 'TIMEOUT_STAGNATION';
      reason = `Price barely moved (${actualMovePct.toFixed(2)}%), signal was premature`;
    }
    // 3. LOWVOL: Moved in right direction but not enough (<30% of expected)
    else if (Math.abs(actualMovePct) < Math.abs(expectedSignedMovePct) * 0.3) {
      outcome = 'TIMEOUT_LOWVOL';
      reason = `Insufficient volatility (moved ${actualMovePct.toFixed(2)}%, needed ${expectedSignedMovePct.toFixed(2)}%)`;
    }
    // 4. VALID: Moving correctly but ran out of time (>30% of expected, right direction)
    else {
      outcome = 'TIMEOUT_VALID';
      reason = `Signal valid, moving correctly (${actualMovePct.toFixed(2)}% of ${expectedSignedMovePct.toFixed(2)}% target), needed more time`;
    }

    console.log(
      `[Triple Barrier] ⏱️ ${outcome} | ${signal.symbol} | ` +
      `Move: ${actualMovePct.toFixed(2)}% (expected ${expectedSignedMovePct.toFixed(2)}%) | ` +
      `Duration: ${Math.round(holdDuration / 1000)}s`
    );

    return {
      outcome,
      exitPrice,
      exitTime,
      returnPct: direction === 'SHORT' ? -returnPct : returnPct,
      holdDuration,
      reason,
      priceMovement: actualMovePct,
      expectedMovement: expectedSignedMovePct,
      highestPrice,
      lowestPrice
    };
  }

  /**
   * Start monitoring a signal (non-blocking)
   * Returns immediately, calls callback when outcome is determined
   */
  startMonitoring(
    signal: HubSignal,
    barriers: TripleBarrier,
    onOutcome: (outcome: BarrierOutcome) => void
  ): void {
    const monitorId = signal.id;

    // Don't start if already monitoring
    if (this.activeMonitors.has(monitorId)) {
      console.warn(`[Triple Barrier] Already monitoring ${monitorId}`);
      return;
    }

    console.log(`[Triple Barrier] Starting monitor for ${signal.symbol} (${monitorId})`);

    // Start monitoring in background
    this.monitorSignal(signal, barriers)
      .then(outcome => {
        onOutcome(outcome);
        this.activeMonitors.delete(monitorId);
      })
      .catch(error => {
        console.error(`[Triple Barrier] Monitor error for ${signal.symbol}:`, error);
        this.activeMonitors.delete(monitorId);
      });

    // Track active monitor (placeholder, actual monitoring is promise-based)
    this.activeMonitors.set(monitorId, setTimeout(() => {}, barriers.timeBarrier - Date.now()));
  }

  /**
   * Stop monitoring a signal
   */
  stopMonitoring(signalId: string): void {
    const timeout = this.activeMonitors.get(signalId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeMonitors.delete(signalId);
      console.log(`[Triple Barrier] Stopped monitoring ${signalId}`);
    }
  }

  /**
   * Get count of actively monitored signals
   */
  getActiveCount(): number {
    return this.activeMonitors.size;
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== PRICE PROVIDERS =====

/**
 * Multi-Exchange Price Provider (RECOMMENDED)
 * Uses multiExchangeAggregatorV4 which already has real-time prices for ALL coins
 * Much faster and more reliable than external APIs
 */
export class MultiExchangePriceProvider implements PriceProvider {
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Get real-time ticker from multi-exchange aggregator
      const ticker = await multiExchangeAggregatorV4.getCanonicalTicker(symbol);

      if (!ticker || !ticker.last) {
        console.warn(`[Price Provider] No ticker data for ${symbol}`);
        return 0;
      }

      return ticker.last;

    } catch (error) {
      console.error(`[Price Provider] Error fetching ${symbol}:`, error);
      return 0;
    }
  }
}

/**
 * Simple price provider using CoinGecko API
 * ⚠️ DEPRECATED: Limited to ~8 coins, has rate limits, slower than multiExchangeAggregatorV4
 * Kept for backward compatibility only
 */
export class CoinGeckoPriceProvider implements PriceProvider {
  private readonly API_BASE = 'https://api.coingecko.com/api/v3';
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 10000; // Cache for 10 seconds

  async getCurrentPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.price;
    }

    // Convert symbol to CoinGecko ID (e.g., BTC/USDT → bitcoin)
    const coinId = this.symbolToCoinGeckoId(symbol);

    try {
      const response = await fetch(
        `${this.API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[coinId]?.usd;

      if (!price) {
        throw new Error(`No price data for ${symbol}`);
      }

      // Update cache
      this.priceCache.set(symbol, { price, timestamp: Date.now() });

      return price;

    } catch (error) {
      console.error(`[Price Provider] Error fetching ${symbol}:`, error);
      // Return cached price if available, even if stale
      return cached?.price || 0;
    }
  }

  private symbolToCoinGeckoId(symbol: string): string {
    // Simple mapping (expand as needed)
    const mapping: Record<string, string> = {
      'BTC/USDT': 'bitcoin',
      'BTC': 'bitcoin',
      'ETH/USDT': 'ethereum',
      'ETH': 'ethereum',
      'SOL/USDT': 'solana',
      'SOL': 'solana',
      'BNB/USDT': 'binancecoin',
      'BNB': 'binancecoin',
      'XRP/USDT': 'ripple',
      'XRP': 'ripple',
      'ADA/USDT': 'cardano',
      'ADA': 'cardano',
      'AVAX/USDT': 'avalanche-2',
      'AVAX': 'avalanche-2',
      'DOGE/USDT': 'dogecoin',
      'DOGE': 'dogecoin'
    };

    return mapping[symbol] || symbol.toLowerCase().replace('/usdt', '');
  }
}

// ✅ Export singleton instance with MultiExchange provider (supports ALL coins!)
export const tripleBarrierMonitor = new TripleBarrierMonitor(new MultiExchangePriceProvider());
