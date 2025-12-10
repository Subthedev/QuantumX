/**
 * LIQUIDITY HUNTER STRATEGY
 * Large exchange outflows + volume spikes to capture smart money moves early
 *
 * LOGIC:
 * - Requires on-chain data and volume data
 * - Exchange outflows < -1.5 (large outflows) + volume spike (>1.5x average)
 * - Base confidence: 35
 * - Add bonuses for extremes
 * - Minimum threshold: 59%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';

export class LiquidityHunterStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[LiquidityHunterStrategy] Analyzing ${data.symbol} for liquidity moves...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: On-chain data for exchange flows
    if (!data.onChainData?.exchangeFlowRatio) {
      console.log(`[LiquidityHunterStrategy] No on-chain data available`);
      return {
        strategyName: 'LIQUIDITY_HUNTER',
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
        timeframe: '2-10 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required on-chain data (exchange flows)'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const exchangeFlowRatio = data.onChainData.exchangeFlowRatio;

    console.log(`[LiquidityHunterStrategy] Exchange Flow Ratio: ${exchangeFlowRatio.toFixed(3)}`);

    // Calculate volume spike (if OHLC data available)
    let volumeSpike = 1.0;
    let hasVolumeData = false;

    if (data.ohlcData?.candles && data.ohlcData.candles.length >= 30) {
      hasVolumeData = true;
      const recentCandles = data.ohlcData.candles.slice(-10);
      const olderCandles = data.ohlcData.candles.slice(-30, -10);

      const recentVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const olderVolume = olderCandles.reduce((sum, c) => sum + c.volume, 0) / olderCandles.length;

      volumeSpike = recentVolume / olderVolume;

      console.log(`[LiquidityHunterStrategy] Volume Spike: ${volumeSpike.toFixed(2)}x`);
    }

    // BULLISH SCENARIO: Large exchange outflows (whales accumulating)
    if (exchangeFlowRatio < -1.5) {
      signalType = 'BUY';
      confidence = 35; // Base confidence

      reasoning.push(`🐋 LARGE EXCHANGE OUTFLOWS: ${Math.abs(exchangeFlowRatio).toFixed(2)}x`);
      reasoning.push(`💡 Smart money removing coins from exchanges (accumulation)`);

      // Outflow extremity bonus
      if (exchangeFlowRatio < -3.0) {
        confidence += 25;
        reasoning.push(`⚡ EXTREME OUTFLOWS: ${Math.abs(exchangeFlowRatio).toFixed(2)}x - Massive accumulation +25%`);
      } else if (exchangeFlowRatio < -2.5) {
        confidence += 20;
        reasoning.push(`🔥 Very Large Outflows: ${Math.abs(exchangeFlowRatio).toFixed(2)}x - Strong accumulation +20%`);
      } else if (exchangeFlowRatio < -2.0) {
        confidence += 15;
        reasoning.push(`📈 Large Outflows: ${Math.abs(exchangeFlowRatio).toFixed(2)}x - Significant accumulation +15%`);
      } else {
        confidence += 10;
        reasoning.push(`📊 Notable Outflows: ${Math.abs(exchangeFlowRatio).toFixed(2)}x - Moderate accumulation +10%`);
      }

      // Volume spike confirmation (CRITICAL for liquidity hunter)
      if (hasVolumeData) {
        if (volumeSpike > 2.0) {
          confidence += 20;
          reasoning.push(`📊 MASSIVE VOLUME SPIKE: ${volumeSpike.toFixed(2)}x average - Smart money moving +20%`);
        } else if (volumeSpike > 1.5) {
          confidence += 15;
          reasoning.push(`📊 Large Volume Spike: ${volumeSpike.toFixed(2)}x average - Confirms accumulation +15%`);
        } else if (volumeSpike > 1.2) {
          confidence += 8;
          reasoning.push(`📊 Volume Increase: ${volumeSpike.toFixed(2)}x average +8%`);
        } else {
          reasoning.push(`⚠️ Low Volume: ${volumeSpike.toFixed(2)}x - Weak confirmation`);
        }
      }

      console.log(`[LiquidityHunterStrategy] Bullish liquidity hunt detected, confidence: ${confidence}%`);
    }
    // BEARISH SCENARIO: Large exchange inflows (whales distributing)
    else if (exchangeFlowRatio > 1.5) {
      signalType = 'SELL';
      confidence = 35;

      reasoning.push(`🐋 LARGE EXCHANGE INFLOWS: ${exchangeFlowRatio.toFixed(2)}x`);
      reasoning.push(`💡 Smart money moving coins to exchanges (distribution)`);

      // Inflow extremity bonus
      if (exchangeFlowRatio > 3.0) {
        confidence += 25;
        reasoning.push(`⚡ EXTREME INFLOWS: ${exchangeFlowRatio.toFixed(2)}x - Massive distribution +25%`);
      } else if (exchangeFlowRatio > 2.5) {
        confidence += 20;
        reasoning.push(`🔥 Very Large Inflows: ${exchangeFlowRatio.toFixed(2)}x - Strong distribution +20%`);
      } else if (exchangeFlowRatio > 2.0) {
        confidence += 15;
        reasoning.push(`📉 Large Inflows: ${exchangeFlowRatio.toFixed(2)}x - Significant distribution +15%`);
      } else {
        confidence += 10;
        reasoning.push(`📊 Notable Inflows: ${exchangeFlowRatio.toFixed(2)}x - Moderate distribution +10%`);
      }

      // Volume spike confirmation
      if (hasVolumeData) {
        if (volumeSpike > 2.0) {
          confidence += 20;
          reasoning.push(`📊 MASSIVE VOLUME SPIKE: ${volumeSpike.toFixed(2)}x - Smart money dumping +20%`);
        } else if (volumeSpike > 1.5) {
          confidence += 15;
          reasoning.push(`📊 Large Volume Spike: ${volumeSpike.toFixed(2)}x - Confirms distribution +15%`);
        } else if (volumeSpike > 1.2) {
          confidence += 8;
          reasoning.push(`📊 Volume Increase: ${volumeSpike.toFixed(2)}x +8%`);
        } else {
          reasoning.push(`⚠️ Low Volume: ${volumeSpike.toFixed(2)}x - Weak confirmation`);
        }
      }

      console.log(`[LiquidityHunterStrategy] Bearish liquidity hunt detected, confidence: ${confidence}%`);
    } else {
      reasoning.push(`📊 Exchange Flows Normal: ${exchangeFlowRatio.toFixed(2)}x`);
      reasoning.push(`No significant smart money movement detected`);
    }

    // Smart money divergence bonus
    if (signalType === 'BUY' && data.onChainData?.smartMoneyDivergence?.detected) {
      if (data.onChainData.smartMoneyDivergence.type === 'BULLISH') {
        confidence += 10;
        reasoning.push(`✅ Smart Money Divergence: ${data.onChainData.smartMoneyDivergence.reason} +10%`);
      }
    } else if (signalType === 'SELL' && data.onChainData?.smartMoneyDivergence?.detected) {
      if (data.onChainData.smartMoneyDivergence.type === 'BEARISH') {
        confidence += 10;
        reasoning.push(`✅ Smart Money Divergence: ${data.onChainData.smartMoneyDivergence.reason} +10%`);
      }
    }

    // Order book confirmation (liquidity walls)
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 65) {
        confidence += 7;
        reasoning.push(`📈 Strong Buy Wall: ${data.orderBookData.buyPressure.toFixed(1)}% - Liquidity support +7%`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 35) {
        confidence += 7;
        reasoning.push(`📉 Strong Sell Wall: ${(100 - data.orderBookData.buyPressure).toFixed(1)}% - Liquidity resistance +7%`);
      }
    }

    // Price momentum alignment
    if (signalType === 'BUY' && data.marketData?.priceChangePercentage24h) {
      if (data.marketData.priceChangePercentage24h > 0) {
        confidence += 5;
        reasoning.push(`📈 Price Momentum Aligned: +${data.marketData.priceChangePercentage24h.toFixed(2)}%`);
      } else {
        reasoning.push(`⚠️ Price still declining: ${data.marketData.priceChangePercentage24h.toFixed(2)}% (accumulation phase)`);
      }
    } else if (signalType === 'SELL' && data.marketData?.priceChangePercentage24h) {
      if (data.marketData.priceChangePercentage24h < 0) {
        confidence += 5;
        reasoning.push(`📉 Price Momentum Aligned: ${data.marketData.priceChangePercentage24h.toFixed(2)}%`);
      }
    }

    // Market phase confirmation
    if (signalType === 'BUY' && data.marketPhase?.phase === 'ACCUMULATION') {
      confidence += 6;
      reasoning.push(`✅ Market Phase: Accumulation - Confirms liquidity hunt +6%`);
    } else if (signalType === 'SELL' && data.marketPhase?.phase === 'DISTRIBUTION') {
      confidence += 6;
      reasoning.push(`✅ Market Phase: Distribution - Confirms liquidity hunt +6%`);
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 59) {
      console.log(`[LiquidityHunterStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (59%)`);
      return {
        strategyName: 'LIQUIDITY_HUNTER',
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
        timeframe: '2-10 days',
        indicators: {
          exchangeFlowRatio,
          volumeSpike,
          hasVolumeData,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (59%)`
      };
    }

    // Calculate entry, targets, and stop loss
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = currentPrice * 1.10; // 10% profit
      target2 = currentPrice * 1.18; // 18% profit
      target3 = currentPrice * 1.30; // 30% profit
      stopLoss = currentPrice * 0.92; // 8% stop loss
    } else {
      entryMin = currentPrice * 0.97;
      entryMax = currentPrice * 1.03;
      target1 = currentPrice * 0.90; // 10% profit on short
      target2 = currentPrice * 0.82; // 18% profit on short
      target3 = currentPrice * 0.70; // 30% profit on short
      stopLoss = currentPrice * 1.08; // 8% stop loss
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 76) strength = 'STRONG';
    else if (confidence >= 67) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[LiquidityHunterStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'LIQUIDITY_HUNTER',
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
      timeframe: '2-10 days',
      indicators: {
        exchangeFlowRatio,
        volumeSpike,
        hasVolumeData,
        smartMoneyDivergence: data.onChainData?.smartMoneyDivergence?.type,
        currentPrice
      },
      rejected: false
    };
  }
}

export const liquidityHunterStrategy = new LiquidityHunterStrategy();
