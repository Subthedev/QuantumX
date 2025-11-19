/**
 * ORDER FLOW TSUNAMI STRATEGY V2 (WITH SPOOFING DETECTION)
 * Detects massive buy-side order book imbalances (>70%) indicating imminent surge
 * NOW WITH ANTI-SPOOFING: Filters out fake order book walls
 *
 * LOGIC:
 * - Requires order book data
 * - Analyzes order book for spoofing patterns (wall flashing, concentration, layering)
 * - Uses adjusted buy pressure after removing suspected spoofing
 * - Rejects signals if spoofing score > 70%
 * - buyPressure > 70% = imminent price surge (after spoofing filter)
 * - Base confidence: 35
 * - Add based on how much > 70% (up to +35 for >80%)
 * - Minimum threshold: 62% (raised due to spoofing filter)
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';
import { spoofingDetection, OrderBookSnapshot } from '../spoofingDetection';

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
    const rawBuyPressure = data.orderBookData.buyPressure;
    const rawBidAskRatio = data.orderBookData.bidAskRatio || 1.0;

    console.log(`[OrderFlowTsunamiStrategy] Raw Buy Pressure: ${rawBuyPressure.toFixed(2)}%`);
    console.log(`[OrderFlowTsunamiStrategy] Raw Bid/Ask Ratio: ${rawBidAskRatio.toFixed(3)}`);

    // ===== SPOOFING DETECTION (INSTITUTIONAL ANTI-MANIPULATION) =====
    // Create order book snapshot for spoofing analysis
    const orderBookSnapshot: OrderBookSnapshot = {
      timestamp: Date.now(),
      bids: data.orderBookData.bids || [],
      asks: data.orderBookData.asks || [],
      buyPressure: rawBuyPressure,
      bidAskRatio: rawBidAskRatio
    };

    const spoofingAnalysis = spoofingDetection.analyzeOrderBook(data.symbol, orderBookSnapshot);

    console.log(`[OrderFlowTsunamiStrategy] Spoofing Score: ${spoofingAnalysis.spoofingScore.toFixed(1)}%`);
    console.log(`[OrderFlowTsunamiStrategy] Trust Score: ${spoofingAnalysis.trustScore.toFixed(1)}%`);
    console.log(`[OrderFlowTsunamiStrategy] Adjusted Buy Pressure: ${spoofingAnalysis.adjustedBuyPressure.toFixed(2)}%`);

    // REJECT if high spoofing detected (>70% confidence of manipulation)
    if (spoofingAnalysis.isSpoofed || spoofingAnalysis.spoofingScore > 70) {
      console.log(`[OrderFlowTsunamiStrategy] ❌ REJECTED - Order book spoofing detected`);
      return {
        strategyName: 'ORDER_FLOW_TSUNAMI',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [
          `🚨 ORDER BOOK SPOOFING DETECTED`,
          `Spoofing Score: ${spoofingAnalysis.spoofingScore.toFixed(1)}% (threshold: 70%)`,
          ...spoofingAnalysis.reasons,
          `⚠️ Order book appears manipulated with fake walls - SIGNAL REJECTED for safety`
        ],
        entryMin: 0,
        entryMax: 0,
        targets: { target1: 0, target2: 0, target3: 0 },
        stopLoss: 0,
        riskRewardRatio: 0,
        timeframe: '1-3 days',
        indicators: {
          rawBuyPressure,
          adjustedBuyPressure: spoofingAnalysis.adjustedBuyPressure,
          spoofingScore: spoofingAnalysis.spoofingScore,
          trustScore: spoofingAnalysis.trustScore,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Order book spoofing detected (${spoofingAnalysis.spoofingScore.toFixed(0)}% confidence)`
      };
    }

    // Use ADJUSTED values after spoofing filter
    const buyPressure = spoofingAnalysis.adjustedBuyPressure;
    const sellPressure = 100 - buyPressure;
    const bidAskRatio = spoofingAnalysis.adjustedBidAskRatio;

    console.log(`[OrderFlowTsunamiStrategy] ✅ Using spoofing-filtered values:`);
    console.log(`[OrderFlowTsunamiStrategy]    Buy Pressure: ${buyPressure.toFixed(2)}% (adjusted)`);
    console.log(`[OrderFlowTsunamiStrategy]    Sell Pressure: ${sellPressure.toFixed(2)}%`);
    console.log(`[OrderFlowTsunamiStrategy]    Bid/Ask Ratio: ${bidAskRatio.toFixed(3)} (adjusted)`);

    // BULLISH TSUNAMI: Massive buy-side pressure (>70%)
    if (buyPressure > 70) {
      signalType = 'BUY';
      confidence = 35; // Base confidence

      reasoning.push(`🌊 ORDER FLOW TSUNAMI DETECTED: ${buyPressure.toFixed(1)}% buy pressure`);
      reasoning.push(`💡 Massive buy-side imbalance indicates imminent price surge`);

      // Add spoofing analysis to reasoning
      if (spoofingAnalysis.spoofingScore > 30 && spoofingAnalysis.spoofingScore <= 70) {
        reasoning.push(`⚠️ Moderate Spoofing Risk: ${spoofingAnalysis.spoofingScore.toFixed(0)}% (adjusted pressure used)`);
        // Reduce confidence for moderate spoofing
        const spoofPenalty = Math.floor(spoofingAnalysis.spoofingScore / 10);
        confidence -= spoofPenalty;
        reasoning.push(`🔧 Confidence reduced by ${spoofPenalty}% due to spoofing risk`);
      } else if (spoofingAnalysis.spoofingScore <= 20) {
        reasoning.push(`✅ Clean Order Book: ${spoofingAnalysis.trustScore.toFixed(0)}% trust score`);
      }

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

      // Add spoofing analysis to reasoning
      if (spoofingAnalysis.spoofingScore > 30 && spoofingAnalysis.spoofingScore <= 70) {
        reasoning.push(`⚠️ Moderate Spoofing Risk: ${spoofingAnalysis.spoofingScore.toFixed(0)}% (adjusted pressure used)`);
        // Reduce confidence for moderate spoofing
        const spoofPenalty = Math.floor(spoofingAnalysis.spoofingScore / 10);
        confidence -= spoofPenalty;
        reasoning.push(`🔧 Confidence reduced by ${spoofPenalty}% due to spoofing risk`);
      } else if (spoofingAnalysis.spoofingScore <= 20) {
        reasoning.push(`✅ Clean Order Book: ${spoofingAnalysis.trustScore.toFixed(0)}% trust score`);
      }

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

    // Reject signal if confidence too low (raised threshold due to spoofing filter)
    if (!signalType || confidence < 62) {
      console.log(`[OrderFlowTsunamiStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (62%)`);
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
          rawBuyPressure,
          adjustedBuyPressure: buyPressure,
          buyPressure,
          sellPressure,
          bidAskRatio,
          spoofingScore: spoofingAnalysis.spoofingScore,
          trustScore: spoofingAnalysis.trustScore,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (62%)`
      };
    }

    // ===== ATR-BASED DYNAMIC LEVELS =====
    // Order flow tsunamis are explosive breakouts - use VOLATILE_BREAKOUT regime
    const { atrCalculator } = await import('../atrCalculator');

    const direction: 'LONG' | 'SHORT' = signalType === 'BUY' ? 'LONG' : 'SHORT';

    // Use VOLATILE_BREAKOUT regime (tsunamis are explosive, fast-moving waves)
    const atrLevels = atrCalculator.getDynamicLevels(
      currentPrice,
      direction,
      data.ohlcData?.candles || [],
      'VOLATILE_BREAKOUT', // Explosive breakout moves typical of order flow tsunamis
      confidence
    );

    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.99; // 1% below
      entryMax = currentPrice * 1.01; // 1% above
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    } else {
      entryMin = currentPrice * 0.99;
      entryMax = currentPrice * 1.01;
      target1 = atrLevels.target1;
      target2 = atrLevels.target2;
      target3 = atrLevels.target3;
      stopLoss = atrLevels.stopLoss;
    }

    const riskRewardRatio = atrLevels.riskRewardRatios[0];

    console.log(
      `[OrderFlowTsunamiStrategy] ATR-Based Levels | ` +
      `ATR: ${atrLevels.atrPercent.toFixed(2)}% | ` +
      `R:R: 1:${atrLevels.riskRewardRatios[0].toFixed(1)} / 1:${atrLevels.riskRewardRatios[1].toFixed(1)} / 1:${atrLevels.riskRewardRatios[2].toFixed(1)}`
    );

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
        rawBuyPressure, // Original buy pressure before spoofing filter
        adjustedBuyPressure: buyPressure, // Buy pressure after spoofing filter
        buyPressure, // Final used value
        sellPressure,
        bidAskRatio,
        imbalancePercent: Math.abs(buyPressure - 50),
        spoofingScore: spoofingAnalysis.spoofingScore,
        trustScore: spoofingAnalysis.trustScore,
        spoofingFiltered: spoofingAnalysis.spoofingScore > 30,
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

export const orderFlowTsunamiStrategy = new OrderFlowTsunamiStrategy();
