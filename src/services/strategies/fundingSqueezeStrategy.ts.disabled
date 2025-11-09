/**
 * FUNDING SQUEEZE STRATEGY
 * Targets extreme negative funding rates (short squeeze potential)
 *
 * LOGIC:
 * - Requires funding rate data
 * - Funding rate < -0.05% (negative) = overleveraged shorts
 * - More negative = higher confidence
 * - Base confidence: 30
 * - Add up to 40% based on funding extremity
 * - Minimum threshold: 58%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { fundingRateService } from '../fundingRateService';

export class FundingSqueezeStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[FundingSqueezeStrategy] Analyzing ${data.symbol} for funding squeeze...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // Fetch funding rate data
    let fundingData;
    try {
      // ✅ FIX: fundingRateService.fetchFundingRate() adds "USDT" to the symbol
      // So pass base coin only (SOL, not SOLUSDT)
      const baseCoin = data.symbol.replace(/USDT$/i, '');
      fundingData = await fundingRateService.fetchFundingRate(baseCoin);
    } catch (error) {
      console.error(`[FundingSqueezeStrategy] Error fetching funding data:`, error);
    }

    if (!fundingData || fundingData.fundingRate === undefined) {
      console.log(`[FundingSqueezeStrategy] No funding rate data available`);
      return {
        strategyName: 'FUNDING_SQUEEZE',
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
        timeframe: '4h-48h',
        indicators: {},
        rejected: true,
        rejectionReason: 'Missing required funding rate data'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const fundingRate = fundingData.fundingRate;
    const fundingRatePercent = fundingRate * 100;

    console.log(`[FundingSqueezeStrategy] Funding rate: ${fundingRatePercent.toFixed(4)}%`);

    // Detect funding extremes
    // ✅ FIX: Pass base coin only (SOL, not SOLUSDT)
    const baseCoin = data.symbol.replace(/USDT$/i, '');
    const fundingExtreme = await fundingRateService.detectFundingExtreme(baseCoin);

    console.log(`[FundingSqueezeStrategy] Funding extreme type: ${fundingExtreme.type}`);
    console.log(`[FundingSqueezeStrategy] Funding extreme confidence: ${fundingExtreme.confidence}%`);

    // SHORT SQUEEZE SCENARIO: Extreme negative funding (overleveraged shorts)
    if (fundingRate < -0.0005) { // -0.05% or more negative
      signalType = 'BUY';
      confidence = 30; // Base confidence

      reasoning.push(`🚨 NEGATIVE FUNDING: ${fundingRatePercent.toFixed(4)}% - Shorts paying longs`);
      reasoning.push(`💡 Overleveraged short positions indicate squeeze potential`);

      // Calculate extremity bonus based on how negative
      if (fundingRate < -0.003) { // < -0.3% (EXTREME)
        confidence += 40;
        reasoning.push(`⚡ EXTREME SHORT OVERLEVERAGE: ${fundingRatePercent.toFixed(4)}% - Maximum squeeze risk +40%`);
      } else if (fundingRate < -0.002) { // < -0.2% (Very High)
        confidence += 32;
        reasoning.push(`🔥 Very High Short Overleverage: ${fundingRatePercent.toFixed(4)}% - +32% confidence`);
      } else if (fundingRate < -0.001) { // < -0.1% (High)
        confidence += 24;
        reasoning.push(`📈 High Short Overleverage: ${fundingRatePercent.toFixed(4)}% - +24% confidence`);
      } else {
        // -0.05% to -0.1%
        confidence += 16;
        reasoning.push(`📊 Moderate Short Overleverage: ${fundingRatePercent.toFixed(4)}% - +16% confidence`);
      }

      // Additional confidence from funding extreme detection
      if (fundingExtreme.type === 'SHORT_SQUEEZE') {
        const extremeBonus = Math.round(fundingExtreme.confidence * 0.15);
        confidence += extremeBonus;
        reasoning.push(`✅ Funding Extreme Detection: ${fundingExtreme.reason} +${extremeBonus}%`);
      }

      console.log(`[FundingSqueezeStrategy] Short squeeze potential detected, confidence: ${confidence}%`);
    }
    // LONG LIQUIDATION SCENARIO: Extreme positive funding (overleveraged longs)
    else if (fundingRate > 0.0005) { // > 0.05% (positive)
      signalType = 'SELL';
      confidence = 30;

      reasoning.push(`⚠️ POSITIVE FUNDING: ${fundingRatePercent.toFixed(4)}% - Longs paying shorts`);
      reasoning.push(`💡 Overleveraged long positions indicate liquidation risk`);

      // Calculate extremity bonus
      if (fundingRate > 0.003) { // > 0.3% (EXTREME)
        confidence += 40;
        reasoning.push(`⚡ EXTREME LONG OVERLEVERAGE: ${fundingRatePercent.toFixed(4)}% - Maximum liquidation risk +40%`);
      } else if (fundingRate > 0.002) { // > 0.2%
        confidence += 32;
        reasoning.push(`🔥 Very High Long Overleverage: ${fundingRatePercent.toFixed(4)}% - +32% confidence`);
      } else if (fundingRate > 0.001) { // > 0.1%
        confidence += 24;
        reasoning.push(`📉 High Long Overleverage: ${fundingRatePercent.toFixed(4)}% - +24% confidence`);
      } else {
        confidence += 16;
        reasoning.push(`📊 Moderate Long Overleverage: ${fundingRatePercent.toFixed(4)}% - +16% confidence`);
      }

      // Additional confidence from funding extreme detection
      if (fundingExtreme.type === 'LONG_LIQUIDATION') {
        const extremeBonus = Math.round(fundingExtreme.confidence * 0.15);
        confidence += extremeBonus;
        reasoning.push(`✅ Funding Extreme Detection: ${fundingExtreme.reason} +${extremeBonus}%`);
      }

      console.log(`[FundingSqueezeStrategy] Long liquidation risk detected, confidence: ${confidence}%`);
    } else {
      reasoning.push(`📊 Funding Rate Neutral: ${fundingRatePercent.toFixed(4)}%`);
      reasoning.push(`No significant leverage imbalance detected`);
    }

    // Order book confirmation for squeezes
    if (signalType === 'BUY' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure > 60) {
        confidence += 8;
        reasoning.push(`📈 Order Book Buy Pressure: ${data.orderBookData.buyPressure.toFixed(1)}% (squeeze fuel)`);
      }
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure) {
      if (data.orderBookData.buyPressure < 40) {
        confidence += 8;
        reasoning.push(`📉 Order Book Sell Pressure: ${(100 - data.orderBookData.buyPressure).toFixed(1)}% (liquidation fuel)`);
      }
    }

    // Volume spike confirmation (squeezes often come with volume)
    if (data.marketData?.volume24h && data.ohlcData?.candles) {
      const recentVolume = data.ohlcData.candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
      const avgVolume = data.ohlcData.candles.reduce((sum, c) => sum + c.volume, 0) / data.ohlcData.candles.length;

      if (recentVolume > avgVolume * 1.3) {
        confidence += 6;
        reasoning.push(`📊 Volume Spike: ${((recentVolume / avgVolume - 1) * 100).toFixed(1)}% above average`);
      }
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 58) {
      console.log(`[FundingSqueezeStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (58%)`);
      return {
        strategyName: 'FUNDING_SQUEEZE',
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
        timeframe: '4h-48h',
        indicators: {
          fundingRate,
          fundingRatePercent,
          fundingExtremeType: fundingExtreme.type,
          fundingExtremeConfidence: fundingExtreme.confidence,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (58%)`
      };
    }

    // Calculate entry, targets, and stop loss
    // Funding squeezes are FAST - quick profits, tight stops
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.99; // 1% below
      entryMax = currentPrice * 1.01; // 1% above
      target1 = currentPrice * 1.05; // 5% quick profit
      target2 = currentPrice * 1.10; // 10% profit
      target3 = currentPrice * 1.18; // 18% profit (big squeeze)
      stopLoss = currentPrice * 0.96; // 4% tight stop
    } else {
      entryMin = currentPrice * 0.99;
      entryMax = currentPrice * 1.01;
      target1 = currentPrice * 0.95; // 5% profit on short
      target2 = currentPrice * 0.90; // 10% profit on short
      target3 = currentPrice * 0.82; // 18% profit on short
      stopLoss = currentPrice * 1.04; // 4% tight stop
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 75) strength = 'STRONG';
    else if (confidence >= 65) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[FundingSqueezeStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'FUNDING_SQUEEZE',
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
      timeframe: '4h-48h',
      indicators: {
        fundingRate,
        fundingRatePercent,
        fundingExtremeType: fundingExtreme.type,
        fundingExtremeConfidence: fundingExtreme.confidence,
        fundingExtremeReason: fundingExtreme.reason,
        currentPrice
      },
      rejected: false
    };
  }
}

export const fundingSqueezeStrategy = new FundingSqueezeStrategy();
