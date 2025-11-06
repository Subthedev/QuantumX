/**
 * SPRING TRAP STRATEGY
 * Detects Wyckoff Spring patterns (false breakdowns that trap sellers)
 *
 * LOGIC:
 * - Requires OHLC data with 50+ candles
 * - Detects Spring pattern using advancedPatternDetection.detectWyckoffAccumulation()
 * - Spring confidence >75% generates BUY signal
 * - Base confidence: 40, plus pattern confidence bonus
 * - Minimum threshold: 70%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { advancedPatternDetection } from '../advancedPatternDetection';

export class SpringTrapStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[SpringTrapStrategy] Analyzing ${data.symbol} for Spring pattern...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data with 50+ candles
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 50) {
      console.log(`[SpringTrapStrategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles (need 50+)`);
      return {
        strategyName: 'SPRING_TRAP',
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
        timeframe: '2-14 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required OHLC data (need 50+ candles)'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const recent50Candles = data.ohlcData.candles.slice(-50);

    // DETECT WYCKOFF ACCUMULATION PATTERN (Spring is part of this)
    const wyckoffPattern = advancedPatternDetection.detectWyckoffAccumulation(recent50Candles);

    console.log(`[SpringTrapStrategy] Wyckoff pattern detected: ${wyckoffPattern.detected}`);
    if (wyckoffPattern.detected) {
      console.log(`[SpringTrapStrategy] Pattern type: ${wyckoffPattern.type}, Phase: ${wyckoffPattern.phase}`);
      console.log(`[SpringTrapStrategy] Pattern confidence: ${wyckoffPattern.confidence}%`);
    }

    // CHECK FOR SPRING PATTERN with high confidence
    if (wyckoffPattern.detected &&
        wyckoffPattern.type === 'ACCUMULATION' &&
        wyckoffPattern.phase.includes('SPRING') &&
        wyckoffPattern.confidence > 75) {

      signalType = 'BUY';
      confidence = 40; // Base confidence

      reasoning.push(`🎯 SPRING DETECTED: ${wyckoffPattern.phase} - False breakdown trapped sellers`);
      reasoning.push(`📊 Pattern Confidence: ${wyckoffPattern.confidence}% (High conviction)`);
      reasoning.push(`💡 ${wyckoffPattern.reasoning}`);

      // Add pattern confidence bonus (up to 30% extra)
      const patternBonus = Math.round(wyckoffPattern.confidence * 0.3);
      confidence += patternBonus;
      reasoning.push(`✅ Pattern strength bonus: +${patternBonus}%`);

      // Additional characteristics boost
      if (wyckoffPattern.characteristics.length >= 3) {
        confidence += 10;
        reasoning.push(`✅ Multiple accumulation characteristics: ${wyckoffPattern.characteristics.length}`);
      }

      // Order book confirmation
      if (data.orderBookData?.buyPressure && data.orderBookData.buyPressure > 60) {
        confidence += 8;
        reasoning.push(`📈 Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}% buy pressure`);
      }

      // Volume confirmation
      const volumeAnalysis = advancedPatternDetection.analyzeVolumeDivergence(recent50Candles);
      if (volumeAnalysis.volumeDivergence && volumeAnalysis.divergenceType === 'BULLISH') {
        confidence += 7;
        reasoning.push(`📊 Bullish Volume Divergence: ${volumeAnalysis.interpretation}`);
      }

      console.log(`[SpringTrapStrategy] Spring pattern CONFIRMED with ${confidence}% confidence`);
      wyckoffPattern.characteristics.forEach(char => {
        reasoning.push(`  • ${char}`);
      });
    } else {
      // Check for Sign of Strength or other accumulation phases
      if (wyckoffPattern.detected && wyckoffPattern.type === 'ACCUMULATION' && wyckoffPattern.confidence >= 70) {
        signalType = 'BUY';
        confidence = 30 + Math.round(wyckoffPattern.confidence * 0.25);

        reasoning.push(`📊 Wyckoff Accumulation: ${wyckoffPattern.phase} phase detected`);
        reasoning.push(`💡 ${wyckoffPattern.reasoning}`);

        console.log(`[SpringTrapStrategy] General accumulation pattern detected (not Spring), confidence: ${confidence}%`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 58) {
      console.log(`[SpringTrapStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (58%)`);
      return {
        strategyName: 'SPRING_TRAP',
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
        timeframe: '2-14 days',
        indicators: {
          wyckoffPattern: wyckoffPattern.phase,
          patternConfidence: wyckoffPattern.confidence,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (58%)`
      };
    }

    // Calculate entry, targets, and stop loss
    const entryMin = currentPrice * 0.97; // 3% below current
    const entryMax = currentPrice * 1.03; // 3% above current
    const target1 = currentPrice * 1.10; // 10% profit
    const target2 = currentPrice * 1.18; // 18% profit
    const target3 = currentPrice * 1.30; // 30% profit
    const stopLoss = currentPrice * 0.90; // 10% stop loss (Spring can be volatile)

    const riskRewardRatio = (target1 - currentPrice) / (currentPrice - stopLoss);

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 78) strength = 'STRONG';
    else if (confidence >= 70) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[SpringTrapStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'SPRING_TRAP',
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
      timeframe: '2-14 days',
      indicators: {
        wyckoffPattern: wyckoffPattern.phase,
        patternConfidence: wyckoffPattern.confidence,
        characteristics: wyckoffPattern.characteristics,
        tradingImplication: wyckoffPattern.tradingImplication,
        currentPrice
      },
      rejected: false
    };
  }
}

export const springTrapStrategy = new SpringTrapStrategy();
