/**
 * INTELLIGENT SIGNAL SELECTOR
 * Chooses THE BEST trade opportunity when multiple strategies detect signals for same coin
 *
 * PHILOSOPHY:
 * - 10 strategies run independently and generate their own analysis
 * - If multiple strategies find opportunities on same coin, we select THE BEST ONE
 * - Selection based on: confidence, consensus, risk/reward, strength
 * - Only ONE signal per coin shown to user (prevents confusion and builds trust)
 * - Track which strategy won for performance monitoring
 *
 * SELECTION CRITERIA:
 * 1. Direction Consensus: Majority LONG or SHORT wins (5+ strategies = strong)
 * 2. Quality Score: Confidence (40%) + Consensus (30%) + Risk/Reward (20%) + Strength (10%)
 * 3. Strategy Reputation: Historical performance adjusts confidence ±20%
 */

import type { StrategySignal } from './strategies/strategyTypes';
import { strategyReputationManager } from './strategies/StrategyReputationManager';

export interface SignalSelectionResult {
  selectedSignal: StrategySignal | null;
  rejectedSignals: StrategySignal[];
  selectionReason: string;
  qualityScore: number;
  consensusMetrics: {
    totalStrategies: number;
    longSignals: number;
    shortSignals: number;
    dominantDirection: 'LONG' | 'SHORT' | 'CONFLICTED';
    consensusStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'CONFLICTED';
  };
}

class IntelligentSignalSelector {
  /**
   * Select the best signal from multiple strategy outputs for a single coin
   */
  selectBestSignal(
    symbol: string,
    validSignals: StrategySignal[],
    marketCondition?: 'trending' | 'ranging' | 'volatile'
  ): SignalSelectionResult {
    if (validSignals.length === 0) {
      return {
        selectedSignal: null,
        rejectedSignals: [],
        selectionReason: 'No valid signals to choose from',
        qualityScore: 0,
        consensusMetrics: {
          totalStrategies: 0,
          longSignals: 0,
          shortSignals: 0,
          dominantDirection: 'CONFLICTED',
          consensusStrength: 'CONFLICTED'
        }
      };
    }

    // Single signal - easy decision
    if (validSignals.length === 1) {
      const signal = validSignals[0];
      return {
        selectedSignal: signal,
        rejectedSignals: [],
        selectionReason: `Single strategy (${signal.strategyName}) detected opportunity`,
        qualityScore: this.calculateQualityScore(signal, 1, 1, marketCondition),
        consensusMetrics: {
          totalStrategies: 1,
          longSignals: signal.type === 'LONG' ? 1 : 0,
          shortSignals: signal.type === 'SHORT' ? 1 : 0,
          dominantDirection: signal.type === 'LONG' ? 'LONG' : 'SHORT',
          consensusStrength: 'WEAK'
        }
      };
    }

    // Multiple signals - intelligent selection required
    console.log(`\n[SignalSelector] ${symbol.toUpperCase()}: Selecting best from ${validSignals.length} signals...`);

    // 1. Analyze direction consensus
    const longSignals = validSignals.filter(s => s.type === 'LONG');
    const shortSignals = validSignals.filter(s => s.type === 'SHORT');

    console.log(`[SignalSelector] Direction split: ${longSignals.length} LONG, ${shortSignals.length} SHORT`);

    // 2. Determine dominant direction
    let dominantDirection: 'LONG' | 'SHORT' | 'CONFLICTED';
    let consensusStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'CONFLICTED';
    let candidateSignals: StrategySignal[];
    let rejectedSignals: StrategySignal[];

    const totalSignals = validSignals.length;
    const majorityThreshold = Math.ceil(totalSignals / 2);

    if (longSignals.length >= majorityThreshold && longSignals.length > shortSignals.length) {
      dominantDirection = 'LONG';
      candidateSignals = longSignals;
      rejectedSignals = shortSignals;

      // Consensus strength based on percentage
      const longPercentage = (longSignals.length / totalSignals) * 100;
      if (longPercentage >= 80) consensusStrength = 'STRONG';
      else if (longPercentage >= 60) consensusStrength = 'MODERATE';
      else consensusStrength = 'WEAK';

    } else if (shortSignals.length >= majorityThreshold && shortSignals.length > longSignals.length) {
      dominantDirection = 'SHORT';
      candidateSignals = shortSignals;
      rejectedSignals = longSignals;

      const shortPercentage = (shortSignals.length / totalSignals) * 100;
      if (shortPercentage >= 80) consensusStrength = 'STRONG';
      else if (shortPercentage >= 60) consensusStrength = 'MODERATE';
      else consensusStrength = 'WEAK';

    } else {
      // Equal split or no clear majority = CONFLICTED
      dominantDirection = 'CONFLICTED';
      consensusStrength = 'CONFLICTED';
      candidateSignals = validSignals;
      rejectedSignals = [];

      console.log(`[SignalSelector] ⚠️  CONFLICTED MARKET: No clear consensus`);
    }

    console.log(`[SignalSelector] Dominant Direction: ${dominantDirection} (${consensusStrength})`);

    // 3. If conflicted, reject all signals (don't show conflicting directions)
    if (dominantDirection === 'CONFLICTED') {
      return {
        selectedSignal: null,
        rejectedSignals: validSignals,
        selectionReason: `Market conflicted: ${longSignals.length} LONG vs ${shortSignals.length} SHORT signals - no clear opportunity`,
        qualityScore: 0,
        consensusMetrics: {
          totalStrategies: totalSignals,
          longSignals: longSignals.length,
          shortSignals: shortSignals.length,
          dominantDirection: 'CONFLICTED',
          consensusStrength: 'CONFLICTED'
        }
      };
    }

    // 4. Calculate quality scores for all candidate signals
    const consensusCount = candidateSignals.length;
    const scoredSignals = candidateSignals.map(signal => ({
      signal,
      qualityScore: this.calculateQualityScore(signal, consensusCount, totalSignals, marketCondition)
    }));

    // 5. Sort by quality score descending
    scoredSignals.sort((a, b) => b.qualityScore - a.qualityScore);

    const bestSignal = scoredSignals[0];

    console.log(`[SignalSelector] ✅ SELECTED: ${bestSignal.signal.strategyName} (Score: ${bestSignal.qualityScore.toFixed(1)}/100)`);
    console.log(`  Confidence: ${bestSignal.signal.confidence}%`);
    console.log(`  Risk/Reward: ${bestSignal.signal.riskRewardRatio.toFixed(2)}:1`);
    console.log(`  Strength: ${bestSignal.signal.strength}`);
    console.log(`  Consensus: ${consensusCount}/${totalSignals} strategies agree`);

    // Log rejected signals
    const allRejected = [
      ...rejectedSignals, // Wrong direction
      ...scoredSignals.slice(1).map(s => s.signal) // Same direction but lower score
    ];

    if (allRejected.length > 0) {
      console.log(`[SignalSelector] ❌ REJECTED: ${allRejected.length} signals`);
      allRejected.forEach(s => {
        console.log(`    - ${s.strategyName} ${s.type} (${s.confidence}%) - ${s.type !== dominantDirection ? 'Wrong direction' : 'Lower quality'}`);
      });
    }

    return {
      selectedSignal: bestSignal.signal,
      rejectedSignals: allRejected,
      selectionReason: this.buildSelectionReason(
        bestSignal.signal,
        consensusCount,
        totalSignals,
        consensusStrength
      ),
      qualityScore: bestSignal.qualityScore,
      consensusMetrics: {
        totalStrategies: totalSignals,
        longSignals: longSignals.length,
        shortSignals: shortSignals.length,
        dominantDirection,
        consensusStrength
      }
    };
  }

  /**
   * Calculate quality score for a signal (0-100)
   * Factors:
   * - Confidence: 40 points (adjusted by reputation)
   * - Consensus: 30 points (how many strategies agree)
   * - Risk/Reward: 20 points
   * - Strength: 10 points
   */
  private calculateQualityScore(
    signal: StrategySignal,
    consensusCount: number,
    totalStrategies: number,
    marketCondition?: 'trending' | 'ranging' | 'volatile'
  ): number {
    // Get reputation-adjusted confidence
    const reputationAdjustment = strategyReputationManager.adjustConfidence(
      signal.strategyName,
      signal.confidence,
      marketCondition
    );

    // Use adjusted confidence for scoring
    const adjustedConfidence = reputationAdjustment.adjustedConfidence;

    // Log reputation adjustment if significant
    if (Math.abs(reputationAdjustment.reputationBoost) >= 5) {
      console.log(
        `[SignalSelector] ${signal.strategyName} reputation: ${reputationAdjustment.reputationBoost > 0 ? '+' : ''}${reputationAdjustment.reputationBoost}% ` +
        `(${reputationAdjustment.reason})`
      );
    }

    // Confidence score (0-40 points) - using reputation-adjusted confidence
    const confidenceScore = (adjustedConfidence / 100) * 40;

    // Consensus score (0-30 points)
    const consensusRatio = consensusCount / totalStrategies;
    const consensusScore = consensusRatio * 30;

    // Risk/Reward score (0-20 points)
    // Scale: 1:1 = 0pts, 2:1 = 10pts, 3:1 = 15pts, 4:1+ = 20pts
    let rrScore = 0;
    if (signal.riskRewardRatio >= 4) rrScore = 20;
    else if (signal.riskRewardRatio >= 3) rrScore = 15;
    else if (signal.riskRewardRatio >= 2) rrScore = 10;
    else rrScore = (signal.riskRewardRatio - 1) * 10;

    // Strength score (0-10 points)
    let strengthScore = 0;
    if (signal.strength === 'STRONG') strengthScore = 10;
    else if (signal.strength === 'MODERATE') strengthScore = 6;
    else strengthScore = 3;

    const totalScore = confidenceScore + consensusScore + rrScore + strengthScore;
    return Math.round(totalScore);
  }

  /**
   * Build human-readable selection reason
   */
  private buildSelectionReason(
    signal: StrategySignal,
    consensusCount: number,
    totalStrategies: number,
    consensusStrength: string
  ): string {
    const consensusPercent = Math.round((consensusCount / totalStrategies) * 100);

    let reason = `${signal.strategyName} selected: `;

    if (consensusStrength === 'STRONG') {
      reason += `Strong ${consensusPercent}% consensus (${consensusCount}/${totalStrategies} strategies), `;
    } else if (consensusStrength === 'MODERATE') {
      reason += `Moderate ${consensusPercent}% consensus (${consensusCount}/${totalStrategies} strategies), `;
    } else {
      reason += `Weak ${consensusPercent}% consensus (${consensusCount}/${totalStrategies} strategies), `;
    }

    reason += `${signal.confidence}% confidence, `;
    reason += `${signal.riskRewardRatio.toFixed(2)}:1 R/R, `;
    reason += `${signal.strength} strength`;

    return reason;
  }
}

export const intelligentSignalSelector = new IntelligentSignalSelector();
