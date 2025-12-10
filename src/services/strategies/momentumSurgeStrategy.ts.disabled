/**
 * MOMENTUM SURGE STRATEGY
 * Combines volume divergence with RSI momentum for trend continuation
 *
 * LOGIC:
 * - Requires OHLC data and technical indicators (RSI)
 * - Bullish volume divergence + RSI between 40-60 (oversold recovery)
 * - Base confidence: 35
 * - Add 15% if RSI in perfect range (40-60)
 * - Add 18% if bullish volume divergence detected
 * - Minimum threshold: 55%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { advancedPatternDetection } from '../advancedPatternDetection';
import { technicalAnalysisService } from '../technicalAnalysis';

export class MomentumSurgeStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[MomentumSurgeStrategy] Analyzing ${data.symbol} for momentum surge...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data for technical indicators
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 50) {
      console.log(`[MomentumSurgeStrategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles`);
      return {
        strategyName: 'MOMENTUM_SURGE',
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
        timeframe: '1-5 days',
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

    console.log(`[MomentumSurgeStrategy] RSI: ${rsi.toFixed(2)}, Signal: ${technicals.rsiSignal}`);

    // Analyze volume divergence
    const volumeAnalysis = advancedPatternDetection.analyzeVolumeDivergence(candles);

    console.log(`[MomentumSurgeStrategy] Volume divergence: ${volumeAnalysis.volumeDivergence}`);
    console.log(`[MomentumSurgeStrategy] Divergence type: ${volumeAnalysis.divergenceType}`);

    // BULLISH SCENARIO: Bullish volume divergence + RSI recovery (40-60 range)
    if (volumeAnalysis.volumeDivergence && volumeAnalysis.divergenceType === 'BULLISH') {
      signalType = 'BUY';
      confidence = 35; // Base confidence

      reasoning.push(`📊 Bullish Volume Divergence: ${volumeAnalysis.interpretation}`);

      // Volume divergence bonus
      confidence += 18;
      reasoning.push(`✅ Volume divergence detected: +18% confidence`);

      // RSI in perfect recovery range (40-60)
      if (rsi >= 40 && rsi <= 60) {
        confidence += 15;
        reasoning.push(`📈 RSI Recovery Zone: ${rsi.toFixed(1)} (optimal 40-60 range) - +15% confidence`);
      } else if (rsi >= 35 && rsi <= 65) {
        confidence += 8;
        reasoning.push(`📈 RSI Near Recovery: ${rsi.toFixed(1)} (acceptable range)`);
      } else {
        reasoning.push(`⚠️ RSI Outside Optimal Range: ${rsi.toFixed(1)}`);
      }

      // Volume trend confirmation
      if (volumeAnalysis.volumeTrend === 'INCREASING') {
        confidence += 7;
        reasoning.push(`📊 Volume Trend: Increasing (confirmation)`);
      }

      // EMA crossover confirmation
      if (technicals.emaCrossover === 'BULLISH') {
        confidence += 8;
        reasoning.push(`✅ EMA Crossover: Bullish (9/21/50 EMAs)`);
      }

      // MACD confirmation
      if (technicals.macd.crossover === 'BULLISH') {
        confidence += 6;
        reasoning.push(`✅ MACD: Bullish crossover`);
      }

      console.log(`[MomentumSurgeStrategy] Bullish momentum surge detected, confidence: ${confidence}%`);
    }
    // BEARISH SCENARIO: Bearish volume divergence + RSI overbought
    else if (volumeAnalysis.volumeDivergence && volumeAnalysis.divergenceType === 'BEARISH') {
      signalType = 'SELL';
      confidence = 35;

      reasoning.push(`📉 Bearish Volume Divergence: ${volumeAnalysis.interpretation}`);

      confidence += 18;
      reasoning.push(`✅ Bearish volume divergence: +18% confidence`);

      // RSI overbought (momentum exhaustion)
      if (rsi >= 60 && rsi <= 75) {
        confidence += 15;
        reasoning.push(`📉 RSI Exhaustion Zone: ${rsi.toFixed(1)} (60-75 range) - +15% confidence`);
      } else if (rsi > 75) {
        confidence += 12;
        reasoning.push(`⚠️ RSI Extremely Overbought: ${rsi.toFixed(1)}`);
      }

      // EMA crossover confirmation
      if (technicals.emaCrossover === 'BEARISH') {
        confidence += 8;
        reasoning.push(`✅ EMA Crossover: Bearish`);
      }

      console.log(`[MomentumSurgeStrategy] Bearish momentum detected, confidence: ${confidence}%`);
    }
    // Check for strong momentum without volume divergence
    else if (technicals.overallSignal === 'STRONG_BUY' && rsi >= 40 && rsi <= 60) {
      signalType = 'BUY';
      confidence = 35;

      reasoning.push(`📈 Strong Technical Signal: ${technicals.overallSignal}`);
      reasoning.push(`📊 RSI Recovery: ${rsi.toFixed(1)} (40-60 optimal range)`);

      confidence += 12;

      if (technicals.emaCrossover === 'BULLISH') {
        confidence += 10;
        reasoning.push(`✅ EMA Bullish Crossover`);
      }

      if (volumeAnalysis.volumeTrend === 'INCREASING') {
        confidence += 8;
        reasoning.push(`📊 Volume Increasing`);
      }

      console.log(`[MomentumSurgeStrategy] Strong momentum (no divergence), confidence: ${confidence}%`);
    }

    // Additional confirmation: Order book support
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 65) {
        confidence += 6;
        reasoning.push(`📈 Strong Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}%`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 35) {
        confidence += 6;
        reasoning.push(`📉 Weak Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}%`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 55) {
      console.log(`[MomentumSurgeStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (55%)`);
      return {
        strategyName: 'MOMENTUM_SURGE',
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
        timeframe: '1-5 days',
        indicators: {
          rsi,
          rsiSignal: technicals.rsiSignal,
          volumeDivergence: volumeAnalysis.volumeDivergence,
          divergenceType: volumeAnalysis.divergenceType,
          overallSignal: technicals.overallSignal,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (55%)`
      };
    }

    // Calculate entry, targets, and stop loss
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.98;
      entryMax = currentPrice * 1.02;
      target1 = currentPrice * 1.07; // 7% profit
      target2 = currentPrice * 1.12; // 12% profit
      target3 = currentPrice * 1.20; // 20% profit
      stopLoss = currentPrice * 0.94; // 6% stop loss
    } else {
      entryMin = currentPrice * 0.98;
      entryMax = currentPrice * 1.02;
      target1 = currentPrice * 0.93; // 7% profit on short
      target2 = currentPrice * 0.88; // 12% profit on short
      target3 = currentPrice * 0.80; // 20% profit on short
      stopLoss = currentPrice * 1.06; // 6% stop loss
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 82) strength = 'VERY_STRONG';
    else if (confidence >= 74) strength = 'STRONG';
    else if (confidence >= 66) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[MomentumSurgeStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'MOMENTUM_SURGE',
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
      timeframe: '1-5 days',
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
      rejected: false
    };
  }
}

export const momentumSurgeStrategy = new MomentumSurgeStrategy();
