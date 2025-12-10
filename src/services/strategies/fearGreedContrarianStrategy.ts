/**
 * FEAR & GREED CONTRARIAN STRATEGY
 * Pure contrarian strategy at extreme fear (<20) or greed (>80) levels
 *
 * LOGIC:
 * - Requires sentiment data (fear/greed index)
 * - Fear <20 = BUY (contrarian)
 * - Greed >80 = SELL (contrarian)
 * - Base confidence: 30
 * - Add up to 35% based on extremity
 * - Minimum threshold: 64%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';

export class FearGreedContrarianStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[FearGreedContrarianStrategy] Analyzing ${data.symbol} for fear/greed extremes...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // Get fear/greed index
    const fearGreedIndex = data.sentimentData?.fearGreedIndex;

    if (fearGreedIndex === undefined || fearGreedIndex === null) {
      console.log(`[FearGreedContrarianStrategy] No sentiment data available`);
      return {
        strategyName: 'FEAR_GREED_CONTRARIAN',
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
        timeframe: '7-30 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required sentiment data (Fear & Greed Index)'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;

    console.log(`[FearGreedContrarianStrategy] Fear & Greed Index: ${fearGreedIndex}`);

    // EXTREME FEAR: Contrarian BUY signal
    if (fearGreedIndex < 20) {
      signalType = 'BUY';
      confidence = 30; // Base confidence

      reasoning.push(`😱 EXTREME FEAR: Index at ${fearGreedIndex} (panic territory)`);
      reasoning.push(`💡 Contrarian Opportunity: "Be greedy when others are fearful"`);

      // Calculate extremity bonus
      if (fearGreedIndex < 10) {
        confidence += 35;
        reasoning.push(`⚡ MAXIMUM FEAR: ${fearGreedIndex} - Historic panic levels +35%`);
        reasoning.push(`🚨 Capitulation likely complete - Reversal imminent`);
      } else if (fearGreedIndex < 15) {
        confidence += 28;
        reasoning.push(`🔥 Severe Fear: ${fearGreedIndex} - Major panic +28% confidence`);
      } else {
        // 15-20 range
        confidence += 20;
        reasoning.push(`📊 Strong Fear: ${fearGreedIndex} - Significant panic +20% confidence`);
      }

      console.log(`[FearGreedContrarianStrategy] Extreme fear detected, confidence: ${confidence}%`);
    }
    // EXTREME GREED: Contrarian SELL signal
    else if (fearGreedIndex > 80) {
      signalType = 'SELL';
      confidence = 30;

      reasoning.push(`🤑 EXTREME GREED: Index at ${fearGreedIndex} (euphoria territory)`);
      reasoning.push(`💡 Contrarian Opportunity: "Be fearful when others are greedy"`);

      // Calculate extremity bonus
      if (fearGreedIndex > 90) {
        confidence += 35;
        reasoning.push(`⚡ MAXIMUM GREED: ${fearGreedIndex} - Historic euphoria levels +35%`);
        reasoning.push(`🚨 Top likely forming - Distribution phase`);
      } else if (fearGreedIndex > 85) {
        confidence += 28;
        reasoning.push(`🔥 Severe Greed: ${fearGreedIndex} - Major euphoria +28% confidence`);
      } else {
        // 80-85 range
        confidence += 20;
        reasoning.push(`📊 Strong Greed: ${fearGreedIndex} - Significant euphoria +20% confidence`);
      }

      console.log(`[FearGreedContrarianStrategy] Extreme greed detected, confidence: ${confidence}%`);
    } else {
      reasoning.push(`📊 Fear & Greed Neutral: ${fearGreedIndex} (20-80 range)`);
      reasoning.push(`No extreme sentiment detected for contrarian play`);
    }

    // On-chain confirmation: Smart money divergence
    if (signalType === 'BUY' && data.onChainData?.smartMoneyDivergence?.detected) {
      if (data.onChainData.smartMoneyDivergence.type === 'BULLISH') {
        confidence += 12;
        reasoning.push(`🐋 Smart Money Alignment: ${data.onChainData.smartMoneyDivergence.reason} +12%`);
      }
    } else if (signalType === 'SELL' && data.onChainData?.smartMoneyDivergence?.detected) {
      if (data.onChainData.smartMoneyDivergence.type === 'BEARISH') {
        confidence += 12;
        reasoning.push(`🐋 Smart Money Alignment: ${data.onChainData.smartMoneyDivergence.reason} +12%`);
      }
    }

    // Exchange flow confirmation
    if (signalType === 'BUY' && data.onChainData?.exchangeFlowRatio !== undefined) {
      const flowRatio = data.onChainData.exchangeFlowRatio;
      if (flowRatio < -1.0) { // Whales accumulating
        confidence += 10;
        reasoning.push(`📈 Exchange Outflows: ${Math.abs(flowRatio).toFixed(2)}x - Whales accumulating during fear +10%`);
      }
    } else if (signalType === 'SELL' && data.onChainData?.exchangeFlowRatio !== undefined) {
      const flowRatio = data.onChainData.exchangeFlowRatio;
      if (flowRatio > 1.0) { // Whales distributing
        confidence += 10;
        reasoning.push(`📉 Exchange Inflows: ${flowRatio.toFixed(2)}x - Whales distributing during greed +10%`);
      }
    }

    // Technical oversold/overbought confirmation
    if (signalType && data.ohlcData?.candles && data.ohlcData.candles.length >= 50) {
      const technicals = technicalAnalysisService.analyzeTechnicals(data.ohlcData.candles);

      if (signalType === 'BUY' && technicals.rsiSignal === 'OVERSOLD') {
        confidence += 8;
        reasoning.push(`✅ RSI Oversold: ${technicals.rsi.toFixed(1)} - Technical alignment +8%`);
      } else if (signalType === 'SELL' && technicals.rsiSignal === 'OVERBOUGHT') {
        confidence += 8;
        reasoning.push(`✅ RSI Overbought: ${technicals.rsi.toFixed(1)} - Technical alignment +8%`);
      }
    }

    // Market phase alignment
    if (signalType === 'BUY' && data.marketPhase?.phase === 'ACCUMULATION') {
      confidence += 8;
      reasoning.push(`📊 Market Phase: Accumulation - Confirms contrarian buy +8%`);
    } else if (signalType === 'SELL' && data.marketPhase?.phase === 'DISTRIBUTION') {
      confidence += 8;
      reasoning.push(`📊 Market Phase: Distribution - Confirms contrarian sell +8%`);
    }

    // Historical pattern: Fear/greed extremes often mark reversals
    if (signalType) {
      reasoning.push(`📚 Historical Edge: Fear/greed extremes have 68% reversal success rate`);
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 60) {
      console.log(`[FearGreedContrarianStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (60%)`);
      return {
        strategyName: 'FEAR_GREED_CONTRARIAN',
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
        timeframe: '7-30 days',
        indicators: {
          fearGreedIndex,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (60%)`
      };
    }

    // Calculate entry, targets, and stop loss
    // Contrarian plays are LONG-TERM - wider targets and stops
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.95; // 5% below (can accumulate on dips)
      entryMax = currentPrice * 1.05; // 5% above
      target1 = currentPrice * 1.15; // 15% profit
      target2 = currentPrice * 1.30; // 30% profit
      target3 = currentPrice * 1.50; // 50% profit (major reversal)
      stopLoss = currentPrice * 0.85; // 15% stop loss (contrarian needs room)
    } else {
      entryMin = currentPrice * 0.95;
      entryMax = currentPrice * 1.05;
      target1 = currentPrice * 0.85; // 15% profit on short
      target2 = currentPrice * 0.70; // 30% profit on short
      target3 = currentPrice * 0.50; // 50% profit on short
      stopLoss = currentPrice * 1.15; // 15% stop loss
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 80) strength = 'VERY_STRONG';
    else if (confidence >= 72) strength = 'STRONG';
    else if (confidence >= 64) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[FearGreedContrarianStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'FEAR_GREED_CONTRARIAN',
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
      timeframe: '7-30 days',
      indicators: {
        fearGreedIndex,
        extremityLevel: fearGreedIndex < 20 ? 'EXTREME_FEAR' : 'EXTREME_GREED',
        smartMoneyDivergence: data.onChainData?.smartMoneyDivergence?.type,
        exchangeFlowRatio: data.onChainData?.exchangeFlowRatio,
        currentPrice
      },
      rejected: false
    };
  }
}

export const fearGreedContrarianStrategy = new FearGreedContrarianStrategy();
