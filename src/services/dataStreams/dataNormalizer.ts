/**
 * DATA NORMALIZATION & VALIDATION LAYER
 * Ensures all data meets canonical schema standards
 * Validates, sanitizes, and rejects malformed data
 */

import { CanonicalTicker, DataQuality } from './canonicalDataTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NormalizationStats {
  totalProcessed: number;
  validData: number;
  rejectedData: number;
  warningsCount: number;
  lastUpdate: number;
}

export class DataNormalizer {
  private stats: NormalizationStats = {
    totalProcessed: 0,
    validData: 0,
    rejectedData: 0,
    warningsCount: 0,
    lastUpdate: Date.now()
  };

  /**
   * Validate canonical ticker data
   */
  validate(ticker: CanonicalTicker): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!ticker.symbol || ticker.symbol.trim() === '') {
      errors.push('Missing or empty symbol');
    }

    if (!ticker.exchange) {
      errors.push('Missing exchange source');
    }

    // Price validation
    if (typeof ticker.price !== 'number' || ticker.price <= 0) {
      errors.push(`Invalid price: ${ticker.price}`);
    }

    if (typeof ticker.bid !== 'number' || ticker.bid < 0) {
      errors.push(`Invalid bid price: ${ticker.bid}`);
    }

    if (typeof ticker.ask !== 'number' || ticker.ask < 0) {
      errors.push(`Invalid ask price: ${ticker.ask}`);
    }

    // Bid/ask spread validation
    if (ticker.bid > 0 && ticker.ask > 0) {
      if (ticker.bid > ticker.ask) {
        errors.push(`Bid price (${ticker.bid}) greater than ask price (${ticker.ask})`);
      }

      const spread = ((ticker.ask - ticker.bid) / ticker.bid) * 100;
      if (spread > 10) { // More than 10% spread is suspicious
        warnings.push(`Large bid-ask spread: ${spread.toFixed(2)}%`);
      }
    }

    // Volume validation
    if (typeof ticker.volume24h !== 'number' || ticker.volume24h < 0) {
      errors.push(`Invalid 24h volume: ${ticker.volume24h}`);
    }

    // High/Low validation
    if (typeof ticker.high24h !== 'number' || ticker.high24h <= 0) {
      errors.push(`Invalid 24h high: ${ticker.high24h}`);
    }

    if (typeof ticker.low24h !== 'number' || ticker.low24h <= 0) {
      errors.push(`Invalid 24h low: ${ticker.low24h}`);
    }

    if (ticker.low24h > ticker.high24h) {
      errors.push(`24h low (${ticker.low24h}) greater than 24h high (${ticker.high24h})`);
    }

    // Current price should be between high and low (with some tolerance for real-time updates)
    if (ticker.price < ticker.low24h * 0.95 || ticker.price > ticker.high24h * 1.05) {
      warnings.push(`Price (${ticker.price}) outside 24h range [${ticker.low24h}, ${ticker.high24h}]`);
    }

    // Timestamp validation
    if (typeof ticker.timestamp !== 'number' || ticker.timestamp <= 0) {
      errors.push(`Invalid timestamp: ${ticker.timestamp}`);
    }

    if (typeof ticker.receivedAt !== 'number' || ticker.receivedAt <= 0) {
      errors.push(`Invalid receivedAt: ${ticker.receivedAt}`);
    }

    // Check data freshness
    const age = Date.now() - ticker.timestamp;
    if (age > 60000) { // More than 1 minute old
      warnings.push(`Stale data: ${Math.floor(age / 1000)}s old`);
    }

    // Price change validation
    if (typeof ticker.priceChangePercent24h !== 'number') {
      errors.push(`Invalid price change percent: ${ticker.priceChangePercent24h}`);
    }

    // Extreme price movements should trigger warnings
    if (Math.abs(ticker.priceChangePercent24h) > 50) {
      warnings.push(`Extreme 24h price change: ${ticker.priceChangePercent24h.toFixed(2)}%`);
    }

    // Data quality validation
    if (!ticker.quality || !['HIGH', 'MEDIUM', 'LOW', 'STALE'].includes(ticker.quality)) {
      errors.push(`Invalid data quality: ${ticker.quality}`);
    }

    this.stats.totalProcessed++;
    if (errors.length > 0) {
      this.stats.rejectedData++;
    } else {
      this.stats.validData++;
    }
    if (warnings.length > 0) {
      this.stats.warningsCount++;
    }
    this.stats.lastUpdate = Date.now();

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize and normalize ticker data
   */
  sanitize(ticker: CanonicalTicker): CanonicalTicker {
    return {
      ...ticker,
      symbol: ticker.symbol.trim().toLowerCase(),
      price: this.roundPrice(ticker.price),
      bid: this.roundPrice(ticker.bid),
      ask: this.roundPrice(ticker.ask),
      volume24h: this.roundVolume(ticker.volume24h),
      volumeQuote: this.roundVolume(ticker.volumeQuote),
      priceChange24h: this.roundPrice(ticker.priceChange24h),
      priceChangePercent24h: this.roundPercent(ticker.priceChangePercent24h),
      priceChange1h: ticker.priceChange1h !== undefined ? this.roundPercent(ticker.priceChange1h) : undefined,
      high24h: this.roundPrice(ticker.high24h),
      low24h: this.roundPrice(ticker.low24h),
      timestamp: Math.floor(ticker.timestamp),
      receivedAt: Math.floor(ticker.receivedAt),
      quality: this.determineQuality(ticker)
    };
  }

  /**
   * Determine data quality based on age and source
   */
  private determineQuality(ticker: CanonicalTicker): DataQuality {
    const age = Date.now() - ticker.timestamp;

    if (age > 30000) return 'STALE';  // > 30s
    if (age > 10000) return 'LOW';    // > 10s
    if (age > 1000) return 'MEDIUM';  // > 1s
    return 'HIGH';                      // < 1s
  }

  /**
   * Round price to appropriate precision
   */
  private roundPrice(price: number): number {
    if (price >= 1000) {
      return Math.round(price * 100) / 100; // 2 decimals for high prices
    } else if (price >= 1) {
      return Math.round(price * 10000) / 10000; // 4 decimals
    } else if (price >= 0.01) {
      return Math.round(price * 1000000) / 1000000; // 6 decimals
    } else {
      return Math.round(price * 100000000) / 100000000; // 8 decimals
    }
  }

  /**
   * Round volume to appropriate precision
   */
  private roundVolume(volume: number): number {
    return Math.round(volume * 100) / 100; // 2 decimals for volume
  }

  /**
   * Round percentage to 2 decimals
   */
  private roundPercent(percent: number): number {
    return Math.round(percent * 100) / 100;
  }

  /**
   * Get normalization statistics
   */
  getStats(): NormalizationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      validData: 0,
      rejectedData: 0,
      warningsCount: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.stats.totalProcessed === 0) return 100;
    return (this.stats.validData / this.stats.totalProcessed) * 100;
  }
}

// Singleton instance
export const dataNormalizer = new DataNormalizer();
