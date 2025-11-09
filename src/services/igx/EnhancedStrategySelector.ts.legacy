/**
 * ENHANCED STRATEGY SELECTOR
 * Intelligently selects which strategies to run based on market regime
 *
 * PURPOSE: Not all strategies work in all market conditions
 * This component dynamically enables/disables strategies based on regime performance
 *
 * KEY INSIGHT: Quant firms don't run all strategies all the time
 * They selectively activate strategies that have an edge in current conditions
 *
 * SELECTION CRITERIA:
 * 1. Regime-Specific Performance - How has strategy performed in this regime?
 * 2. Alpha's Preferred/Avoided Lists - What does Alpha V3 recommend?
 * 3. Recent Win Rate - Has strategy been winning lately in this regime?
 * 4. ML Weight - Does ML engine trust this strategy?
 * 5. Circuit Breaker Status - Is strategy healthy?
 * 6. Market Phase Alignment - Does strategy fit current phase?
 *
 * STRATEGY CATEGORIES:
 * - ALWAYS_RUN: Core strategies that work in most conditions
 * - REGIME_SPECIFIC: Strategies for specific regimes (bull/bear/sideways)
 * - EXPERIMENTAL: Newer strategies being tested
 * - DEPRECATED: Old strategies being phased out
 */

import type { AlphaInsights } from './EventDrivenAlphaV3';
import type { MarketRegime } from './AdaptiveFrequencyController';

/**
 * Strategy metadata
 */
interface StrategyMetadata {
  name: string;
  category: 'ALWAYS_RUN' | 'REGIME_SPECIFIC' | 'EXPERIMENTAL' | 'DEPRECATED';
  bestRegimes: MarketRegime[]; // Regimes where strategy excels
  worstRegimes: MarketRegime[]; // Regimes where strategy fails
  minConfidenceThreshold: number; // Don't run if confidence < this
  description: string;
}

/**
 * Strategy selection decision
 */
export interface StrategySelection {
  strategyName: string;
  shouldRun: boolean;
  confidence: number; // 0-100 (confidence in this decision)
  reasoning: string[];
  performanceScore: number; // 0-100 (expected performance in current regime)
}

/**
 * Selection summary
 */
export interface SelectionSummary {
  totalStrategies: number;
  selectedStrategies: number;
  disabledStrategies: number;
  averageConfidence: number;
  regime: MarketRegime;
  selections: StrategySelection[];
  reasoning: string[];
  timestamp: number;
}

/**
 * Per-regime performance tracking
 */
interface RegimePerformance {
  regime: MarketRegime;
  strategyName: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  avgProfit: number;
  lastUpdated: number;
}

export class EnhancedStrategySelector {
  // Strategy metadata (10 strategies from Beta V5)
  private readonly STRATEGY_METADATA: Map<string, StrategyMetadata> = new Map([
    ['WHALE_SHADOW', {
      name: 'WHALE_SHADOW',
      category: 'ALWAYS_RUN',
      bestRegimes: ['BULL', 'ACCUMULATION', 'MARKUP'],
      worstRegimes: ['BEAR', 'MARKDOWN'],
      minConfidenceThreshold: 65,
      description: 'Tracks smart money accumulation and distribution'
    }],
    ['SPRING_TRAP', {
      name: 'SPRING_TRAP',
      category: 'REGIME_SPECIFIC',
      bestRegimes: ['RANGING', 'SIDEWAYS', 'ACCUMULATION'],
      worstRegimes: ['VOLATILE', 'TRENDING_STRONG'],
      minConfidenceThreshold: 70,
      description: 'Identifies false breakdowns in ranges'
    }],
    ['MOMENTUM_SURGE', {
      name: 'MOMENTUM_SURGE',
      category: 'ALWAYS_RUN',
      bestRegimes: ['BULL', 'MARKUP', 'TRENDING_STRONG'],
      worstRegimes: ['RANGING', 'SIDEWAYS'],
      minConfidenceThreshold: 60,
      description: 'Rides strong momentum waves'
    }],
    ['VOLATILITY_BREAKOUT', {
      name: 'VOLATILITY_BREAKOUT',
      category: 'REGIME_SPECIFIC',
      bestRegimes: ['VOLATILE', 'BREAKOUT'],
      worstRegimes: ['RANGING', 'LOW_VOLATILITY'],
      minConfidenceThreshold: 75,
      description: 'Catches explosive volatility breakouts'
    }],
    ['LIQUIDITY_GRAB', {
      name: 'LIQUIDITY_GRAB',
      category: 'ALWAYS_RUN',
      bestRegimes: ['RANGING', 'SIDEWAYS', 'ACCUMULATION'],
      worstRegimes: ['TRENDING_STRONG'],
      minConfidenceThreshold: 70,
      description: 'Identifies stop-hunt reversals'
    }],
    ['DIVERGENCE_HUNTER', {
      name: 'DIVERGENCE_HUNTER',
      category: 'REGIME_SPECIFIC',
      bestRegimes: ['RANGING', 'DISTRIBUTION', 'ACCUMULATION'],
      worstRegimes: ['TRENDING_STRONG', 'MARKUP'],
      minConfidenceThreshold: 72,
      description: 'Spots price-indicator divergences'
    }],
    ['ORDERFLOW_IMBALANCE', {
      name: 'ORDERFLOW_IMBALANCE',
      category: 'ALWAYS_RUN',
      bestRegimes: ['ALL'],
      worstRegimes: [],
      minConfidenceThreshold: 65,
      description: 'Detects orderflow imbalances'
    }],
    ['MEAN_REVERSION', {
      name: 'MEAN_REVERSION',
      category: 'REGIME_SPECIFIC',
      bestRegimes: ['RANGING', 'SIDEWAYS', 'OVERSOLD', 'OVERBOUGHT'],
      worstRegimes: ['TRENDING_STRONG', 'MARKUP', 'MARKDOWN'],
      minConfidenceThreshold: 68,
      description: 'Buys oversold, sells overbought'
    }],
    ['TREND_CONTINUATION', {
      name: 'TREND_CONTINUATION',
      category: 'REGIME_SPECIFIC',
      bestRegimes: ['TRENDING_STRONG', 'BULL', 'BEAR', 'MARKUP', 'MARKDOWN'],
      worstRegimes: ['RANGING', 'SIDEWAYS'],
      minConfidenceThreshold: 62,
      description: 'Enters pullbacks in strong trends'
    }],
    ['PATTERN_CONFLUENCE', {
      name: 'PATTERN_CONFLUENCE',
      category: 'ALWAYS_RUN',
      bestRegimes: ['ALL'],
      worstRegimes: [],
      minConfidenceThreshold: 68,
      description: 'Combines multiple pattern confirmations'
    }]
  ]);

  // Per-regime performance tracking
  private regimePerformance = new Map<string, RegimePerformance>();

  constructor() {
    console.log('[Enhanced Strategy Selector] Initialized with 10 strategies');
  }

  /**
   * Main method: Select which strategies to run
   */
  selectStrategies(
    alphaInsights: AlphaInsights,
    currentMLWeights: Map<string, number>,
    healthyStrategies: Set<string>
  ): SelectionSummary {
    const regime = alphaInsights.regime;
    console.log(`[Strategy Selector] 🎯 Selecting strategies for ${regime} regime...`);

    const selections: StrategySelection[] = [];
    const globalReasoning: string[] = [];

    // Evaluate each strategy
    for (const [strategyName, metadata] of this.STRATEGY_METADATA.entries()) {
      const selection = this.evaluateStrategy(
        strategyName,
        metadata,
        regime,
        alphaInsights,
        currentMLWeights,
        healthyStrategies
      );

      selections.push(selection);
    }

    // Count selected
    const selectedCount = selections.filter(s => s.shouldRun).length;
    const disabledCount = selections.filter(s => !s.shouldRun).length;

    // Calculate average confidence
    const avgConfidence = selectedCount > 0
      ? selections.filter(s => s.shouldRun).reduce((sum, s) => sum + s.confidence, 0) / selectedCount
      : 0;

    // Global reasoning
    globalReasoning.push(`Selected ${selectedCount}/10 strategies for ${regime} regime`);

    if (selectedCount >= 8) {
      globalReasoning.push('Running most strategies - favorable market conditions');
    } else if (selectedCount >= 5) {
      globalReasoning.push('Running balanced strategy mix');
    } else if (selectedCount >= 3) {
      globalReasoning.push('Running conservative strategy subset - challenging conditions');
    } else {
      globalReasoning.push('Running minimal strategies - very challenging conditions');
    }

    // List disabled strategies
    const disabledList = selections
      .filter(s => !s.shouldRun)
      .map(s => s.strategyName)
      .join(', ');

    if (disabledList) {
      globalReasoning.push(`Disabled: ${disabledList}`);
    }

    const summary: SelectionSummary = {
      totalStrategies: this.STRATEGY_METADATA.size,
      selectedStrategies: selectedCount,
      disabledStrategies: disabledCount,
      averageConfidence: Math.round(avgConfidence),
      regime,
      selections,
      reasoning: globalReasoning,
      timestamp: Date.now()
    };

    console.log(
      `[Strategy Selector] ✅ Selected ${selectedCount}/10 strategies ` +
      `(Avg confidence: ${summary.averageConfidence}%)`
    );

    return summary;
  }

  /**
   * Evaluate individual strategy
   */
  private evaluateStrategy(
    strategyName: string,
    metadata: StrategyMetadata,
    regime: MarketRegime,
    alphaInsights: AlphaInsights,
    mlWeights: Map<string, number>,
    healthyStrategies: Set<string>
  ): StrategySelection {
    const reasoning: string[] = [];
    let shouldRun = true; // Assume run unless reason not to
    let performanceScore = 70; // Base score

    // 1. Check if strategy is healthy
    if (!healthyStrategies.has(strategyName)) {
      shouldRun = false;
      reasoning.push('Strategy unhealthy (circuit breaker tripped)');
      return {
        strategyName,
        shouldRun: false,
        confidence: 95,
        reasoning,
        performanceScore: 0
      };
    }

    // 2. Check category
    if (metadata.category === 'DEPRECATED') {
      shouldRun = false;
      reasoning.push('Strategy deprecated');
      return {
        strategyName,
        shouldRun: false,
        confidence: 100,
        reasoning,
        performanceScore: 0
      };
    }

    // 3. ALWAYS_RUN strategies run unless critically bad
    if (metadata.category === 'ALWAYS_RUN') {
      performanceScore += 15;
      reasoning.push('Core strategy - always run');
    }

    // 4. Check regime alignment
    const regimeScore = this.scoreRegimeAlignment(regime, metadata);
    performanceScore += (regimeScore - 50) * 0.4; // Adjust by regime fit

    if (regimeScore >= 80) {
      reasoning.push(`Excellent fit for ${regime} regime`);
    } else if (regimeScore <= 30) {
      reasoning.push(`Poor fit for ${regime} regime`);
      shouldRun = false;
    } else if (regimeScore <= 50) {
      reasoning.push(`Suboptimal for ${regime} regime`);
    }

    // 5. Check Alpha's recommendations
    if (alphaInsights.preferredStrategies?.includes(strategyName)) {
      performanceScore += 15;
      reasoning.push('Alpha V3 recommends this strategy');
    }

    if (alphaInsights.avoidedStrategies?.includes(strategyName)) {
      performanceScore -= 20;
      reasoning.push('Alpha V3 recommends avoiding this strategy');
      shouldRun = false;
    }

    // 6. Check ML weight
    const mlWeight = mlWeights.get(strategyName) || 0.1;
    if (mlWeight > 0.15) {
      performanceScore += 10;
      reasoning.push(`Strong ML weight (${(mlWeight * 100).toFixed(0)}%)`);
    } else if (mlWeight < 0.08) {
      performanceScore -= 10;
      reasoning.push(`Weak ML weight (${(mlWeight * 100).toFixed(0)}%)`);
    }

    // 7. Check recent regime performance
    const recentPerformance = this.getRecentRegimePerformance(strategyName, regime);
    if (recentPerformance) {
      if (recentPerformance.winRate > 0.65 && recentPerformance.totalSignals >= 10) {
        performanceScore += 10;
        reasoning.push(`Strong recent performance in ${regime} (${(recentPerformance.winRate * 100).toFixed(0)}% WR)`);
      } else if (recentPerformance.winRate < 0.40 && recentPerformance.totalSignals >= 10) {
        performanceScore -= 15;
        reasoning.push(`Poor recent performance in ${regime} (${(recentPerformance.winRate * 100).toFixed(0)}% WR)`);
        shouldRun = false;
      }
    }

    // 8. Experimental strategies need higher confidence
    if (metadata.category === 'EXPERIMENTAL') {
      if (performanceScore < 75) {
        shouldRun = false;
        reasoning.push('Experimental strategy needs higher confidence to run');
      } else {
        reasoning.push('Experimental strategy - monitoring closely');
      }
    }

    // Clamp performance score
    performanceScore = Math.max(0, Math.min(100, performanceScore));

    // Calculate decision confidence
    const confidence = this.calculateDecisionConfidence(shouldRun, performanceScore, reasoning.length);

    return {
      strategyName,
      shouldRun,
      confidence,
      reasoning,
      performanceScore: Math.round(performanceScore)
    };
  }

  /**
   * Score regime alignment for strategy
   */
  private scoreRegimeAlignment(regime: MarketRegime, metadata: StrategyMetadata): number {
    // Check if it's in best regimes
    if (metadata.bestRegimes.includes(regime) || metadata.bestRegimes.includes('ALL' as any)) {
      return 90; // Excellent fit
    }

    // Check if it's in worst regimes
    if (metadata.worstRegimes.includes(regime)) {
      return 20; // Poor fit
    }

    // Neutral (not best, not worst)
    return 55;
  }

  /**
   * Get recent performance in specific regime
   */
  private getRecentRegimePerformance(
    strategyName: string,
    regime: MarketRegime
  ): RegimePerformance | undefined {
    const key = `${strategyName}_${regime}`;
    return this.regimePerformance.get(key);
  }

  /**
   * Record strategy outcome in regime (called by Continuous Learning Integrator)
   */
  recordRegimeOutcome(
    strategyName: string,
    regime: MarketRegime,
    success: boolean,
    profit: number
  ): void {
    const key = `${strategyName}_${regime}`;
    let perf = this.regimePerformance.get(key);

    if (!perf) {
      perf = {
        regime,
        strategyName,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgProfit: 0,
        lastUpdated: Date.now()
      };
      this.regimePerformance.set(key, perf);
    }

    // Update stats
    perf.totalSignals++;
    if (success) {
      perf.wins++;
    } else {
      perf.losses++;
    }
    perf.winRate = perf.wins / perf.totalSignals;

    // Update average profit (exponential moving average)
    perf.avgProfit = perf.avgProfit * 0.9 + profit * 0.1;
    perf.lastUpdated = Date.now();

    console.log(
      `[Strategy Selector] 📊 Updated ${strategyName} in ${regime}: ` +
      `${perf.wins}/${perf.totalSignals} (${(perf.winRate * 100).toFixed(0)}% WR)`
    );
  }

  /**
   * Calculate decision confidence
   */
  private calculateDecisionConfidence(
    shouldRun: boolean,
    performanceScore: number,
    reasoningCount: number
  ): number {
    let confidence = 70; // Base

    // Strong performance score → high confidence
    if (performanceScore >= 85) {
      confidence += 20;
    } else if (performanceScore >= 70) {
      confidence += 10;
    } else if (performanceScore < 40) {
      confidence += 15; // High confidence in NOT running
    }

    // More reasoning factors → higher confidence
    if (reasoningCount >= 4) {
      confidence += 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Get all strategy metadata
   */
  getAllStrategyMetadata(): Map<string, StrategyMetadata> {
    return new Map(this.STRATEGY_METADATA);
  }

  /**
   * Get strategy metadata by name
   */
  getStrategyMetadata(strategyName: string): StrategyMetadata | undefined {
    return this.STRATEGY_METADATA.get(strategyName);
  }

  /**
   * Get regime performance for all strategies
   */
  getAllRegimePerformance(): Map<string, RegimePerformance> {
    return new Map(this.regimePerformance);
  }

  /**
   * Reset (for testing)
   */
  reset(): void {
    this.regimePerformance.clear();
    console.log('[Enhanced Strategy Selector] Reset complete');
  }

  /**
   * Export performance data
   */
  exportPerformanceData() {
    return {
      regimePerformance: Array.from(this.regimePerformance.entries()).map(([key, value]) => ({
        key,
        ...value
      })),
      metadata: Array.from(this.STRATEGY_METADATA.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
}

// Singleton instance
export const enhancedStrategySelector = new EnhancedStrategySelector();
