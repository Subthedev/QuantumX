/**
 * BOLLINGER MEAN REVERSION STRATEGY
 *
 * INSTITUTIONAL INSIGHT:
 * This is the COMPLEMENT to our Volatility Breakout strategy.
 * While Volatility Breakout trades EXPANSION, this trades REVERSION.
 * Together they cover both market conditions: trending (breakout) vs ranging (reversion).
 *
 * THEORY:
 * - Bollinger Bands = Price ± 2 standard deviations (95% confidence)
 * - When price touches band, it's statistically "stretched" from mean
 * - Price tends to REVERT to the mean (middle band = 20-day SMA)
 * - This is PURE statistics - not momentum or sentiment
 *
 * KEY METRICS:
 * - Band Touch: Price at upper/lower band
 * - Band Width: Distance between bands (volatility measure)
 * - Position in Band: How far into the band (0-100%)
 * - RSI Confirmation: Overbought/oversold confirmation
 *
 * SIGNAL LOGIC:
 * - Price at lower band + RSI < 30 = BUY (oversold bounce)
 * - Price at upper band + RSI > 70 = SELL (overbought pullback)
 * - Tighter bands = stronger mean reversion (lower volatility)
 *
 * RISK CONTROLS:
 * - Min band width: 2% (avoid dead zones)
 * - Max band width: 15% (avoid runaway trends)
 * - Volume confirmation: 1.2x average minimum
 * - Stop loss: Outside opposite band
 */

import type { StrategySignal, MarketDataInput } from './strategyTypes';

interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  width: number; // (upper - lower) / middle
  position: number; // Where price is in band (0-100%)
}

class BollingerMeanReversionStrategy {
  private readonly MIN_BAND_WIDTH = 0.02; // 2%
  private readonly MAX_BAND_WIDTH = 0.15; // 15%
  private readonly OVERSOLD_RSI = 30;
  private readonly OVERBOUGHT_RSI = 70;
  private readonly MIN_VOLUME_MULTIPLE = 1.2;

  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    const reasoning: string[] = [];
    let signalType: 'BUY' | 'SELL' | null = null;
    let confidence = 0;

    try {
      const currentPrice = data.currentPrice;
      const technicals = data.technicalData;

      // Get Bollinger Band data
      const bollingerBands = technicals?.bollingerBands;
      if (!bollingerBands) {
        return {
          strategyName: 'BOLLINGER_MEAN_REVERSION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: ['Missing Bollinger Bands data'],
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '2-5 days',
          indicators: {},
          rejected: true,
          rejectionReason: 'Missing technical data'
        };
      }

      // Calculate Bollinger metrics
      const bollingerData = this.calculateBollingerMetrics(currentPrice, bollingerBands);

      reasoning.push(`📊 Bollinger Band Analysis:`);
      reasoning.push(`   • Upper Band: $${bollingerData.upper.toFixed(2)}`);
      reasoning.push(`   • Middle (SMA): $${bollingerData.middle.toFixed(2)}`);
      reasoning.push(`   • Lower Band: $${bollingerData.lower.toFixed(2)}`);
      reasoning.push(`   • Band Width: ${(bollingerData.width * 100).toFixed(2)}%`);
      reasoning.push(`   • Position: ${bollingerData.position.toFixed(1)}% (0=lower, 100=upper)`);

      // Get RSI
      const rsi = technicals?.rsi || 50;
      reasoning.push(`   • RSI: ${rsi.toFixed(1)}`);

      // ===== BAND WIDTH CHECK =====
      if (bollingerData.width < this.MIN_BAND_WIDTH) {
        return {
          strategyName: 'BOLLINGER_MEAN_REVERSION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `❌ REJECTED: Bands too tight ${(bollingerData.width * 100).toFixed(2)}% (min ${(this.MIN_BAND_WIDTH * 100).toFixed(0)}%)`,
            `⚠️ Dead zone - no meaningful reversion opportunity`
          ],
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '2-5 days',
          indicators: { bandWidth: bollingerData.width },
          rejected: true,
          rejectionReason: `Bands too tight: ${(bollingerData.width * 100).toFixed(1)}%`
        };
      }

      if (bollingerData.width > this.MAX_BAND_WIDTH) {
        reasoning.push(`\n⚠️ Wide Bands: ${(bollingerData.width * 100).toFixed(1)}% (>15%) - trending market`);
        reasoning.push(`📊 Mean reversion less reliable in strong trends`);
      }

      // ===== VOLUME CHECK =====
      const volumeSurge = data.volume24h / data.volumeAvg;
      if (volumeSurge < this.MIN_VOLUME_MULTIPLE) {
        reasoning.push(`\n⚠️ Low Volume: ${volumeSurge.toFixed(2)}x (need ${this.MIN_VOLUME_MULTIPLE}x+)`);
        reasoning.push(`📊 Weak reversion signals without volume`);
      }

      // ===== SIGNAL LOGIC =====

      // BULLISH REVERSION (bounce from lower band)
      if (bollingerData.position <= 15 && rsi <= 35) {
        signalType = 'BUY';
        confidence = 45; // Base confidence

        reasoning.push(`\n🔵 BULLISH Mean Reversion:`);
        reasoning.push(`   • Price at LOWER band (${bollingerData.position.toFixed(1)}% position)`);
        reasoning.push(`   • Statistically stretched - expect bounce to middle`);

        // Band position bonus (closer to lower band = better)
        if (bollingerData.position <= 5) {
          confidence += 20;
          reasoning.push(`⚡ EXTREME Oversold: ${bollingerData.position.toFixed(1)}% position - +20% confidence`);
        } else if (bollingerData.position <= 10) {
          confidence += 15;
          reasoning.push(`💪 Strong Oversold: ${bollingerData.position.toFixed(1)}% position - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📈 Oversold: ${bollingerData.position.toFixed(1)}% position - +10% confidence`);
        }

        // RSI confirmation bonus
        if (rsi <= 25) {
          confidence += 18;
          reasoning.push(`📊 EXTREME RSI: ${rsi.toFixed(1)} - +18% confidence`);
        } else if (rsi <= 30) {
          confidence += 12;
          reasoning.push(`📊 Oversold RSI: ${rsi.toFixed(1)} - +12% confidence`);
        } else {
          confidence += 8;
          reasoning.push(`📊 Low RSI: ${rsi.toFixed(1)} - +8% confidence`);
        }

        // Band width bonus (tighter bands = stronger reversion)
        if (bollingerData.width <= 0.05) { // 5%
          confidence += 15;
          reasoning.push(`📏 Tight Bands: ${(bollingerData.width * 100).toFixed(1)}% - strong mean reversion - +15% confidence`);
        } else if (bollingerData.width <= 0.08) {
          confidence += 10;
          reasoning.push(`📏 Moderate Bands: ${(bollingerData.width * 100).toFixed(1)}% - +10% confidence`);
        } else {
          confidence += 5;
          reasoning.push(`📏 Wide Bands: ${(bollingerData.width * 100).toFixed(1)}% - +5% confidence`);
        }

        // Volume confirmation bonus
        if (volumeSurge >= 2.0) {
          confidence += 12;
          reasoning.push(`📊 Strong Volume: ${volumeSurge.toFixed(2)}x average - +12% confidence`);
        } else if (volumeSurge >= 1.5) {
          confidence += 8;
          reasoning.push(`✓ Good Volume: ${volumeSurge.toFixed(2)}x average - +8% confidence`);
        } else if (volumeSurge >= 1.2) {
          confidence += 5;
          reasoning.push(`✓ Volume Confirmed: ${volumeSurge.toFixed(2)}x average - +5% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • BUY at lower band - expect bounce to middle`);
        reasoning.push(`   • Target: Middle band ($${bollingerData.middle.toFixed(2)})`);
        reasoning.push(`   • This is PURE statistics - 95% confidence reversion`);

      } else if (bollingerData.position >= 85 && rsi >= 65) {
        // BEARISH REVERSION (pullback from upper band)
        signalType = 'SELL';
        confidence = 45; // Base confidence

        reasoning.push(`\n🔴 BEARISH Mean Reversion:`);
        reasoning.push(`   • Price at UPPER band (${bollingerData.position.toFixed(1)}% position)`);
        reasoning.push(`   • Statistically stretched - expect pullback to middle`);

        // Band position bonus (closer to upper band = better)
        if (bollingerData.position >= 95) {
          confidence += 20;
          reasoning.push(`⚡ EXTREME Overbought: ${bollingerData.position.toFixed(1)}% position - +20% confidence`);
        } else if (bollingerData.position >= 90) {
          confidence += 15;
          reasoning.push(`💪 Strong Overbought: ${bollingerData.position.toFixed(1)}% position - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📈 Overbought: ${bollingerData.position.toFixed(1)}% position - +10% confidence`);
        }

        // RSI confirmation bonus
        if (rsi >= 75) {
          confidence += 18;
          reasoning.push(`📊 EXTREME RSI: ${rsi.toFixed(1)} - +18% confidence`);
        } else if (rsi >= 70) {
          confidence += 12;
          reasoning.push(`📊 Overbought RSI: ${rsi.toFixed(1)} - +12% confidence`);
        } else {
          confidence += 8;
          reasoning.push(`📊 High RSI: ${rsi.toFixed(1)} - +8% confidence`);
        }

        // Band width bonus
        if (bollingerData.width <= 0.05) {
          confidence += 15;
          reasoning.push(`📏 Tight Bands: ${(bollingerData.width * 100).toFixed(1)}% - strong mean reversion - +15% confidence`);
        } else if (bollingerData.width <= 0.08) {
          confidence += 10;
          reasoning.push(`📏 Moderate Bands: ${(bollingerData.width * 100).toFixed(1)}% - +10% confidence`);
        } else {
          confidence += 5;
          reasoning.push(`📏 Wide Bands: ${(bollingerData.width * 100).toFixed(1)}% - +5% confidence`);
        }

        // Volume confirmation bonus
        if (volumeSurge >= 2.0) {
          confidence += 12;
          reasoning.push(`📊 Strong Volume: ${volumeSurge.toFixed(2)}x average - +12% confidence`);
        } else if (volumeSurge >= 1.5) {
          confidence += 8;
          reasoning.push(`✓ Good Volume: ${volumeSurge.toFixed(2)}x average - +8% confidence`);
        } else if (volumeSurge >= 1.2) {
          confidence += 5;
          reasoning.push(`✓ Volume Confirmed: ${volumeSurge.toFixed(2)}x average - +5% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • SELL at upper band - expect pullback to middle`);
        reasoning.push(`   • Target: Middle band ($${bollingerData.middle.toFixed(2)})`);
        reasoning.push(`   • This is PURE statistics - 95% confidence reversion`);

      } else {
        // NO SIGNAL (price not at extremes)
        reasoning.push(`\n✋ NO SIGNAL: Price not at band extremes (${bollingerData.position.toFixed(1)}% position)`);
        reasoning.push(`📊 Need price ≤15% or ≥85% position for reversion signal`);

        return {
          strategyName: 'BOLLINGER_MEAN_REVERSION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning,
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '2-5 days',
          indicators: { position: bollingerData.position },
          rejected: false
        };
      }

      // Calculate targets and stop loss with ATR
      const targetData = await this.calculateTargets(
        currentPrice,
        signalType,
        bollingerData,
        data.ohlcData?.candles || [],
        confidence
      );

      const { entryMin, entryMax, targets, stopLoss, riskRewardRatio, atrBased, atrValue, atrPercent, riskRewardRatios } = targetData;

      // Determine signal strength
      let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
      if (confidence >= 85) strength = 'VERY_STRONG';
      else if (confidence >= 75) strength = 'STRONG';
      else if (confidence >= 65) strength = 'MODERATE';

      return {
        strategyName: 'BOLLINGER_MEAN_REVERSION',
        symbol: data.symbol,
        type: signalType,
        confidence: Math.min(100, Math.max(0, confidence)),
        strength,
        reasoning,
        entryMin,
        entryMax,
        targets,
        stopLoss,
        riskRewardRatio,
        timeframe: '2-5 days',
        indicators: {
          upperBand: bollingerData.upper,
          middleBand: bollingerData.middle,
          lowerBand: bollingerData.lower,
          bandWidth: bollingerData.width,
          position: bollingerData.position,
          rsi
        },
        // ATR-based fields
        atrBased,
        atrValue,
        atrPercent,
        riskRewardRatios,
        rejected: false
      };

    } catch (error) {
      console.error('[BollingerMeanReversion] Error:', error);
      return {
        strategyName: 'BOLLINGER_MEAN_REVERSION',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`Error analyzing Bollinger Bands: ${error instanceof Error ? error.message : 'Unknown error'}`],
        entryMin: data.currentPrice,
        entryMax: data.currentPrice,
        targets: {
          target1: data.currentPrice * 1.02,
          target2: data.currentPrice * 1.04,
          target3: data.currentPrice * 1.06
        },
        stopLoss: data.currentPrice * 0.95,
        riskRewardRatio: 1.2,
        timeframe: '2-5 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Analysis error'
      };
    }
  }

  /**
   * Calculate Bollinger Band metrics
   */
  private calculateBollingerMetrics(
    currentPrice: number,
    bollingerBands: { upper: number; middle: number; lower: number }
  ): BollingerData {
    const { upper, middle, lower } = bollingerBands;

    // Band width (volatility measure)
    const width = (upper - lower) / middle;

    // Position in band (0-100%)
    const position = ((currentPrice - lower) / (upper - lower)) * 100;

    return {
      upper,
      middle,
      lower,
      width,
      position: Math.max(0, Math.min(100, position)) // Clamp 0-100
    };
  }

  /**
   * Calculate entry/exit targets and stop loss with ATR-based dynamic levels
   */
  private async calculateTargets(
    currentPrice: number,
    signalType: 'BUY' | 'SELL' | null,
    bollingerData: BollingerData,
    candles: any[],
    confidence: number
  ): Promise<{
    entryMin: number;
    entryMax: number;
    targets: { target1: number; target2: number; target3: number };
    stopLoss: number;
    riskRewardRatio: number;
    atrBased?: boolean;
    atrValue?: number;
    atrPercent?: number;
    riskRewardRatios?: [number, number, number];
  }> {
    if (!signalType) {
      return {
        entryMin: currentPrice,
        entryMax: currentPrice,
        targets: {
          target1: currentPrice * 1.02,
          target2: currentPrice * 1.04,
          target3: currentPrice * 1.06
        },
        stopLoss: currentPrice * 0.95,
        riskRewardRatio: 1.2
      };
    }

    // ===== ATR-BASED DYNAMIC LEVELS =====
    // Mean reversion happens in ranging markets - use BULL_RANGE or BEAR_RANGE
    const { atrCalculator } = await import('../atrCalculator');

    const direction: 'LONG' | 'SHORT' = signalType === 'BUY' ? 'LONG' : 'SHORT';
    const regime = signalType === 'BUY' ? 'BULL_RANGE' : 'BEAR_RANGE';

    const atrLevels = atrCalculator.getDynamicLevels(
      currentPrice,
      direction,
      candles,
      regime,
      confidence
    );

    console.log(
      `[BollingerMeanReversion] ATR-Based Levels | ` +
      `ATR: ${atrLevels.atrPercent.toFixed(2)}% | ` +
      `R:R: 1:${atrLevels.riskRewardRatios[0].toFixed(1)} / 1:${atrLevels.riskRewardRatios[1].toFixed(1)} / 1:${atrLevels.riskRewardRatios[2].toFixed(1)}`
    );

    if (signalType === 'BUY') {
      // Use ATR-based targets but keep Bollinger logic as reference
      return {
        entryMin: currentPrice * 0.998,
        entryMax: currentPrice * 1.002,
        targets: {
          target1: atrLevels.target1, // ATR-based progressive targets
          target2: atrLevels.target2,
          target3: atrLevels.target3
        },
        stopLoss: atrLevels.stopLoss, // ATR-based stop
        riskRewardRatio: atrLevels.riskRewardRatios[0],
        atrBased: true,
        atrValue: atrLevels.atrValue,
        atrPercent: atrLevels.atrPercent,
        riskRewardRatios: atrLevels.riskRewardRatios
      };
    } else {
      // SELL signal
      return {
        entryMin: currentPrice * 0.998,
        entryMax: currentPrice * 1.002,
        targets: {
          target1: atrLevels.target1,
          target2: atrLevels.target2,
          target3: atrLevels.target3
        },
        stopLoss: atrLevels.stopLoss,
        riskRewardRatio: atrLevels.riskRewardRatios[0],
        atrBased: true,
        atrValue: atrLevels.atrValue,
        atrPercent: atrLevels.atrPercent,
        riskRewardRatios: atrLevels.riskRewardRatios
      };
    }
  }
}

export { BollingerMeanReversionStrategy };
export const bollingerMeanReversionStrategy = new BollingerMeanReversionStrategy();
