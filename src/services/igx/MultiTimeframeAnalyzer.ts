/**
 * Multi-Timeframe Analyzer
 * Analyzes multiple timeframes simultaneously for confluence detection
 *
 * TIMEFRAME PYRAMID:
 * - 1m:  Ultra-short term, entry timing
 * - 5m:  Short term, momentum confirmation
 * - 15m: Medium term, pattern validation
 * - 1h:  Intraday trend
 * - 4h:  Swing trend
 * - 1d:  Primary trend
 *
 * CONFLUENCE SCORING:
 * - All timeframes aligned (6/6) = 100% confidence
 * - Majority aligned (4/6) = 67% confidence
 * - Mixed signals (3/6) = 50% confidence
 * - Divergence (<3/6) = Low confidence
 */

import type { TimeframeData } from './FeatureCache';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  trend: TrendDirection;
  strength: number; // 0-100
  momentum: number; // -100 to +100
  volatility: number; // 0-100
  volume: 'HIGH' | 'NORMAL' | 'LOW';
  support?: number;
  resistance?: number;
  confidence: number; // 0-100
}

export interface MultiTimeframeResult {
  symbol: string;
  timestamp: number;

  // Individual timeframe analyses
  timeframes: Map<Timeframe, TimeframeAnalysis>;

  // Confluence analysis
  confluence: {
    overallTrend: TrendDirection;
    alignment: number; // 0-100 (how aligned are timeframes)
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    strongestTimeframe: Timeframe;
    weakestTimeframe: Timeframe;
  };

  // Actionable signals
  signals: {
    entryQuality: number; // 0-100
    trendConfirmation: boolean;
    momentumConfirmation: boolean;
    volumeConfirmation: boolean;
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  };

  // Risk assessment
  risk: {
    volatilityRisk: 'HIGH' | 'MEDIUM' | 'LOW';
    trendRisk: 'HIGH' | 'MEDIUM' | 'LOW'; // Based on alignment
    overallRisk: number; // 0-100
  };
}

export class MultiTimeframeAnalyzer {
  private readonly TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Timeframe weights for confluence (higher timeframes = more weight)
  private readonly TIMEFRAME_WEIGHTS: Record<Timeframe, number> = {
    '1m': 0.05,
    '5m': 0.10,
    '15m': 0.15,
    '1h': 0.20,
    '4h': 0.25,
    '1d': 0.25
  };

  /**
   * Analyze multiple timeframes and detect confluence
   */
  analyze(
    symbol: string,
    timeframeData: Map<Timeframe, TimeframeData>
  ): MultiTimeframeResult {
    const timestamp = Date.now();

    // Analyze each timeframe
    const timeframes = new Map<Timeframe, TimeframeAnalysis>();
    for (const tf of this.TIMEFRAMES) {
      const data = timeframeData.get(tf);
      if (data) {
        timeframes.set(tf, this.analyzeTimeframe(tf, data));
      }
    }

    // Calculate confluence
    const confluence = this.calculateConfluence(timeframes);

    // Generate signals
    const signals = this.generateSignals(timeframes, confluence);

    // Assess risk
    const risk = this.assessRisk(timeframes, confluence);

    return {
      symbol,
      timestamp,
      timeframes,
      confluence,
      signals,
      risk
    };
  }

  /**
   * Analyze a single timeframe
   */
  private analyzeTimeframe(
    timeframe: Timeframe,
    data: TimeframeData
  ): TimeframeAnalysis {
    const candles = data.candles;
    if (!candles || candles.length < 20) {
      return this.getDefaultAnalysis(timeframe);
    }

    // Calculate trend
    const trend = this.detectTrend(candles);
    const strength = this.calculateTrendStrength(candles);

    // Calculate momentum (RSI-like)
    const momentum = this.calculateMomentum(candles);

    // Calculate volatility
    const volatility = this.calculateVolatility(candles);

    // Analyze volume
    const volume = this.analyzeVolume(candles);

    // Find support/resistance
    const { support, resistance } = this.findSupportResistance(candles);

    // Calculate confidence
    const confidence = this.calculateConfidence(strength, momentum, volatility);

    return {
      timeframe,
      trend,
      strength,
      momentum,
      volatility,
      volume,
      support,
      resistance,
      confidence
    };
  }

  /**
   * Detect trend direction
   */
  private detectTrend(candles: Array<{ close: number; time: number }>): TrendDirection {
    if (candles.length < 20) return 'NEUTRAL';

    // Use EMA20 vs EMA50 crossover logic
    const ema20 = this.calculateEMA(candles.map(c => c.close), 20);
    const ema50 = this.calculateEMA(candles.map(c => c.close), 50);

    if (!ema20 || !ema50) return 'NEUTRAL';

    const diff = ((ema20 - ema50) / ema50) * 100;

    if (diff > 1) return 'BULLISH';
    if (diff < -1) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Calculate trend strength (0-100)
   */
  private calculateTrendStrength(candles: Array<{ close: number }>): number {
    if (candles.length < 20) return 0;

    const closes = candles.map(c => c.close);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);

    if (!ema20 || !ema50) return 0;

    // Strength based on distance between EMAs
    const distance = Math.abs(((ema20 - ema50) / ema50) * 100);
    return Math.min(distance * 20, 100);
  }

  /**
   * Calculate momentum (-100 to +100)
   */
  private calculateMomentum(candles: Array<{ close: number }>): number {
    if (candles.length < 14) return 0;

    // Simple RSI-style calculation
    const period = 14;
    const closes = candles.map(c => c.close).slice(-period - 1);

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Convert RSI (0-100) to momentum (-100 to +100)
    return (rsi - 50) * 2;
  }

  /**
   * Calculate volatility (0-100)
   */
  private calculateVolatility(candles: Array<{ high: number; low: number; close: number }>): number {
    if (candles.length < 14) return 50;

    // ATR-style calculation
    const period = 14;
    const ranges = candles.slice(-period).map(c => c.high - c.low);
    const avgRange = ranges.reduce((sum, r) => sum + r, 0) / period;

    const lastClose = candles[candles.length - 1].close;
    const volatilityPercent = (avgRange / lastClose) * 100;

    // Normalize to 0-100 scale
    return Math.min(volatilityPercent * 20, 100);
  }

  /**
   * Analyze volume
   */
  private analyzeVolume(candles: Array<{ volume: number }>): 'HIGH' | 'NORMAL' | 'LOW' {
    if (candles.length < 20) return 'NORMAL';

    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (volumes.length - 1);
    const currentVolume = volumes[volumes.length - 1];

    const ratio = currentVolume / avgVolume;

    if (ratio > 1.5) return 'HIGH';
    if (ratio < 0.5) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Find support and resistance levels
   */
  private findSupportResistance(candles: Array<{ high: number; low: number; close: number }>): {
    support?: number;
    resistance?: number;
  } {
    if (candles.length < 20) return {};

    const recent = candles.slice(-20);
    const lows = recent.map(c => c.low);
    const highs = recent.map(c => c.high);

    const support = Math.min(...lows);
    const resistance = Math.max(...highs);

    return { support, resistance };
  }

  /**
   * Calculate confidence for this timeframe
   */
  private calculateConfidence(strength: number, momentum: number, volatility: number): number {
    // High strength + strong momentum + moderate volatility = high confidence
    const strengthScore = strength;
    const momentumScore = Math.abs(momentum);
    const volatilityScore = volatility < 60 ? (100 - volatility) : 40; // Prefer lower volatility

    return Math.round((strengthScore * 0.4 + momentumScore * 0.3 + volatilityScore * 0.3));
  }

  /**
   * Calculate confluence across timeframes
   */
  private calculateConfluence(
    timeframes: Map<Timeframe, TimeframeAnalysis>
  ): MultiTimeframeResult['confluence'] {
    if (timeframes.size === 0) {
      return {
        overallTrend: 'NEUTRAL',
        alignment: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        strongestTimeframe: '1d',
        weakestTimeframe: '1m'
      };
    }

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let bullishWeight = 0;
    let bearishWeight = 0;

    let strongestTf: Timeframe = '1d';
    let weakestTf: Timeframe = '1m';
    let maxStrength = 0;
    let minStrength = 100;

    for (const [tf, analysis] of timeframes.entries()) {
      if (analysis.trend === 'BULLISH') {
        bullishCount++;
        bullishWeight += this.TIMEFRAME_WEIGHTS[tf];
      } else if (analysis.trend === 'BEARISH') {
        bearishCount++;
        bearishWeight += this.TIMEFRAME_WEIGHTS[tf];
      } else {
        neutralCount++;
      }

      if (analysis.strength > maxStrength) {
        maxStrength = analysis.strength;
        strongestTf = tf;
      }
      if (analysis.strength < minStrength) {
        minStrength = analysis.strength;
        weakestTf = tf;
      }
    }

    // Determine overall trend (weighted)
    let overallTrend: TrendDirection = 'NEUTRAL';
    if (bullishWeight > bearishWeight && bullishWeight > 0.5) {
      overallTrend = 'BULLISH';
    } else if (bearishWeight > bullishWeight && bearishWeight > 0.5) {
      overallTrend = 'BEARISH';
    }

    // Calculate alignment (0-100)
    const total = bullishCount + bearishCount + neutralCount;
    const maxCount = Math.max(bullishCount, bearishCount, neutralCount);
    const alignment = (maxCount / total) * 100;

    return {
      overallTrend,
      alignment,
      bullishCount,
      bearishCount,
      neutralCount,
      strongestTimeframe: strongestTf,
      weakestTimeframe: weakestTf
    };
  }

  /**
   * Generate actionable signals
   */
  private generateSignals(
    timeframes: Map<Timeframe, TimeframeAnalysis>,
    confluence: MultiTimeframeResult['confluence']
  ): MultiTimeframeResult['signals'] {
    // Entry quality based on alignment
    const entryQuality = confluence.alignment;

    // Trend confirmation (3+ timeframes agree)
    const trendConfirmation = confluence.alignment >= 50;

    // Momentum confirmation (higher timeframes positive)
    const tf4h = timeframes.get('4h');
    const tf1d = timeframes.get('1d');
    const momentumConfirmation =
      (tf4h?.momentum || 0) > 0 &&
      (tf1d?.momentum || 0) > 0;

    // Volume confirmation
    const tf15m = timeframes.get('15m');
    const volumeConfirmation = tf15m?.volume === 'HIGH';

    // Generate recommendation
    let recommendation: MultiTimeframeResult['signals']['recommendation'] = 'HOLD';

    if (confluence.overallTrend === 'BULLISH') {
      if (entryQuality >= 80 && momentumConfirmation) {
        recommendation = 'STRONG_BUY';
      } else if (entryQuality >= 60) {
        recommendation = 'BUY';
      }
    } else if (confluence.overallTrend === 'BEARISH') {
      if (entryQuality >= 80 && momentumConfirmation) {
        recommendation = 'STRONG_SELL';
      } else if (entryQuality >= 60) {
        recommendation = 'SELL';
      }
    }

    return {
      entryQuality,
      trendConfirmation,
      momentumConfirmation,
      volumeConfirmation,
      recommendation
    };
  }

  /**
   * Assess risk levels
   */
  private assessRisk(
    timeframes: Map<Timeframe, TimeframeAnalysis>,
    confluence: MultiTimeframeResult['confluence']
  ): MultiTimeframeResult['risk'] {
    // Volatility risk (average across timeframes)
    const volatilities = Array.from(timeframes.values()).map(t => t.volatility);
    const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;

    const volatilityRisk = avgVolatility > 70 ? 'HIGH' : avgVolatility > 40 ? 'MEDIUM' : 'LOW';

    // Trend risk (based on alignment)
    const trendRisk = confluence.alignment < 50 ? 'HIGH' : confluence.alignment < 70 ? 'MEDIUM' : 'LOW';

    // Overall risk score
    const overallRisk = Math.round((avgVolatility * 0.6 + (100 - confluence.alignment) * 0.4));

    return {
      volatilityRisk,
      trendRisk,
      overallRisk
    };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(values: number[], period: number): number | null {
    if (values.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Get default analysis for missing data
   */
  private getDefaultAnalysis(timeframe: Timeframe): TimeframeAnalysis {
    return {
      timeframe,
      trend: 'NEUTRAL',
      strength: 0,
      momentum: 0,
      volatility: 50,
      volume: 'NORMAL',
      confidence: 0
    };
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const multiTimeframeAnalyzer = new MultiTimeframeAnalyzer();
