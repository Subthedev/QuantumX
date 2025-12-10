/**
 * VOLATILITY BREAKOUT STRATEGY
 * Bollinger Band squeeze + ATR expansion + directional confirmation for range breakouts
 *
 * LOGIC:
 * - Requires OHLC data and technical indicators
 * - Detect Bollinger Band width contraction (squeeze)
 * - Then expansion with price breaking upper/lower band
 * - Base confidence: 32
 * - Add bonuses for strong breakout
 * - Minimum threshold: 66%
 */

import { StrategySignal } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { technicalAnalysisService } from '../technicalAnalysis';

export class VolatilityBreakoutStrategy {
  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    console.log(`[VolatilityBreakoutStrategy] Analyzing ${data.symbol} for volatility breakout...`);

    const reasoning: string[] = [];
    let confidence = 0;
    let signalType: 'BUY' | 'SELL' | null = null;

    // REQUIRED: OHLC data for Bollinger Bands and ATR
    if (!data.ohlcData?.candles || data.ohlcData.candles.length < 50) {
      console.log(`[VolatilityBreakoutStrategy] Insufficient OHLC data: ${data.ohlcData?.candles?.length || 0} candles`);
      return {
        strategyName: 'VOLATILITY_BREAKOUT',
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
        rejectionReason: 'Missing required OHLC data for Bollinger Bands'
      };
    }

    const currentPrice = data.marketData?.current_price || 0;
    const candles = data.ohlcData.candles;

    // Calculate Bollinger Bands
    const currentBB = technicalAnalysisService.calculateBollingerBands(candles, 20, 2);
    const previousBB = technicalAnalysisService.calculateBollingerBands(candles.slice(0, -10), 20, 2);

    // Calculate Bollinger Band width (normalized)
    const currentWidth = (currentBB.upper - currentBB.lower) / currentBB.middle;
    const previousWidth = (previousBB.upper - previousBB.lower) / previousBB.middle;

    // Calculate technical indicators
    const technicals = technicalAnalysisService.analyzeTechnicals(candles);
    const bbPosition = technicals.bollingerBands.position;

    console.log(`[VolatilityBreakoutStrategy] BB Width: Current=${(currentWidth * 100).toFixed(2)}%, Previous=${(previousWidth * 100).toFixed(2)}%`);
    console.log(`[VolatilityBreakoutStrategy] BB Position: ${bbPosition}`);
    console.log(`[VolatilityBreakoutStrategy] Price: ${currentPrice.toFixed(2)}, Upper: ${currentBB.upper.toFixed(2)}, Lower: ${currentBB.lower.toFixed(2)}`);

    // Detect squeeze (BB width contraction)
    const isSqueezing = currentWidth < previousWidth * 0.9; // 10% contraction
    const isSqueezed = currentWidth < 0.05; // Very tight bands (5% width)

    // Detect expansion
    const isExpanding = currentWidth > previousWidth * 1.1; // 10% expansion

    // Calculate ATR for volatility measurement
    const atr = this.calculateATR(candles, 14);
    const avgPrice = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
    const atrPercent = (atr / avgPrice) * 100;

    console.log(`[VolatilityBreakoutStrategy] Squeezing: ${isSqueezing}, Squeezed: ${isSqueezed}, Expanding: ${isExpanding}`);
    console.log(`[VolatilityBreakoutStrategy] ATR: ${atr.toFixed(2)} (${atrPercent.toFixed(2)}%)`);

    // BULLISH BREAKOUT: Price breaks above upper Bollinger Band after squeeze
    if ((bbPosition === 'ABOVE_UPPER' || bbPosition === 'NEAR_UPPER') && (isExpanding || isSqueezed)) {
      signalType = 'BUY';
      confidence = 32; // Base confidence

      reasoning.push(`🚀 VOLATILITY BREAKOUT: Price breaking above upper Bollinger Band`);
      reasoning.push(`📊 BB Position: ${bbPosition} - Upper: ${currentBB.upper.toFixed(2)}, Price: ${currentPrice.toFixed(2)}`);

      // Squeeze bonus
      if (isSqueezed && isExpanding) {
        confidence += 20;
        reasoning.push(`⚡ SQUEEZE + EXPANSION: Tight bands (${(currentWidth * 100).toFixed(2)}%) now expanding - Classic breakout +20%`);
      } else if (isSqueezed) {
        confidence += 15;
        reasoning.push(`📊 Extreme Squeeze: BB width ${(currentWidth * 100).toFixed(2)}% - Breakout imminent +15%`);
      } else if (isExpanding) {
        confidence += 12;
        reasoning.push(`📈 Band Expansion: ${((currentWidth / previousWidth - 1) * 100).toFixed(1)}% - Volatility increasing +12%`);
      } else {
        confidence += 6;
        reasoning.push(`📊 Near Upper Band: Potential breakout forming`);
      }

      // ATR expansion bonus (high volatility = strong breakout)
      if (atrPercent > 5) {
        confidence += 15;
        reasoning.push(`📊 High ATR: ${atrPercent.toFixed(2)}% - Strong volatility expansion +15%`);
      } else if (atrPercent > 3) {
        confidence += 10;
        reasoning.push(`📊 Moderate ATR: ${atrPercent.toFixed(2)}% - Good volatility +10%`);
      } else {
        confidence += 5;
        reasoning.push(`📊 ATR: ${atrPercent.toFixed(2)}%`);
      }

      console.log(`[VolatilityBreakoutStrategy] Bullish breakout detected, confidence: ${confidence}%`);
    }
    // BEARISH BREAKDOWN: Price breaks below lower Bollinger Band after squeeze
    else if ((bbPosition === 'BELOW_LOWER' || bbPosition === 'NEAR_LOWER') && (isExpanding || isSqueezed)) {
      signalType = 'SELL';
      confidence = 32;

      reasoning.push(`📉 VOLATILITY BREAKDOWN: Price breaking below lower Bollinger Band`);
      reasoning.push(`📊 BB Position: ${bbPosition} - Lower: ${currentBB.lower.toFixed(2)}, Price: ${currentPrice.toFixed(2)}`);

      // Squeeze bonus
      if (isSqueezed && isExpanding) {
        confidence += 20;
        reasoning.push(`⚡ SQUEEZE + EXPANSION: Tight bands (${(currentWidth * 100).toFixed(2)}%) now expanding - Classic breakdown +20%`);
      } else if (isSqueezed) {
        confidence += 15;
        reasoning.push(`📊 Extreme Squeeze: BB width ${(currentWidth * 100).toFixed(2)}% - Breakdown imminent +15%`);
      } else if (isExpanding) {
        confidence += 12;
        reasoning.push(`📉 Band Expansion: ${((currentWidth / previousWidth - 1) * 100).toFixed(1)}% - Volatility increasing +12%`);
      } else {
        confidence += 6;
        reasoning.push(`📊 Near Lower Band: Potential breakdown forming`);
      }

      // ATR expansion bonus
      if (atrPercent > 5) {
        confidence += 15;
        reasoning.push(`📊 High ATR: ${atrPercent.toFixed(2)}% - Strong volatility expansion +15%`);
      } else if (atrPercent > 3) {
        confidence += 10;
        reasoning.push(`📊 Moderate ATR: ${atrPercent.toFixed(2)}% - Good volatility +10%`);
      } else {
        confidence += 5;
        reasoning.push(`📊 ATR: ${atrPercent.toFixed(2)}%`);
      }

      console.log(`[VolatilityBreakoutStrategy] Bearish breakdown detected, confidence: ${confidence}%`);
    }
    // Check for squeeze forming (no breakout yet)
    else if (isSqueezed) {
      reasoning.push(`⏳ Bollinger Squeeze Forming: ${(currentWidth * 100).toFixed(2)}% width`);
      reasoning.push(`💡 Waiting for directional breakout confirmation`);
    }

    // Volume confirmation (breakouts need volume)
    if (signalType && candles.length >= 30) {
      const recentVolume = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
      const avgVolume = candles.slice(-30).reduce((sum, c) => sum + c.volume, 0) / 30;
      const volumeRatio = recentVolume / avgVolume;

      if (volumeRatio > 1.5) {
        confidence += 12;
        reasoning.push(`📊 Strong Volume Confirmation: ${volumeRatio.toFixed(2)}x average - Breakout validated +12%`);
      } else if (volumeRatio > 1.2) {
        confidence += 8;
        reasoning.push(`📊 Volume Support: ${volumeRatio.toFixed(2)}x average +8%`);
      } else {
        reasoning.push(`⚠️ Low Volume: ${volumeRatio.toFixed(2)}x - Weak breakout confirmation`);
      }
    }

    // RSI momentum confirmation
    const rsi = technicals.rsi;
    if (signalType === 'BUY' && rsi > 55 && rsi < 75) {
      confidence += 8;
      reasoning.push(`📈 RSI Momentum: ${rsi.toFixed(1)} - Bullish but not overbought +8%`);
    } else if (signalType === 'SELL' && rsi < 45 && rsi > 25) {
      confidence += 8;
      reasoning.push(`📉 RSI Momentum: ${rsi.toFixed(1)} - Bearish but not oversold +8%`);
    }

    // Price momentum alignment
    if (signalType === 'BUY' && data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h > 2) {
      confidence += 7;
      reasoning.push(`📈 Strong Price Momentum: +${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h) +7%`);
    } else if (signalType === 'SELL' && data.marketData?.priceChangePercentage24h && data.marketData.priceChangePercentage24h < -2) {
      confidence += 7;
      reasoning.push(`📉 Strong Negative Momentum: ${data.marketData.priceChangePercentage24h.toFixed(2)}% (24h) +7%`);
    }

    // Order book confirmation
    if (signalType === 'BUY' && data.orderBookData?.buyPressure && data.orderBookData.buyPressure > 60) {
      confidence += 6;
      reasoning.push(`📈 Order Book Support: ${data.orderBookData.buyPressure.toFixed(1)}% buy pressure +6%`);
    } else if (signalType === 'SELL' && data.orderBookData?.buyPressure && data.orderBookData.buyPressure < 40) {
      confidence += 6;
      reasoning.push(`📉 Order Book Weakness: ${data.orderBookData.buyPressure.toFixed(1)}% weak support +6%`);
    }

    // Reject signal if confidence too low
    if (!signalType || confidence < 55) {
      console.log(`[VolatilityBreakoutStrategy] Signal REJECTED - Confidence ${confidence}% below threshold (55%)`);
      return {
        strategyName: 'VOLATILITY_BREAKOUT',
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
          bbUpper: currentBB.upper,
          bbMiddle: currentBB.middle,
          bbLower: currentBB.lower,
          bbPosition,
          bbWidth: currentWidth,
          isSqueezing,
          isSqueezed,
          isExpanding,
          atr,
          atrPercent,
          rsi,
          currentPrice
        },
        rejected: true,
        rejectionReason: `Confidence ${Math.round(confidence)}% below threshold (55%)`
      };
    }

    // Calculate entry, targets, and stop loss
    // Volatility breakouts are FAST - use wider targets
    let entryMin = 0, entryMax = 0, target1 = 0, target2 = 0, target3 = 0, stopLoss = 0;

    if (signalType === 'BUY') {
      entryMin = currentPrice * 0.99;
      entryMax = currentPrice * 1.01;
      target1 = currentPrice * 1.08; // 8% profit
      target2 = currentPrice * 1.15; // 15% profit
      target3 = currentPrice * 1.25; // 25% profit (volatility can run)
      stopLoss = currentBB.middle; // Use middle BB as stop (mean reversion)
    } else {
      entryMin = currentPrice * 0.99;
      entryMax = currentPrice * 1.01;
      target1 = currentPrice * 0.92; // 8% profit on short
      target2 = currentPrice * 0.85; // 15% profit on short
      target3 = currentPrice * 0.75; // 25% profit on short
      stopLoss = currentBB.middle; // Use middle BB as stop
    }

    const riskRewardRatio = signalType === 'BUY'
      ? ((target1 - currentPrice) / (currentPrice - stopLoss))
      : ((currentPrice - target1) / (stopLoss - currentPrice));

    // Determine strength
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    if (confidence >= 85) strength = 'VERY_STRONG';
    else if (confidence >= 75) strength = 'STRONG';
    else if (confidence >= 66) strength = 'MODERATE';
    else strength = 'WEAK';

    console.log(`[VolatilityBreakoutStrategy] Signal ACCEPTED - ${signalType} with ${confidence}% confidence (${strength})`);

    return {
      strategyName: 'VOLATILITY_BREAKOUT',
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
        bbUpper: currentBB.upper,
        bbMiddle: currentBB.middle,
        bbLower: currentBB.lower,
        bbPosition,
        bbWidth: currentWidth,
        bbWidthPercent: currentWidth * 100,
        isSqueezing,
        isSqueezed,
        isExpanding,
        atr,
        atrPercent,
        rsi,
        currentPrice
      },
      rejected: false
    };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(candles: any[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    // Calculate average of last 'period' true ranges
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / period;

    return atr;
  }
}

export const volatilityBreakoutStrategy = new VolatilityBreakoutStrategy();
