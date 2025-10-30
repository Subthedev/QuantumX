/**
 * Order Flow Imbalance Analysis Service
 * Production-grade order flow imbalance calculation with actionable trading insights
 *
 * Order Flow Imbalance (OFI) measures the imbalance between buying and selling pressure
 * at different price levels, helping identify areas of aggressive buying/selling.
 */

import type { OrderBookLevel } from './orderBookService';

export interface OrderFlowImbalance {
  // Core OFI metrics
  overallImbalance: number; // -100 to +100 (negative = sell pressure, positive = buy pressure)
  imbalanceStrength: 'extreme_sell' | 'strong_sell' | 'moderate_sell' | 'neutral' | 'moderate_buy' | 'strong_buy' | 'extreme_buy';

  // Level-by-level analysis
  levelImbalances: LevelImbalance[];

  // Depth-weighted metrics
  topOfBookImbalance: number; // Imbalance in top 5 levels (most important)
  midBookImbalance: number; // Imbalance in levels 6-15
  deepBookImbalance: number; // Imbalance in levels 16+

  // Volume-weighted metrics
  volumeWeightedImbalance: number; // Weighted by order sizes
  largeOrderImbalance: number; // Imbalance from large orders only (>avg)

  // Temporal metrics
  imbalanceTrend: 'increasing' | 'stable' | 'decreasing';
  imbalanceVelocity: number; // Rate of change

  // Price level analysis
  strongestBuyLevel: PriceLevel | null; // Price with strongest buy pressure
  strongestSellLevel: PriceLevel | null; // Price with strongest sell pressure
  supportLevel: number | null; // Identified support from bid imbalance
  resistanceLevel: number | null; // Identified resistance from ask imbalance

  // Actionable insights
  signals: OrderFlowSignal[];
  recommendation: TradeRecommendation;

  // Metadata
  timestamp: number;
  confidence: number; // 0-100
}

export interface LevelImbalance {
  priceLevel: number;
  bidVolume: number;
  askVolume: number;
  imbalance: number; // -100 to +100
  depth: number; // Distance from mid price (basis points)
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface PriceLevel {
  price: number;
  volume: number;
  imbalance: number;
  levelIndex: number;
}

export interface OrderFlowSignal {
  type: 'whale_buy' | 'whale_sell' | 'absorption' | 'spoofing' | 'accumulation' | 'distribution' | 'breakout_imminent' | 'reversal_signal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  priceLevel?: number;
  confidence: number;
}

export interface TradeRecommendation {
  action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'wait';
  reasoning: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: 'immediate' | 'short_term' | 'medium_term';
}

class OrderFlowAnalysisService {
  private previousImbalances: Map<string, OrderFlowImbalance> = new Map();
  private imbalanceHistory: Map<string, number[]> = new Map();
  private readonly HISTORY_LENGTH = 20; // Keep last 20 measurements for trend analysis

  /**
   * Calculate comprehensive order flow imbalance analysis
   */
  calculateOrderFlowImbalance(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[],
    midPrice: number,
    symbol: string
  ): OrderFlowImbalance {
    const timestamp = Date.now();

    // Calculate level-by-level imbalances
    const levelImbalances = this.calculateLevelImbalances(bids, asks, midPrice);

    // Calculate depth-weighted imbalances
    const topOfBookImbalance = this.calculateDepthImbalance(levelImbalances, 0, 5);
    const midBookImbalance = this.calculateDepthImbalance(levelImbalances, 5, 15);
    const deepBookImbalance = this.calculateDepthImbalance(levelImbalances, 15, 100);

    // Calculate volume-weighted imbalance
    const volumeWeightedImbalance = this.calculateVolumeWeightedImbalance(levelImbalances);

    // Calculate large order imbalance (whale detection)
    const avgVolume = this.calculateAverageVolume(bids, asks);
    const largeOrderImbalance = this.calculateLargeOrderImbalance(bids, asks, avgVolume);

    // Calculate overall imbalance (weighted average favoring top of book)
    const overallImbalance =
      topOfBookImbalance * 0.5 +  // Top of book is most important
      midBookImbalance * 0.3 +
      deepBookImbalance * 0.2;

    // Determine imbalance strength
    const imbalanceStrength = this.determineImbalanceStrength(overallImbalance);

    // Calculate temporal metrics
    const { imbalanceTrend, imbalanceVelocity } = this.calculateTemporalMetrics(
      symbol,
      overallImbalance
    );

    // Identify key price levels
    const strongestBuyLevel = this.findStrongestLevel(levelImbalances, 'buy');
    const strongestSellLevel = this.findStrongestLevel(levelImbalances, 'sell');
    const supportLevel = this.identifySupportLevel(bids, levelImbalances, midPrice);
    const resistanceLevel = this.identifyResistanceLevel(asks, levelImbalances, midPrice);

    // Generate signals
    const signals = this.generateSignals(
      levelImbalances,
      overallImbalance,
      largeOrderImbalance,
      imbalanceTrend,
      strongestBuyLevel,
      strongestSellLevel,
      midPrice
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      overallImbalance,
      imbalanceTrend,
      signals,
      supportLevel,
      resistanceLevel,
      midPrice
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(levelImbalances, signals.length);

    const imbalance: OrderFlowImbalance = {
      overallImbalance,
      imbalanceStrength,
      levelImbalances,
      topOfBookImbalance,
      midBookImbalance,
      deepBookImbalance,
      volumeWeightedImbalance,
      largeOrderImbalance,
      imbalanceTrend,
      imbalanceVelocity,
      strongestBuyLevel,
      strongestSellLevel,
      supportLevel,
      resistanceLevel,
      signals,
      recommendation,
      timestamp,
      confidence
    };

    // Store for trend analysis
    this.previousImbalances.set(symbol, imbalance);

    return imbalance;
  }

  /**
   * Calculate imbalance for each price level
   */
  private calculateLevelImbalances(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[],
    midPrice: number
  ): LevelImbalance[] {
    const imbalances: LevelImbalance[] = [];
    const maxLevels = Math.max(bids.length, asks.length);

    for (let i = 0; i < maxLevels; i++) {
      const bid = bids[i];
      const ask = asks[i];

      if (!bid && !ask) continue;

      const bidVolume = bid?.quantity || 0;
      const askVolume = ask?.quantity || 0;
      const totalVolume = bidVolume + askVolume;

      // Calculate imbalance: positive = buy pressure, negative = sell pressure
      const imbalance = totalVolume > 0
        ? ((bidVolume - askVolume) / totalVolume) * 100
        : 0;

      // Calculate depth (distance from mid price in basis points)
      const priceLevel = bid?.price || ask?.price || midPrice;
      const depth = Math.abs((priceLevel - midPrice) / midPrice) * 10000; // bps

      // Determine significance based on volume and depth
      const significance = this.determineSignificance(bidVolume + askVolume, depth, i);

      imbalances.push({
        priceLevel,
        bidVolume,
        askVolume,
        imbalance,
        depth,
        significance
      });
    }

    return imbalances;
  }

  /**
   * Calculate imbalance for a specific depth range
   */
  private calculateDepthImbalance(
    levelImbalances: LevelImbalance[],
    startIndex: number,
    endIndex: number
  ): number {
    const relevantLevels = levelImbalances.slice(startIndex, endIndex);
    if (relevantLevels.length === 0) return 0;

    const totalImbalance = relevantLevels.reduce((sum, level) => {
      // Weight by significance
      const weight = level.significance === 'critical' ? 2 :
                     level.significance === 'high' ? 1.5 :
                     level.significance === 'medium' ? 1 : 0.5;
      return sum + (level.imbalance * weight);
    }, 0);

    const totalWeight = relevantLevels.reduce((sum, level) => {
      const weight = level.significance === 'critical' ? 2 :
                     level.significance === 'high' ? 1.5 :
                     level.significance === 'medium' ? 1 : 0.5;
      return sum + weight;
    }, 0);

    return totalWeight > 0 ? totalImbalance / totalWeight : 0;
  }

  /**
   * Calculate volume-weighted imbalance
   */
  private calculateVolumeWeightedImbalance(levelImbalances: LevelImbalance[]): number {
    const totalVolume = levelImbalances.reduce((sum, level) =>
      sum + level.bidVolume + level.askVolume, 0
    );

    if (totalVolume === 0) return 0;

    const weightedImbalance = levelImbalances.reduce((sum, level) => {
      const levelVolume = level.bidVolume + level.askVolume;
      const weight = levelVolume / totalVolume;
      return sum + (level.imbalance * weight);
    }, 0);

    return weightedImbalance;
  }

  /**
   * Calculate average volume across all levels
   */
  private calculateAverageVolume(bids: OrderBookLevel[], asks: OrderBookLevel[]): number {
    const allVolumes = [
      ...bids.map(b => b.quantity),
      ...asks.map(a => a.quantity)
    ];
    return allVolumes.reduce((sum, vol) => sum + vol, 0) / allVolumes.length;
  }

  /**
   * Calculate imbalance from large orders only (whale detection)
   */
  private calculateLargeOrderImbalance(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[],
    avgVolume: number
  ): number {
    const largeBids = bids.filter(b => b.quantity > avgVolume * 2);
    const largeAsks = asks.filter(a => a.quantity > avgVolume * 2);

    const largeBidVolume = largeBids.reduce((sum, b) => sum + b.quantity, 0);
    const largeAskVolume = largeAsks.reduce((sum, a) => sum + a.quantity, 0);
    const totalLargeVolume = largeBidVolume + largeAskVolume;

    return totalLargeVolume > 0
      ? ((largeBidVolume - largeAskVolume) / totalLargeVolume) * 100
      : 0;
  }

  /**
   * Determine imbalance strength category
   */
  private determineImbalanceStrength(imbalance: number): OrderFlowImbalance['imbalanceStrength'] {
    if (imbalance > 60) return 'extreme_buy';
    if (imbalance > 40) return 'strong_buy';
    if (imbalance > 15) return 'moderate_buy';
    if (imbalance < -60) return 'extreme_sell';
    if (imbalance < -40) return 'strong_sell';
    if (imbalance < -15) return 'moderate_sell';
    return 'neutral';
  }

  /**
   * Calculate temporal metrics (trend and velocity)
   */
  private calculateTemporalMetrics(
    symbol: string,
    currentImbalance: number
  ): { imbalanceTrend: OrderFlowImbalance['imbalanceTrend'], imbalanceVelocity: number } {
    // Get or initialize history
    let history = this.imbalanceHistory.get(symbol) || [];
    history.push(currentImbalance);

    // Keep only recent history
    if (history.length > this.HISTORY_LENGTH) {
      history = history.slice(-this.HISTORY_LENGTH);
    }
    this.imbalanceHistory.set(symbol, history);

    if (history.length < 3) {
      return { imbalanceTrend: 'stable', imbalanceVelocity: 0 };
    }

    // Calculate trend using linear regression
    const recentHistory = history.slice(-10);
    const trend = this.calculateTrend(recentHistory);

    // Calculate velocity (rate of change)
    const velocity = recentHistory[recentHistory.length - 1] - recentHistory[0];

    return {
      imbalanceTrend: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
      imbalanceVelocity: velocity
    };
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    values.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += Math.pow(x - xMean, 2);
    });

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Determine significance of a price level
   */
  private determineSignificance(
    volume: number,
    depth: number,
    levelIndex: number
  ): LevelImbalance['significance'] {
    // Top 3 levels are always significant
    if (levelIndex < 3) return 'critical';

    // High volume at any depth is significant
    if (volume > 1000) return 'high';
    if (volume > 500) return 'medium';

    // Close to mid price is more significant
    if (depth < 10) return 'high'; // Within 0.1%
    if (depth < 50) return 'medium'; // Within 0.5%

    return 'low';
  }

  /**
   * Find strongest buy or sell level
   */
  private findStrongestLevel(
    levelImbalances: LevelImbalance[],
    side: 'buy' | 'sell'
  ): PriceLevel | null {
    const relevantLevels = levelImbalances.filter(level =>
      side === 'buy' ? level.imbalance > 30 : level.imbalance < -30
    );

    if (relevantLevels.length === 0) return null;

    const strongest = relevantLevels.reduce((max, level, index) => {
      const strength = Math.abs(level.imbalance) * (level.bidVolume + level.askVolume);
      const maxStrength = Math.abs(max.imbalance) * (max.bidVolume + max.askVolume);
      return strength > maxStrength ? { ...level, index } : max;
    });

    return {
      price: strongest.priceLevel,
      volume: strongest.bidVolume + strongest.askVolume,
      imbalance: strongest.imbalance,
      levelIndex: relevantLevels.indexOf(strongest)
    };
  }

  /**
   * Identify support level from bid concentration
   */
  private identifySupportLevel(
    bids: OrderBookLevel[],
    levelImbalances: LevelImbalance[],
    midPrice: number
  ): number | null {
    // Look for strong bid concentration below current price
    const supportCandidates = levelImbalances
      .filter(level => level.priceLevel < midPrice && level.imbalance > 40)
      .sort((a, b) => (b.bidVolume + b.askVolume) - (a.bidVolume + a.askVolume));

    return supportCandidates.length > 0 ? supportCandidates[0].priceLevel : null;
  }

  /**
   * Identify resistance level from ask concentration
   */
  private identifyResistanceLevel(
    asks: OrderBookLevel[],
    levelImbalances: LevelImbalance[],
    midPrice: number
  ): number | null {
    // Look for strong ask concentration above current price
    const resistanceCandidates = levelImbalances
      .filter(level => level.priceLevel > midPrice && level.imbalance < -40)
      .sort((a, b) => (b.bidVolume + b.askVolume) - (a.bidVolume + a.askVolume));

    return resistanceCandidates.length > 0 ? resistanceCandidates[0].priceLevel : null;
  }

  /**
   * Generate actionable signals from order flow analysis
   */
  private generateSignals(
    levelImbalances: LevelImbalance[],
    overallImbalance: number,
    largeOrderImbalance: number,
    trend: OrderFlowImbalance['imbalanceTrend'],
    strongestBuy: PriceLevel | null,
    strongestSell: PriceLevel | null,
    midPrice: number
  ): OrderFlowSignal[] {
    const signals: OrderFlowSignal[] = [];

    // Whale detection
    if (Math.abs(largeOrderImbalance) > 50) {
      signals.push({
        type: largeOrderImbalance > 0 ? 'whale_buy' : 'whale_sell',
        severity: 'critical',
        title: largeOrderImbalance > 0 ? 'Whale Accumulation Detected' : 'Whale Distribution Detected',
        description: `Large orders showing ${Math.abs(largeOrderImbalance).toFixed(1)}% ${largeOrderImbalance > 0 ? 'buy' : 'sell'} imbalance`,
        action: largeOrderImbalance > 0
          ? 'Follow whale money - consider entering long position'
          : 'Whales distributing - consider taking profits or shorting',
        confidence: 90
      });
    }

    // Absorption pattern (large volume at one level)
    const criticalLevels = levelImbalances.filter(l => l.significance === 'critical');
    const absorptionLevel = criticalLevels.find(l =>
      (l.bidVolume + l.askVolume) > 1000 && Math.abs(l.imbalance) > 60
    );
    if (absorptionLevel) {
      signals.push({
        type: 'absorption',
        severity: 'high',
        title: 'Order Absorption Detected',
        description: `Heavy ${absorptionLevel.imbalance > 0 ? 'buying' : 'selling'} absorption at $${absorptionLevel.priceLevel.toFixed(2)}`,
        action: absorptionLevel.imbalance > 0
          ? 'Strong support - good entry point for longs'
          : 'Strong resistance - consider profit taking',
        priceLevel: absorptionLevel.priceLevel,
        confidence: 85
      });
    }

    // Accumulation/Distribution
    if (trend === 'increasing' && overallImbalance > 30) {
      signals.push({
        type: 'accumulation',
        severity: 'medium',
        title: 'Accumulation Phase Detected',
        description: 'Sustained buying pressure building across order book',
        action: 'Accumulation suggests upcoming bullish move - consider long positions',
        confidence: 75
      });
    } else if (trend === 'decreasing' && overallImbalance < -30) {
      signals.push({
        type: 'distribution',
        severity: 'medium',
        title: 'Distribution Phase Detected',
        description: 'Sustained selling pressure building across order book',
        action: 'Distribution suggests upcoming bearish move - consider profit taking',
        confidence: 75
      });
    }

    // Breakout imminent
    if (strongestBuy && strongestSell) {
      const spread = Math.abs(strongestBuy.price - strongestSell.price) / midPrice;
      if (spread < 0.005 && Math.abs(overallImbalance) > 40) { // Tight range + strong imbalance
        signals.push({
          type: 'breakout_imminent',
          severity: 'high',
          title: 'Breakout Imminent',
          description: `Tight range with ${overallImbalance > 0 ? 'bullish' : 'bearish'} pressure building`,
          action: overallImbalance > 0
            ? `Prepare for upside breakout above $${strongestSell.price.toFixed(2)}`
            : `Prepare for downside breakout below $${strongestBuy.price.toFixed(2)}`,
          confidence: 80
        });
      }
    }

    // Reversal signal
    if (trend === 'increasing' && overallImbalance < -50) {
      signals.push({
        type: 'reversal_signal',
        severity: 'medium',
        title: 'Potential Reversal Signal',
        description: 'Strong sell pressure emerging despite recent buying',
        action: 'Watch for trend reversal - consider reducing long exposure',
        confidence: 70
      });
    } else if (trend === 'decreasing' && overallImbalance > 50) {
      signals.push({
        type: 'reversal_signal',
        severity: 'medium',
        title: 'Potential Reversal Signal',
        description: 'Strong buy pressure emerging despite recent selling',
        action: 'Watch for trend reversal - opportunity for long entry',
        confidence: 70
      });
    }

    return signals.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate trade recommendation
   */
  private generateRecommendation(
    overallImbalance: number,
    trend: OrderFlowImbalance['imbalanceTrend'],
    signals: OrderFlowSignal[],
    supportLevel: number | null,
    resistanceLevel: number | null,
    midPrice: number
  ): TradeRecommendation {
    const criticalSignals = signals.filter(s => s.severity === 'critical');
    const hasWhaleActivity = signals.some(s => s.type === 'whale_buy' || s.type === 'whale_sell');

    // Strong buy conditions
    if (overallImbalance > 50 && trend === 'increasing') {
      return {
        action: 'strong_buy',
        reasoning: 'Extreme buy pressure with increasing momentum. Whale activity supports upward move.',
        entryPrice: supportLevel || midPrice * 0.998,
        targetPrice: resistanceLevel || midPrice * 1.02,
        stopLoss: supportLevel ? supportLevel * 0.995 : midPrice * 0.99,
        riskLevel: hasWhaleActivity ? 'medium' : 'low',
        timeHorizon: 'immediate'
      };
    }

    // Buy conditions
    if (overallImbalance > 25 || (overallImbalance > 15 && trend === 'increasing')) {
      return {
        action: 'buy',
        reasoning: 'Strong buy pressure detected. Order flow suggests upward movement.',
        entryPrice: supportLevel || midPrice * 0.999,
        targetPrice: resistanceLevel || midPrice * 1.015,
        stopLoss: supportLevel ? supportLevel * 0.997 : midPrice * 0.995,
        riskLevel: 'medium',
        timeHorizon: 'short_term'
      };
    }

    // Strong sell conditions
    if (overallImbalance < -50 && trend === 'decreasing') {
      return {
        action: 'strong_sell',
        reasoning: 'Extreme sell pressure with decreasing momentum. Distribution phase active.',
        entryPrice: resistanceLevel || midPrice * 1.002,
        targetPrice: supportLevel || midPrice * 0.98,
        stopLoss: resistanceLevel ? resistanceLevel * 1.005 : midPrice * 1.01,
        riskLevel: hasWhaleActivity ? 'medium' : 'low',
        timeHorizon: 'immediate'
      };
    }

    // Sell conditions
    if (overallImbalance < -25 || (overallImbalance < -15 && trend === 'decreasing')) {
      return {
        action: 'sell',
        reasoning: 'Strong sell pressure detected. Order flow suggests downward movement.',
        entryPrice: resistanceLevel || midPrice * 1.001,
        targetPrice: supportLevel || midPrice * 0.985,
        stopLoss: resistanceLevel ? resistanceLevel * 1.003 : midPrice * 1.005,
        riskLevel: 'medium',
        timeHorizon: 'short_term'
      };
    }

    // Wait condition (conflicting signals)
    if (criticalSignals.length > 1 && Math.abs(overallImbalance) < 20) {
      return {
        action: 'wait',
        reasoning: 'Conflicting signals detected. Market indecision. Wait for clearer direction.',
        riskLevel: 'high',
        timeHorizon: 'medium_term'
      };
    }

    // Hold (neutral conditions)
    return {
      action: 'hold',
      reasoning: 'Balanced order flow. No strong directional bias. Monitor for changes.',
      riskLevel: 'low',
      timeHorizon: 'medium_term'
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(levelImbalances: LevelImbalance[], signalCount: number): number {
    // Base confidence from data quality
    const criticalLevels = levelImbalances.filter(l => l.significance === 'critical').length;
    const dataQuality = Math.min((criticalLevels / 10) * 100, 100);

    // Signal confidence
    const signalConfidence = Math.min(signalCount * 15, 100);

    // Combined confidence
    return Math.round((dataQuality * 0.6 + signalConfidence * 0.4));
  }
}

export const orderFlowAnalysisService = new OrderFlowAnalysisService();
