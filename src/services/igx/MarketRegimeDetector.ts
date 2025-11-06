/**
 * MARKET REGIME DETECTOR
 * Institutional-Grade Market Phase Detection
 *
 * Inspired by Jump Trading, Jane Street, Citadel quant approaches
 *
 * REGIMES:
 * - BULL_MOMENTUM: Strong uptrend with momentum
 * - BEAR_MOMENTUM: Strong downtrend with momentum
 * - BULL_RANGE: Upward bias but range-bound
 * - BEAR_RANGE: Downward bias but range-bound
 * - CHOPPY: No clear direction, whipsaw conditions
 * - VOLATILE_BREAKOUT: High volatility with directional break
 * - ACCUMULATION: Low volatility consolidation before move
 *
 * Each regime has different optimal:
 * - Strategy selection
 * - Consensus thresholds
 * - Position sizing
 * - Risk management
 */

import { technicalAnalysisService } from '../technicalAnalysis';

export type MarketRegime =
  | 'BULL_MOMENTUM'
  | 'BEAR_MOMENTUM'
  | 'BULL_RANGE'
  | 'BEAR_RANGE'
  | 'CHOPPY'
  | 'VOLATILE_BREAKOUT'
  | 'ACCUMULATION';

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number; // 0-100
  trendStrength: number; // 0-100 (0 = mean-reverting, 100 = trending)
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  volumeProfile: 'DECLINING' | 'STABLE' | 'INCREASING' | 'SURGING';

  // Adaptive parameters based on regime
  optimalConsensusThreshold: number; // 40-60%
  qualityTierAdjustment: number; // -10 to +10 points
  recommendedStrategies: string[]; // Which strategies perform best
  positionSizeMultiplier: number; // 0.5 to 1.5

  // Technical context
  rsi: number;
  atr: number; // Average True Range
  bbWidth: number; // Bollinger Band Width
  emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volumeTrend: 'UP' | 'DOWN' | 'FLAT';
}

export class MarketRegimeDetector {
  private previousRegime: MarketRegime | null = null;
  private regimeStartTime: number = 0;
  private regimeHistory: { regime: MarketRegime; timestamp: number; duration: number }[] = [];

  /**
   * Detect current market regime from OHLC data
   */
  detect(candles: any[], symbol: string): RegimeAnalysis {
    if (!candles || candles.length < 50) {
      console.warn(`[RegimeDetector] Insufficient data for ${symbol}`);
      return this.getDefaultRegime();
    }

    // Calculate technical indicators
    const technicals = technicalAnalysisService.analyzeTechnicals(candles);
    const rsi = technicals.rsi;
    const macd = technicals.macd;

    // EMAs for trend
    const ema20 = technicalAnalysisService.calculateEMA(candles, 20);
    const ema50 = technicalAnalysisService.calculateEMA(candles, 50);
    const ema200 = technicalAnalysisService.calculateEMA(candles, 200);
    const currentPrice = candles[candles.length - 1].close;

    // ATR for volatility
    const atr = this.calculateATR(candles, 14);
    const atrPercent = (atr / currentPrice) * 100;

    // Bollinger Band Width for volatility regime
    const bbWidth = this.calculateBollingerBandWidth(candles, 20, 2);

    // Volume analysis
    const volumeTrend = this.analyzeVolumeTrend(candles);
    const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const volumeRatio = recentVolume / avgVolume;

    // EMA Alignment
    let emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (ema20 > ema50 && ema50 > ema200 && currentPrice > ema20) {
      emaAlignment = 'BULLISH';
    } else if (ema20 < ema50 && ema50 < ema200 && currentPrice < ema20) {
      emaAlignment = 'BEARISH';
    } else {
      emaAlignment = 'NEUTRAL';
    }

    // Trend strength (0-100)
    const trendStrength = this.calculateTrendStrength(
      currentPrice,
      ema20,
      ema50,
      ema200,
      rsi,
      macd
    );

    // Volatility classification
    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    if (atrPercent < 2) volatility = 'LOW';
    else if (atrPercent < 4) volatility = 'MEDIUM';
    else if (atrPercent < 7) volatility = 'HIGH';
    else volatility = 'EXTREME';

    // Volume profile
    let volumeProfile: 'DECLINING' | 'STABLE' | 'INCREASING' | 'SURGING';
    if (volumeRatio < 0.7) volumeProfile = 'DECLINING';
    else if (volumeRatio < 1.1) volumeProfile = 'STABLE';
    else if (volumeRatio < 1.5) volumeProfile = 'INCREASING';
    else volumeProfile = 'SURGING';

    // REGIME DETECTION LOGIC
    let regime: MarketRegime;
    let confidence: number;

    // 1. VOLATILE BREAKOUT (ATR spike + volume spike + directional move)
    if (volatility === 'HIGH' || volatility === 'EXTREME') {
      if (volumeProfile === 'SURGING' && Math.abs(rsi - 50) > 15) {
        regime = 'VOLATILE_BREAKOUT';
        confidence = Math.min(95, 60 + Math.abs(rsi - 50) + (atrPercent * 2));
      }
      // 2. CHOPPY (high volatility but no trend)
      else if (trendStrength < 40) {
        regime = 'CHOPPY';
        confidence = 70;
      }
      // 3. BULL_MOMENTUM or BEAR_MOMENTUM (volatile trending)
      else if (trendStrength >= 70 && emaAlignment !== 'NEUTRAL') {
        regime = emaAlignment === 'BULLISH' ? 'BULL_MOMENTUM' : 'BEAR_MOMENTUM';
        confidence = trendStrength;
      } else {
        regime = 'CHOPPY';
        confidence = 65;
      }
    }
    // 4. ACCUMULATION (low volatility consolidation)
    else if (volatility === 'LOW' && bbWidth < 0.03 && volumeProfile !== 'SURGING') {
      regime = 'ACCUMULATION';
      confidence = 75;
    }
    // 5. BULL_MOMENTUM (strong uptrend)
    else if (trendStrength >= 70 && emaAlignment === 'BULLISH' && rsi > 55) {
      regime = 'BULL_MOMENTUM';
      confidence = trendStrength;
    }
    // 6. BEAR_MOMENTUM (strong downtrend)
    else if (trendStrength >= 70 && emaAlignment === 'BEARISH' && rsi < 45) {
      regime = 'BEAR_MOMENTUM';
      confidence = trendStrength;
    }
    // 7. BULL_RANGE (upward bias but range-bound)
    else if (trendStrength >= 45 && trendStrength < 70 && emaAlignment === 'BULLISH') {
      regime = 'BULL_RANGE';
      confidence = 60 + (trendStrength - 45);
    }
    // 8. BEAR_RANGE (downward bias but range-bound)
    else if (trendStrength >= 45 && trendStrength < 70 && emaAlignment === 'BEARISH') {
      regime = 'BEAR_RANGE';
      confidence = 60 + (trendStrength - 45);
    }
    // 9. CHOPPY (default when no clear regime)
    else {
      regime = 'CHOPPY';
      confidence = Math.min(80, 50 + (50 - trendStrength) / 2);
    }

    // Track regime changes
    if (this.previousRegime !== regime) {
      if (this.previousRegime) {
        const duration = Date.now() - this.regimeStartTime;
        this.regimeHistory.push({
          regime: this.previousRegime,
          timestamp: this.regimeStartTime,
          duration
        });

        // Keep last 50 regime changes
        if (this.regimeHistory.length > 50) {
          this.regimeHistory = this.regimeHistory.slice(-50);
        }
      }

      this.previousRegime = regime;
      this.regimeStartTime = Date.now();

      console.log(
        `\n[RegimeDetector] 🎯 REGIME CHANGE: ${regime} ` +
        `(${confidence.toFixed(0)}% confidence) | ${symbol}\n` +
        `[RegimeDetector] Trend: ${trendStrength.toFixed(0)} | Vol: ${volatility} | EMA: ${emaAlignment}`
      );
    }

    // Generate adaptive parameters
    const adaptiveParams = this.getAdaptiveParameters(regime, trendStrength, volatility);

    return {
      regime,
      confidence,
      trendStrength,
      volatility,
      volumeProfile,
      optimalConsensusThreshold: adaptiveParams.consensusThreshold,
      qualityTierAdjustment: adaptiveParams.qualityAdjustment,
      recommendedStrategies: adaptiveParams.strategies,
      positionSizeMultiplier: adaptiveParams.positionMultiplier,
      rsi,
      atr: atrPercent,
      bbWidth,
      emaAlignment,
      volumeTrend: volumeTrend as 'UP' | 'DOWN' | 'FLAT'
    };
  }

  /**
   * Get adaptive parameters for each regime
   * This is where quant magic happens - regime-specific optimization
   */
  private getAdaptiveParameters(
    regime: MarketRegime,
    trendStrength: number,
    volatility: string
  ): {
    consensusThreshold: number;
    qualityAdjustment: number;
    strategies: string[];
    positionMultiplier: number;
  } {
    switch (regime) {
      case 'BULL_MOMENTUM':
        return {
          consensusThreshold: 42, // LOWER - momentum strategies aligned
          qualityAdjustment: +8, // BOOST quality
          strategies: [
            'GOLDEN_CROSS_MOMENTUM',
            'MOMENTUM_SURGE',
            'LIQUIDITY_HUNTER',
            'FEAR_GREED_CONTRARIAN' // Contrarian helps catch pullbacks
          ],
          positionMultiplier: 1.3 // LARGER positions in strong trends
        };

      case 'BEAR_MOMENTUM':
        return {
          consensusThreshold: 42,
          qualityAdjustment: +8,
          strategies: [
            'GOLDEN_CROSS_MOMENTUM', // Death cross
            'MOMENTUM_SURGE',
            'FEAR_GREED_CONTRARIAN',
            'VOLATILITY_BREAKOUT'
          ],
          positionMultiplier: 1.2 // Slightly smaller (bear moves faster)
        };

      case 'BULL_RANGE':
        return {
          consensusThreshold: 48,
          qualityAdjustment: +4,
          strategies: [
            'SPRING_TRAP',
            'WHALE_SHADOW',
            'LIQUIDITY_HUNTER',
            'MARKET_PHASE_SNIPER'
          ],
          positionMultiplier: 1.0
        };

      case 'BEAR_RANGE':
        return {
          consensusThreshold: 48,
          qualityAdjustment: +4,
          strategies: [
            'SPRING_TRAP',
            'WHALE_SHADOW',
            'FUNDING_SQUEEZE',
            'ORDER_FLOW_TSUNAMI'
          ],
          positionMultiplier: 0.9 // Smaller in bearish ranges
        };

      case 'CHOPPY':
        return {
          consensusThreshold: 58, // HIGHER - require strong consensus
          qualityAdjustment: -5, // PENALIZE - choppy is dangerous
          strategies: [
            'SPRING_TRAP', // Best for chop
            'VOLATILITY_BREAKOUT',
            'MARKET_PHASE_SNIPER'
          ],
          positionMultiplier: 0.6 // MUCH SMALLER - high risk
        };

      case 'VOLATILE_BREAKOUT':
        return {
          consensusThreshold: 45,
          qualityAdjustment: +10, // MAXIMUM BOOST - clear directional move
          strategies: [
            'VOLATILITY_BREAKOUT',
            'MOMENTUM_SURGE',
            'ORDER_FLOW_TSUNAMI',
            'LIQUIDITY_HUNTER',
            'GOLDEN_CROSS_MOMENTUM'
          ],
          positionMultiplier: 1.5 // MAXIMUM SIZE - high conviction
        };

      case 'ACCUMULATION':
        return {
          consensusThreshold: 52,
          qualityAdjustment: 0,
          strategies: [
            'WHALE_SHADOW', // Whales accumulate in low vol
            'SPRING_TRAP',
            'FUNDING_SQUEEZE',
            'MARKET_PHASE_SNIPER'
          ],
          positionMultiplier: 0.8 // Smaller - waiting for breakout
        };

      default:
        return {
          consensusThreshold: 50,
          qualityAdjustment: 0,
          strategies: [],
          positionMultiplier: 1.0
        };
    }
  }

  /**
   * Calculate Average True Range (volatility)
   */
  private calculateATR(candles: any[], period: number): number {
    if (candles.length < period + 1) return 0;

    let atr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      atr += tr;
    }

    return atr / period;
  }

  /**
   * Calculate Bollinger Band Width (volatility indicator)
   */
  private calculateBollingerBandWidth(candles: any[], period: number, stdDev: number): number {
    if (candles.length < period) return 0;

    const closes = candles.slice(-period).map((c: any) => c.close);
    const sma = closes.reduce((sum: number, val: number) => sum + val, 0) / period;

    const variance =
      closes.reduce((sum: number, val: number) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    const upperBand = sma + stdDev * std;
    const lowerBand = sma - stdDev * std;

    return (upperBand - lowerBand) / sma; // Normalized width
  }

  /**
   * Calculate trend strength (0-100)
   */
  private calculateTrendStrength(
    price: number,
    ema20: number,
    ema50: number,
    ema200: number,
    rsi: number,
    macd: any
  ): number {
    let strength = 0;

    // EMA alignment (40 points)
    if ((ema20 > ema50 && ema50 > ema200) || (ema20 < ema50 && ema50 < ema200)) {
      strength += 40;
    } else if ((ema20 > ema50) || (ema20 < ema50)) {
      strength += 20;
    }

    // Price relative to EMAs (20 points)
    if ((price > ema20 && price > ema50) || (price < ema20 && price < ema50)) {
      strength += 20;
    }

    // RSI extreme (20 points)
    if (Math.abs(rsi - 50) > 15) {
      strength += Math.min(20, Math.abs(rsi - 50));
    }

    // MACD crossover (20 points)
    if (macd.crossover === 'BULLISH' || macd.crossover === 'BEARISH') {
      strength += 20;
    }

    return Math.min(100, strength);
  }

  /**
   * Analyze volume trend
   */
  private analyzeVolumeTrend(candles: any[]): string {
    if (candles.length < 20) return 'FLAT';

    const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const olderVolume = candles.slice(-20, -10).reduce((sum, c) => sum + c.volume, 0) / 10;

    if (recentVolume > olderVolume * 1.15) return 'UP';
    if (recentVolume < olderVolume * 0.85) return 'DOWN';
    return 'FLAT';
  }

  /**
   * Get default regime (used when insufficient data)
   */
  private getDefaultRegime(): RegimeAnalysis {
    return {
      regime: 'CHOPPY',
      confidence: 50,
      trendStrength: 50,
      volatility: 'MEDIUM',
      volumeProfile: 'STABLE',
      optimalConsensusThreshold: 50,
      qualityTierAdjustment: 0,
      recommendedStrategies: [],
      positionSizeMultiplier: 1.0,
      rsi: 50,
      atr: 3,
      bbWidth: 0.04,
      emaAlignment: 'NEUTRAL',
      volumeTrend: 'FLAT'
    };
  }

  /**
   * Get regime history
   */
  getRegimeHistory(): { regime: MarketRegime; timestamp: number; duration: number }[] {
    return [...this.regimeHistory];
  }

  /**
   * Get current regime duration
   */
  getCurrentRegimeDuration(): number {
    return Date.now() - this.regimeStartTime;
  }
}

// Singleton instance
export const marketRegimeDetector = new MarketRegimeDetector();
