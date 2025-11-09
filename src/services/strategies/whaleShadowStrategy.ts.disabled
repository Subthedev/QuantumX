/**
 * WHALE SHADOW STRATEGY
 * Detects smart money divergence - whales accumulating during fear or distributing during greed
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';

export class WhaleShadowStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: On-chain data (exchange flows)
    if (!data.onChainData?.exchangeFlowRatio) {
      return {
        strategyName: 'WHALE_SHADOW',
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
        timeframe: '1-7 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required on-chain data'
      };
    }

    const { exchangeFlowRatio, smartMoneyDivergence } = data.onChainData;
    const fearGreedIndex = data.sentimentData?.fearGreedIndex || 50;
    const currentPrice = data.marketData?.current_price || 0;

    // BULLISH DIVERGENCE: Fear + Whale Accumulation (Exchange Outflows)
    if (fearGreedIndex < 35 && exchangeFlowRatio < -1.0) {
      signalType = 'BUY';
      confidence += 35;
      reasoning.push(`🐋 WHALE ACCUMULATION: ${Math.abs(exchangeFlowRatio).toFixed(2)}x exchange outflows during FEAR (${fearGreedIndex})`);

      // Extra confidence for extreme scenarios
      if (fearGreedIndex < 25 && exchangeFlowRatio < -1.5) {
        confidence += 15;
        reasoning.push(`⚡ EXTREME DIVERGENCE: Panic selling + heavy whale buying`);
      }

      // Market phase alignment
      if (data.marketPhase?.phase === 'ACCUMULATION') {
        confidence += 10;
        reasoning.push(`📊 Market Phase: Accumulation phase confirmed`);
      }
    }
    // BEARISH DIVERGENCE: Greed + Whale Distribution (Exchange Inflows)
    else if (fearGreedIndex > 65 && exchangeFlowRatio > 1.0) {
      signalType = 'SELL';
      confidence += 35;
      reasoning.push(`🐋 WHALE DISTRIBUTION: ${exchangeFlowRatio.toFixed(2)}x exchange inflows during GREED (${fearGreedIndex})`);

      // Extra confidence for extreme scenarios
      if (fearGreedIndex > 75 && exchangeFlowRatio > 1.5) {
        confidence += 15;
        reasoning.push(`⚡ EXTREME DIVERGENCE: Euphoria + heavy whale selling`);
      }

      // Market phase alignment
      if (data.marketPhase?.phase === 'DISTRIBUTION') {
        confidence += 10;
        reasoning.push(`📊 Market Phase: Distribution phase confirmed`);
      }
    }

    // Additional confirmation: Order book support (for BUY) or resistance (for SELL)
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 60) {
        confidence += 8;
        reasoning.push(`📈 Order Book: ${data.orderBookData.buyPressure.toFixed(1)}% buy-side support`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 40) {
        confidence += 8;
        reasoning.push(`📉 Order Book: ${data.orderBookData.buyPressure.toFixed(1)}% weak buy support`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 60) {
      return {
        strategyName: 'WHALE_SHADOW',
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
        timeframe: '1-7 days',
        indicators: {
          fearGreedIndex,
          exchangeFlowRatio,
          smartMoneyDivergence
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (60%)`
      };
    }

    // Calculate entry, targets, and stop loss
    const volatility = 0.03; // 3% default volatility assumption
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.98; // 2% below current
      entryMax = currentPrice * 1.02; // 2% above current
      target1 = currentPrice * 1.08; // 8% profit
      target2 = currentPrice * 1.15; // 15% profit
      target3 = currentPrice * 1.25; // 25% profit
      stopLoss = currentPrice * 0.92; // 8% stop loss
    } else {
      entryMin = currentPrice * 0.98;
      entryMax = currentPrice * 1.02;
      target1 = currentPrice * 0.92; // 8% profit on short
      target2 = currentPrice * 0.85; // 15% profit on short
      target3 = currentPrice * 0.75; // 25% profit on short
      stopLoss = currentPrice * 1.08; // 8% stop loss
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 80) strength = 'VERY_STRONG';
    else if (confidence >= 73) strength = 'STRONG';
    else if (confidence >= 68) strength = 'MODERATE';
    else strength = 'WEAK';

    return {
      strategyName: 'WHALE_SHADOW',
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
      timeframe: '1-7 days',
      indicators: {
        fearGreedIndex,
        exchangeFlowRatio,
        smartMoneyDivergence,
        currentPrice
      },
      rejected: false
    };
  }
}

export const whaleShadowStrategy = new WhaleShadowStrategy();
