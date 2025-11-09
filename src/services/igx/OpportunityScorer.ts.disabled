/**
 * Opportunity Scorer
 * Scores signal opportunities based on quality, not arbitrary profit targets
 *
 * PARADIGM SHIFT:
 * - FROM: "Are we behind on monthly target?" (goal-chasing)
 * - TO:   "Is this a high-quality opportunity?" (opportunity-maximizing)
 *
 * SCORING DIMENSIONS:
 * 1. Edge Quality (40%): Pattern strength, consensus, risk-reward
 * 2. Market Fit (30%): Regime alignment, volatility appropriateness
 * 3. Execution Quality (20%): Liquidity, data quality, timing
 * 4. Risk Context (10%): Current drawdown, correlation, concentration
 */

import type {
  MarketMetrics,
  RegimeCharacteristics,
  SignalCandidate
} from '@/types/igx-enhanced';

export interface OpportunityScore {
  total: number;                    // 0-100 composite score
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'; // Letter grade
  recommendation: 'TAKE' | 'CONSIDER' | 'SKIP'; // Action recommendation

  // Score breakdown
  edgeQuality: number;              // 0-100
  marketFit: number;                // 0-100
  executionQuality: number;         // 0-100
  riskContext: number;              // 0-100

  // Detailed reasoning
  strengths: string[];              // What makes this good
  weaknesses: string[];             // What's concerning
  reasoning: string;                // Why this score?

  timestamp: number;
}

export interface OpportunityMetrics {
  // Opportunity tracking (NOT profit targets)
  totalScored: number;
  highQualityCount: number;         // Grade A or better
  mediumQualityCount: number;       // Grade B
  lowQualityCount: number;          // Grade C or worse

  // Quality distribution
  averageScore: number;
  scoreStdDev: number;

  // Selectivity
  takeRate: number;                 // % of opportunities taken
  skipRate: number;                 // % of opportunities skipped

  // Performance (measured by Sharpe, not $ returns)
  avgScoreOfTaken: number;
  avgScoreOfSkipped: number;

  timestamp: number;
}

export class OpportunityScorer {
  private scoreHistory: OpportunityScore[] = [];
  private readonly MAX_HISTORY = 1000;

  // Score thresholds for grades
  private readonly GRADE_THRESHOLDS = {
    'A+': 90,
    'A': 80,
    'B': 70,
    'C': 60,
    'D': 50,
    'F': 0
  };

  // Action thresholds
  private readonly ACTION_THRESHOLDS = {
    TAKE: 75,        // Score >= 75 = clear take
    CONSIDER: 60,    // Score 60-74 = consider carefully
    SKIP: 0          // Score < 60 = skip
  };

  /**
   * Score a signal opportunity
   */
  scoreOpportunity(
    signal: SignalCandidate,
    marketMetrics: MarketMetrics,
    regime: RegimeCharacteristics,
    riskContext: {
      currentDrawdown: number;
      winRate: number;
      correlationWithPortfolio: number;
      concentrationRisk: number;
    }
  ): OpportunityScore {

    // 1. EDGE QUALITY (40% weight)
    const edgeQuality = this.scoreEdgeQuality(signal);

    // 2. MARKET FIT (30% weight)
    const marketFit = this.scoreMarketFit(signal, marketMetrics, regime);

    // 3. EXECUTION QUALITY (20% weight)
    const executionQuality = this.scoreExecutionQuality(signal);

    // 4. RISK CONTEXT (10% weight)
    const riskContextScore = this.scoreRiskContext(signal, riskContext);

    // Calculate weighted composite score
    const total = Math.round(
      edgeQuality * 0.40 +
      marketFit * 0.30 +
      executionQuality * 0.20 +
      riskContextScore * 0.10
    );

    // Determine grade
    const grade = this.getGrade(total);

    // Determine recommendation
    const recommendation = this.getRecommendation(total);

    // Generate strengths and weaknesses
    const strengths = this.identifyStrengths(
      edgeQuality,
      marketFit,
      executionQuality,
      riskContextScore,
      signal
    );

    const weaknesses = this.identifyWeaknesses(
      edgeQuality,
      marketFit,
      executionQuality,
      riskContextScore,
      signal
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      total,
      grade,
      recommendation,
      strengths,
      weaknesses
    );

    const score: OpportunityScore = {
      total,
      grade,
      recommendation,
      edgeQuality,
      marketFit,
      executionQuality,
      riskContext: riskContextScore,
      strengths,
      weaknesses,
      reasoning,
      timestamp: Date.now()
    };

    // Store in history
    this.scoreHistory.push(score);
    if (this.scoreHistory.length > this.MAX_HISTORY) {
      this.scoreHistory.shift();
    }

    return score;
  }

  /**
   * Score edge quality (pattern strength, consensus, risk-reward)
   */
  private scoreEdgeQuality(signal: SignalCandidate): number {
    const weights = {
      patternStrength: 0.35,
      consensus: 0.35,
      riskReward: 0.30
    };

    // Pattern strength (0-100)
    const patternScore = Math.min(signal.patternStrength || 0, 100);

    // Consensus (0-1 → 0-100)
    const consensusScore = (signal.consensus || 0) * 100;

    // Risk-reward (1:1 = 0, 2:1 = 50, 3:1 = 75, 4:1+ = 100)
    const riskReward = signal.riskReward || 1;
    let rrScore = 0;
    if (riskReward >= 4) rrScore = 100;
    else if (riskReward >= 3) rrScore = 75;
    else if (riskReward >= 2) rrScore = 50;
    else if (riskReward >= 1.5) rrScore = 25;

    return Math.round(
      patternScore * weights.patternStrength +
      consensusScore * weights.consensus +
      rrScore * weights.riskReward
    );
  }

  /**
   * Score market fit (regime alignment, volatility)
   */
  private scoreMarketFit(
    signal: SignalCandidate,
    metrics: MarketMetrics,
    regime: RegimeCharacteristics
  ): number {
    let score = 50; // Start neutral

    // Regime alignment
    if (signal.direction === 'LONG') {
      if (regime.regime === 'BULL_TRENDING') score += 20;
      else if (regime.regime === 'BEAR_TRENDING') score -= 20;
      else if (regime.regime === 'RANGING') score += 0;
    } else if (signal.direction === 'SHORT') {
      if (regime.regime === 'BEAR_TRENDING') score += 20;
      else if (regime.regime === 'BULL_TRENDING') score -= 20;
      else if (regime.regime === 'RANGING') score += 0;
    }

    // Volatility appropriateness
    if (metrics.volatilityScore > 70) {
      // High volatility - penalize tight stops
      if (signal.stopDistance && signal.stopDistance < 0.02) {
        score -= 15; // Stop too tight for volatility
      } else {
        score += 10; // Good risk management
      }
    } else if (metrics.volatilityScore < 30) {
      // Low volatility - reward tight stops
      if (signal.stopDistance && signal.stopDistance < 0.02) {
        score += 15; // Tight control in low vol
      }
    }

    // Composite market score alignment
    if (metrics.compositeScore > 70) score += 15;
    else if (metrics.compositeScore < 30) score -= 15;

    // Regime confidence
    score += (regime.confidence - 50) / 5; // -10 to +10 adjustment

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Score execution quality (liquidity, data quality, timing)
   */
  private scoreExecutionQuality(signal: SignalCandidate): number {
    const weights = {
      liquidity: 0.40,
      dataQuality: 0.35,
      timing: 0.25
    };

    // Liquidity score (0-100)
    const liquidityScore = signal.liquidityScore || 50;

    // Data quality (0-100)
    const dataQualityScore = signal.dataQuality || 50;

    // Timing score (based on signal freshness)
    const age = Date.now() - (signal.timestamp || Date.now());
    const ageMinutes = age / 60000;
    let timingScore = 100;
    if (ageMinutes > 60) timingScore = 20;      // Very stale
    else if (ageMinutes > 30) timingScore = 50; // Stale
    else if (ageMinutes > 15) timingScore = 75; // Slightly stale
    else if (ageMinutes > 5) timingScore = 90;  // Fresh
    else timingScore = 100;                      // Very fresh

    return Math.round(
      liquidityScore * weights.liquidity +
      dataQualityScore * weights.dataQuality +
      timingScore * weights.timing
    );
  }

  /**
   * Score risk context (drawdown, correlation, concentration)
   */
  private scoreRiskContext(
    signal: SignalCandidate,
    context: {
      currentDrawdown: number;
      winRate: number;
      correlationWithPortfolio: number;
      concentrationRisk: number;
    }
  ): number {
    let score = 100; // Start optimistic

    // Drawdown penalty
    if (context.currentDrawdown < -15) score -= 40; // Deep drawdown
    else if (context.currentDrawdown < -10) score -= 25; // Moderate drawdown
    else if (context.currentDrawdown < -5) score -= 10; // Slight drawdown

    // Win rate consideration
    if (context.winRate < 40) score -= 15; // Struggling
    else if (context.winRate > 65) score += 10; // Hot streak

    // Correlation penalty (avoid doubling down)
    if (context.correlationWithPortfolio > 0.7) score -= 20; // High correlation
    else if (context.correlationWithPortfolio < 0.3) score += 10; // Good diversification

    // Concentration penalty
    if (context.concentrationRisk > 0.3) score -= 15; // Too concentrated
    else if (context.concentrationRisk < 0.15) score += 5; // Well diversified

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get letter grade from score
   */
  private getGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= this.GRADE_THRESHOLDS['A+']) return 'A+';
    if (score >= this.GRADE_THRESHOLDS['A']) return 'A';
    if (score >= this.GRADE_THRESHOLDS['B']) return 'B';
    if (score >= this.GRADE_THRESHOLDS['C']) return 'C';
    if (score >= this.GRADE_THRESHOLDS['D']) return 'D';
    return 'F';
  }

  /**
   * Get action recommendation from score
   */
  private getRecommendation(score: number): 'TAKE' | 'CONSIDER' | 'SKIP' {
    if (score >= this.ACTION_THRESHOLDS.TAKE) return 'TAKE';
    if (score >= this.ACTION_THRESHOLDS.CONSIDER) return 'CONSIDER';
    return 'SKIP';
  }

  /**
   * Identify strengths of the opportunity
   */
  private identifyStrengths(
    edge: number,
    market: number,
    execution: number,
    risk: number,
    signal: SignalCandidate
  ): string[] {
    const strengths: string[] = [];

    if (edge >= 80) strengths.push('Exceptional edge quality');
    else if (edge >= 70) strengths.push('Strong edge quality');

    if (market >= 80) strengths.push('Excellent market fit');
    else if (market >= 70) strengths.push('Good market alignment');

    if (execution >= 80) strengths.push('High execution quality');
    else if (execution >= 70) strengths.push('Solid execution setup');

    if (risk >= 80) strengths.push('Favorable risk context');

    if (signal.riskReward && signal.riskReward >= 3) {
      strengths.push(`Outstanding ${signal.riskReward.toFixed(1)}:1 risk-reward`);
    }

    if (signal.consensus && signal.consensus >= 0.75) {
      strengths.push(`Strong ${(signal.consensus * 100).toFixed(0)}% strategy consensus`);
    }

    return strengths;
  }

  /**
   * Identify weaknesses of the opportunity
   */
  private identifyWeaknesses(
    edge: number,
    market: number,
    execution: number,
    risk: number,
    signal: SignalCandidate
  ): string[] {
    const weaknesses: string[] = [];

    if (edge < 50) weaknesses.push('Weak edge quality');
    if (market < 50) weaknesses.push('Poor market fit');
    if (execution < 50) weaknesses.push('Execution concerns');
    if (risk < 50) weaknesses.push('Unfavorable risk context');

    if (signal.riskReward && signal.riskReward < 2) {
      weaknesses.push(`Low ${signal.riskReward.toFixed(1)}:1 risk-reward`);
    }

    if (signal.consensus && signal.consensus < 0.50) {
      weaknesses.push(`Low ${(signal.consensus * 100).toFixed(0)}% strategy agreement`);
    }

    if (signal.liquidityScore && signal.liquidityScore < 40) {
      weaknesses.push('Liquidity concerns');
    }

    return weaknesses;
  }

  /**
   * Generate reasoning for the score
   */
  private generateReasoning(
    total: number,
    grade: string,
    recommendation: string,
    strengths: string[],
    weaknesses: string[]
  ): string {
    let reasoning = `Grade ${grade} (${total}/100). `;

    if (recommendation === 'TAKE') {
      reasoning += 'High-quality opportunity - TAKE. ';
    } else if (recommendation === 'CONSIDER') {
      reasoning += 'Moderate opportunity - consider carefully. ';
    } else {
      reasoning += 'Low-quality opportunity - SKIP. ';
    }

    if (strengths.length > 0) {
      reasoning += `Strengths: ${strengths.join(', ')}. `;
    }

    if (weaknesses.length > 0) {
      reasoning += `Concerns: ${weaknesses.join(', ')}.`;
    }

    return reasoning;
  }

  /**
   * Get opportunity metrics
   */
  getMetrics(): OpportunityMetrics {
    if (this.scoreHistory.length === 0) {
      return {
        totalScored: 0,
        highQualityCount: 0,
        mediumQualityCount: 0,
        lowQualityCount: 0,
        averageScore: 0,
        scoreStdDev: 0,
        takeRate: 0,
        skipRate: 0,
        avgScoreOfTaken: 0,
        avgScoreOfSkipped: 0,
        timestamp: Date.now()
      };
    }

    const total = this.scoreHistory.length;
    const scores = this.scoreHistory.map(s => s.total);

    // Grade distribution
    const highQuality = this.scoreHistory.filter(s =>
      s.grade === 'A+' || s.grade === 'A'
    ).length;

    const mediumQuality = this.scoreHistory.filter(s =>
      s.grade === 'B'
    ).length;

    const lowQuality = this.scoreHistory.filter(s =>
      s.grade === 'C' || s.grade === 'D' || s.grade === 'F'
    ).length;

    // Statistics
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / total;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / total;
    const stdDev = Math.sqrt(variance);

    // Selectivity
    const taken = this.scoreHistory.filter(s => s.recommendation === 'TAKE').length;
    const skipped = this.scoreHistory.filter(s => s.recommendation === 'SKIP').length;

    const avgTaken = taken > 0
      ? this.scoreHistory
          .filter(s => s.recommendation === 'TAKE')
          .reduce((sum, s) => sum + s.total, 0) / taken
      : 0;

    const avgSkipped = skipped > 0
      ? this.scoreHistory
          .filter(s => s.recommendation === 'SKIP')
          .reduce((sum, s) => sum + s.total, 0) / skipped
      : 0;

    return {
      totalScored: total,
      highQualityCount: highQuality,
      mediumQualityCount: mediumQuality,
      lowQualityCount: lowQuality,
      averageScore: Math.round(avgScore * 100) / 100,
      scoreStdDev: Math.round(stdDev * 100) / 100,
      takeRate: (taken / total) * 100,
      skipRate: (skipped / total) * 100,
      avgScoreOfTaken: Math.round(avgTaken * 100) / 100,
      avgScoreOfSkipped: Math.round(avgSkipped * 100) / 100,
      timestamp: Date.now()
    };
  }

  /**
   * Get recent scores for analysis
   */
  getRecentScores(count: number = 50): OpportunityScore[] {
    return this.scoreHistory.slice(-count);
  }

  /**
   * Clear history (for testing)
   */
  clearHistory() {
    this.scoreHistory = [];
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const opportunityScorer = new OpportunityScorer();
