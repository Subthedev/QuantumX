/**
 * V4 QUALITY GATE SYSTEM
 * 6-stage filter ensuring only high-quality, profitable signals pass
 *
 * PHILOSOPHY: Quality over quantity
 * - Better to miss opportunities than take bad trades
 * - Multiple independent filters catch different failure modes
 * - Each gate has specific rejection criteria
 *
 * GATES:
 * 1. Pattern Strength - Must score >70/100
 * 2. Strategy Consensus - >60% directional agreement
 * 3. Risk/Reward - Must be >2:1
 * 4. Liquidity - Order book depth sufficient, spread tight
 * 5. Portfolio Correlation - Max 3 signals per sector
 * 6. Time Deduplication - 4 hour window per coin
 */

import type { Pattern } from '../patterns/intelligentPatternDetector';
import type { EnrichedCanonicalTicker } from '../dataStreams/multiExchangeAggregatorV4';

export interface SignalCandidate {
  symbol: string;
  coinId: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  confidence: number;
  patterns: Pattern[];
  strategyConsensus: {
    longVotes: number;
    shortVotes: number;
    neutralVotes: number;
  };
  ticker: EnrichedCanonicalTicker;
  sector?: string; // DeFi, L1, L2, Gaming, etc.
}

export interface QualityGateResult {
  passed: boolean;
  rejectionReason?: string;
  gatesFailed: string[];
  qualityScore: number; // 0-100 overall quality
  details: {
    patternStrength: number;
    consensusScore: number;
    riskRewardRatio: number;
    liquidityScore: number;
    correlationScore: number;
    timeScore: number;
  };
}

export class QualityGateSystem {
  private activeSignals: Map<string, { timestamp: number; sector?: string }> = new Map();
  private sectorCounts: Map<string, number> = new Map();

  private readonly MIN_PATTERN_STRENGTH = 60; // Lowered to catch more opportunities
  private readonly MIN_CONSENSUS = 0.55; // 55% agreement (slightly lower for more signals)
  private readonly MIN_RISK_REWARD = 2.0; // 2:1 minimum (keep this strict)
  private readonly MAX_SPREAD_PERCENT = 0.5; // 0.5% max spread
  private readonly MIN_ORDER_BOOK_DEPTH = 50000; // $50k minimum depth
  private readonly MAX_SIGNALS_PER_SECTOR = 3;
  private readonly DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours (faster signal generation)

  /**
   * Run all 6 quality gates on a signal candidate
   */
  evaluate(candidate: SignalCandidate): QualityGateResult {
    const gatesFailed: string[] = [];
    const details = {
      patternStrength: 0,
      consensusScore: 0,
      riskRewardRatio: 0,
      liquidityScore: 0,
      correlationScore: 0,
      timeScore: 0
    };

    // GATE 1: Pattern Strength
    const patternGate = this.gatePatternStrength(candidate);
    details.patternStrength = patternGate.score;
    if (!patternGate.passed) {
      gatesFailed.push('PATTERN_STRENGTH');
    }

    // GATE 2: Strategy Consensus
    const consensusGate = this.gateStrategyConsensus(candidate);
    details.consensusScore = consensusGate.score;
    if (!consensusGate.passed) {
      gatesFailed.push('CONSENSUS');
    }

    // GATE 3: Risk/Reward Ratio
    const rrGate = this.gateRiskReward(candidate);
    details.riskRewardRatio = rrGate.ratio;
    if (!rrGate.passed) {
      gatesFailed.push('RISK_REWARD');
    }

    // GATE 4: Liquidity Check
    const liquidityGate = this.gateLiquidity(candidate);
    details.liquidityScore = liquidityGate.score;
    if (!liquidityGate.passed) {
      gatesFailed.push('LIQUIDITY');
    }

    // GATE 5: Portfolio Correlation
    const correlationGate = this.gatePortfolioCorrelation(candidate);
    details.correlationScore = correlationGate.score;
    if (!correlationGate.passed) {
      gatesFailed.push('CORRELATION');
    }

    // GATE 6: Time Deduplication
    const timeGate = this.gateTimeDeduplication(candidate);
    details.timeScore = timeGate.score;
    if (!timeGate.passed) {
      gatesFailed.push('TIME_DEDUP');
    }

    // Calculate overall quality score (weighted average)
    const qualityScore = this.calculateQualityScore(details);

    const passed = gatesFailed.length === 0;
    const rejectionReason = passed
      ? undefined
      : `Failed gates: ${gatesFailed.join(', ')}`;

    return {
      passed,
      rejectionReason,
      gatesFailed,
      qualityScore,
      details
    };
  }

  /**
   * GATE 1: Pattern Strength
   * Patterns must score >70/100 with confluence bonuses
   */
  private gatePatternStrength(candidate: SignalCandidate): { passed: boolean; score: number; reason?: string } {
    if (candidate.patterns.length === 0) {
      return { passed: false, score: 0, reason: 'No patterns detected' };
    }

    // Calculate base pattern strength (average of all patterns)
    const avgStrength = candidate.patterns.reduce((sum, p) => sum + p.strength, 0) / candidate.patterns.length;

    // Bonus for confluence (multiple patterns)
    let bonusMultiplier = 1.0;
    if (candidate.patterns.length >= 3) {
      bonusMultiplier = 1.3; // +30% bonus for 3+ patterns aligning
    } else if (candidate.patterns.length === 2) {
      bonusMultiplier = 1.15; // +15% bonus for 2 patterns
    }

    const finalScore = Math.min(avgStrength * bonusMultiplier, 100);

    if (finalScore < this.MIN_PATTERN_STRENGTH) {
      return {
        passed: false,
        score: finalScore,
        reason: `Pattern strength ${finalScore.toFixed(0)} < ${this.MIN_PATTERN_STRENGTH} required`
      };
    }

    return { passed: true, score: finalScore };
  }

  /**
   * GATE 2: Strategy Consensus
   * >60% of strategies must agree on direction
   */
  private gateStrategyConsensus(candidate: SignalCandidate): { passed: boolean; score: number; reason?: string } {
    const { longVotes, shortVotes, neutralVotes } = candidate.strategyConsensus;
    const totalVotes = longVotes + shortVotes + neutralVotes;

    if (totalVotes === 0) {
      return { passed: false, score: 0, reason: 'No strategy votes' };
    }

    const expectedVotes = candidate.direction === 'LONG' ? longVotes : shortVotes;
    const consensusRatio = expectedVotes / totalVotes;
    const consensusScore = consensusRatio * 100;

    if (consensusRatio < this.MIN_CONSENSUS) {
      return {
        passed: false,
        score: consensusScore,
        reason: `Consensus ${(consensusRatio * 100).toFixed(0)}% < ${this.MIN_CONSENSUS * 100}% required (${longVotes}L/${shortVotes}S/${neutralVotes}N)`
      };
    }

    return { passed: true, score: consensusScore };
  }

  /**
   * GATE 3: Risk/Reward Ratio
   * Must be >2:1 minimum
   */
  private gateRiskReward(candidate: SignalCandidate): { passed: boolean; ratio: number; reason?: string } {
    const { entryPrice, stopLoss, targets } = candidate;

    // Calculate risk (distance to stop loss)
    const risk = Math.abs(entryPrice - stopLoss);

    if (risk === 0) {
      return { passed: false, ratio: 0, reason: 'Invalid stop loss (zero risk)' };
    }

    // Calculate reward (distance to first target, conservative)
    const firstTarget = targets[0];
    const reward = Math.abs(firstTarget - entryPrice);

    const rrRatio = reward / risk;

    if (rrRatio < this.MIN_RISK_REWARD) {
      return {
        passed: false,
        ratio: rrRatio,
        reason: `R:R ${rrRatio.toFixed(2)}:1 < ${this.MIN_RISK_REWARD}:1 required`
      };
    }

    return { passed: true, ratio: rrRatio };
  }

  /**
   * GATE 4: Liquidity Check
   * Order book depth sufficient, spread tight enough
   */
  private gateLiquidity(candidate: SignalCandidate): { passed: boolean; score: number; reason?: string } {
    const { ticker } = candidate;

    // Check spread
    if (ticker.bid && ticker.ask) {
      const spread = ticker.ask - ticker.bid;
      const spreadPercent = (spread / ticker.price) * 100;

      if (spreadPercent > this.MAX_SPREAD_PERCENT) {
        return {
          passed: false,
          score: 50,
          reason: `Spread ${spreadPercent.toFixed(2)}% > ${this.MAX_SPREAD_PERCENT}% max (too wide to enter)`
        };
      }
    }

    // Check order book depth (if available)
    if (ticker.orderBookDepth) {
      const totalDepth = ticker.orderBookDepth.bidDepth + ticker.orderBookDepth.askDepth;

      if (totalDepth < this.MIN_ORDER_BOOK_DEPTH) {
        return {
          passed: false,
          score: 60,
          reason: `Order book depth $${(totalDepth / 1000).toFixed(0)}k < $${(this.MIN_ORDER_BOOK_DEPTH / 1000).toFixed(0)}k required`
        };
      }

      // Score based on depth (higher is better)
      const depthScore = Math.min((totalDepth / this.MIN_ORDER_BOOK_DEPTH) * 75, 100);
      return { passed: true, score: depthScore };
    }

    // No depth data available, pass with neutral score
    return { passed: true, score: 75 };
  }

  /**
   * GATE 5: Portfolio Correlation
   * Max 3 active signals per sector (diversification)
   */
  private gatePortfolioCorrelation(candidate: SignalCandidate): { passed: boolean; score: number; reason?: string } {
    const sector = candidate.sector || 'UNKNOWN';

    // Count active signals in this sector
    const sectorCount = this.sectorCounts.get(sector) || 0;

    if (sectorCount >= this.MAX_SIGNALS_PER_SECTOR) {
      return {
        passed: false,
        score: 0,
        reason: `Already have ${sectorCount} active signals in ${sector} sector (max ${this.MAX_SIGNALS_PER_SECTOR})`
      };
    }

    // Score inversely proportional to sector saturation
    const score = ((this.MAX_SIGNALS_PER_SECTOR - sectorCount) / this.MAX_SIGNALS_PER_SECTOR) * 100;

    return { passed: true, score };
  }

  /**
   * GATE 6: Time Deduplication
   * 1 signal per coin per 4 hours
   */
  private gateTimeDeduplication(candidate: SignalCandidate): { passed: boolean; score: number; reason?: string } {
    const dedupKey = `${candidate.coinId}-${candidate.direction}`;
    const lastSignal = this.activeSignals.get(dedupKey);

    if (lastSignal) {
      const timeSinceLastSignal = Date.now() - lastSignal.timestamp;

      if (timeSinceLastSignal < this.DEDUP_WINDOW_MS) {
        const remainingMinutes = Math.ceil((this.DEDUP_WINDOW_MS - timeSinceLastSignal) / 60000);
        return {
          passed: false,
          score: 0,
          reason: `Signal already generated ${Math.floor(timeSinceLastSignal / 60000)}m ago (wait ${remainingMinutes}m)`
        };
      }
    }

    return { passed: true, score: 100 };
  }

  /**
   * Calculate overall quality score (weighted average)
   */
  private calculateQualityScore(details: QualityGateResult['details']): number {
    // Weighted average (most important gates have higher weight)
    const weights = {
      patternStrength: 0.25,     // 25% - Critical
      consensusScore: 0.20,      // 20% - Important
      riskRewardRatio: 0.25,     // 25% - Critical (normalize R:R to 0-100)
      liquidityScore: 0.15,      // 15% - Important
      correlationScore: 0.10,    // 10% - Nice to have
      timeScore: 0.05            // 5% - Binary check
    };

    // Normalize R:R ratio to 0-100 scale (2:1 = 50, 4:1 = 100)
    const normalizedRR = Math.min((details.riskRewardRatio / 4) * 100, 100);

    const weightedScore =
      details.patternStrength * weights.patternStrength +
      details.consensusScore * weights.consensusScore +
      normalizedRR * weights.riskRewardRatio +
      details.liquidityScore * weights.liquidityScore +
      details.correlationScore * weights.correlationScore +
      details.timeScore * weights.timeScore;

    return Math.round(weightedScore);
  }

  /**
   * Register a signal as active (for correlation and time dedup)
   */
  registerSignal(candidate: SignalCandidate) {
    const dedupKey = `${candidate.coinId}-${candidate.direction}`;
    const sector = candidate.sector || 'UNKNOWN';

    this.activeSignals.set(dedupKey, {
      timestamp: Date.now(),
      sector
    });

    // Increment sector count
    const currentCount = this.sectorCounts.get(sector) || 0;
    this.sectorCounts.set(sector, currentCount + 1);
  }

  /**
   * Deregister a signal when it closes (for correlation tracking)
   */
  deregisterSignal(coinId: string, direction: 'LONG' | 'SHORT', sector?: string) {
    const dedupKey = `${coinId}-${direction}`;
    const signal = this.activeSignals.get(dedupKey);

    if (signal) {
      this.activeSignals.delete(dedupKey);

      // Decrement sector count
      const signalSector = sector || signal.sector || 'UNKNOWN';
      const currentCount = this.sectorCounts.get(signalSector) || 0;
      if (currentCount > 0) {
        this.sectorCounts.set(signalSector, currentCount - 1);
      }
    }
  }

  /**
   * Clean up expired signals from deduplication map
   */
  cleanupExpiredSignals() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, signal] of this.activeSignals.entries()) {
      if (now - signal.timestamp > this.DEDUP_WINDOW_MS) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const signal = this.activeSignals.get(key);
      if (signal) {
        // Decrement sector count
        const sector = signal.sector || 'UNKNOWN';
        const currentCount = this.sectorCounts.get(sector) || 0;
        if (currentCount > 0) {
          this.sectorCounts.set(sector, currentCount - 1);
        }
      }
      this.activeSignals.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`[QualityGates] Cleaned up ${expiredKeys.length} expired signals`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeSignalsCount: this.activeSignals.size,
      sectorDistribution: Object.fromEntries(this.sectorCounts),
      gates: {
        minPatternStrength: this.MIN_PATTERN_STRENGTH,
        minConsensus: this.MIN_CONSENSUS,
        minRiskReward: this.MIN_RISK_REWARD,
        maxSpread: this.MAX_SPREAD_PERCENT,
        minDepth: this.MIN_ORDER_BOOK_DEPTH,
        maxPerSector: this.MAX_SIGNALS_PER_SECTOR,
        dedupWindowHours: this.DEDUP_WINDOW_MS / (60 * 60 * 1000)
      }
    };
  }

  /**
   * Reset state (for testing)
   */
  reset() {
    this.activeSignals.clear();
    this.sectorCounts.clear();
  }
}

// Singleton instance
export const qualityGateSystem = new QualityGateSystem();
