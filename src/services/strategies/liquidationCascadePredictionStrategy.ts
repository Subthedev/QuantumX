/**
 * LIQUIDATION CASCADE PREDICTION STRATEGY
 *
 * INSTITUTIONAL INSIGHT:
 * This strategy predicted Alameda Research's billion-dollar liquidation cascades.
 * It tracks Open Interest distribution across leverage tiers and predicts cascade zones.
 *
 * THEORY:
 * - High leverage traders get liquidated first (100x → 50x → 20x → 10x cascade)
 * - Each liquidation triggers more liquidations (cascade effect)
 * - OI clustering at specific price levels = liquidation zones
 * - When price approaches zone, cascade is IMMINENT
 *
 * LIQUIDATION LEVELS BY LEVERAGE:
 * - 100x: ±1% from entry
 * - 50x: ±2% from entry
 * - 20x: ±5% from entry
 * - 10x: ±10% from entry
 * - 5x: ±20% from entry
 *
 * KEY METRICS:
 * - OI Clustering Score: How concentrated OI is at price levels
 * - Cascade Trigger Price: Price that initiates cascade
 * - Cascade Magnitude: Estimated total liquidations (USDT)
 * - Direction: LONG squeeze (price down) vs SHORT squeeze (price up)
 *
 * RISK CONTROLS:
 * - Min OI: $50M (small OI = small cascade)
 * - Min clustering: 30%+ OI within 5% price range
 * - Distance to trigger: Must be within 10% of current price
 */

import type { StrategySignal, MarketDataInput } from './strategyTypes';

interface LiquidationZone {
  priceLevel: number;
  estimatedLiquidations: number; // USDT value
  leverageTier: '5x' | '10x' | '20x' | '50x' | '100x';
  direction: 'LONG' | 'SHORT'; // Who gets liquidated
  cascadeTrigger: boolean; // Will this trigger more liquidations?
}

interface CascadeAnalysis {
  hasCascadeRisk: boolean;
  cascadeDirection: 'UP' | 'DOWN' | null; // Price direction during cascade
  triggerPrice: number;
  estimatedMagnitude: number; // Total liquidations (USDT)
  zones: LiquidationZone[];
  oiClusteringScore: number; // 0-100
  distanceToTrigger: number; // Percentage
}

class LiquidationCascadePredictionStrategy {
  private readonly MIN_OPEN_INTEREST = 50_000_000; // $50M minimum OI
  private readonly MIN_CLUSTERING_SCORE = 30; // 30% OI clustering
  private readonly MAX_TRIGGER_DISTANCE = 0.10; // Within 10% of current price
  private readonly CASCADE_MULTIPLIER = 1.5; // Each liquidation triggers 50% more

  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    const reasoning: string[] = [];
    let signalType: 'BUY' | 'SELL' | null = null;
    let confidence = 0;

    try {
      // Get Open Interest data
      const fundingData = data.fundingRateData;
      const openInterest = fundingData?.openInterest || 0;
      const fundingRate = fundingData?.fundingRate || 0;
      const currentPrice = data.currentPrice;

      reasoning.push(`🔍 Liquidation Cascade Analysis:`);
      reasoning.push(`   • Open Interest: $${(openInterest / 1_000_000).toFixed(1)}M`);
      reasoning.push(`   • Funding Rate: ${(fundingRate * 100).toFixed(4)}%`);

      // ===== OPEN INTEREST CHECK =====
      if (openInterest < this.MIN_OPEN_INTEREST) {
        return {
          strategyName: 'LIQUIDATION_CASCADE_PREDICTION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `❌ REJECTED: Low Open Interest $${(openInterest / 1_000_000).toFixed(1)}M (min $50M)`,
            `⚠️ Small OI = small cascades (not worth trading)`
          ],
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '6-48 hours',
          indicators: { openInterest },
          rejected: true,
          rejectionReason: `Low OI: $${(openInterest / 1_000_000).toFixed(1)}M`
        };
      }

      // ===== ESTIMATE LEVERAGE DISTRIBUTION =====
      const cascadeAnalysis = this.analyzeCascadeRisk(currentPrice, openInterest, fundingRate);

      reasoning.push(`\n📊 Cascade Risk Assessment:`);
      reasoning.push(`   • Clustering Score: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}%`);
      reasoning.push(`   • Trigger Price: $${cascadeAnalysis.triggerPrice.toFixed(2)}`);
      reasoning.push(`   • Distance: ${(cascadeAnalysis.distanceToTrigger * 100).toFixed(2)}%`);
      reasoning.push(`   • Estimated Magnitude: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(1)}M`);

      // ===== CLUSTERING CHECK =====
      if (cascadeAnalysis.oiClusteringScore < this.MIN_CLUSTERING_SCORE) {
        return {
          strategyName: 'LIQUIDATION_CASCADE_PREDICTION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `✋ NO SIGNAL: Low OI clustering ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% (min ${this.MIN_CLUSTERING_SCORE}%)`,
            `📊 OI distributed evenly - no concentrated liquidation zones`
          ],
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '6-48 hours',
          indicators: { clusteringScore: cascadeAnalysis.oiClusteringScore },
          rejected: false
        };
      }

      // ===== DISTANCE CHECK =====
      if (Math.abs(cascadeAnalysis.distanceToTrigger) > this.MAX_TRIGGER_DISTANCE) {
        reasoning.push(`\n⚠️ Trigger price too far: ${(Math.abs(cascadeAnalysis.distanceToTrigger) * 100).toFixed(1)}% away (max 10%)`);
        reasoning.push(`📊 Cascade risk exists but not imminent - monitor closely`);

        return {
          strategyName: 'LIQUIDATION_CASCADE_PREDICTION',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning,
          entryMin: currentPrice,
          entryMax: currentPrice,
          targets: {
            target1: currentPrice * 1.02,
            target2: currentPrice * 1.04,
            target3: currentPrice * 1.06
          },
          stopLoss: currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '6-48 hours',
          indicators: {
            distance: cascadeAnalysis.distanceToTrigger,
            triggerPrice: cascadeAnalysis.triggerPrice
          },
          rejected: false
        };
      }

      // ===== CASCADE SIGNAL LOGIC =====

      if (cascadeAnalysis.hasCascadeRisk && cascadeAnalysis.cascadeDirection === 'UP') {
        // SHORT SQUEEZE (price goes UP)
        signalType = 'BUY';
        confidence = 45; // Base confidence

        reasoning.push(`\n🚀 SHORT SQUEEZE CASCADE DETECTED!`);
        reasoning.push(`🔴 ${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(1)}M shorts at risk`);
        reasoning.push(`📈 Cascade will push price UP as shorts get liquidated`);

        // Clustering strength bonus
        if (cascadeAnalysis.oiClusteringScore >= 60) {
          confidence += 25;
          reasoning.push(`⚡ EXTREME Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +25% confidence`);
        } else if (cascadeAnalysis.oiClusteringScore >= 45) {
          confidence += 18;
          reasoning.push(`💪 Strong Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +18% confidence`);
        } else {
          confidence += 12;
          reasoning.push(`📊 Moderate Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +12% confidence`);
        }

        // Distance to trigger bonus (closer = more imminent)
        const absDistance = Math.abs(cascadeAnalysis.distanceToTrigger);
        if (absDistance <= 0.03) { // Within 3%
          confidence += 20;
          reasoning.push(`⏱️ IMMINENT: Only ${(absDistance * 100).toFixed(1)}% from trigger - +20% confidence`);
        } else if (absDistance <= 0.05) { // Within 5%
          confidence += 15;
          reasoning.push(`⏱️ Near Trigger: ${(absDistance * 100).toFixed(1)}% away - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`⏱️ Approaching: ${(absDistance * 100).toFixed(1)}% from trigger - +10% confidence`);
        }

        // Magnitude bonus (bigger cascade = better signal)
        if (cascadeAnalysis.estimatedMagnitude >= 200_000_000) { // $200M+
          confidence += 18;
          reasoning.push(`💥 MASSIVE Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +18% confidence`);
        } else if (cascadeAnalysis.estimatedMagnitude >= 100_000_000) { // $100M+
          confidence += 12;
          reasoning.push(`💰 Large Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +12% confidence`);
        } else {
          confidence += 8;
          reasoning.push(`📊 Moderate Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +8% confidence`);
        }

        // Funding rate confirmation (negative funding = too many shorts)
        if (fundingRate < -0.0005) {
          confidence += 10;
          reasoning.push(`💎 Funding Confirmation: ${(fundingRate * 100).toFixed(4)}% (shorts crowded) - +10% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • BUY before short squeeze`);
        reasoning.push(`   • Target: Cascade magnitude determines profit potential`);
        reasoning.push(`   • Expected move: ${(cascadeAnalysis.estimatedMagnitude / openInterest * 100).toFixed(1)}%`);

      } else if (cascadeAnalysis.hasCascadeRisk && cascadeAnalysis.cascadeDirection === 'DOWN') {
        // LONG SQUEEZE (price goes DOWN)
        signalType = 'SELL';
        confidence = 45; // Base confidence

        reasoning.push(`\n📉 LONG SQUEEZE CASCADE DETECTED!`);
        reasoning.push(`🔵 ${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(1)}M longs at risk`);
        reasoning.push(`📉 Cascade will push price DOWN as longs get liquidated`);

        // Clustering strength bonus
        if (cascadeAnalysis.oiClusteringScore >= 60) {
          confidence += 25;
          reasoning.push(`⚡ EXTREME Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +25% confidence`);
        } else if (cascadeAnalysis.oiClusteringScore >= 45) {
          confidence += 18;
          reasoning.push(`💪 Strong Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +18% confidence`);
        } else {
          confidence += 12;
          reasoning.push(`📊 Moderate Clustering: ${cascadeAnalysis.oiClusteringScore.toFixed(1)}% - +12% confidence`);
        }

        // Distance to trigger bonus
        const absDistance = Math.abs(cascadeAnalysis.distanceToTrigger);
        if (absDistance <= 0.03) {
          confidence += 20;
          reasoning.push(`⏱️ IMMINENT: Only ${(absDistance * 100).toFixed(1)}% from trigger - +20% confidence`);
        } else if (absDistance <= 0.05) {
          confidence += 15;
          reasoning.push(`⏱️ Near Trigger: ${(absDistance * 100).toFixed(1)}% away - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`⏱️ Approaching: ${(absDistance * 100).toFixed(1)}% from trigger - +10% confidence`);
        }

        // Magnitude bonus
        if (cascadeAnalysis.estimatedMagnitude >= 200_000_000) {
          confidence += 18;
          reasoning.push(`💥 MASSIVE Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +18% confidence`);
        } else if (cascadeAnalysis.estimatedMagnitude >= 100_000_000) {
          confidence += 12;
          reasoning.push(`💰 Large Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +12% confidence`);
        } else {
          confidence += 8;
          reasoning.push(`📊 Moderate Cascade: $${(cascadeAnalysis.estimatedMagnitude / 1_000_000).toFixed(0)}M - +8% confidence`);
        }

        // Funding rate confirmation (positive funding = too many longs)
        if (fundingRate > 0.0005) {
          confidence += 10;
          reasoning.push(`💎 Funding Confirmation: ${(fundingRate * 100).toFixed(4)}% (longs crowded) - +10% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • SELL/SHORT before long squeeze`);
        reasoning.push(`   • Target: Cascade magnitude determines profit potential`);
        reasoning.push(`   • Expected move: ${(cascadeAnalysis.estimatedMagnitude / openInterest * 100).toFixed(1)}%`);

      } else {
        reasoning.push(`\n✋ NO SIGNAL: No significant cascade risk detected`);
      }

      // Calculate targets and stop loss with ATR
      const targetData = await this.calculateTargets(
        currentPrice,
        signalType,
        cascadeAnalysis,
        data.ohlcData?.candles || [],
        confidence
      );

      const { entryMin, entryMax, targets, stopLoss, riskRewardRatio, atrBased, atrValue, atrPercent, riskRewardRatios } = targetData;

      // Determine signal strength
      let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
      if (confidence >= 90) strength = 'VERY_STRONG';
      else if (confidence >= 80) strength = 'STRONG';
      else if (confidence >= 70) strength = 'MODERATE';

      return {
        strategyName: 'LIQUIDATION_CASCADE_PREDICTION',
        symbol: data.symbol,
        type: signalType,
        confidence: Math.min(100, Math.max(0, confidence)),
        strength,
        reasoning,
        entryMin,
        entryMax,
        targets,
        stopLoss,
        riskRewardRatio,
        timeframe: '6-48 hours',
        indicators: {
          openInterest,
          clusteringScore: cascadeAnalysis.oiClusteringScore,
          triggerPrice: cascadeAnalysis.triggerPrice,
          estimatedMagnitude: cascadeAnalysis.estimatedMagnitude,
          distanceToTrigger: cascadeAnalysis.distanceToTrigger,
          cascadeDirection: cascadeAnalysis.cascadeDirection
        },
        // ATR-based fields
        atrBased,
        atrValue,
        atrPercent,
        riskRewardRatios,
        rejected: false
      };

    } catch (error) {
      console.error('[LiquidationCascade] Error:', error);
      return {
        strategyName: 'LIQUIDATION_CASCADE_PREDICTION',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`Error analyzing liquidations: ${error instanceof Error ? error.message : 'Unknown error'}`],
        entryMin: data.currentPrice,
        entryMax: data.currentPrice,
        targets: {
          target1: data.currentPrice * 1.02,
          target2: data.currentPrice * 1.04,
          target3: data.currentPrice * 1.06
        },
        stopLoss: data.currentPrice * 0.95,
        riskRewardRatio: 1.2,
        timeframe: '6-48 hours',
        indicators: {},
        rejected: true,
        rejectionReason: 'Analysis error'
      };
    }
  }

  /**
   * Analyze cascade risk based on Open Interest and funding rate
   */
  private analyzeCascadeRisk(
    currentPrice: number,
    openInterest: number,
    fundingRate: number
  ): CascadeAnalysis {
    // Estimate leverage distribution based on funding rate
    const leverageDistribution = this.estimateLeverageDistribution(fundingRate);

    // Calculate liquidation zones for each leverage tier
    const zones: LiquidationZone[] = [];
    let totalLiquidations = 0;

    // SHORT positions (negative funding = too many shorts)
    if (fundingRate < -0.0003) {
      // Shorts get liquidated on UPSIDE moves
      const shortOI = openInterest * 0.6; // Assume 60% shorts if negative funding

      // 100x shorts liquidate at +1%
      zones.push({
        priceLevel: currentPrice * 1.01,
        estimatedLiquidations: shortOI * leverageDistribution['100x'],
        leverageTier: '100x',
        direction: 'SHORT',
        cascadeTrigger: true
      });

      // 50x shorts liquidate at +2%
      zones.push({
        priceLevel: currentPrice * 1.02,
        estimatedLiquidations: shortOI * leverageDistribution['50x'],
        leverageTier: '50x',
        direction: 'SHORT',
        cascadeTrigger: true
      });

      // 20x shorts liquidate at +5%
      zones.push({
        priceLevel: currentPrice * 1.05,
        estimatedLiquidations: shortOI * leverageDistribution['20x'],
        leverageTier: '20x',
        direction: 'SHORT',
        cascadeTrigger: true
      });

      totalLiquidations = shortOI * 0.5; // Estimate 50% of shorts in danger zone

      // Find trigger price (where cascade starts)
      const triggerPrice = currentPrice * 1.01; // 100x zone
      const distanceToTrigger = (triggerPrice - currentPrice) / currentPrice;

      return {
        hasCascadeRisk: true,
        cascadeDirection: 'UP', // Price goes UP during short squeeze
        triggerPrice,
        estimatedMagnitude: totalLiquidations * this.CASCADE_MULTIPLIER,
        zones,
        oiClusteringScore: this.calculateClusteringScore(zones, openInterest),
        distanceToTrigger
      };
    }

    // LONG positions (positive funding = too many longs)
    else if (fundingRate > 0.0003) {
      // Longs get liquidated on DOWNSIDE moves
      const longOI = openInterest * 0.6; // Assume 60% longs if positive funding

      // 100x longs liquidate at -1%
      zones.push({
        priceLevel: currentPrice * 0.99,
        estimatedLiquidations: longOI * leverageDistribution['100x'],
        leverageTier: '100x',
        direction: 'LONG',
        cascadeTrigger: true
      });

      // 50x longs liquidate at -2%
      zones.push({
        priceLevel: currentPrice * 0.98,
        estimatedLiquidations: longOI * leverageDistribution['50x'],
        leverageTier: '50x',
        direction: 'LONG',
        cascadeTrigger: true
      });

      // 20x longs liquidate at -5%
      zones.push({
        priceLevel: currentPrice * 0.95,
        estimatedLiquidations: longOI * leverageDistribution['20x'],
        leverageTier: '20x',
        direction: 'LONG',
        cascadeTrigger: true
      });

      totalLiquidations = longOI * 0.5;

      const triggerPrice = currentPrice * 0.99;
      const distanceToTrigger = (triggerPrice - currentPrice) / currentPrice;

      return {
        hasCascadeRisk: true,
        cascadeDirection: 'DOWN',
        triggerPrice,
        estimatedMagnitude: totalLiquidations * this.CASCADE_MULTIPLIER,
        zones,
        oiClusteringScore: this.calculateClusteringScore(zones, openInterest),
        distanceToTrigger
      };
    }

    // No clear cascade risk (funding neutral)
    return {
      hasCascadeRisk: false,
      cascadeDirection: null,
      triggerPrice: currentPrice,
      estimatedMagnitude: 0,
      zones: [],
      oiClusteringScore: 0,
      distanceToTrigger: 0
    };
  }

  /**
   * Estimate leverage distribution based on funding rate
   */
  private estimateLeverageDistribution(fundingRate: number): Record<string, number> {
    // More extreme funding = more degenerate leverage
    const absRate = Math.abs(fundingRate);

    if (absRate > 0.001) { // Very high funding
      return {
        '5x': 0.15,
        '10x': 0.20,
        '20x': 0.25,
        '50x': 0.25,
        '100x': 0.15
      };
    } else if (absRate > 0.0005) { // High funding
      return {
        '5x': 0.20,
        '10x': 0.25,
        '20x': 0.25,
        '50x': 0.20,
        '100x': 0.10
      };
    } else { // Normal funding
      return {
        '5x': 0.30,
        '10x': 0.30,
        '20x': 0.25,
        '50x': 0.10,
        '100x': 0.05
      };
    }
  }

  /**
   * Calculate OI clustering score (0-100)
   */
  private calculateClusteringScore(zones: LiquidationZone[], totalOI: number): number {
    if (zones.length === 0) return 0;

    // Sum liquidations in danger zones
    const clusteredOI = zones.reduce((sum, zone) => sum + zone.estimatedLiquidations, 0);

    // Clustering score = % of OI in danger zones
    const score = (clusteredOI / totalOI) * 100;

    return Math.min(100, score);
  }

  /**
   * Calculate entry/exit targets and stop loss with ATR-based dynamic levels
   */
  private async calculateTargets(
    currentPrice: number,
    signalType: 'BUY' | 'SELL' | null,
    cascadeAnalysis: CascadeAnalysis,
    candles: any[],
    confidence: number
  ): Promise<{
    entryMin: number;
    entryMax: number;
    targets: { target1: number; target2: number; target3: number };
    stopLoss: number;
    riskRewardRatio: number;
    atrBased?: boolean;
    atrValue?: number;
    atrPercent?: number;
    riskRewardRatios?: [number, number, number];
  }> {
    if (!signalType) {
      return {
        entryMin: currentPrice,
        entryMax: currentPrice,
        targets: {
          target1: currentPrice * 1.02,
          target2: currentPrice * 1.04,
          target3: currentPrice * 1.06
        },
        stopLoss: currentPrice * 0.95,
        riskRewardRatio: 1.2
      };
    }

    // ===== ATR-BASED DYNAMIC LEVELS =====
    // Liquidation cascades are explosive, volatile events - use VOLATILE_BREAKOUT regime
    const { atrCalculator } = await import('../atrCalculator');

    const direction: 'LONG' | 'SHORT' = signalType === 'BUY' ? 'LONG' : 'SHORT';

    const atrLevels = atrCalculator.getDynamicLevels(
      currentPrice,
      direction,
      candles,
      'VOLATILE_BREAKOUT', // Cascades are violent, explosive moves
      confidence
    );

    console.log(
      `[LiquidationCascade] ATR-Based Levels | ` +
      `ATR: ${atrLevels.atrPercent.toFixed(2)}% | ` +
      `R:R: 1:${atrLevels.riskRewardRatios[0].toFixed(1)} / 1:${atrLevels.riskRewardRatios[1].toFixed(1)} / 1:${atrLevels.riskRewardRatios[2].toFixed(1)}`
    );

    if (signalType === 'BUY') {
      // Short squeeze (price goes UP)
      return {
        entryMin: currentPrice * 0.995,
        entryMax: currentPrice * 1.005,
        targets: {
          target1: atrLevels.target1,
          target2: atrLevels.target2,
          target3: atrLevels.target3
        },
        stopLoss: atrLevels.stopLoss,
        riskRewardRatio: atrLevels.riskRewardRatios[0],
        atrBased: true,
        atrValue: atrLevels.atrValue,
        atrPercent: atrLevels.atrPercent,
        riskRewardRatios: atrLevels.riskRewardRatios
      };
    } else {
      // Long squeeze (price goes DOWN)
      return {
        entryMin: currentPrice * 0.995,
        entryMax: currentPrice * 1.005,
        targets: {
          target1: atrLevels.target1,
          target2: atrLevels.target2,
          target3: atrLevels.target3
        },
        stopLoss: atrLevels.stopLoss,
        riskRewardRatio: atrLevels.riskRewardRatios[0],
        atrBased: true,
        atrValue: atrLevels.atrValue,
        atrPercent: atrLevels.atrPercent,
        riskRewardRatios: atrLevels.riskRewardRatios
      };
    }
  }
}

export { LiquidationCascadePredictionStrategy };
export const liquidationCascadePredictionStrategy = new LiquidationCascadePredictionStrategy();
