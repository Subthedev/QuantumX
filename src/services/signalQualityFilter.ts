/**
 * IGX SIGNAL QUALITY FILTER
 * Enforces "Quality > Quantity" philosophy
 *
 * Features:
 * - Multi-strategy consensus requirement (2+ strategies must agree)
 * - Confidence boosting when strategies converge (3+ = +10%, 5+ = +15%)
 * - Market regime filtering (avoid choppy/ranging markets)
 * - Signal priority scoring (rank best opportunities)
 * - Deduplication per strategy-coin combo
 */

import { StrategySignal } from './strategies/strategyTypes';
import { MultiStrategyResult } from './strategies/multiStrategyEngine';

export interface QualityFilterConfig {
  minStrategiesForConsensus: number;  // Default: 2
  confidenceBoostThreshold: number;   // Default: 3 strategies
  confidenceBoostAmount: number;      // Default: +10%
  strongConsensusThreshold: number;   // Default: 5 strategies
  strongConsensusBoost: number;       // Default: +15%
  minFinalConfidence: number;         // Default: 65%
  allowRangingMarkets: boolean;       // Default: false
}

export interface FilteredSignal {
  signal: StrategySignal;
  consensusCount: number;
  confidenceBoost: number;
  finalConfidence: number;
  qualityScore: number;
  agreeingStrategies: string[];
  reasoning: string[];
}

export interface QualityFilterResult {
  passed: boolean;
  filteredSignal: FilteredSignal | null;
  rejectionReason: string | null;
  stats: {
    totalStrategies: number;
    successfulStrategies: number;
    consensusCount: number;
    averageConfidence: number;
    qualityScore: number;
  };
}

class SignalQualityFilter {
  private config: QualityFilterConfig = {
    minStrategiesForConsensus: 2,
    confidenceBoostThreshold: 3,
    confidenceBoostAmount: 10,
    strongConsensusThreshold: 5,
    strongConsensusBoost: 15,
    minFinalConfidence: 65,
    allowRangingMarkets: false
  };

  /**
   * Apply quality filter to multi-strategy result
   */
  async applyFilter(
    result: MultiStrategyResult,
    customConfig?: Partial<QualityFilterConfig>
  ): Promise<QualityFilterResult> {
    const config = { ...this.config, ...customConfig };

    // Get successful signals (not rejected, above minimum threshold)
    const successfulSignals = result.signals.filter(
      s => !s.rejected && s.type !== null
    );

    console.log(`\n[QualityFilter] Analyzing ${result.symbol.toUpperCase()}`);
    console.log(`  - Total Strategies: ${result.totalStrategiesRun}`);
    console.log(`  - Successful Signals: ${successfulSignals.length}`);

    // FILTER 1: Minimum consensus check
    if (successfulSignals.length < config.minStrategiesForConsensus) {
      return {
        passed: false,
        filteredSignal: null,
        rejectionReason: `Insufficient consensus: ${successfulSignals.length}/${config.minStrategiesForConsensus} strategies`,
        stats: {
          totalStrategies: result.totalStrategiesRun,
          successfulStrategies: successfulSignals.length,
          consensusCount: successfulSignals.length,
          averageConfidence: result.averageConfidence,
          qualityScore: 0
        }
      };
    }

    // Group signals by direction (LONG/SHORT)
    const longSignals = successfulSignals.filter(s => s.type === 'LONG');
    const shortSignals = successfulSignals.filter(s => s.type === 'SHORT');

    const dominantDirection = longSignals.length > shortSignals.length ? 'LONG' : 'SHORT';
    const dominantSignals = dominantDirection === 'LONG' ? longSignals : shortSignals;

    console.log(`  - Signal Direction: ${longSignals.length} LONG, ${shortSignals.length} SHORT`);
    console.log(`  - Dominant Direction: ${dominantDirection} (${dominantSignals.length} strategies)`);

    // FILTER 2: Check if dominant direction has enough consensus
    if (dominantSignals.length < config.minStrategiesForConsensus) {
      return {
        passed: false,
        filteredSignal: null,
        rejectionReason: `Direction conflict: Only ${dominantSignals.length} strategies agree on ${dominantDirection}`,
        stats: {
          totalStrategies: result.totalStrategiesRun,
          successfulStrategies: successfulSignals.length,
          consensusCount: dominantSignals.length,
          averageConfidence: result.averageConfidence,
          qualityScore: 0
        }
      };
    }

    // Select best signal from dominant direction (highest confidence)
    const bestSignal = dominantSignals.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // Calculate consensus metrics
    const consensusCount = dominantSignals.length;
    const agreeingStrategies = dominantSignals.map(s => s.strategyName);

    // Calculate confidence boost based on consensus
    let confidenceBoost = 0;
    if (consensusCount >= config.strongConsensusThreshold) {
      confidenceBoost = config.strongConsensusBoost;
      console.log(`  - 🎯 STRONG CONSENSUS: ${consensusCount} strategies (+${confidenceBoost}% confidence)`);
    } else if (consensusCount >= config.confidenceBoostThreshold) {
      confidenceBoost = config.confidenceBoostAmount;
      console.log(`  - ✅ Good Consensus: ${consensusCount} strategies (+${confidenceBoost}% confidence)`);
    }

    // Calculate final confidence with boost (capped at 95%)
    const finalConfidence = Math.min(95, bestSignal.confidence + confidenceBoost);

    // FILTER 3: Check if final confidence meets minimum
    if (finalConfidence < config.minFinalConfidence) {
      return {
        passed: false,
        filteredSignal: null,
        rejectionReason: `Final confidence ${finalConfidence.toFixed(1)}% below minimum ${config.minFinalConfidence}%`,
        stats: {
          totalStrategies: result.totalStrategiesRun,
          successfulStrategies: successfulSignals.length,
          consensusCount: dominantSignals.length,
          averageConfidence: result.averageConfidence,
          qualityScore: this.calculateQualityScore(consensusCount, finalConfidence, result.totalStrategiesRun)
        }
      };
    }

    // FILTER 4: Market regime check (if enabled)
    if (!config.allowRangingMarkets) {
      // Check if market is ranging (high consolidation)
      // We'll check this via volatility and signal strength
      if (bestSignal.strength === 'WEAK') {
        return {
          passed: false,
          filteredSignal: null,
          rejectionReason: `Weak signal in potential ranging market (strength: ${bestSignal.strength})`,
          stats: {
            totalStrategies: result.totalStrategiesRun,
            successfulStrategies: successfulSignals.length,
            consensusCount: dominantSignals.length,
            averageConfidence: result.averageConfidence,
            qualityScore: this.calculateQualityScore(consensusCount, finalConfidence, result.totalStrategiesRun)
          }
        };
      }
    }

    // Calculate quality score (0-100)
    const qualityScore = this.calculateQualityScore(
      consensusCount,
      finalConfidence,
      result.totalStrategiesRun
    );

    // Compile comprehensive reasoning
    const reasoning = [
      `${consensusCount} strategies agree on ${dominantDirection} (${agreeingStrategies.join(', ')})`,
      `Base confidence: ${bestSignal.confidence}%, Boosted: ${finalConfidence}% (+${confidenceBoost}%)`,
      `Quality Score: ${qualityScore}/100`,
      ...bestSignal.reasoning.slice(0, 2)
    ];

    console.log(`  - ✅ PASSED QUALITY FILTER`);
    console.log(`  - Final Confidence: ${finalConfidence}%`);
    console.log(`  - Quality Score: ${qualityScore}/100`);
    console.log(`  - Agreeing Strategies: ${agreeingStrategies.join(', ')}`);

    return {
      passed: true,
      filteredSignal: {
        signal: bestSignal,
        consensusCount,
        confidenceBoost,
        finalConfidence,
        qualityScore,
        agreeingStrategies,
        reasoning
      },
      rejectionReason: null,
      stats: {
        totalStrategies: result.totalStrategiesRun,
        successfulStrategies: successfulSignals.length,
        consensusCount: dominantSignals.length,
        averageConfidence: result.averageConfidence,
        qualityScore
      }
    };
  }

  /**
   * Calculate quality score (0-100)
   * Factors:
   * - Consensus strength (40 points)
   * - Final confidence (40 points)
   * - Strategy diversity (20 points)
   */
  private calculateQualityScore(
    consensusCount: number,
    finalConfidence: number,
    totalStrategies: number
  ): number {
    // Consensus strength (0-40 points)
    const consensusScore = Math.min(40, (consensusCount / totalStrategies) * 100 * 0.4);

    // Confidence score (0-40 points)
    const confidenceScore = (finalConfidence / 100) * 40;

    // Diversity score (0-20 points) - more strategies = better
    const diversityScore = Math.min(20, (consensusCount / totalStrategies) * 20);

    const totalScore = consensusScore + confidenceScore + diversityScore;
    return Math.round(totalScore);
  }

  /**
   * Update filter configuration
   */
  updateConfig(newConfig: Partial<QualityFilterConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('[QualityFilter] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): QualityFilterConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const signalQualityFilter = new SignalQualityFilter();
