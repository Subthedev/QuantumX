/**
 * MOMENTUM SURGE V2 STRATEGY
 * TRUE momentum continuation - captures genuine momentum acceleration
 *
 * LOGIC:
 * - BULLISH: RSI 60-75 (momentum zone) + volume surge 2x+ + price breakout
 * - BEARISH: RSI 25-40 (bearish momentum) + volume surge + price breakdown
 * - Base confidence: 35
 * - Add 20% if RSI in perfect momentum range
 * - Add 22% if volume surge 2x+ detected
 * - Add 10% for price breakout confirmation
 * - Minimum threshold: 60%
 *
 * INSTITUTIONAL INSIGHT:
 * Real momentum = strong directional move + volume surge + RSI in trend zone
 * NOT recovery or mean reversion - pure trend continuation
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { advancedPatternDetection } from '../advancedPatternDetection';
import { technicalAnalysisService } from '../technicalAnalysis';

export class MomentumSurgeV2Strategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[MomentumSurgeV2Strategy] Analyzing ${data.symbol} for TRUE momentum surge...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data for technical indicators
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 50) {
      console.log(`[MomentumSurgeV2Strategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles`);
      return {
        strategyName: 'MOMENTUM_SURGE_V2',
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
        timeframe: '2-7 days',
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

    // Calculate volume surge
    const recentVolumes = candles.slice(-10).map(c => c.volume);
    const avgVolume = recentVolumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (recentVolumes.length - 1);
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    const volumeSurge = avgVolume > 0 ? currentVolume / avgVolume : 1;

    // Calculate price momentum (recent price change)
    const priceChange24h = data.marketData?.price_change_percentage_24h || 0;

    console.log(`[MomentumSurgeV2Strategy] RSI: ${rsi.toFixed(2)}, Volume Surge: ${volumeSurge.toFixed(2)}x, Price Change: ${priceChange24h.toFixed(2)}%`);

    // BULLISH MOMENTUM SURGE: RSI 60-75 + Volume Surge + Price Breakout
    if (rsi >= 60 && rsi <= 75) {
      signalType = 'BUY';
      confidence = 35; // Base confidence

      reasoning.push(`🚀 MOMENTUM SURGE DETECTED: RSI in bullish momentum zone`);

      // RSI in perfect momentum range (60-75)
      if (rsi >= 62 && rsi <= 72) {
        confidence += 20;
        reasoning.push(`📈 RSI Momentum Zone: ${rsi.toFixed(1)} (perfect 62-72 range) - +20% confidence`);
      } else {
        confidence += 15;
        reasoning.push(`📈 RSI Momentum: ${rsi.toFixed(1)} (60-75 range) - +15% confidence`);
      }

      // Volume surge detection (2x+ is significant)
      if (volumeSurge >= 3.0) {
        confidence += 22;
        reasoning.push(`🔥 MASSIVE Volume Surge: ${volumeSurge.toFixed(2)}x average - +22% confidence`);
      } else if (volumeSurge >= 2.0) {
        confidence += 18;
        reasoning.push(`📊 Strong Volume Surge: ${volumeSurge.toFixed(2)}x average - +18% confidence`);
      } else if (volumeSurge >= 1.5) {
        confidence += 10;
        reasoning.push(`📊 Moderate Volume Surge: ${volumeSurge.toFixed(2)}x average - +10% confidence`);
      } else {
        reasoning.push(`⚠️ Volume Surge Weak: ${volumeSurge.toFixed(2)}x (need 2x+ for momentum)`);
      }

      // Price breakout confirmation (strong upward movement)
      if (priceChange24h >= 8) {
        confidence += 15;
        reasoning.push(`💥 Strong Price Breakout: +${priceChange24h.toFixed(1)}% (24h) - +15% confidence`);
      } else if (priceChange24h >= 5) {
        confidence += 10;
        reasoning.push(`✅ Price Momentum: +${priceChange24h.toFixed(1)}% (24h) - +10% confidence`);
      } else if (priceChange24h >= 3) {
        confidence += 5;
        reasoning.push(`📈 Moderate Price Move: +${priceChange24h.toFixed(1)}% (24h)`);
      } else {
        reasoning.push(`⚠️ Weak Price Action: +${priceChange24h.toFixed(1)}% (need 5%+ for momentum)`);
      }

      // EMA crossover confirmation (trend alignment)
      if (technicals.emaCrossover === 'BULLISH') {
        confidence += 8;
        reasoning.push(`✅ EMA Crossover: Bullish (trend aligned) - +8% confidence`);
      }

      // MACD confirmation (momentum indicator)
      if (technicals.macd.crossover === 'BULLISH' && technicals.macd.histogram > 0) {
        confidence += 7;
        reasoning.push(`✅ MACD: Bullish + positive histogram - +7% confidence`);
      }

      // Order book confirmation
      if (data.orderBookData?.buyPressure && data.orderBookData.buyPressure > 65) {
        confidence += 6;
        reasoning.push(`📈 Strong Buy Pressure: ${data.orderBookData.buyPressure.toFixed(1)}% - +6% confidence`);
      }

      console.log(`[MomentumSurgeV2Strategy] Bullish momentum surge detected, confidence: ${confidence}%`);
    }
    // BEARISH MOMENTUM SURGE: RSI 25-40 + Volume Surge + Price Breakdown
    else if (rsi >= 25 && rsi <= 40) {
      signalType = 'SELL';
      confidence = 35; // Base confidence

      reasoning.push(`🔻 BEARISH MOMENTUM DETECTED: RSI in bearish momentum zone`);

      // RSI in bearish momentum range (25-40)
      if (rsi >= 28 && rsi <= 38) {
        confidence += 20;
        reasoning.push(`📉 RSI Bearish Momentum: ${rsi.toFixed(1)} (perfect 28-38 range) - +20% confidence`);
      } else {
        confidence += 15;
        reasoning.push(`📉 RSI Bearish Zone: ${rsi.toFixed(1)} (25-40 range) - +15% confidence`);
      }

      // Volume surge on breakdown (panic selling or strong bearish flow)
      if (volumeSurge >= 3.0) {
        confidence += 22;
        reasoning.push(`🔥 MASSIVE Selling Pressure: ${volumeSurge.toFixed(2)}x volume - +22% confidence`);
      } else if (volumeSurge >= 2.0) {
        confidence += 18;
        reasoning.push(`📊 Strong Selling Volume: ${volumeSurge.toFixed(2)}x average - +18% confidence`);
      } else if (volumeSurge >= 1.5) {
        confidence += 10;
        reasoning.push(`📊 Moderate Selling Volume: ${volumeSurge.toFixed(2)}x - +10% confidence`);
      } else {
        reasoning.push(`⚠️ Volume Surge Weak: ${volumeSurge.toFixed(2)}x (need 2x+ for momentum)`);
      }

      // Price breakdown confirmation (strong downward movement)
      if (priceChange24h <= -8) {
        confidence += 15;
        reasoning.push(`💥 Strong Price Breakdown: ${priceChange24h.toFixed(1)}% (24h) - +15% confidence`);
      } else if (priceChange24h <= -5) {
        confidence += 10;
        reasoning.push(`✅ Bearish Momentum: ${priceChange24h.toFixed(1)}% (24h) - +10% confidence`);
      } else if (priceChange24h <= -3) {
        confidence += 5;
        reasoning.push(`📉 Moderate Decline: ${priceChange24h.toFixed(1)}% (24h)`);
      } else {
        reasoning.push(`⚠️ Weak Price Action: ${priceChange24h.toFixed(1)}% (need -5%+ for momentum)`);
      }

      // EMA crossover confirmation
      if (technicals.emaCrossover === 'BEARISH') {
        confidence += 8;
        reasoning.push(`✅ EMA Crossover: Bearish (trend aligned) - +8% confidence`);
      }

      // MACD confirmation
      if (technicals.macd.crossover === 'BEARISH' && technicals.macd.histogram < 0) {
        confidence += 7;
        reasoning.push(`✅ MACD: Bearish + negative histogram - +7% confidence`);
      }

      // Order book confirmation
      if (data.orderBookData?.buyPressure && data.orderBookData.buyPressure < 35) {
        confidence += 6;
        reasoning.push(`📉 Weak Buy Support: ${data.orderBookData.buyPressure.toFixed(1)}% - +6% confidence`);
      }

      console.log(`[MomentumSurgeV2Strategy] Bearish momentum surge detected, confidence: ${confidence}%`);
    }
    // Outside momentum zones - reject
    else {
      console.log(`[MomentumSurgeV2Strategy] RSI ${rsi.toFixed(1)} outside momentum zones (need 60-75 bullish or 25-40 bearish)`);
      return {
        strategyName: 'MOMENTUM_SURGE_V2',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`RSI ${rsi.toFixed(1)} outside momentum zones (need 60-75 bullish or 25-40 bearish)`],
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '2-7 days',
        indicators: { rsi, volumeSurge, priceChange24h, currentPrice },
        rejected: true,
        rejectionReason: 'RSI outside momentum zones'
      };
    }

    // Reject signal if confidence too low (raised threshold for momentum trades)
    if (!signalType || confidence < 60) {
      console.log(`[MomentumSurgeV2Strategy] Signal REJECTED - Confidence ${confidence}% below threshold (60%)`);
      return {
        strategyName: 'MOMENTUM_SURGE_V2',
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
        timeframe: '2-7 days',
        indicators: {
          rsi,
          volumeSurge,
          priceChange24h,
          emaCrossover: technicals.emaCrossover,
          macdCrossover: technicals.macd.crossover,
          overallSignal: technicals.overallSignal,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (60%)`
      };
    }

    // Calculate entry, targets, and stop loss using ATR-based dynamic levels
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;
    let riskRewardRatio = 0;

    // Import ATR calculator at runtime to avoid circular deps
    const { atrCalculator } = await import('../atrCalculator');

    // Get ATR-based dynamic levels
    const direction = signalType === 'BUY' ? 'LONG' : 'SHORT';
    const atrLevels = atrCalculator.getDynamicLevels(
      currentPrice,
      direction,
      data.ohlcData,
      data.regime || 'BULL_MOMENTUM', // Use detected regime or default
      confidence
    );

    // Use ATR-based levels for targets and stop loss
    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    } else {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    }

    riskRewardRatio = atrLevels.riskRewardRatios[0]; // Use first target R:R

    console.log(
      `[MomentumSurgeV2] ATR-Based Levels | ` +
      `ATR: ${atrLevels.atrPercent.toFixed(2)}% | ` +
      `R:R: 1:${atrLevels.riskRewardRatios[0].toFixed(1)} / 1:${atrLevels.riskRewardRatios[1].toFixed(1)} / 1:${atrLevels.riskRewardRatios[2].toFixed(1)}`
    );

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 75) strength = 'STRONG';
    else if (confidence >= 65) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[MomentumSurgeV2Strategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'MOMENTUM_SURGE_V2',
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
      timeframe: '2-7 days',
      indicators: {
        rsi,
        rsiSignal: technicals.rsiSignal,
        volumeSurge,
        priceChange24h,
        emaCrossover: technicals.emaCrossover,
        macdCrossover: technicals.macd.crossover,
        macdHistogram: technicals.macd.histogram,
        overallSignal: technicals.overallSignal,
        currentPrice
      },
      // ATR-based dynamic levels
      atrBased: true,
      atrValue: atrLevels.atrValue,
      atrPercent: atrLevels.atrPercent,
      riskRewardRatios: atrLevels.riskRewardRatios,
      rejected: false
    };
  }
}

export const momentumSurgeV2Strategy = new MomentumSurgeV2Strategy();
