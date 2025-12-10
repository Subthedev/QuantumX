/**
 * MOMENTUM RECOVERY STRATEGY
 * Mean reversion / recovery pattern - captures oversold bounces and overbought reversals
 *
 * LOGIC:
 * - BULLISH: RSI 40-60 (recovery zone) + bullish volume divergence + oversold bounce
 * - BEARISH: RSI 40-60 (distribution zone) + bearish volume divergence + overbought reversal
 * - Base confidence: 38
 * - Add 18% if RSI in perfect recovery range (45-55)
 * - Add 20% if bullish/bearish volume divergence detected
 * - Add 12% for bullish divergence confirmation
 * - Minimum threshold: 58%
 *
 * INSTITUTIONAL INSIGHT:
 * Recovery trades = mean reversion after oversold/overbought extremes
 * Look for RSI returning to neutral zone (40-60) with volume divergence
 * This is NOT momentum - it's counter-trend recovery with divergence confirmation
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { advancedPatternDetection } from '../advancedPatternDetection';
import { technicalAnalysisService } from '../technicalAnalysis';

export class MomentumRecoveryStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[MomentumRecoveryStrategy] Analyzing ${data.symbol} for recovery/mean reversion...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data for technical indicators
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 50) {
      console.log(`[MomentumRecoveryStrategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles`);
      return {
        strategyName: 'MOMENTUM_RECOVERY',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [],
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '1-4 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required OHLC data for technical analysis'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const candles = data.ohlcData.candles;

    // Calculate technical indicators
    const technicals = technicalAnalysisService.analyzeTechnicals(candles);
    const rsi = technicals.rsi;

    console.log(`[MomentumRecoveryStrategy] RSI: ${rsi.toFixed(2)}, Signal: ${technicals.rsiSignal}`);

    // Analyze volume divergence (critical for recovery pattern)
    const volumeAnalysis = advancedPatternDetection.analyzeVolumeDivergence(candles);

    console.log(`[MomentumRecoveryStrategy] Volume divergence: ${volumeAnalysis.volumeDivergence}`);
    console.log(`[MomentumRecoveryStrategy] Divergence type: ${volumeAnalysis.divergenceType}`);

    // Check if RSI is in recovery zone (40-60)
    if (rsi < 40 || rsi > 60) {
      console.log(`[MomentumRecoveryStrategy] RSI ${rsi.toFixed(1)} outside recovery zone (need 40-60)`);
      return {
        strategyName: 'MOMENTUM_RECOVERY',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`RSI ${rsi.toFixed(1)} outside recovery zone (need 40-60 for mean reversion)`],
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '1-4 days',
        indicators: { rsi, currentPrice },
        rejected: true,
        rejectionReason: 'RSI outside recovery zone (40-60)'
      };
    }

    // BULLISH RECOVERY: RSI 40-60 + Bullish volume divergence (oversold bounce)
    if (volumeAnalysis.volumeDivergence && volumeAnalysis.divergenceType === 'BULLISH') {
      signalType = 'BUY';
      confidence = 38; // Base confidence

      reasoning.push(`📊 RECOVERY PATTERN: Bullish volume divergence in recovery zone`);
      reasoning.push(`📈 ${volumeAnalysis.interpretation}`);

      // Volume divergence bonus (critical for recovery trades)
      confidence += 20;
      reasoning.push(`✅ Bullish Volume Divergence: Price down but volume declining - +20% confidence`);

      // RSI in perfect recovery range (45-55 is sweet spot for mean reversion)
      if (rsi >= 45 && rsi <= 55) {
        confidence += 18;
        reasoning.push(`📈 RSI Perfect Recovery: ${rsi.toFixed(1)} (sweet spot 45-55) - +18% confidence`);
      } else if (rsi >= 42 && rsi <= 58) {
        confidence += 14;
        reasoning.push(`📈 RSI Recovery Zone: ${rsi.toFixed(1)} (good 42-58 range) - +14% confidence`);
      } else {
        confidence += 10;
        reasoning.push(`📈 RSI Recovery: ${rsi.toFixed(1)} (40-60 range) - +10% confidence`);
      }

      // Volume trend confirmation (decreasing volume on decline = exhaustion)
      if (volumeAnalysis.volumeTrend === 'DECREASING') {
        confidence += 10;
        reasoning.push(`📊 Volume Exhaustion: Declining volume on down move (bullish divergence) - +10% confidence`);
      } else if (volumeAnalysis.volumeTrend === 'INCREASING') {
        confidence += 8;
        reasoning.push(`📊 Volume Increasing: Support building - +8% confidence`);
      }

      // EMA crossover confirmation (trend reversal)
      if (technicals.emaCrossover === 'BULLISH') {
        confidence += 10;
        reasoning.push(`✅ EMA Crossover: Bullish (recovery confirmed) - +10% confidence`);
      }

      // MACD bullish divergence (momentum shifting)
      if (technicals.macd.crossover === 'BULLISH') {
        confidence += 8;
        reasoning.push(`✅ MACD: Bullish crossover (momentum recovery) - +8% confidence`);
      }

      // Bollinger Band position (bouncing from lower band = mean reversion)
      if (technicals.bollingerBands) {
        const { lower, middle } = technicals.bollingerBands;
        if (currentPrice <= lower * 1.02) { // Within 2% of lower band
          confidence += 10;
          reasoning.push(`📉 Bollinger Band: Near lower band (mean reversion setup) - +10% confidence`);
        } else if (currentPrice <= middle) {
          confidence += 5;
          reasoning.push(`📊 Bollinger Band: Below middle (recovery potential)`);
        }
      }

      // Order book support
      if (data.orderBookData?.buyPressure) {
        if (data.orderBookData.buyPressure > 60) {
          confidence += 7;
          reasoning.push(`📈 Strong Buy Support: ${data.orderBookData.buyPressure.toFixed(1)}% - +7% confidence`);
        } else if (data.orderBookData.buyPressure > 52) {
          confidence += 4;
          reasoning.push(`📈 Moderate Buy Support: ${data.orderBookData.buyPressure.toFixed(1)}%`);
        }
      }

      console.log(`[MomentumRecoveryStrategy] Bullish recovery pattern detected, confidence: ${confidence}%`);
    }
    // BEARISH RECOVERY: RSI 40-60 + Bearish volume divergence (overbought reversal)
    else if (volumeAnalysis.volumeDivergence && volumeAnalysis.divergenceType === 'BEARISH') {
      signalType = 'SELL';
      confidence = 38;

      reasoning.push(`📉 REVERSAL PATTERN: Bearish volume divergence in distribution zone`);
      reasoning.push(`📉 ${volumeAnalysis.interpretation}`);

      // Bearish volume divergence bonus
      confidence += 20;
      reasoning.push(`✅ Bearish Volume Divergence: Price up but volume declining - +20% confidence`);

      // RSI in distribution zone (45-55 is peak reversal zone)
      if (rsi >= 45 && rsi <= 55) {
        confidence += 18;
        reasoning.push(`📉 RSI Distribution Peak: ${rsi.toFixed(1)} (reversal zone 45-55) - +18% confidence`);
      } else if (rsi >= 42 && rsi <= 58) {
        confidence += 14;
        reasoning.push(`📉 RSI Distribution Zone: ${rsi.toFixed(1)} (good 42-58 range) - +14% confidence`);
      } else {
        confidence += 10;
        reasoning.push(`📉 RSI Distribution: ${rsi.toFixed(1)} (40-60 range) - +10% confidence`);
      }

      // Volume trend (decreasing on up move = distribution)
      if (volumeAnalysis.volumeTrend === 'DECREASING') {
        confidence += 10;
        reasoning.push(`📊 Volume Distribution: Declining volume on rally (bearish) - +10% confidence`);
      }

      // EMA crossover confirmation
      if (technicals.emaCrossover === 'BEARISH') {
        confidence += 10;
        reasoning.push(`✅ EMA Crossover: Bearish (reversal confirmed) - +10% confidence`);
      }

      // MACD bearish divergence
      if (technicals.macd.crossover === 'BEARISH') {
        confidence += 8;
        reasoning.push(`✅ MACD: Bearish crossover (momentum exhaustion) - +8% confidence`);
      }

      // Bollinger Band position (rejection from upper band = mean reversion)
      if (technicals.bollingerBands) {
        const { upper, middle } = technicals.bollingerBands;
        if (currentPrice >= upper * 0.98) { // Within 2% of upper band
          confidence += 10;
          reasoning.push(`📈 Bollinger Band: Near upper band (reversal setup) - +10% confidence`);
        } else if (currentPrice >= middle) {
          confidence += 5;
          reasoning.push(`📊 Bollinger Band: Above middle (reversal potential)`);
        }
      }

      // Order book weakness
      if (data.orderBookData?.buyPressure) {
        if (data.orderBookData.buyPressure < 40) {
          confidence += 7;
          reasoning.push(`📉 Weak Buy Support: ${data.orderBookData.buyPressure.toFixed(1)}% - +7% confidence`);
        } else if (data.orderBookData.buyPressure < 48) {
          confidence += 4;
          reasoning.push(`📉 Declining Support: ${data.orderBookData.buyPressure.toFixed(1)}%`);
        }
      }

      console.log(`[MomentumRecoveryStrategy] Bearish reversal pattern detected, confidence: ${confidence}%`);
    }
    // NO volume divergence - check for strong recovery signal without it
    else if (technicals.overallSignal === 'STRONG_BUY' && rsi >= 40 && rsi <= 60) {
      signalType = 'BUY';
      confidence = 35;

      reasoning.push(`📈 Strong Technical Recovery: ${technicals.overallSignal}`);
      reasoning.push(`📊 RSI Recovery Zone: ${rsi.toFixed(1)} (40-60 range)`);

      confidence += 15;

      if (rsi >= 45 && rsi <= 55) {
        confidence += 10;
        reasoning.push(`📈 RSI Perfect Recovery: ${rsi.toFixed(1)} - +10% confidence`);
      }

      if (technicals.emaCrossover === 'BULLISH') {
        confidence += 12;
        reasoning.push(`✅ EMA Bullish Crossover - +12% confidence`);
      }

      if (volumeAnalysis.volumeTrend === 'INCREASING') {
        confidence += 10;
        reasoning.push(`📊 Volume Increasing (buying support) - +10% confidence`);
      }

      console.log(`[MomentumRecoveryStrategy] Strong recovery (no divergence), confidence: ${confidence}%`);
    }
    // NO clear recovery pattern
    else {
      console.log(`[MomentumRecoveryStrategy] No recovery pattern detected (need volume divergence or STRONG_BUY signal)`);
      return {
        strategyName: 'MOMENTUM_RECOVERY',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: ['No recovery pattern: Need volume divergence or strong technical signal'],
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '1-4 days',
        indicators: {
          rsi,
          volumeDivergence: volumeAnalysis.volumeDivergence,
          divergenceType: volumeAnalysis.divergenceType,
          overallSignal: technicals.overallSignal,
          currentPrice
        },
        rejected: true,
        rejectionReason: 'No recovery pattern detected'
      };
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 58) {
      console.log(`[MomentumRecoveryStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (58%)`);
      return {
        strategyName: 'MOMENTUM_RECOVERY',
        symbol: data.symbol,
        type: null,
        confidence: Math.round(confidence),
        strength: 'WEAK',
        reasoning,
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '1-4 days',
        indicators: {
          rsi,
          rsiSignal: technicals.rsiSignal,
          volumeDivergence: volumeAnalysis.volumeDivergence,
          divergenceType: volumeAnalysis.divergenceType,
          volumeTrend: volumeAnalysis.volumeTrend,
          overallSignal: technicals.overallSignal,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (58%)`
      };
    }

    // ===== ATR-BASED DYNAMIC LEVELS =====
    // Recovery trades are mean reversion - use BULL_RANGE or BEAR_RANGE regime
    const { atrCalculator } = await import('../atrCalculator');

    const direction: 'LONG' | 'SHORT' = signalType === 'BUY' ? 'LONG' : 'SHORT';

    // Use range regime (mean reversion happens in ranging markets)
    const regime = signalType === 'BUY' ? 'BULL_RANGE' : 'BEAR_RANGE';
    const atrLevels = atrCalculator.getDynamicLevels(
      currentPrice,
      direction,
      candles,
      regime,
      confidence
    );

    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.98;
      entryMax = currentPrice * 1.02;
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    } else {
      entryMin = currentPrice * 0.98;
      entryMax = currentPrice * 1.02;
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    }

    const riskRewardRatio = atrLevels.riskRewardRatios[0];

    console.log(
      `[MomentumRecoveryStrategy] ATR-Based Levels | ` +
      `ATR: ${atrLevels.atrPercent.toFixed(2)}% | ` +
      `R:R: 1:${atrLevels.riskRewardRatios[0].toFixed(1)} / 1:${atrLevels.riskRewardRatios[1].toFixed(1)} / 1:${atrLevels.riskRewardRatios[2].toFixed(1)}`
    );

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 75) strength = 'STRONG';
    else if (confidence >= 65) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[MomentumRecoveryStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'MOMENTUM_RECOVERY',
      symbol: data.symbol,
      type: signalType,
      confidence: Math.round(confidence),
      strength,
      reasoning,
      entryMin,
      entryMax,
      targets: { target1, target2, target3 },
      stopLoss,
      riskRewardRatio: Math.round(riskRewardRatio * 10) / 10,
      timeframe: '1-4 days',
      indicators: {
        rsi,
        rsiSignal: technicals.rsiSignal,
        volumeDivergence: volumeAnalysis.volumeDivergence,
        divergenceType: volumeAnalysis.divergenceType,
        volumeTrend: volumeAnalysis.volumeTrend,
        emaCrossover: technicals.emaCrossover,
        macdCrossover: technicals.macd.crossover,
        overallSignal: technicals.overallSignal,
        currentPrice
      },
      // ATR-based fields
      atrBased: true,
      atrValue: atrLevels.atrValue,
      atrPercent: atrLevels.atrPercent,
      riskRewardRatios: atrLevels.riskRewardRatios,
      rejected: false
    };
  }
}

export const momentumRecoveryStrategy = new MomentumRecoveryStrategy();
