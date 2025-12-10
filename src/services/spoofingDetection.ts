/**
 * SPOOFING DETECTION MODULE
 * Detects fake order book walls that manipulate buy/sell pressure readings
 *
 * INSTITUTIONAL INSIGHT:
 * Spoofing = placing large fake orders to create illusion of demand/supply, then cancelling before execution
 * Real institutional flow has different characteristics than spoofing
 *
 * DETECTION METHODS:
 * 1. Order lifetime tracking - Real orders persist, fake orders flash
 * 2. Depth consistency - Track if walls repeatedly appear/disappear
 * 3. Size distribution - Real flow is distributed, spoofing is concentrated
 * 4. Cancellation rate - Track order cancellations vs executions
 * 5. Time-weighted scoring - Penalize short-lived orders
 */

export interface OrderBookSnapshot {
  timestamp: number;
  bids: Array<{ price: number; amount: number }>;
  asks: Array<{ price: number; amount: number }>;
  buyPressure: number;
  bidAskRatio: number;
}

export interface SpoofingAnalysis {
  isSpoofed: boolean;
  spoofingScore: number; // 0-100, higher = more likely spoofed
  trustScore: number; // 0-100, higher = more trustworthy
  reasons: string[];
  adjustedBuyPressure: number; // Buy pressure after removing suspected spoofing
  adjustedBidAskRatio: number;
}

class SpoofingDetectionService {
  private orderBookHistory: Map<string, OrderBookSnapshot[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 20; // Keep last 20 snapshots per symbol
  private readonly SPOOF_LIFETIME_THRESHOLD = 15000; // 15 seconds (spoofing orders flash quickly)
  private readonly WALL_SIZE_PERCENTILE = 0.85; // Orders in top 15% by size are considered "walls"

  /**
   * Analyze order book for spoofing patterns
   */
  analyzeOrderBook(
    symbol: string,
    currentSnapshot: OrderBookSnapshot
  ): SpoofingAnalysis {
    const reasons: string[] = [];
    let spoofingScore = 0;
    let adjustedBuyPressure = currentSnapshot.buyPressure;
    let adjustedBidAskRatio = currentSnapshot.bidAskRatio;

    // Store current snapshot in history
    if (!this.orderBookHistory.has(symbol)) {
      this.orderBookHistory.set(symbol, []);
    }
    const history = this.orderBookHistory.get(symbol)!;
    history.push(currentSnapshot);

    // Keep only recent history
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }

    // Need at least 5 snapshots to detect patterns
    if (history.length < 5) {
      return {
        isSpoofed: false,
        spoofingScore: 0,
        trustScore: 100,
        reasons: ['Insufficient history for spoofing detection (need 5+ snapshots)'],
        adjustedBuyPressure,
        adjustedBidAskRatio
      };
    }

    // 1. WALL FLASHING DETECTION
    const wallFlashingScore = this.detectWallFlashing(history);
    if (wallFlashingScore > 30) {
      spoofingScore += wallFlashingScore;
      reasons.push(`🚨 Wall Flashing: Large orders appearing/disappearing (+${wallFlashingScore.toFixed(0)} spoof score)`);
    }

    // 2. ORDER SIZE CONCENTRATION
    const concentrationScore = this.analyzeOrderConcentration(currentSnapshot);
    if (concentrationScore > 25) {
      spoofingScore += concentrationScore;
      reasons.push(`⚠️ Order Concentration: Few large orders dominate book (+${concentrationScore.toFixed(0)} spoof score)`);
    }

    // 3. BID/ASK VOLATILITY (rapid changes = manipulation)
    const volatilityScore = this.analyzeBidAskVolatility(history);
    if (volatilityScore > 20) {
      spoofingScore += volatilityScore;
      reasons.push(`📊 High Volatility: Bid/ask ratio fluctuating rapidly (+${volatilityScore.toFixed(0)} spoof score)`);
    }

    // 4. LAYERED SPOOFING (multiple walls at same distance)
    const layeringScore = this.detectLayeredSpoofing(currentSnapshot);
    if (layeringScore > 20) {
      spoofingScore += layeringScore;
      reasons.push(`🎯 Layered Spoofing: Multiple identical walls detected (+${layeringScore.toFixed(0)} spoof score)`);
    }

    // 5. TIME-WEIGHTED CONSISTENCY
    const consistencyScore = this.analyzeTimeWeightedConsistency(history);
    if (consistencyScore < 50) {
      const penalty = (50 - consistencyScore) / 2;
      spoofingScore += penalty;
      reasons.push(`⏱️ Low Consistency: Order book unstable over time (+${penalty.toFixed(0)} spoof score)`);
    }

    // Calculate trust score (inverse of spoofing score)
    const trustScore = Math.max(0, 100 - spoofingScore);

    // Determine if definitely spoofed (threshold: 50%)
    const isSpoofed = spoofingScore >= 50;

    // Adjust buy pressure if spoofing detected
    if (spoofingScore > 30) {
      // Reduce buy pressure confidence based on spoofing score
      const adjustmentFactor = 1 - (spoofingScore / 200); // Max 50% reduction
      const pressureDelta = currentSnapshot.buyPressure - 50; // Distance from neutral
      adjustedBuyPressure = 50 + (pressureDelta * adjustmentFactor);

      reasons.push(`🔧 Adjusted Buy Pressure: ${currentSnapshot.buyPressure.toFixed(1)}% → ${adjustedBuyPressure.toFixed(1)}% (spoofing correction)`);

      // Also adjust bid/ask ratio
      if (currentSnapshot.bidAskRatio > 1) {
        adjustedBidAskRatio = 1 + ((currentSnapshot.bidAskRatio - 1) * adjustmentFactor);
      } else {
        adjustedBidAskRatio = 1 - ((1 - currentSnapshot.bidAskRatio) * adjustmentFactor);
      }
    }

    if (isSpoofed) {
      reasons.push(`❌ SPOOFING DETECTED: Order book appears manipulated (${spoofingScore.toFixed(0)}% confidence)`);
    } else if (spoofingScore > 30) {
      reasons.push(`⚠️ Possible Spoofing: Moderate manipulation signals detected`);
    } else {
      reasons.push(`✅ Clean Order Book: No significant spoofing detected`);
    }

    return {
      isSpoofed,
      spoofingScore: Math.min(100, spoofingScore),
      trustScore,
      reasons,
      adjustedBuyPressure,
      adjustedBidAskRatio
    };
  }

  /**
   * Detect walls that appear and disappear repeatedly (flashing)
   */
  private detectWallFlashing(history: OrderBookSnapshot[]): number {
    let flashingScore = 0;
    const timeWindow = 60000; // 1 minute window

    // Track large bid/ask changes between snapshots
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const timeDiff = curr.timestamp - prev.timestamp;

      if (timeDiff < this.SPOOF_LIFETIME_THRESHOLD) {
        // Very rapid changes (< 15 seconds) = likely spoofing
        const pressureChange = Math.abs(curr.buyPressure - prev.buyPressure);
        const ratioChange = Math.abs(curr.bidAskRatio - prev.bidAskRatio);

        if (pressureChange > 15) { // >15% pressure change in <15 seconds
          flashingScore += 15;
        } else if (pressureChange > 10) {
          flashingScore += 10;
        }

        if (ratioChange > 0.5) { // Big ratio swings
          flashingScore += 10;
        }
      }
    }

    return Math.min(flashingScore, 40); // Cap at 40
  }

  /**
   * Analyze if orders are concentrated in few large sizes (spoofing pattern)
   */
  private analyzeOrderConcentration(snapshot: OrderBookSnapshot): number {
    const allOrders = [...snapshot.bids, ...snapshot.asks];
    if (allOrders.length < 10) return 0;

    const sortedBySize = allOrders.sort((a, b) => b.amount - a.amount);
    const totalVolume = allOrders.reduce((sum, o) => sum + o.amount, 0);

    // Check if top 3 orders dominate the book
    const top3Volume = sortedBySize.slice(0, 3).reduce((sum, o) => sum + o.amount, 0);
    const top3Percent = (top3Volume / totalVolume) * 100;

    if (top3Percent > 60) {
      return 35; // Extremely concentrated = likely spoofing
    } else if (top3Percent > 50) {
      return 25;
    } else if (top3Percent > 40) {
      return 15;
    }

    return 0;
  }

  /**
   * Analyze bid/ask ratio volatility (rapid swings = manipulation)
   */
  private analyzeBidAskVolatility(history: OrderBookSnapshot[]): number {
    if (history.length < 5) return 0;

    const recentHistory = history.slice(-10);
    const ratios = recentHistory.map(s => s.bidAskRatio);

    // Calculate standard deviation
    const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
    const stdDev = Math.sqrt(variance);

    // High volatility in short time = manipulation
    if (stdDev > 0.8) {
      return 30;
    } else if (stdDev > 0.5) {
      return 20;
    } else if (stdDev > 0.3) {
      return 10;
    }

    return 0;
  }

  /**
   * Detect layered spoofing (multiple walls at same price intervals)
   */
  private detectLayeredSpoofing(snapshot: OrderBookSnapshot): number {
    let layeringScore = 0;

    // Check bids for layering
    const bidPrices = snapshot.bids.map(b => b.price);
    const bidAmounts = snapshot.bids.map(b => b.amount);

    // Look for multiple similar-sized orders at regular intervals
    const avgBidAmount = bidAmounts.reduce((sum, a) => sum + a, 0) / bidAmounts.length;
    const largeOrders = snapshot.bids.filter(b => b.amount > avgBidAmount * 2);

    if (largeOrders.length >= 3) {
      // Check if they're evenly spaced (layering pattern)
      const spacings: number[] = [];
      for (let i = 1; i < Math.min(largeOrders.length, 5); i++) {
        const spacing = Math.abs(largeOrders[i].price - largeOrders[i - 1].price);
        spacings.push(spacing);
      }

      // If spacings are similar, likely layered spoofing
      const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
      const spacingVariance = spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / spacings.length;

      if (spacingVariance < avgSpacing * 0.1) { // Very uniform spacing
        layeringScore = 25;
      }
    }

    return layeringScore;
  }

  /**
   * Analyze if order book is stable over time (real flow) or chaotic (spoofing)
   */
  private analyzeTimeWeightedConsistency(history: OrderBookSnapshot[]): number {
    if (history.length < 5) return 50;

    const recentHistory = history.slice(-10);

    // Calculate how consistent buy pressure has been
    const pressures = recentHistory.map(s => s.buyPressure);
    const avgPressure = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;

    let consistencyScore = 100;

    // Penalize for large deviations from average
    for (const pressure of pressures) {
      const deviation = Math.abs(pressure - avgPressure);
      if (deviation > 20) {
        consistencyScore -= 10;
      } else if (deviation > 10) {
        consistencyScore -= 5;
      }
    }

    return Math.max(0, consistencyScore);
  }

  /**
   * Clear history for a symbol (useful for testing or memory management)
   */
  clearHistory(symbol: string): void {
    this.orderBookHistory.delete(symbol);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.orderBookHistory.clear();
  }
}

export const spoofingDetection = new SpoofingDetectionService();
