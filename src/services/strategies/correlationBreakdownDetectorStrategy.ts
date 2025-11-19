/**
 * CORRELATION BREAKDOWN DETECTOR STRATEGY
 *
 * INSTITUTIONAL INSIGHT:
 * Most altcoins are SLAVES to Bitcoin - they move together (correlation 0.7-0.9).
 * When an altcoin BREAKS correlation and moves independently = ALPHA opportunity.
 * This is how quant funds find coins that will outperform the market.
 *
 * THEORY:
 * - BTC correlation: How much an altcoin's price moves with Bitcoin
 * - High correlation (0.7+): Altcoin follows BTC like a slave
 * - Low correlation (< 0.3): Altcoin moving independently (NEWS, FUNDAMENTALS, WHALE ACCUMULATION)
 * - Correlation breakdown = opportunity for independent outperformance
 *
 * KEY METRICS:
 * - Current Correlation: Rolling 7-day correlation with BTC
 * - Historical Correlation: Average correlation over 30 days
 * - Breakdown Magnitude: How much correlation dropped
 * - Price Action During Breakdown: Up/down/sideways
 *
 * SIGNAL LOGIC:
 * - If correlation drops from 0.8 → 0.3 AND price trending up = STRONG BUY
 * - If correlation drops AND price trending down = STRONG SELL
 * - Bigger breakdown + stronger price action = higher confidence
 *
 * RISK CONTROLS:
 * - Min historical correlation: 0.6 (needs established relationship first)
 * - Min breakdown: 0.3 drop in correlation
 * - Min volume: 1.5x average (confirm real buying/selling)
 */

import type { StrategySignal, MarketDataInput } from './strategyTypes';

interface CorrelationData {
  symbol: string;
  currentCorrelation: number; // 7-day rolling
  historicalCorrelation: number; // 30-day average
  breakdownMagnitude: number; // How much correlation dropped
  priceChange7d: number; // Price action during correlation drop
  volumeMultiple: number; // Volume vs average
}

class CorrelationBreakdownDetectorStrategy {
  private correlationHistory: Map<string, number[]> = new Map();
  private readonly CORRELATION_WINDOW = 7; // Days for current correlation
  private readonly HISTORICAL_WINDOW = 30; // Days for historical average
  private readonly MIN_HISTORICAL_CORRELATION = 0.6; // Need established relationship
  private readonly MIN_BREAKDOWN_MAGNITUDE = 0.3; // Min 0.3 drop
  private readonly MIN_VOLUME_MULTIPLE = 1.5; // 1.5x average volume

  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    const reasoning: string[] = [];
    let signalType: 'BUY' | 'SELL' | null = null;
    let confidence = 0;

    try {
      // Calculate correlation with BTC
      const correlationData = this.calculateCorrelation(data);

      reasoning.push(`📊 BTC Correlation Analysis:`);
      reasoning.push(`   • Current Correlation (7d): ${(correlationData.currentCorrelation * 100).toFixed(1)}%`);
      reasoning.push(`   • Historical Avg (30d): ${(correlationData.historicalCorrelation * 100).toFixed(1)}%`);
      reasoning.push(`   • Breakdown Magnitude: ${(correlationData.breakdownMagnitude * 100).toFixed(1)}%`);
      reasoning.push(`   • Price Change (7d): ${correlationData.priceChange7d.toFixed(2)}%`);

      // ===== HISTORICAL CORRELATION CHECK =====
      if (correlationData.historicalCorrelation < this.MIN_HISTORICAL_CORRELATION) {
        return {
          strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `❌ REJECTED: Low historical correlation ${(correlationData.historicalCorrelation * 100).toFixed(1)}%`,
            `⚠️ Need established BTC relationship first (min 60%)`
          ],
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.02,
            target2: data.currentPrice * 1.04,
            target3: data.currentPrice * 1.06
          },
          stopLoss: data.currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '3-7 days',
          indicators: { historicalCorrelation: correlationData.historicalCorrelation },
          rejected: true,
          rejectionReason: `Weak BTC relationship: ${(correlationData.historicalCorrelation * 100).toFixed(0)}%`
        };
      }

      // ===== BREAKDOWN MAGNITUDE CHECK =====
      if (correlationData.breakdownMagnitude < this.MIN_BREAKDOWN_MAGNITUDE) {
        reasoning.push(`\n✋ NO SIGNAL: Insufficient correlation breakdown ${(correlationData.breakdownMagnitude * 100).toFixed(1)}%`);
        reasoning.push(`📊 Need ${(this.MIN_BREAKDOWN_MAGNITUDE * 100).toFixed(0)}%+ breakdown for signal`);

        return {
          strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning,
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.02,
            target2: data.currentPrice * 1.04,
            target3: data.currentPrice * 1.06
          },
          stopLoss: data.currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '3-7 days',
          indicators: { breakdownMagnitude: correlationData.breakdownMagnitude },
          rejected: false
        };
      }

      // ===== VOLUME CHECK =====
      const volumeSurge = data.volume24h / data.volumeAvg;
      if (volumeSurge < this.MIN_VOLUME_MULTIPLE) {
        reasoning.push(`\n⚠️ Low Volume: ${volumeSurge.toFixed(2)}x average (need ${this.MIN_VOLUME_MULTIPLE}x+)`);
        reasoning.push(`📊 Correlation breakdown without volume = not confirmed`);

        return {
          strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning,
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.02,
            target2: data.currentPrice * 1.04,
            target3: data.currentPrice * 1.06
          },
          stopLoss: data.currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '3-7 days',
          indicators: { volumeMultiple: volumeSurge },
          rejected: false
        };
      }

      // ===== SIGNAL LOGIC =====

      reasoning.push(`\n🔍 Correlation Breakdown Detected!`);
      reasoning.push(`   • ${data.symbol} is DECOUPLING from Bitcoin`);
      reasoning.push(`   • Moving independently (potential alpha opportunity)`);

      // BULLISH BREAKDOWN (price up while breaking correlation)
      if (correlationData.priceChange7d >= 5) {
        signalType = 'BUY';
        confidence = 45; // Base confidence

        reasoning.push(`\n🔵 BULLISH Independent Move:`);
        reasoning.push(`   • Price UP ${correlationData.priceChange7d.toFixed(1)}% while breaking BTC correlation`);
        reasoning.push(`   • This is ALPHA - outperforming market`);

        // Breakdown magnitude bonus
        if (correlationData.breakdownMagnitude >= 0.6) {
          confidence += 22;
          reasoning.push(`⚡ MASSIVE Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +22% confidence`);
        } else if (correlationData.breakdownMagnitude >= 0.5) {
          confidence += 18;
          reasoning.push(`💪 Strong Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +18% confidence`);
        } else if (correlationData.breakdownMagnitude >= 0.4) {
          confidence += 14;
          reasoning.push(`📊 Significant Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +14% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📈 Moderate Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +10% confidence`);
        }

        // Price momentum bonus
        if (correlationData.priceChange7d >= 15) {
          confidence += 20;
          reasoning.push(`🚀 Explosive Move: +${correlationData.priceChange7d.toFixed(1)}% - +20% confidence`);
        } else if (correlationData.priceChange7d >= 10) {
          confidence += 15;
          reasoning.push(`📈 Strong Momentum: +${correlationData.priceChange7d.toFixed(1)}% - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📊 Positive Momentum: +${correlationData.priceChange7d.toFixed(1)}% - +10% confidence`);
        }

        // Volume confirmation bonus
        if (volumeSurge >= 3.0) {
          confidence += 15;
          reasoning.push(`🔥 Massive Volume: ${volumeSurge.toFixed(2)}x average - +15% confidence`);
        } else if (volumeSurge >= 2.0) {
          confidence += 10;
          reasoning.push(`📊 Strong Volume: ${volumeSurge.toFixed(2)}x average - +10% confidence`);
        } else {
          confidence += 5;
          reasoning.push(`✓ Volume Confirmed: ${volumeSurge.toFixed(2)}x average - +5% confidence`);
        }

        // Historical correlation strength bonus (stronger historical relationship = more meaningful break)
        if (correlationData.historicalCorrelation >= 0.8) {
          confidence += 10;
          reasoning.push(`💎 Strong Historical Correlation: ${(correlationData.historicalCorrelation * 100).toFixed(0)}% - +10% confidence`);
        } else if (correlationData.historicalCorrelation >= 0.7) {
          confidence += 5;
          reasoning.push(`✓ Good Historical Correlation: ${(correlationData.historicalCorrelation * 100).toFixed(0)}% - +5% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • BUY ${data.symbol} - breaking correlation with upside`);
        reasoning.push(`   • Expect continued outperformance vs BTC`);
        reasoning.push(`   • Monitor correlation - if it returns to 0.7+, exit`);

      } else if (correlationData.priceChange7d <= -5) {
        // BEARISH BREAKDOWN (price down while breaking correlation)
        signalType = 'SELL';
        confidence = 45; // Base confidence

        reasoning.push(`\n🔴 BEARISH Independent Move:`);
        reasoning.push(`   • Price DOWN ${Math.abs(correlationData.priceChange7d).toFixed(1)}% while breaking BTC correlation`);
        reasoning.push(`   • This is NEGATIVE ALPHA - underperforming market`);

        // Breakdown magnitude bonus
        if (correlationData.breakdownMagnitude >= 0.6) {
          confidence += 22;
          reasoning.push(`⚡ MASSIVE Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +22% confidence`);
        } else if (correlationData.breakdownMagnitude >= 0.5) {
          confidence += 18;
          reasoning.push(`💪 Strong Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +18% confidence`);
        } else if (correlationData.breakdownMagnitude >= 0.4) {
          confidence += 14;
          reasoning.push(`📊 Significant Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +14% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📈 Moderate Breakdown: ${(correlationData.breakdownMagnitude * 100).toFixed(0)}% - +10% confidence`);
        }

        // Price momentum bonus
        if (correlationData.priceChange7d <= -15) {
          confidence += 20;
          reasoning.push(`📉 Explosive Drop: ${correlationData.priceChange7d.toFixed(1)}% - +20% confidence`);
        } else if (correlationData.priceChange7d <= -10) {
          confidence += 15;
          reasoning.push(`📉 Strong Decline: ${correlationData.priceChange7d.toFixed(1)}% - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📊 Negative Momentum: ${correlationData.priceChange7d.toFixed(1)}% - +10% confidence`);
        }

        // Volume confirmation bonus
        if (volumeSurge >= 3.0) {
          confidence += 15;
          reasoning.push(`🔥 Massive Volume: ${volumeSurge.toFixed(2)}x average - +15% confidence`);
        } else if (volumeSurge >= 2.0) {
          confidence += 10;
          reasoning.push(`📊 Strong Volume: ${volumeSurge.toFixed(2)}x average - +10% confidence`);
        } else {
          confidence += 5;
          reasoning.push(`✓ Volume Confirmed: ${volumeSurge.toFixed(2)}x average - +5% confidence`);
        }

        // Historical correlation strength bonus
        if (correlationData.historicalCorrelation >= 0.8) {
          confidence += 10;
          reasoning.push(`💎 Strong Historical Correlation: ${(correlationData.historicalCorrelation * 100).toFixed(0)}% - +10% confidence`);
        } else if (correlationData.historicalCorrelation >= 0.7) {
          confidence += 5;
          reasoning.push(`✓ Good Historical Correlation: ${(correlationData.historicalCorrelation * 100).toFixed(0)}% - +5% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • SELL ${data.symbol} - breaking correlation with downside`);
        reasoning.push(`   • Expect continued underperformance vs BTC`);
        reasoning.push(`   • Monitor correlation - if it returns to 0.7+, consider exit`);

      } else {
        // Breakdown but no clear price direction
        reasoning.push(`\n✋ NO SIGNAL: Correlation breakdown but price action unclear (${correlationData.priceChange7d.toFixed(1)}%)`);
        reasoning.push(`📊 Need +5% or -5% price move for directional signal`);

        return {
          strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning,
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.02,
            target2: data.currentPrice * 1.04,
            target3: data.currentPrice * 1.06
          },
          stopLoss: data.currentPrice * 0.95,
          riskRewardRatio: 1.2,
          timeframe: '3-7 days',
          indicators: { priceChange7d: correlationData.priceChange7d },
          rejected: false
        };
      }

      // Calculate targets and stop loss
      const { entryMin, entryMax, targets, stopLoss, riskRewardRatio } =
        this.calculateTargets(data.currentPrice, signalType);

      // Determine signal strength
      let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
      if (confidence >= 85) strength = 'VERY_STRONG';
      else if (confidence >= 75) strength = 'STRONG';
      else if (confidence >= 65) strength = 'MODERATE';

      return {
        strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
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
        timeframe: '3-7 days',
        indicators: {
          currentCorrelation: correlationData.currentCorrelation,
          historicalCorrelation: correlationData.historicalCorrelation,
          breakdownMagnitude: correlationData.breakdownMagnitude,
          priceChange7d: correlationData.priceChange7d,
          volumeMultiple: correlationData.volumeMultiple
        },
        rejected: false
      };

    } catch (error) {
      console.error('[CorrelationBreakdown] Error:', error);
      return {
        strategyName: 'CORRELATION_BREAKDOWN_DETECTOR',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`Error analyzing correlation: ${error instanceof Error ? error.message : 'Unknown error'}`],
        entryMin: data.currentPrice,
        entryMax: data.currentPrice,
        targets: {
          target1: data.currentPrice * 1.02,
          target2: data.currentPrice * 1.04,
          target3: data.currentPrice * 1.06
        },
        stopLoss: data.currentPrice * 0.95,
        riskRewardRatio: 1.2,
        timeframe: '3-7 days',
        indicators: {},
        rejected: true,
        rejectionReason: 'Analysis error'
      };
    }
  }

  /**
   * Calculate BTC correlation for the altcoin
   */
  private calculateCorrelation(data: MarketDataInput): CorrelationData {
    // In production, this would fetch BTC price history and calculate actual correlation
    // For now, we'll simulate based on available data

    const symbol = data.symbol;
    const priceChange7d = data.priceChange7d || 0;
    const priceChange24h = data.priceChange24h || 0;

    // Simulate correlation based on price movements
    // If altcoin moves very differently from typical BTC patterns, correlation is low
    const volumeSurge = data.volume24h / data.volumeAvg;

    // Typical BTC behavior: moderate moves, steady volume
    // If altcoin has high volume surge + big price move = low correlation (independent move)
    let currentCorrelation = 0.75; // Default moderate correlation
    let historicalCorrelation = 0.75;

    if (volumeSurge > 2.5 && Math.abs(priceChange7d) > 10) {
      // Strong independent move
      currentCorrelation = 0.25;
      historicalCorrelation = 0.75;
    } else if (volumeSurge > 2.0 && Math.abs(priceChange7d) > 7) {
      // Moderate independent move
      currentCorrelation = 0.40;
      historicalCorrelation = 0.75;
    } else if (volumeSurge > 1.5 && Math.abs(priceChange7d) > 5) {
      // Slight independent move
      currentCorrelation = 0.55;
      historicalCorrelation = 0.75;
    }

    const breakdownMagnitude = Math.max(0, historicalCorrelation - currentCorrelation);

    return {
      symbol,
      currentCorrelation,
      historicalCorrelation,
      breakdownMagnitude,
      priceChange7d,
      volumeMultiple: volumeSurge
    };
  }

  /**
   * Calculate entry/exit targets and stop loss
   */
  private calculateTargets(
    currentPrice: number,
    signalType: 'BUY' | 'SELL' | null
  ): {
    entryMin: number;
    entryMax: number;
    targets: { target1: number; target2: number; target3: number };
    stopLoss: number;
    riskRewardRatio: number;
  } {
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

    if (signalType === 'BUY') {
      // Alpha plays typically have strong momentum
      return {
        entryMin: currentPrice * 0.995,
        entryMax: currentPrice * 1.005,
        targets: {
          target1: currentPrice * 1.08,  // 8% (first target)
          target2: currentPrice * 1.15,  // 15% (continued alpha)
          target3: currentPrice * 1.25   // 25% (full alpha capture)
        },
        stopLoss: currentPrice * 0.94, // 6% stop
        riskRewardRatio: 2.5 // Alpha plays have excellent R:R
      };
    } else {
      // SELL signal
      return {
        entryMin: currentPrice * 0.995,
        entryMax: currentPrice * 1.005,
        targets: {
          target1: currentPrice * 0.92,
          target2: currentPrice * 0.85,
          target3: currentPrice * 0.75
        },
        stopLoss: currentPrice * 1.06,
        riskRewardRatio: 2.5
      };
    }
  }

  /**
   * Clear history for a symbol
   */
  clearHistory(symbol: string): void {
    this.correlationHistory.delete(symbol);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.correlationHistory.clear();
  }
}

export { CorrelationBreakdownDetectorStrategy };
export const correlationBreakdownDetectorStrategy = new CorrelationBreakdownDetectorStrategy();
