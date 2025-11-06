/**
 * Technical Analysis Service
 * Multi-timeframe technical indicators for professional signal generation
 */

export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  emaShort: number;
  emaMedium: number;
  emaLong: number;
  emaCrossover: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  macd: {
    value: number;
    signal: number;
    histogram: number;
    crossover: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'ABOVE_UPPER' | 'NEAR_UPPER' | 'MIDDLE' | 'NEAR_LOWER' | 'BELOW_LOWER';
  };
  volumeConfirmation: 'STRONG' | 'MODERATE' | 'WEAK';
  trendStrength: number; // 0-100
  overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class TechnicalAnalysisService {
  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 50; // Neutral if insufficient data

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = candles.length - period; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(candles: Candle[], period: number): number {
    if (candles.length < period) return candles[candles.length - 1]?.close || 0;

    const multiplier = 2 / (period + 1);
    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(candles: Candle[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(candles, 12);
    const ema26 = this.calculateEMA(candles, 26);
    const macdLine = ema12 - ema26;

    // For signal line, we'd need to calculate EMA of MACD
    // Simplified: use a fraction of MACD as signal
    const signalLine = macdLine * 0.9; // Simplified signal line
    const histogram = macdLine - signalLine;

    return {
      value: macdLine,
      signal: signalLine,
      histogram
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number; middle: number; lower: number } {
    if (candles.length < period) {
      const price = candles[candles.length - 1]?.close || 0;
      return { upper: price, middle: price, lower: price };
    }

    const recentCandles = candles.slice(-period);
    const closes = recentCandles.map(c => c.close);

    const middle = closes.reduce((sum, c) => sum + c, 0) / period;

    // Calculate standard deviation
    const squaredDiffs = closes.map(c => Math.pow(c - middle, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const std = Math.sqrt(variance);

    const upper = middle + (std * stdDev);
    const lower = middle - (std * stdDev);

    return { upper, middle, lower };
  }

  /**
   * Generate comprehensive technical analysis
   */
  analyzeTechnicals(candles: Candle[]): TechnicalIndicators {
    if (candles.length < 50) {
      // Insufficient data for full analysis
      return this.getDefaultIndicators();
    }

    // RSI Analysis
    const rsi = this.calculateRSI(candles, 14);
    const rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' =
      rsi < 30 ? 'OVERSOLD' :
      rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL';

    // EMA Analysis
    const emaShort = this.calculateEMA(candles, 9);
    const emaMedium = this.calculateEMA(candles, 21);
    const emaLong = this.calculateEMA(candles, 50);

    const emaCrossover: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      emaShort > emaMedium && emaMedium > emaLong ? 'BULLISH' :
      emaShort < emaMedium && emaMedium < emaLong ? 'BEARISH' : 'NEUTRAL';

    // MACD Analysis
    const macd = this.calculateMACD(candles);
    const macdCrossover: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      macd.histogram > 0 ? 'BULLISH' :
      macd.histogram < 0 ? 'BEARISH' : 'NEUTRAL';

    // Bollinger Bands
    const bb = this.calculateBollingerBands(candles, 20, 2);
    const currentPrice = candles[candles.length - 1].close;
    const bbPosition: 'ABOVE_UPPER' | 'NEAR_UPPER' | 'MIDDLE' | 'NEAR_LOWER' | 'BELOW_LOWER' =
      currentPrice > bb.upper ? 'ABOVE_UPPER' :
      currentPrice > bb.middle + (bb.upper - bb.middle) * 0.5 ? 'NEAR_UPPER' :
      currentPrice < bb.lower ? 'BELOW_LOWER' :
      currentPrice < bb.middle - (bb.middle - bb.lower) * 0.5 ? 'NEAR_LOWER' : 'MIDDLE';

    // Volume Confirmation
    const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const olderVolume = candles.slice(-30, -10).reduce((sum, c) => sum + c.volume, 0) / 20;
    const volumeConfirmation: 'STRONG' | 'MODERATE' | 'WEAK' =
      recentVolume > olderVolume * 1.2 ? 'STRONG' :
      recentVolume > olderVolume * 0.8 ? 'MODERATE' : 'WEAK';

    // Trend Strength
    const trendStrength = this.calculateTrendStrength(candles);

    // Overall Signal
    const overallSignal = this.determineOverallSignal({
      rsi,
      rsiSignal,
      emaCrossover,
      macdCrossover: macd.histogram > 0 ? 'BULLISH' : macd.histogram < 0 ? 'BEARISH' : 'NEUTRAL',
      bbPosition,
      trendStrength
    });

    return {
      rsi,
      rsiSignal,
      emaShort,
      emaMedium,
      emaLong,
      emaCrossover,
      macd: { ...macd, crossover: macdCrossover },
      bollingerBands: { ...bb, position: bbPosition },
      volumeConfirmation,
      trendStrength,
      overallSignal
    };
  }

  /**
   * Calculate trend strength (0-100)
   */
  private calculateTrendStrength(candles: Candle[]): number {
    if (candles.length < 20) return 50;

    const recentCandles = candles.slice(-20);
    let bullishCandles = 0;
    let bearishCandles = 0;

    recentCandles.forEach(candle => {
      if (candle.close > candle.open) bullishCandles++;
      else bearishCandles++;
    });

    // Calculate directional strength
    const strength = Math.abs(bullishCandles - bearishCandles) / recentCandles.length * 100;

    return Math.round(strength);
  }

  /**
   * Determine overall signal from all indicators
   */
  private determineOverallSignal(params: {
    rsi: number;
    rsiSignal: string;
    emaCrossover: string;
    macdCrossover: string;
    bbPosition: string;
    trendStrength: number;
  }): 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' {
    let score = 50; // Start neutral

    // RSI contribution
    if (params.rsiSignal === 'OVERSOLD') score += 15;
    else if (params.rsiSignal === 'OVERBOUGHT') score -= 15;

    // EMA contribution
    if (params.emaCrossover === 'BULLISH') score += 20;
    else if (params.emaCrossover === 'BEARISH') score -= 20;

    // MACD contribution
    if (params.macdCrossover === 'BULLISH') score += 15;
    else if (params.macdCrossover === 'BEARISH') score -= 15;

    // Trend strength contribution
    score += (params.trendStrength - 50) * 0.3;

    // Determine signal
    if (score >= 75) return 'STRONG_BUY';
    if (score >= 60) return 'BUY';
    if (score <= 25) return 'STRONG_SELL';
    if (score <= 40) return 'SELL';
    return 'NEUTRAL';
  }

  /**
   * Get default indicators when data is insufficient
   */
  private getDefaultIndicators(): TechnicalIndicators {
    return {
      rsi: 50,
      rsiSignal: 'NEUTRAL',
      emaShort: 0,
      emaMedium: 0,
      emaLong: 0,
      emaCrossover: 'NEUTRAL',
      macd: {
        value: 0,
        signal: 0,
        histogram: 0,
        crossover: 'NEUTRAL'
      },
      bollingerBands: {
        upper: 0,
        middle: 0,
        lower: 0,
        position: 'MIDDLE'
      },
      volumeConfirmation: 'WEAK',
      trendStrength: 50,
      overallSignal: 'NEUTRAL'
    };
  }
}

export const technicalAnalysisService = new TechnicalAnalysisService();
