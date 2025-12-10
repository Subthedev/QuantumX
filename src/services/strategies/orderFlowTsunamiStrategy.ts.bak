/**
 * ORDER FLOW TSUNAMI STRATEGY
 * Detects massive buy-side order book imbalances (>70%) indicating imminent surge
 *
 * LOGIC:
 * - Requires order book data
 * - buyPressure > 70% = imminent price surge
 * - Base confidence: 35
 * - Add based on how much > 70% (up to +35 for >80%)
 * - Minimum threshold: 67%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';

export class OrderFlowTsunamiStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[OrderFlowTsunamiStrategy] Analyzing ${data.symbol} for order flow tsunami...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: Order book data
    if (!data.orderBookData?.buyPressure) {
      console.log(`[OrderFlowTsunamiStrategy] No order book data available`);
      return {
        strategyName: 'ORDER_FLOW_TSUNAMI',
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
        timeframe: '1-3 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required order book data'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const buyPressure = data.orderBookData.buyPressure;
    const sellPressure = 100 - buyPressure;
    const bidAskRatio = data.orderBookData.bidAskRatio || 1.0;

    console.log(`[OrderFlowTsunamiStrategy] Buy Pressure: ${buyPressure.toFixed(2)}%`);
    console.log(`[OrderFlowTsunamiStrategy] Sell Pressure: ${sellPressure.toFixed(2)}%`);
    console.log(`[OrderFlowTsunamiStrategy] Bid/Ask Ratio: ${bidAskRatio.toFixed(3)}`);

    // BULLISH TSUNAMI: Massive buy-side pressure (>70%)
    if (buyPressure > 70) {
      signalType = 'BUY';
      confidence = 35; // Base confidence

      reasoning.push(`🌊 ORDER FLOW TSUNAMI DETECTED: ${buyPressure.toFixed(1)}% buy pressure`);
      reasoning.push(`💡 Massive buy-side imbalance indicates imminent price surge`);

      // Calculate pressure bonus based on extremity
      if (buyPressure > 85) {
        confidence += 35;
        reasoning.push(`⚡ EXTREME BUY IMBALANCE: ${buyPressure.toFixed(1)}% - Maximum surge potential +35%`);
      } else if (buyPressure > 80) {
        confidence += 28;
        reasoning.push(`🔥 Very Strong Buy Imbalance: ${buyPressure.toFixed(1)}% - +28% confidence`);
      } else if (buyPressure > 75) {
        confidence += 20;
        reasoning.push(`📈 Strong Buy Imbalance: ${buyPressure.toFixed(1)}% - +20% confidence`);
      } else {
        // 70-75%
        confidence += 12;
        reasoning.push(`📊 Significant Buy Imbalance: ${buyPressure.toFixed(1)}% - +12% confidence`);
      }

      // Bid/Ask ratio confirmation
      if (bidAskRatio > 2.0) {
        confidence += 10;
        reasoning.push(`✅ Bid/Ask Ratio: ${bidAskRatio.toFixed(2)} (>2.0) - Strong bid wall +10%`);
      } else if (bidAskRatio > 1.5) {
        confidence += 6;
        reasoning.push(`✅ Bid/Ask Ratio: ${bidAskRatio.toFixed(2)} (>1.5) - Healthy bid support +6%`);
      }

      console.log(`[OrderFlowTsunamiStrategy] Bullish tsunami detected, confidence: ${confidence}%`);
    }
    // BEARISH TSUNAMI: Massive sell-side pressure (>70%)
    else if (sellPressure > 70) {
      signalType = 'SELL';
      confidence = 35;

      reasoning.push(`🌊 SELL-SIDE TSUNAMI DETECTED: ${sellPressure.toFixed(1)}% sell pressure`);
      reasoning.push(`💡 Massive sell-side imbalance indicates imminent price drop`);

      // Calculate pressure bonus
      if (sellPressure > 85) {
        confidence += 35;
        reasoning.push(`⚡ EXTREME SELL IMBALANCE: ${sellPressure.toFixed(1)}% - Maximum drop potential +35%`);
      } else if (sellPressure > 80) {
        confidence += 28;
        reasoning.push(`🔥 Very Strong Sell Imbalance: ${sellPressure.toFixed(1)}% - +28% confidence`);
      } else if (sellPressure > 75) {
        confidence += 20;
        reasoning.push(`📉 Strong Sell Imbalance: ${sellPressure.toFixed(1)}% - +20% confidence`);
      } else {
        confidence += 12;
        reasoning.push(`📊 Significant Sell Imbalance: ${sellPressure.toFixed(1)}% - +12% confidence`);
      }

      // Bid/Ask ratio confirmation
      if (bidAskRatio < 0.5) {
        confidence += 10;
        reasoning.push(`✅ Bid/Ask Ratio: ${bidAskRatio.toFixed(2)} (<0.5) - Overwhelming sell wall +10%`);
      } else if (bidAskRatio < 0.7) {
        confidence += 6;
        reasoning.push(`✅ Bid/Ask Ratio: ${bidAskRatio.toFixed(2)} (<0.7) - Strong sell pressure +6%`);
      }

      console.log(`[OrderFlowTsunamiStrategy] Bearish tsunami detected, confidence: ${confidence}%`);
    } else {
      reasoning.push(`📊 Order Book Balanced: ${buyPressure.toFixed(1)}% buy / ${sellPressure.toFixed(1)}% sell`);
      reasoning.push(`No significant order flow imbalance detected`);
    }

    // Volume confirmation (tsunami + volume = explosive move)
    if (signalType && data.ohlcData?.candles && data.ohlcData.candles.length >= 20) {
      const recentCandles = data.ohlcData.candles.slice(-10);
      const olderCandles = data.ohlcData.candles.slice(-20, -10);

      const recentVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
      const olderVolume = olderCandles.reduce((sum, c) => sum + c.volume, 0) / olderCandles.length;

      if (recentVolume > olderVolume * 1.5) {
        confidence += 8;
        reasoning.push(`📊 Volume Surge: ${((recentVolume / olderVolume - 1) * 100).toFixed(1)}% above average - Tsunami confirmed`);
      } else if (recentVolume > olderVolume * 1.2) {
        confidence += 4;
        reasoning.push(`📊 Volume Increase: ${((recentVolume / olderVolume - 1) * 100).toFixed(1)}% above average`);
      }
    }

    // Price momentum alignment
    if (signalType === 'BUY' && data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h > 0) {
      confidence += 5;
      reasoning.push(`📈 Price Momentum: +${data.marketData.priceChangePercentage24h.toFixed(2)}% (aligned with buy pressure)`);
    } else if (signalType === 'SELL' && data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h < 0) {
      confidence += 5;
      reasoning.push(`📉 Price Momentum: ${data.marketData.priceChangePercentage24h.toFixed(2)}% (aligned with sell pressure)`);
    }

    // Technical confirmation
    if (signalType === 'BUY' && data.ohlcData?.candles && data.ohlcData.candles.length >= 50) {
      const technicals = technicalAnalysisService.analyzeTechnicals(data.ohlcData.candles);

      if (technicals.overallSignal === 'STRONG_BUY' || technicals.overallSignal === 'BUY') {
        confidence += 6;
        reasoning.push(`✅ Technical Analysis: ${technicals.overallSignal} - Confirms tsunami direction`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 58) {
      console.log(`[OrderFlowTsunamiStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (58%)`);
      return {
        strategyName: 'ORDER_FLOW_TSUNAMI',
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
        timeframe: '1-3 days',
        indicators: {
          buyPressure,
          sellPressure,
          bidAskRatio,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (58%)`
      };
    }

    // Calculate entry, targets, and stop loss
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.99; // 1% below
      entryMax = currentPrice * 1.01; // 1% above
      target1 = currentPrice * 1.06; // 6% profit
      target2 = currentPrice * 1.12; // 12% profit
      target3 = currentPrice * 1.20; // 20% profit (tsunami wave)
      stopLoss = currentPrice * 0.95; // 5% stop loss
    } else {
      entryMin = currentPrice * 0.99;
      entryMax = currentPrice * 1.01;
      target1 = currentPrice * 0.94; // 6% profit on short
      target2 = currentPrice * 0.88; // 12% profit on short
      target3 = currentPrice * 0.80; // 20% profit on short
      stopLoss = currentPrice * 1.05; // 5% stop loss
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

    console.log(`[OrderFlowTsunamiStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'ORDER_FLOW_TSUNAMI',
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
      timeframe: '1-3 days',
      indicators: {
        buyPressure,
        sellPressure,
        bidAskRatio,
        imbalancePercent: Math.abs(buyPressure - 50),
        currentPrice
      },
      rejected: false
    };
  }
}

export const orderFlowTsunamiStrategy = new OrderFlowTsunamiStrategy();
