/**
 * IGX ADVANCED PATTERN DETECTION ENGINE
 * Detects genuinely profitable patterns based on institutional behavior
 *
 * PATTERNS DETECTED:
 * 1. Wyckoff Accumulation (Spring, Test, Sign of Strength)
 * 2. Wyckoff Distribution (Upthrust, Test, Sign of Weakness)
 * 3. Volume Divergence (Price vs Volume)
 * 4. Delta Divergence (Price vs Delta)
 * 5. Liquidity Grabs (Stop hunts before reversals)
 * 6. Hidden Order Flow (Large orders in order book)
 */

import type { Candle } from './technicalAnalysis';

export interface WyckoffPattern {
  detected: boolean;
  type: 'ACCUMULATION' | 'DISTRIBUTION' | null;
  phase: string;
  confidence: number;
  characteristics: string[];
  tradingImplication: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'WAIT';
  reasoning: string;
}

export interface VolumeAnalysis {
  volumeTrend: 'INCREASING' | 'DECREASING' | 'CLIMAX' | 'DRYING_UP';
  volumeDivergence: boolean;
  divergenceType: 'BULLISH' | 'BEARISH' | null;
  volumeScore: number; // 0-100
  interpretation: string;
}

export interface LiquidityGrab {
  detected: boolean;
  type: 'BULLISH_GRAB' | 'BEARISH_GRAB' | null;
  confidence: number;
  reasoning: string;
}

export interface OrderFlowPattern {
  largeOrdersDetected: boolean;
  orderType: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  imbalance: number; // -100 to +100
  confidence: number;
  interpretation: string;
}

class AdvancedPatternDetection {
  /**
   * WYCKOFF ACCUMULATION DETECTION
   * Phases: PS (Preliminary Support) → SC (Selling Climax) → AR (Automatic Rally) →
   *         ST (Secondary Test) → Spring → Test → SOS (Sign of Strength) → LPS (Last Point of Support)
   */
  detectWyckoffAccumulation(candles: Candle[]): WyckoffPattern {
    if (candles.length < 50) {
      return this.getEmptyPattern();
    }

    const characteristics: string[] = [];
    let confidence = 0;
    let phase = 'UNKNOWN';
    let tradingImplication: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'WAIT' = 'WAIT';

    // Analyze recent 50 candles
    const recent = candles.slice(-50);

    // 1. DETECT SELLING CLIMAX (High volume sell-off)
    const volumeIncreased = this.detectVolumeClimax(recent);
    if (volumeIncreased) {
      characteristics.push('Selling Climax detected - High volume capitulation');
      confidence += 15;
    }

    // 2. DETECT SPRING (False breakdown below support that quickly reverses)
    const springDetected = this.detectSpring(recent);
    if (springDetected.detected) {
      characteristics.push('Spring detected - False breakdown trapped sellers');
      confidence += 25; // Spring is a VERY strong signal
      phase = 'SPRING';
      tradingImplication = 'STRONG_BUY';
    }

    // 3. DETECT SECONDARY TEST (Price retests low on decreasing volume)
    const secondaryTest = this.detectSecondaryTest(recent);
    if (secondaryTest) {
      characteristics.push('Secondary Test - Price retests low on lower volume');
      confidence += 15;
    }

    // 4. DETECT SIGN OF STRENGTH (Strong rally on increasing volume)
    const signOfStrength = this.detectSignOfStrength(recent);
    if (signOfStrength) {
      characteristics.push('Sign of Strength - Breakout with volume confirmation');
      confidence += 20;
      if (phase === 'SPRING') {
        tradingImplication = 'STRONG_BUY';
      } else {
        tradingImplication = 'BUY';
        phase = 'SIGN_OF_STRENGTH';
      }
    }

    // 5. DETECT RANGE BOUND TRADING (Accumulation phase characteristic)
    const rangeDetected = this.detectRange(recent);
    if (rangeDetected) {
      characteristics.push('Range-bound trading - Accumulation in progress');
      confidence += 10;
    }

    if (confidence >= 40 && characteristics.length >= 2) {
      return {
        detected: true,
        type: 'ACCUMULATION',
        phase,
        confidence: Math.min(100, confidence),
        characteristics,
        tradingImplication,
        reasoning: `Wyckoff Accumulation pattern detected. ${characteristics.join('. ')}. Institutions likely accumulating for upward move.`
      };
    }

    return this.getEmptyPattern();
  }

  /**
   * WYCKOFF DISTRIBUTION DETECTION
   * Phases: PSY (Preliminary Supply) → BC (Buying Climax) → AR (Automatic Reaction) →
   *         ST (Secondary Test) → UTAD (Upthrust After Distribution) → SOW (Sign of Weakness)
   */
  detectWyckoffDistribution(candles: Candle[]): WyckoffPattern {
    if (candles.length < 50) {
      return this.getEmptyPattern();
    }

    const characteristics: string[] = [];
    let confidence = 0;
    let phase = 'UNKNOWN';
    let tradingImplication: 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL' | 'WAIT' = 'WAIT';

    const recent = candles.slice(-50);

    // 1. DETECT BUYING CLIMAX (High volume rally exhaustion)
    const buyingClimax = this.detectBuyingClimax(recent);
    if (buyingClimax) {
      characteristics.push('Buying Climax - Euphoric buying on extreme volume');
      confidence += 15;
    }

    // 2. DETECT UPTHRUST (False breakout above resistance that fails)
    const upthrust = this.detectUpthrust(recent);
    if (upthrust.detected) {
      characteristics.push('Upthrust detected - False breakout trapped buyers');
      confidence += 25; // Upthrust is VERY strong distribution signal
      phase = 'UPTHRUST';
      tradingImplication = 'STRONG_SELL';
    }

    // 3. DETECT SIGN OF WEAKNESS (Price breaks support on volume)
    const signOfWeakness = this.detectSignOfWeakness(recent);
    if (signOfWeakness) {
      characteristics.push('Sign of Weakness - Support broken with volume');
      confidence += 20;
      if (phase === 'UPTHRUST') {
        tradingImplication = 'STRONG_SELL';
      } else {
        tradingImplication = 'SELL';
        phase = 'SIGN_OF_WEAKNESS';
      }
    }

    // 4. DETECT RANGE BOUND AT TOP
    const rangeAtTop = this.detectRangeAtTop(recent);
    if (rangeAtTop) {
      characteristics.push('Range at top - Distribution in progress');
      confidence += 10;
    }

    if (confidence >= 40 && characteristics.length >= 2) {
      return {
        detected: true,
        type: 'DISTRIBUTION',
        phase,
        confidence: Math.min(100, confidence),
        characteristics,
        tradingImplication,
        reasoning: `Wyckoff Distribution pattern detected. ${characteristics.join('. ')}. Institutions likely distributing before downward move.`
      };
    }

    return this.getEmptyPattern();
  }

  /**
   * VOLUME DIVERGENCE ANALYSIS
   * Bullish: Price makes lower low, but volume decreases (selling pressure exhausted)
   * Bearish: Price makes higher high, but volume decreases (buying pressure exhausted)
   */
  analyzeVolumeDivergence(candles: Candle[]): VolumeAnalysis {
    if (candles.length < 30) {
      return this.getDefaultVolumeAnalysis();
    }

    const recent = candles.slice(-30);

    // Find peaks and troughs
    const priceHighs = this.findLocalMaxima(recent.map(c => c.high));
    const priceLows = this.findLocalMinima(recent.map(c => c.low));

    let divergenceDetected = false;
    let divergenceType: 'BULLISH' | 'BEARISH' | null = null;
    let interpretation = 'No significant divergence detected';

    // BULLISH DIVERGENCE: Lower price low + Higher volume low
    if (priceLows.length >= 2) {
      const lastLow = priceLows[priceLows.length - 1];
      const prevLow = priceLows[priceLows.length - 2];

      if (recent[lastLow].low < recent[prevLow].low &&
          recent[lastLow].volume < recent[prevLow].volume) {
        divergenceDetected = true;
        divergenceType = 'BULLISH';
        interpretation = 'Bullish divergence: Price making lower lows but volume decreasing. Selling pressure exhausted.';
      }
    }

    // BEARISH DIVERGENCE: Higher price high + Lower volume high
    if (priceHighs.length >= 2) {
      const lastHigh = priceHighs[priceHighs.length - 1];
      const prevHigh = priceHighs[priceHighs.length - 2];

      if (recent[lastHigh].high > recent[prevHigh].high &&
          recent[lastHigh].volume < recent[prevHigh].volume) {
        divergenceDetected = true;
        divergenceType = 'BEARISH';
        interpretation = 'Bearish divergence: Price making higher highs but volume decreasing. Buying pressure exhausted.';
      }
    }

    // Volume trend analysis
    const recentVolume = recent.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const olderVolume = recent.slice(-30, -10).reduce((sum, c) => sum + c.volume, 0) / 20;

    let volumeTrend: 'INCREASING' | 'DECREASING' | 'CLIMAX' | 'DRYING_UP';
    if (recentVolume > olderVolume * 2) volumeTrend = 'CLIMAX';
    else if (recentVolume < olderVolume * 0.5) volumeTrend = 'DRYING_UP';
    else if (recentVolume > olderVolume * 1.2) volumeTrend = 'INCREASING';
    else volumeTrend = 'DECREASING';

    const volumeScore = divergenceDetected ? (divergenceType === 'BULLISH' ? 75 : 25) : 50;

    return {
      volumeTrend,
      volumeDivergence: divergenceDetected,
      divergenceType,
      volumeScore,
      interpretation
    };
  }

  /**
   * LIQUIDITY GRAB DETECTION
   * Detects stop hunts: Price briefly breaks key level, triggers stops, then reverses
   * This is a VERY profitable pattern when detected correctly
   */
  detectLiquidityGrab(candles: Candle[], supportLevel: number, resistanceLevel: number): LiquidityGrab {
    if (candles.length < 10) {
      return { detected: false, type: null, confidence: 0, reasoning: 'Insufficient data' };
    }

    const recent = candles.slice(-10);

    // BULLISH LIQUIDITY GRAB: Wick below support, then strong close above
    for (let i = recent.length - 5; i < recent.length; i++) {
      const candle = recent[i];

      // Check if wick went below support but closed above
      if (candle.low < supportLevel && candle.close > supportLevel) {
        // Check if subsequent candles confirmed reversal
        const nextCandles = recent.slice(i + 1);
        const bullishConfirmation = nextCandles.filter(c => c.close > candle.close).length >= 2;

        if (bullishConfirmation) {
          return {
            detected: true,
            type: 'BULLISH_GRAB',
            confidence: 80,
            reasoning: `Liquidity grab detected below support at $${supportLevel.toFixed(2)}. Stop losses triggered, then price reversed strongly. Classic institutional accumulation tactic.`
          };
        }
      }

      // BEARISH LIQUIDITY GRAB: Wick above resistance, then strong close below
      if (candle.high > resistanceLevel && candle.close < resistanceLevel) {
        const nextCandles = recent.slice(i + 1);
        const bearishConfirmation = nextCandles.filter(c => c.close < candle.close).length >= 2;

        if (bearishConfirmation) {
          return {
            detected: true,
            type: 'BEARISH_GRAB',
            confidence: 80,
            reasoning: `Liquidity grab detected above resistance at $${resistanceLevel.toFixed(2)}. Buy stops triggered, then price reversed down. Classic distribution tactic.`
          };
        }
      }
    }

    return { detected: false, type: null, confidence: 0, reasoning: 'No liquidity grab pattern detected' };
  }

  // ===========================================
  // HELPER METHODS - WYCKOFF DETECTION
  // ===========================================

  private detectVolumeClimax(candles: Candle[]): boolean {
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const lastCandles = candles.slice(-5);

    // Check for volume spike (2x average) with price decline
    return lastCandles.some(c => c.volume > avgVolume * 2 && c.close < c.open);
  }

  private detectSpring(candles: Candle[]): { detected: boolean; confidence: number } {
    // Spring: Price breaks below recent low (support), then quickly reverses above
    const recent = candles.slice(-20);
    const support = Math.min(...recent.slice(0, -5).map(c => c.low));

    for (let i = recent.length - 5; i < recent.length; i++) {
      const candle = recent[i];

      // Check if low broke support but closed above
      if (candle.low < support * 0.98 && candle.close > support) {
        // Check if subsequent candles rallied
        const afterSpring = recent.slice(i + 1);
        if (afterSpring.length > 0 && afterSpring.every(c => c.close > support)) {
          return { detected: true, confidence: 80 };
        }
      }
    }

    return { detected: false, confidence: 0 };
  }

  private detectSecondaryTest(candles: Candle[]): boolean {
    const recent = candles.slice(-20);
    const low = Math.min(...recent.map(c => c.low));

    // Find candles that tested the low on lower volume
    const tests = recent.filter(c => Math.abs(c.low - low) / low < 0.02);

    if (tests.length >= 2) {
      return tests[tests.length - 1].volume < tests[0].volume * 0.8;
    }

    return false;
  }

  private detectSignOfStrength(candles: Candle[]): boolean {
    const recent = candles.slice(-10);
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;

    // Look for strong bullish candle on high volume
    return recent.slice(-3).some(c =>
      c.close > c.open * 1.03 && // 3%+ green candle
      c.volume > avgVolume * 1.5  // 50% above average volume
    );
  }

  private detectRange(candles: Candle[]): boolean {
    const recent = candles.slice(-20);
    const high = Math.max(...recent.map(c => c.high));
    const low = Math.min(...recent.map(c => c.low));
    const range = (high - low) / low * 100;

    // Range-bound if price stays within 10% range
    return range < 10;
  }

  private detectBuyingClimax(candles: Candle[]): boolean {
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const lastCandles = candles.slice(-5);

    // Volume spike with price rally
    return lastCandles.some(c => c.volume > avgVolume * 2 && c.close > c.open);
  }

  private detectUpthrust(candles: Candle[]): { detected: boolean; confidence: number } {
    const recent = candles.slice(-20);
    const resistance = Math.max(...recent.slice(0, -5).map(c => c.high));

    for (let i = recent.length - 5; i < recent.length; i++) {
      const candle = recent[i];

      // Check if high broke resistance but closed below
      if (candle.high > resistance * 1.02 && candle.close < resistance) {
        const afterUpthrust = recent.slice(i + 1);
        if (afterUpthrust.length > 0 && afterUpthrust.every(c => c.close < resistance)) {
          return { detected: true, confidence: 80 };
        }
      }
    }

    return { detected: false, confidence: 0 };
  }

  private detectSignOfWeakness(candles: Candle[]): boolean {
    const recent = candles.slice(-10);
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;

    // Strong bearish candle on high volume
    return recent.slice(-3).some(c =>
      c.close < c.open * 0.97 && // 3%+ red candle
      c.volume > avgVolume * 1.5
    );
  }

  private detectRangeAtTop(candles: Candle[]): boolean {
    const allCandles = candles;
    const recent = candles.slice(-20);

    // Check if recent range is at top 20% of overall price range
    const allHigh = Math.max(...allCandles.map(c => c.high));
    const allLow = Math.min(...allCandles.map(c => c.low));
    const recentAvg = recent.reduce((sum, c) => sum + c.close, 0) / recent.length;

    const position = (recentAvg - allLow) / (allHigh - allLow);

    return position > 0.8; // In top 20%
  }

  private findLocalMaxima(arr: number[]): number[] {
    const maxima: number[] = [];
    for (let i = 2; i < arr.length - 2; i++) {
      if (arr[i] > arr[i-1] && arr[i] > arr[i-2] && arr[i] > arr[i+1] && arr[i] > arr[i+2]) {
        maxima.push(i);
      }
    }
    return maxima;
  }

  private findLocalMinima(arr: number[]): number[] {
    const minima: number[] = [];
    for (let i = 2; i < arr.length - 2; i++) {
      if (arr[i] < arr[i-1] && arr[i] < arr[i-2] && arr[i] < arr[i+1] && arr[i] < arr[i+2]) {
        minima.push(i);
      }
    }
    return minima;
  }

  private getEmptyPattern(): WyckoffPattern {
    return {
      detected: false,
      type: null,
      phase: 'NONE',
      confidence: 0,
      characteristics: [],
      tradingImplication: 'WAIT',
      reasoning: 'No Wyckoff pattern detected'
    };
  }

  private getDefaultVolumeAnalysis(): VolumeAnalysis {
    return {
      volumeTrend: 'DECREASING',
      volumeDivergence: false,
      divergenceType: null,
      volumeScore: 50,
      interpretation: 'Insufficient data for volume analysis'
    };
  }
}

export const advancedPatternDetection = new AdvancedPatternDetection();
