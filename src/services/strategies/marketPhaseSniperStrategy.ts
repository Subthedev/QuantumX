/**
 * MARKET PHASE SNIPER STRATEGY
 * Adaptive strategy based on market phase (Accumulation/Distribution/Markup/Markdown)
 *
 * LOGIC:
 * - Requires market phase detection data
 * - If phase = ACCUMULATION + whale accumulation: BUY
 * - If phase = DISTRIBUTION + whale distribution: SELL
 * - If phase = MARKUP + momentum: BUY continuation
 * - If phase = MARKDOWN + momentum: SELL continuation
 * - Base confidence: 35
 * - Add based on phase confidence and alignment
 * - Minimum threshold: 57%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';

export class MarketPhaseSniperStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[MarketPhaseSniperStrategy] Analyzing ${data.symbol} market phase...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: Market phase data
    if (!data.marketPhase?.phase) {
      console.log(`[MarketPhaseSniperStrategy] No market phase data available`);
      return {
        strategyName: 'MARKET_PHASE_SNIPER',
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
        timeframe: '3-14 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required market phase data'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const phase = data.marketPhase.phase;
    const phaseConfidence = data.marketPhase.confidence || 0;

    console.log(`[MarketPhaseSniperStrategy] Market Phase: ${phase} (${phaseConfidence}% confidence)`);

    // Get on-chain data for smart money divergence
    const exchangeFlowRatio = data.onChainData?.exchangeFlowRatio;
    const smartMoneyDivergence = data.onChainData?.smartMoneyDivergence;

    // ACCUMULATION PHASE: Look for whale accumulation
    if (phase === 'ACCUMULATION') {
      confidence = 35; // Base confidence

      reasoning.push(`📊 ACCUMULATION PHASE: Smart money buying during fear`);
      reasoning.push(`💡 Phase confidence: ${phaseConfidence}%`);

      // Phase confidence bonus
      if (phaseConfidence > 70) {
        confidence += 15;
        reasoning.push(`✅ High phase conviction: +15% confidence`);
      } else if (phaseConfidence > 60) {
        confidence += 10;
        reasoning.push(`✅ Moderate phase conviction: +10% confidence`);
      } else {
        confidence += 5;
        reasoning.push(`✅ Phase detected: +5% confidence`);
      }

      // Whale accumulation confirmation (exchange outflows)
      if (exchangeFlowRatio !== undefined && exchangeFlowRatio < -1.0) {
        signalType = 'BUY';
        confidence += 18;
        reasoning.push(`🐋 Whale Accumulation: ${Math.abs(exchangeFlowRatio).toFixed(2)}x exchange outflows +18%`);
      } else if (exchangeFlowRatio !== undefined && exchangeFlowRatio < -0.5) {
        signalType = 'BUY';
        confidence += 12;
        reasoning.push(`🐋 Moderate Accumulation: ${Math.abs(exchangeFlowRatio).toFixed(2)}x outflows +12%`);
      } else {
        signalType = 'BUY';
        confidence += 5;
        reasoning.push(`📊 Accumulation phase detected (weak on-chain confirmation)`);
      }

      // Smart money divergence bonus
      if (smartMoneyDivergence?.detected && smartMoneyDivergence.type === 'BULLISH') {
        confidence += 12;
        reasoning.push(`✅ Smart Money Divergence: ${smartMoneyDivergence.reason} +12%`);
      }

      console.log(`[MarketPhaseSniperStrategy] Accumulation phase BUY signal, confidence: ${confidence}%`);
    }
    // DISTRIBUTION PHASE: Look for whale distribution
    else if (phase === 'DISTRIBUTION') {
      confidence = 35;

      reasoning.push(`📊 DISTRIBUTION PHASE: Smart money selling during greed`);
      reasoning.push(`💡 Phase confidence: ${phaseConfidence}%`);

      // Phase confidence bonus
      if (phaseConfidence > 70) {
        confidence += 15;
        reasoning.push(`✅ High phase conviction: +15% confidence`);
      } else if (phaseConfidence > 60) {
        confidence += 10;
        reasoning.push(`✅ Moderate phase conviction: +10% confidence`);
      } else {
        confidence += 5;
        reasoning.push(`✅ Phase detected: +5% confidence`);
      }

      // Whale distribution confirmation (exchange inflows)
      if (exchangeFlowRatio !== undefined && exchangeFlowRatio > 1.0) {
        signalType = 'SELL';
        confidence += 18;
        reasoning.push(`🐋 Whale Distribution: ${exchangeFlowRatio.toFixed(2)}x exchange inflows +18%`);
      } else if (exchangeFlowRatio !== undefined && exchangeFlowRatio > 0.5) {
        signalType = 'SELL';
        confidence += 12;
        reasoning.push(`🐋 Moderate Distribution: ${exchangeFlowRatio.toFixed(2)}x inflows +12%`);
      } else {
        signalType = 'SELL';
        confidence += 5;
        reasoning.push(`📊 Distribution phase detected (weak on-chain confirmation)`);
      }

      // Smart money divergence bonus
      if (smartMoneyDivergence?.detected && smartMoneyDivergence.type === 'BEARISH') {
        confidence += 12;
        reasoning.push(`✅ Smart Money Divergence: ${smartMoneyDivergence.reason} +12%`);
      }

      console.log(`[MarketPhaseSniperStrategy] Distribution phase SELL signal, confidence: ${confidence}%`);
    }
    // MARKUP PHASE: Trend continuation (BUY)
    else if (phase === 'MARKUP') {
      signalType = 'BUY';
      confidence = 35;

      reasoning.push(`📈 MARKUP PHASE: Uptrend in progress - Trend following`);
      reasoning.push(`💡 Phase confidence: ${phaseConfidence}%`);

      // Phase confidence bonus
      if (phaseConfidence > 70) {
        confidence += 12;
        reasoning.push(`✅ Strong uptrend: +12% confidence`);
      } else {
        confidence += 8;
        reasoning.push(`✅ Uptrend detected: +8% confidence`);
      }

      // Momentum confirmation
      if (data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h > 3) {
        confidence += 10;
        reasoning.push(`📈 Strong Price Momentum: +${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h) +10%`);
      } else if (data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h > 0) {
        confidence += 6;
        reasoning.push(`📈 Positive Momentum: +${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h)`);
      }

      // No distribution signal (whales still holding/accumulating)
      if (exchangeFlowRatio !== undefined && exchangeFlowRatio < 0.5) {
        confidence += 10;
        reasoning.push(`✅ No Whale Distribution: Trend likely to continue +10%`);
      }

      console.log(`[MarketPhaseSniperStrategy] Markup phase BUY continuation, confidence: ${confidence}%`);
    }
    // MARKDOWN PHASE: Downtrend continuation (SELL)
    else if (phase === 'MARKDOWN') {
      signalType = 'SELL';
      confidence = 35;

      reasoning.push(`📉 MARKDOWN PHASE: Downtrend in progress - Trend following`);
      reasoning.push(`💡 Phase confidence: ${phaseConfidence}%`);

      // Phase confidence bonus
      if (phaseConfidence > 70) {
        confidence += 12;
        reasoning.push(`✅ Strong downtrend: +12% confidence`);
      } else {
        confidence += 8;
        reasoning.push(`✅ Downtrend detected: +8% confidence`);
      }

      // Momentum confirmation
      if (data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h < -3) {
        confidence += 10;
        reasoning.push(`📉 Strong Negative Momentum: ${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h) +10%`);
      } else if (data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h < 0) {
        confidence += 6;
        reasoning.push(`📉 Negative Momentum: ${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h)`);
      }

      // No accumulation signal (whales still distributing/selling)
      if (exchangeFlowRatio !== undefined && exchangeFlowRatio > -0.5) {
        confidence += 10;
        reasoning.push(`✅ No Whale Accumulation: Downtrend likely to continue +10%`);
      }

      console.log(`[MarketPhaseSniperStrategy] Markdown phase SELL continuation, confidence: ${confidence}%`);
    }

    // Order book confirmation
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 60) {
        confidence += 8;
        reasoning.push(`📈 Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}% buy pressure +8%`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 40) {
        confidence += 8;
        reasoning.push(`📉 Order Book Weakness: ${data.orderBookData.buyPressure.toFixed(1)}% weak buy support +8%`);
      }
    }

    // Technical confirmation
    if (signalType && data.ohlcData?.candles && data.ohlcData.candles.length >= 50) {
      const technicals = technicalAnalysisService.analyzeTechnicals(data.ohlcData.candles);

      if (signalType === 'BUY' && (technicals.overallSignal === 'STRONG_BUY' || technicals.overallSignal === 'BUY')) {
        confidence += 7;
        reasoning.push(`✅ Technical Analysis: ${technicals.overallSignal} - Confirms phase direction +7%`);
      } else if (signalType === 'SELL' && (technicals.overallSignal === 'STRONG_SELL' || technicals.overallSignal === 'SELL')) {
        confidence += 7;
        reasoning.push(`✅ Technical Analysis: ${technicals.overallSignal} - Confirms phase direction +7%`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 57) {
      console.log(`[MarketPhaseSniperStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (57%)`);
      return {
        strategyName: 'MARKET_PHASE_SNIPER',
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
        timeframe: '3-14 days',
        indicators: {
          marketPhase: phase,
          phaseConfidence,
          exchangeFlowRatio,
          smartMoneyDivergence: smartMoneyDivergence?.type,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (57%)`
      };
    }

    // Calculate entry, targets, and stop loss (adaptive based on phase)
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      if (phase === 'ACCUMULATION') {
        // Wider entry range for accumulation
        entryMin = currentPrice * 0.95;
        entryMax = currentPrice * 1.05;
        target1 = currentPrice * 1.12; // 12% profit
        target2 = currentPrice * 1.25; // 25% profit
        target3 = currentPrice * 1.40; // 40% profit
        stopLoss = currentPrice * 0.90; // 10% stop
      } else {
        // MARKUP: Tighter entry for trend continuation
        entryMin = currentPrice * 0.98;
        entryMax = currentPrice * 1.02;
        target1 = currentPrice * 1.08; // 8% profit
        target2 = currentPrice * 1.15; // 15% profit
        target3 = currentPrice * 1.25; // 25% profit
        stopLoss = currentPrice * 0.94; // 6% stop
      }
    } else {
      if (phase === 'DISTRIBUTION') {
        // Wider entry range for distribution
        entryMin = currentPrice * 0.95;
        entryMax = currentPrice * 1.05;
        target1 = currentPrice * 0.88; // 12% profit on short
        target2 = currentPrice * 0.75; // 25% profit on short
        target3 = currentPrice * 0.60; // 40% profit on short
        stopLoss = currentPrice * 1.10; // 10% stop
      } else {
        // MARKDOWN: Tighter entry for trend continuation
        entryMin = currentPrice * 0.98;
        entryMax = currentPrice * 1.02;
        target1 = currentPrice * 0.92; // 8% profit on short
        target2 = currentPrice * 0.85; // 15% profit on short
        target3 = currentPrice * 0.75; // 25% profit on short
        stopLoss = currentPrice * 1.06; // 6% stop
      }
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 76) strength = 'STRONG';
    else if (confidence >= 68) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[MarketPhaseSniperStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'MARKET_PHASE_SNIPER',
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
      timeframe: '3-14 days',
      indicators: {
        marketPhase: phase,
        phaseConfidence,
        exchangeFlowRatio,
        smartMoneyDivergence: smartMoneyDivergence?.type,
        priceChange24h: data.marketData?.priceChangePercentage24h,
        currentPrice
      },
      rejected: false
    };
  }
}

export const marketPhaseSniperStrategy = new MarketPhaseSniperStrategy();
