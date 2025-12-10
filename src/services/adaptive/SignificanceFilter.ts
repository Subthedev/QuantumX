/**
 * SIGNIFICANCE FILTER SERVICE
 * Filters out market noise by ensuring triggers are truly significant
 *
 * PHILOSOPHY:
 * - Many triggers are just market noise (0.1% moves, 5% volume changes)
 * - We only want to analyze SIGNIFICANT movements that matter
 * - This reduces compute waste and improves signal quality
 * - Different coins have different volatility profiles (BTC vs SHIB)
 *
 * SIGNIFICANCE THRESHOLDS:
 * - Price Change: Minimum 1% move (not 0.1%)
 * - Volume Spike: Minimum 50% increase (not 10%)
 * - Order Book Imbalance: Minimum 20% (not 5%)
 * - Velocity: Minimum 0.5%/second (not 0.1%/s)
 * - Spread Widening: Minimum 2x increase (not 1.2x)
 *
 * ADAPTIVE SCALING:
 * - High volatility coins (>5% daily): Higher thresholds
 * - Low volatility coins (<1% daily): Lower thresholds
 * - Stablecoins: Ultra-low thresholds (0.1% is significant for USDT)
 */

interface SignificanceThresholds {
  minPriceChangePercent: number;
  minVolumeSpike: number;
  minOrderBookImbalance: number;
  minVelocityPerSecond: number;
  minSpreadWidening: number;
  minBidAskRatio: number;
}

interface VolatilityProfile {
  symbol: string;
  avgDailyVolatility: number;
  category: 'ULTRA_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  lastUpdated: number;
}

interface FilterResult {
  isSignificant: boolean;
  reason?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NOISE';
  confidence: number; // 0-100 confidence that this is significant
}

export class SignificanceFilter {
  private volatilityProfiles: Map<string, VolatilityProfile> = new Map();
  private readonly PROFILE_UPDATE_INTERVAL = 3600000; // 1 hour

  // Base thresholds (will be scaled by volatility)
  private readonly BASE_THRESHOLDS: SignificanceThresholds = {
    minPriceChangePercent: 1.0,     // 1% minimum price move
    minVolumeSpike: 1.5,            // 50% volume increase (1.5x)
    minOrderBookImbalance: 1.2,     // 20% imbalance (1.2 ratio)
    minVelocityPerSecond: 0.5,      // 0.5% per second minimum
    minSpreadWidening: 2.0,          // 2x spread increase
    minBidAskRatio: 0.7              // 30% deviation from 1.0 (0.7 or 1.3)
  };

  // Stablecoin list for ultra-low thresholds
  private readonly STABLECOINS = new Set([
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'FRAX', 'GUSD', 'USDD'
  ]);

  // Stats for monitoring
  private stats = {
    totalEvaluations: 0,
    significantTriggers: 0,
    noisyTriggers: 0,
    criticalTriggers: 0,
    filterRate: 0 // Percentage of triggers filtered as noise
  };

  /**
   * Check if a price change is significant
   */
  checkPriceSignificance(
    symbol: string,
    priceChangePercent: number,
    previousPrice: number,
    currentPrice: number
  ): FilterResult {
    this.stats.totalEvaluations++;

    const thresholds = this.getAdaptiveThresholds(symbol);
    const absChange = Math.abs(priceChangePercent);

    // Check absolute significance
    if (absChange < thresholds.minPriceChangePercent) {
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Price change ${absChange.toFixed(2)}% below threshold ${thresholds.minPriceChangePercent.toFixed(2)}%`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Calculate severity and confidence
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidence = 50;

    if (absChange > thresholds.minPriceChangePercent * 5) {
      severity = 'CRITICAL';
      confidence = 95;
      this.stats.criticalTriggers++;
    } else if (absChange > thresholds.minPriceChangePercent * 3) {
      severity = 'HIGH';
      confidence = 80;
    } else if (absChange > thresholds.minPriceChangePercent * 1.5) {
      severity = 'MEDIUM';
      confidence = 65;
    }

    this.stats.significantTriggers++;

    return {
      isSignificant: true,
      reason: `Significant price ${priceChangePercent > 0 ? 'surge' : 'drop'}: ${absChange.toFixed(2)}%`,
      severity,
      confidence
    };
  }

  /**
   * Check if volume change is significant
   */
  checkVolumeSignificance(
    symbol: string,
    currentVolume: number,
    previousVolume: number
  ): FilterResult {
    this.stats.totalEvaluations++;

    if (previousVolume === 0) {
      return {
        isSignificant: false,
        reason: 'No previous volume data',
        severity: 'NOISE',
        confidence: 0
      };
    }

    const thresholds = this.getAdaptiveThresholds(symbol);
    const volumeRatio = currentVolume / previousVolume;

    // Check if volume spike is significant
    if (volumeRatio < thresholds.minVolumeSpike) {
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Volume change ${((volumeRatio - 1) * 100).toFixed(0)}% below threshold ${((thresholds.minVolumeSpike - 1) * 100).toFixed(0)}%`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Calculate severity
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidence = 60;

    if (volumeRatio > 5.0) {
      severity = 'CRITICAL';
      confidence = 90;
      this.stats.criticalTriggers++;
    } else if (volumeRatio > 3.0) {
      severity = 'HIGH';
      confidence = 75;
    } else if (volumeRatio > 2.0) {
      severity = 'MEDIUM';
      confidence = 65;
    }

    this.stats.significantTriggers++;

    return {
      isSignificant: true,
      reason: `Significant volume spike: ${(volumeRatio).toFixed(1)}x increase`,
      severity,
      confidence
    };
  }

  /**
   * Check if order book imbalance is significant
   */
  checkOrderBookSignificance(
    symbol: string,
    bidAskRatio: number,
    buyPressure: number
  ): FilterResult {
    this.stats.totalEvaluations++;

    const thresholds = this.getAdaptiveThresholds(symbol);

    // Check if bid/ask ratio deviates significantly from 1.0
    const ratioDeviation = Math.abs(bidAskRatio - 1.0);
    const minDeviation = Math.abs(thresholds.minBidAskRatio - 1.0);

    if (ratioDeviation < minDeviation) {
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Order book balanced (ratio: ${bidAskRatio.toFixed(2)})`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Check buy pressure significance (should be far from 50%)
    const pressureDeviation = Math.abs(buyPressure - 50);
    if (pressureDeviation < 20) { // Less than 20% deviation from neutral
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Buy pressure neutral (${buyPressure.toFixed(0)}%)`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Calculate severity
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidence = 60;

    if (bidAskRatio > 2.0 || bidAskRatio < 0.5) {
      severity = 'CRITICAL';
      confidence = 85;
      this.stats.criticalTriggers++;
    } else if (bidAskRatio > 1.5 || bidAskRatio < 0.67) {
      severity = 'HIGH';
      confidence = 70;
    } else {
      severity = 'MEDIUM';
      confidence = 60;
    }

    this.stats.significantTriggers++;

    const direction = bidAskRatio > 1.0 ? 'bullish' : 'bearish';
    return {
      isSignificant: true,
      reason: `Significant ${direction} order book imbalance (ratio: ${bidAskRatio.toFixed(2)}, buy pressure: ${buyPressure.toFixed(0)}%)`,
      severity,
      confidence
    };
  }

  /**
   * Check if price velocity is significant
   */
  checkVelocitySignificance(
    symbol: string,
    velocityPerSecond: number
  ): FilterResult {
    this.stats.totalEvaluations++;

    const thresholds = this.getAdaptiveThresholds(symbol);
    const absVelocity = Math.abs(velocityPerSecond);

    if (absVelocity < thresholds.minVelocityPerSecond) {
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Velocity ${absVelocity.toFixed(3)}%/s below threshold ${thresholds.minVelocityPerSecond.toFixed(3)}%/s`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Calculate severity
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidence = 65;

    if (absVelocity > 2.0) { // 2% per second is extreme
      severity = 'CRITICAL';
      confidence = 95;
      this.stats.criticalTriggers++;
    } else if (absVelocity > 1.0) {
      severity = 'HIGH';
      confidence = 80;
    } else if (absVelocity > 0.75) {
      severity = 'MEDIUM';
      confidence = 70;
    }

    this.stats.significantTriggers++;

    return {
      isSignificant: true,
      reason: `Extreme velocity: ${absVelocity.toFixed(2)}%/second`,
      severity,
      confidence
    };
  }

  /**
   * Check if spread widening is significant
   */
  checkSpreadSignificance(
    symbol: string,
    spreadMultiplier: number
  ): FilterResult {
    this.stats.totalEvaluations++;

    const thresholds = this.getAdaptiveThresholds(symbol);

    if (spreadMultiplier < thresholds.minSpreadWidening) {
      this.stats.noisyTriggers++;
      return {
        isSignificant: false,
        reason: `Spread change ${spreadMultiplier.toFixed(1)}x below threshold ${thresholds.minSpreadWidening.toFixed(1)}x`,
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Calculate severity
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let confidence = 70;

    if (spreadMultiplier > 5.0) {
      severity = 'CRITICAL';
      confidence = 90;
      this.stats.criticalTriggers++;
    } else if (spreadMultiplier > 3.0) {
      severity = 'HIGH';
      confidence = 80;
    } else {
      severity = 'MEDIUM';
      confidence = 70;
    }

    this.stats.significantTriggers++;

    return {
      isSignificant: true,
      reason: `Significant spread widening: ${spreadMultiplier.toFixed(1)}x`,
      severity,
      confidence
    };
  }

  /**
   * Combined significance check for all trigger factors
   */
  evaluateTriggerSignificance(
    symbol: string,
    priceChangePercent: number,
    velocityPerSecond: number,
    currentVolume: number,
    previousVolume: number,
    bidAskRatio?: number,
    buyPressure?: number,
    spreadMultiplier?: number
  ): FilterResult {
    const results: FilterResult[] = [];

    // Check price significance
    results.push(this.checkPriceSignificance(
      symbol,
      priceChangePercent,
      0, // Previous price not needed for percentage check
      0  // Current price not needed for percentage check
    ));

    // Check velocity significance
    results.push(this.checkVelocitySignificance(symbol, velocityPerSecond));

    // Check volume significance if data available
    if (previousVolume > 0) {
      results.push(this.checkVolumeSignificance(symbol, currentVolume, previousVolume));
    }

    // Check order book significance if data available
    if (bidAskRatio !== undefined && buyPressure !== undefined) {
      results.push(this.checkOrderBookSignificance(symbol, bidAskRatio, buyPressure));
    }

    // Check spread significance if data available
    if (spreadMultiplier !== undefined) {
      results.push(this.checkSpreadSignificance(symbol, spreadMultiplier));
    }

    // Find the most significant result
    const significantResults = results.filter(r => r.isSignificant);

    if (significantResults.length === 0) {
      return {
        isSignificant: false,
        reason: 'No significant market changes detected',
        severity: 'NOISE',
        confidence: 0
      };
    }

    // Return the highest severity result
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const highestSeverity = significantResults.reduce((prev, curr) => {
      const prevIndex = severityOrder.indexOf(prev.severity);
      const currIndex = severityOrder.indexOf(curr.severity);
      return currIndex < prevIndex ? curr : prev;
    });

    // Boost confidence if multiple factors are significant
    if (significantResults.length > 2) {
      highestSeverity.confidence = Math.min(100, highestSeverity.confidence + 10);
    }

    return highestSeverity;
  }

  /**
   * Get adaptive thresholds based on coin volatility
   */
  private getAdaptiveThresholds(symbol: string): SignificanceThresholds {
    const profile = this.getVolatilityProfile(symbol);

    // Scale thresholds based on volatility category
    let multiplier = 1.0;

    switch (profile.category) {
      case 'ULTRA_LOW': // Stablecoins
        multiplier = 0.1; // 10x more sensitive
        break;
      case 'LOW': // BTC, ETH
        multiplier = 0.5;
        break;
      case 'MEDIUM': // Most altcoins
        multiplier = 1.0;
        break;
      case 'HIGH': // Volatile altcoins
        multiplier = 1.5;
        break;
      case 'EXTREME': // Meme coins
        multiplier = 2.0;
        break;
    }

    return {
      minPriceChangePercent: this.BASE_THRESHOLDS.minPriceChangePercent * multiplier,
      minVolumeSpike: this.BASE_THRESHOLDS.minVolumeSpike,  // Volume thresholds don't scale
      minOrderBookImbalance: this.BASE_THRESHOLDS.minOrderBookImbalance,
      minVelocityPerSecond: this.BASE_THRESHOLDS.minVelocityPerSecond * multiplier,
      minSpreadWidening: this.BASE_THRESHOLDS.minSpreadWidening,
      minBidAskRatio: 1.0 - (1.0 - this.BASE_THRESHOLDS.minBidAskRatio) * multiplier
    };
  }

  /**
   * Get or create volatility profile for a symbol
   */
  private getVolatilityProfile(symbol: string): VolatilityProfile {
    const upperSymbol = symbol.toUpperCase();

    // Check if stablecoin
    if (this.STABLECOINS.has(upperSymbol)) {
      return {
        symbol: upperSymbol,
        avgDailyVolatility: 0.1,
        category: 'ULTRA_LOW',
        lastUpdated: Date.now()
      };
    }

    // Check cached profile
    const cached = this.volatilityProfiles.get(upperSymbol);
    if (cached && Date.now() - cached.lastUpdated < this.PROFILE_UPDATE_INTERVAL) {
      return cached;
    }

    // Create default profile based on common coins
    let category: VolatilityProfile['category'] = 'MEDIUM';
    let avgDailyVolatility = 3.0;

    // Categorize known coins
    if (upperSymbol === 'BTC' || upperSymbol === 'ETH') {
      category = 'LOW';
      avgDailyVolatility = 2.0;
    } else if (upperSymbol.includes('DOGE') || upperSymbol.includes('SHIB') || upperSymbol.includes('PEPE')) {
      category = 'EXTREME';
      avgDailyVolatility = 10.0;
    } else if (upperSymbol.includes('BNB') || upperSymbol.includes('SOL') || upperSymbol.includes('ADA')) {
      category = 'MEDIUM';
      avgDailyVolatility = 4.0;
    }

    const profile: VolatilityProfile = {
      symbol: upperSymbol,
      avgDailyVolatility,
      category,
      lastUpdated: Date.now()
    };

    this.volatilityProfiles.set(upperSymbol, profile);
    return profile;
  }

  /**
   * Update volatility profile based on observed data
   */
  updateVolatilityProfile(symbol: string, dailyVolatility: number) {
    const upperSymbol = symbol.toUpperCase();

    // Don't update stablecoins
    if (this.STABLECOINS.has(upperSymbol)) {
      return;
    }

    // Categorize based on volatility
    let category: VolatilityProfile['category'];
    if (dailyVolatility < 0.5) {
      category = 'ULTRA_LOW';
    } else if (dailyVolatility < 2.0) {
      category = 'LOW';
    } else if (dailyVolatility < 5.0) {
      category = 'MEDIUM';
    } else if (dailyVolatility < 10.0) {
      category = 'HIGH';
    } else {
      category = 'EXTREME';
    }

    const profile: VolatilityProfile = {
      symbol: upperSymbol,
      avgDailyVolatility: dailyVolatility,
      category,
      lastUpdated: Date.now()
    };

    this.volatilityProfiles.set(upperSymbol, profile);

    console.log(`[SignificanceFilter] Updated ${upperSymbol} profile: ${category} (${dailyVolatility.toFixed(1)}% daily volatility)`);
  }

  /**
   * Get filter statistics
   */
  getStats() {
    const filterRate = this.stats.totalEvaluations > 0
      ? (this.stats.noisyTriggers / this.stats.totalEvaluations) * 100
      : 0;

    return {
      ...this.stats,
      filterRate: Math.round(filterRate),
      significanceRate: Math.round(100 - filterRate)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalEvaluations: 0,
      significantTriggers: 0,
      noisyTriggers: 0,
      criticalTriggers: 0,
      filterRate: 0
    };
  }

  /**
   * Clear all cached profiles
   */
  clearProfiles() {
    this.volatilityProfiles.clear();
  }
}

// Singleton instance
export const significanceFilter = new SignificanceFilter();