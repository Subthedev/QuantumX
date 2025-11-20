/**
 * GOLDEN CROSS MOMENTUM STRATEGY
 * Golden cross (50 EMA > 200 EMA) + RSI momentum + volume confirmation
 *
 * LOGIC:
 * - Requires OHLC data (100+ candles for 200 EMA)
 * - Calculate 50/200 EMA, check if 50 recently crossed above 200
 * - RSI > 50 (bullish momentum)
 * - Volume increasing
 * - Base confidence: 40
 * - Add bonuses for each condition
 * - Minimum threshold: 69%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';

export class GoldenCrossMomentumStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[GoldenCrossMomentumStrategy] Analyzing ${data.symbol} for golden cross...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data with 100+ candles (need 200 EMA)
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 100) {
      console.log(`[GoldenCrossMomentumStrategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles (need 100+)`);
      return {
        strategyName: 'GOLDEN_CROSS_MOMENTUM',
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
        timeframe: '5-21 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required OHLC data (need 100+ candles for 200 EMA)'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const candles = data.ohlcData.candles;

    // Calculate EMAs
    const ema50 = technicalAnalysisService.calculateEMA(candles, 50);
    const ema200 = technicalAnalysisService.calculateEMA(candles, 200);
    const ema20 = technicalAnalysisService.calculateEMA(candles, 20);

    // Calculate previous EMAs to detect crossover
    const previousCandles = candles.slice(0, -5); // 5 candles ago
    const prevEma50 = technicalAnalysisService.calculateEMA(previousCandles, 50);
    const prevEma200 = technicalAnalysisService.calculateEMA(previousCandles, 200);

    console.log(`[GoldenCrossMomentumStrategy] Current: EMA50=${ema50.toFixed(2)}, EMA200=${ema200.toFixed(2)}`);
    console.log(`[GoldenCrossMomentumStrategy] Previous: EMA50=${prevEma50.toFixed(2)}, EMA200=${prevEma200.toFixed(2)}`);

    const goldenCrossActive = ema50 > ema200;
    const goldenCrossRecent = prevEma50 <= prevEma200 && ema50 > ema200;
    const deathCrossActive = ema50 < ema200;
    const deathCrossRecent = prevEma50 >= prevEma200 && ema50 < ema200;

    // Calculate technical indicators
    const technicals = technicalAnalysisService.analyzeTechnicals(candles);
    const rsi = technicals.rsi;

    console.log(`[GoldenCrossMomentumStrategy] Golden Cross Active: ${goldenCrossActive}`);
    console.log(`[GoldenCrossMomentumStrategy] Golden Cross Recent: ${goldenCrossRecent}`);
    console.log(`[GoldenCrossMomentumStrategy] RSI: ${rsi.toFixed(2)}`);

    // GOLDEN CROSS SCENARIO (Bullish)
    if (goldenCrossActive) {
      signalType = 'BUY';
      confidence = 40; // Base confidence

      if (goldenCrossRecent) {
        reasoning.push(`✨ GOLDEN CROSS DETECTED: 50 EMA just crossed above 200 EMA`);
        reasoning.push(`📈 Classic bullish reversal pattern - Major trend change`);
        confidence += 15;
        reasoning.push(`✅ Fresh crossover bonus: +15% confidence`);
      } else {
        reasoning.push(`📊 Golden Cross Active: 50 EMA (${ema50.toFixed(2)}) > 200 EMA (${ema200.toFixed(2)})`);
        reasoning.push(`📈 Bullish trend structure confirmed`);
        confidence += 8;
        reasoning.push(`✅ Active golden cross: +8% confidence`);
      }

      // RSI momentum check (>50 = bullish momentum)
      if (rsi > 50 && rsi < 70) {
        confidence += 12;
        reasoning.push(`📈 RSI Momentum: ${rsi.toFixed(1)} (>50 = bullish, <70 = not overbought) +12%`);
      } else if (rsi >= 70) {
        confidence += 6;
        reasoning.push(`⚠️ RSI Strong: ${rsi.toFixed(1)} (bullish but overbought) +6%`);
      } else {
        reasoning.push(`⚠️ RSI Weak: ${rsi.toFixed(1)} (<50 = lacks momentum)`);
      }

      // Volume confirmation
      const recentCandles = candles.slice(-10);
      const olderCandles = candles.slice(-30, -10);
      const recentVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const olderVolume = olderCandles.reduce((sum, c) => sum + c.volume, 0) / olderCandles.length;

      if (recentVolume > olderVolume * 1.2) {
        confidence += 10;
        reasoning.push(`📊 Volume Increasing: ${((recentVolume / olderVolume - 1) * 100).toFixed(1)}% above average +10%`);
      } else if (recentVolume > olderVolume) {
        confidence += 5;
        reasoning.push(`📊 Volume Stable/Slight Increase: ${((recentVolume / olderVolume - 1) * 100).toFixed(1)}%`);
      } else {
        reasoning.push(`⚠️ Volume Decreasing: Weak confirmation`);
      }

      // Price above 20 EMA (short-term strength)
      if (currentPrice > ema20) {
        confidence += 7;
        reasoning.push(`✅ Price > 20 EMA: Short-term uptrend confirmed +7%`);
      }

      // MACD confirmation
      if (technicals.macd.crossover === 'BULLISH') {
        confidence += 8;
        reasoning.push(`✅ MACD Bullish Crossover: Additional momentum confirmation +8%`);
      }

      console.log(`[GoldenCrossMomentumStrategy] Golden cross signal, confidence: ${confidence}%`);
    }
    // DEATH CROSS SCENARIO (Bearish)
    else if (deathCrossActive) {
      signalType = 'SELL';
      confidence = 40;

      if (deathCrossRecent) {
        reasoning.push(`💀 DEATH CROSS DETECTED: 50 EMA just crossed below 200 EMA`);
        reasoning.push(`📉 Classic bearish reversal pattern - Major trend change`);
        confidence += 15;
        reasoning.push(`✅ Fresh crossover bonus: +15% confidence`);
      } else {
        reasoning.push(`📊 Death Cross Active: 50 EMA (${ema50.toFixed(2)}) < 200 EMA (${ema200.toFixed(2)})`);
        reasoning.push(`📉 Bearish trend structure confirmed`);
        confidence += 8;
        reasoning.push(`✅ Active death cross: +8% confidence`);
      }

      // RSI momentum check (<50 = bearish momentum)
      if (rsi < 50 && rsi > 30) {
        confidence += 12;
        reasoning.push(`📉 RSI Momentum: ${rsi.toFixed(1)} (<50 = bearish, >30 = not oversold) +12%`);
      } else if (rsi <= 30) {
        confidence += 6;
        reasoning.push(`⚠️ RSI Weak: ${rsi.toFixed(1)} (bearish but oversold) +6%`);
      }

      // Volume confirmation
      const recentCandles = candles.slice(-10);
      const olderCandles = candles.slice(-30, -10);
      const recentVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const olderVolume = olderCandles.reduce((sum, c) => sum + c.volume, 0) / olderCandles.length;

      if (recentVolume > olderVolume * 1.2) {
        confidence += 10;
        reasoning.push(`📊 Volume Increasing: ${((recentVolume / olderVolume - 1) * 100).toFixed(1)}% (selling pressure) +10%`);
      }

      // Price below 20 EMA
      if (currentPrice < ema20) {
        confidence += 7;
        reasoning.push(`✅ Price < 20 EMA: Short-term downtrend confirmed +7%`);
      }

      // MACD confirmation
      if (technicals.macd.crossover === 'BEARISH') {
        confidence += 8;
        reasoning.push(`✅ MACD Bearish Crossover: Additional momentum confirmation +8%`);
      }

      console.log(`[GoldenCrossMomentumStrategy] Death cross signal, confidence: ${confidence}%`);
    }

    // Order book confirmation
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 60) {
        confidence += 6;
        reasoning.push(`📈 Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}% buy pressure`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 40) {
        confidence += 6;
        reasoning.push(`📉 Order Book Weakness: ${data.orderBookData.buyPressure.toFixed(1)}% weak buy support`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 56) {
      console.log(`[GoldenCrossMomentumStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (56%)`);
      return {
        strategyName: 'GOLDEN_CROSS_MOMENTUM',
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
        timeframe: '5-21 days',
        indicators: {
          ema50,
          ema200,
          ema20,
          goldenCrossActive,
          goldenCrossRecent,
          rsi,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (56%)`
      };
    }

    // Calculate entry, targets, and stop loss
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = currentPrice * 1.10; // 10% profit
      target2 = currentPrice * 1.20; // 20% profit
      target3 = currentPrice * 1.35; // 35% profit (golden cross can run far)
      stopLoss = currentPrice * 0.93; // 7% stop loss (use 200 EMA as support)
    } else {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = currentPrice * 0.90; // 10% profit on short
      target2 = currentPrice * 0.80; // 20% profit on short
      target3 = currentPrice * 0.65; // 35% profit on short
      stopLoss = currentPrice * 1.07; // 7% stop loss
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 77) strength = 'STRONG';
    else if (confidence >= 69) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[GoldenCrossMomentumStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'GOLDEN_CROSS_MOMENTUM',
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
      timeframe: '5-21 days',
      indicators: {
        ema50,
        ema200,
        ema20,
        goldenCrossActive,
        goldenCrossRecent,
        deathCrossActive,
        deathCrossRecent,
        rsi,
        macdCrossover: technicals.macd.crossover,
        currentPrice
      },
      rejected: false
    };
  }
}

export const goldenCrossMomentumStrategy = new GoldenCrossMomentumStrategy();
