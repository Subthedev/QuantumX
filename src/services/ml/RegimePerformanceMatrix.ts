/**
 * REGIME PERFORMANCE MATRIX
 * Tracks which strategies perform best in which market regimes
 *
 * PURPOSE:
 * - Build historical database of strategy performance by regime
 * - Enable pre-emptive strategy loading before regime transitions
 * - Optimize strategy weights based on regime-specific win rates
 *
 * ARCHITECTURE:
 * - Matrix: [Strategy × Regime] → Performance Metrics
 * - Real-time updates from signal outcomes
 * - Statistical significance testing (min 10 samples per cell)
 * - Confidence intervals for win rates
 *
 * INSPIRED BY:
 * - Two Sigma: Factor performance matrices across regimes
 * - Renaissance: Strategy rotation based on regime
 * - AQR: Regime-conditional alpha estimation
 */

import { supabase } from '@/integrations/supabase/client';
import { StrategyName } from '../strategies/strategyTypes';
import { MarketRegime } from './MarketRegimePredictorML';

export interface RegimePerformanceMetrics {
  strategyName: StrategyName;
  regime: MarketRegime;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number; // 0-100
  avgProfit: number; // Average profit %
  avgLoss: number; // Average loss %
  profitFactor: number; // Total profit / Total loss
  sharpeRatio: number;
  confidence: number; // 0-1 (statistical confidence)
  lastUpdated: number;
}

export interface RegimeStrategyRanking {
  regime: MarketRegime;
  topStrategies: Array<{
    strategyName: StrategyName;
    winRate: number;
    profitFactor: number;
    rank: number;
  }>;
  confidence: number; // Overall confidence in rankings
}

export class RegimePerformanceMatrix {
  // Performance matrix: Strategy × Regime
  private matrix: Map<string, RegimePerformanceMetrics> = new Map();

  // Minimum samples for statistical significance
  private readonly MIN_SAMPLES = 10;

  private readonly ALL_STRATEGIES: StrategyName[] = [
    'WHALE_SHADOW',
    'SPRING_TRAP',
    'MOMENTUM_SURGE',
    'MOMENTUM_SURGE_V2',
    'MOMENTUM_RECOVERY',
    'FUNDING_SQUEEZE',
    'ORDER_FLOW_TSUNAMI',
    'FEAR_GREED_CONTRARIAN',
    'GOLDEN_CROSS_MOMENTUM',
    'MARKET_PHASE_SNIPER',
    'LIQUIDITY_HUNTER',
    'VOLATILITY_BREAKOUT',
    'STATISTICAL_ARBITRAGE',
    'ORDER_BOOK_MICROSTRUCTURE',
    'LIQUIDATION_CASCADE_PREDICTION',
    'CORRELATION_BREAKDOWN_DETECTOR',
    'BOLLINGER_MEAN_REVERSION'
  ];

  private readonly ALL_REGIMES: MarketRegime[] = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE', 'CALM'];

  constructor() {
    this.initializeMatrix();
    this.loadFromStorage();
    console.log('[RegimePerformanceMatrix] Initialized 17×5 matrix (85 cells)');
  }

  /**
   * Get top strategies for a specific regime
   */
  getTopStrategiesForRegime(regime: MarketRegime, limit: number = 5): StrategyName[] {
    const regimeMetrics = this.ALL_STRATEGIES
      .map(strategy => this.getMetrics(strategy, regime))
      .filter(m => m.totalSignals >= this.MIN_SAMPLES); // Only include statistically significant

    // Sort by win rate × profit factor (composite score)
    const ranked = regimeMetrics.sort((a, b) => {
      const scoreA = (a.winRate / 100) * a.profitFactor * a.confidence;
      const scoreB = (b.winRate / 100) * b.profitFactor * b.confidence;
      return scoreB - scoreA;
    });

    return ranked.slice(0, limit).map(m => m.strategyName);
  }

  /**
   * Get strategy rankings for all regimes
   */
  getAllRegimeRankings(): RegimeStrategyRanking[] {
    const rankings: RegimeStrategyRanking[] = [];

    for (const regime of this.ALL_REGIMES) {
      const regimeMetrics = this.ALL_STRATEGIES
        .map(strategy => this.getMetrics(strategy, regime))
        .filter(m => m.totalSignals >= this.MIN_SAMPLES);

      // Sort by composite score
      const sorted = regimeMetrics.sort((a, b) => {
        const scoreA = (a.winRate / 100) * a.profitFactor * a.confidence;
        const scoreB = (b.winRate / 100) * b.profitFactor * b.confidence;
        return scoreB - scoreA;
      });

      const topStrategies = sorted.slice(0, 5).map((m, index) => ({
        strategyName: m.strategyName,
        winRate: m.winRate,
        profitFactor: m.profitFactor,
        rank: index + 1
      }));

      // Overall confidence = average of top strategies' confidence
      const confidence = topStrategies.length > 0
        ? sorted.slice(0, 5).reduce((sum, m) => sum + m.confidence, 0) / Math.min(5, sorted.length)
        : 0;

      rankings.push({
        regime,
        topStrategies,
        confidence: Math.round(confidence * 100) / 100
      });
    }

    return rankings;
  }

  /**
   * Get performance metrics for specific strategy-regime pair
   */
  getMetrics(strategyName: StrategyName, regime: MarketRegime): RegimePerformanceMetrics {
    const key = this.getKey(strategyName, regime);
    return this.matrix.get(key) || this.getDefaultMetrics(strategyName, regime);
  }

  /**
   * Record outcome for a strategy in a specific regime
   */
  async recordOutcome(
    strategyName: StrategyName,
    regime: MarketRegime,
    outcome: 'WIN' | 'LOSS',
    profitLossPercent: number
  ): Promise<void> {
    const key = this.getKey(strategyName, regime);
    const metrics = this.matrix.get(key) || this.getDefaultMetrics(strategyName, regime);

    // Update counts
    metrics.totalSignals++;
    if (outcome === 'WIN') {
      metrics.wins++;
    } else {
      metrics.losses++;
    }

    // Update win rate
    metrics.winRate = (metrics.wins / metrics.totalSignals) * 100;

    // Update profit/loss averages
    if (outcome === 'WIN' && profitLossPercent > 0) {
      const prevTotal = metrics.avgProfit * (metrics.wins - 1);
      metrics.avgProfit = (prevTotal + profitLossPercent) / metrics.wins;
    } else if (outcome === 'LOSS' && profitLossPercent < 0) {
      const prevTotal = metrics.avgLoss * (metrics.losses - 1);
      metrics.avgLoss = (prevTotal + Math.abs(profitLossPercent)) / metrics.losses;
    }

    // Update profit factor
    const totalProfit = metrics.avgProfit * metrics.wins;
    const totalLoss = metrics.avgLoss * metrics.losses;
    metrics.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    // Update Sharpe ratio (simplified)
    metrics.sharpeRatio = this.calculateSharpeRatio(metrics);

    // Update confidence (based on sample size)
    metrics.confidence = this.calculateConfidence(metrics.totalSignals);

    metrics.lastUpdated = Date.now();

    this.matrix.set(key, metrics);

    console.log(
      `[RegimePerformanceMatrix] Updated ${strategyName} in ${regime}: ` +
      `${metrics.wins}W/${metrics.losses}L (${metrics.winRate.toFixed(1)}% WR)`
    );

    this.persist();
  }

  /**
   * Load historical performance from Supabase
   */
  async loadHistoricalPerformance(): Promise<void> {
    try {
      console.log('[RegimePerformanceMatrix] Loading historical performance from Supabase...');

      // Fetch all completed signals
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('strategy_name, status, profit_loss_percent, market_regime, created_at')
        .in('status', ['SUCCESS', 'FAILED'])
        .not('market_regime', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000); // Last 1000 signals

      if (error) {
        console.error('[RegimePerformanceMatrix] Error loading historical data:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('[RegimePerformanceMatrix] No historical data available');
        return;
      }

      // Process signals
      for (const signal of data) {
        const strategyName = signal.strategy_name as StrategyName;
        const regime = signal.market_regime as MarketRegime;
        const outcome = signal.status === 'SUCCESS' ? 'WIN' : 'LOSS';
        const profitLoss = signal.profit_loss_percent || 0;

        // Skip if invalid
        if (!this.ALL_STRATEGIES.includes(strategyName)) continue;
        if (!this.ALL_REGIMES.includes(regime)) continue;

        await this.recordOutcome(strategyName, regime, outcome, profitLoss);
      }

      console.log(`[RegimePerformanceMatrix] ✅ Loaded ${data.length} historical signals`);
      this.logMatrixSummary();

    } catch (error) {
      console.error('[RegimePerformanceMatrix] Error loading historical performance:', error);
    }
  }

  /**
   * Get strategy weight multiplier for regime
   * Returns value between 0.5 (poor) and 2.0 (excellent)
   */
  getStrategyWeightMultiplier(strategyName: StrategyName, regime: MarketRegime): number {
    const metrics = this.getMetrics(strategyName, regime);

    // If insufficient data, return neutral weight
    if (metrics.totalSignals < this.MIN_SAMPLES) {
      return 1.0;
    }

    // Calculate multiplier based on win rate and profit factor
    const winRateScore = metrics.winRate / 100; // 0-1
    const profitFactorScore = Math.min(1, metrics.profitFactor / 2); // 0-1 (capped at 2.0)

    // Composite score
    const compositeScore = (winRateScore * 0.6 + profitFactorScore * 0.4) * metrics.confidence;

    // Map to multiplier range [0.5, 2.0]
    return 0.5 + (compositeScore * 1.5);
  }

  /**
   * Get strategy recommendations for incoming regime
   */
  getRegimeTransitionRecommendations(
    currentRegime: MarketRegime,
    incomingRegime: MarketRegime
  ): {
    strategiesToLoad: StrategyName[];
    strategiesToUnload: StrategyName[];
    reasoning: string[];
  } {
    // Get top strategies for incoming regime
    const incomingTopStrategies = this.getTopStrategiesForRegime(incomingRegime, 7);

    // Get top strategies for current regime
    const currentTopStrategies = this.getTopStrategiesForRegime(currentRegime, 7);

    // Strategies to load = in incoming but not in current
    const strategiesToLoad = incomingTopStrategies.filter(
      s => !currentTopStrategies.includes(s)
    );

    // Strategies to unload = in current but not in incoming
    const strategiesToUnload = currentTopStrategies.filter(
      s => !incomingTopStrategies.includes(s)
    );

    // Generate reasoning
    const reasoning: string[] = [];

    if (strategiesToLoad.length > 0) {
      reasoning.push(`Pre-load ${strategiesToLoad.length} strategies for ${incomingRegime} regime`);
      strategiesToLoad.forEach(s => {
        const metrics = this.getMetrics(s, incomingRegime);
        reasoning.push(
          `  • ${s}: ${metrics.winRate.toFixed(0)}% WR, ${metrics.profitFactor.toFixed(2)}x PF`
        );
      });
    }

    if (strategiesToUnload.length > 0) {
      reasoning.push(`Reduce weight for ${strategiesToUnload.length} strategies`);
    }

    return {
      strategiesToLoad,
      strategiesToUnload,
      reasoning
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Initialize empty matrix
   */
  private initializeMatrix(): void {
    for (const strategy of this.ALL_STRATEGIES) {
      for (const regime of this.ALL_REGIMES) {
        const key = this.getKey(strategy, regime);
        this.matrix.set(key, this.getDefaultMetrics(strategy, regime));
      }
    }
  }

  /**
   * Get matrix key
   */
  private getKey(strategyName: StrategyName, regime: MarketRegime): string {
    return `${strategyName}-${regime}`;
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(strategyName: StrategyName, regime: MarketRegime): RegimePerformanceMetrics {
    return {
      strategyName,
      regime,
      totalSignals: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      confidence: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate Sharpe ratio (simplified)
   */
  private calculateSharpeRatio(metrics: RegimePerformanceMetrics): number {
    if (metrics.totalSignals < 2) return 0;

    const avgReturn = (metrics.avgProfit * metrics.wins - metrics.avgLoss * metrics.losses) / metrics.totalSignals;

    // Simplified std dev
    const winRatio = metrics.wins / metrics.totalSignals;
    const variance = winRatio * Math.pow(metrics.avgProfit, 2) + (1 - winRatio) * Math.pow(metrics.avgLoss, 2);
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    if (sampleSize < this.MIN_SAMPLES) {
      return sampleSize / this.MIN_SAMPLES; // Linear ramp up to MIN_SAMPLES
    }

    // Logarithmic growth after MIN_SAMPLES
    return Math.min(1, 0.5 + 0.5 * Math.log10(sampleSize / this.MIN_SAMPLES + 1));
  }

  /**
   * Log matrix summary
   */
  private logMatrixSummary(): void {
    console.log('[RegimePerformanceMatrix] 📊 Matrix Summary:');

    for (const regime of this.ALL_REGIMES) {
      const totalSignals = this.ALL_STRATEGIES.reduce((sum, strategy) => {
        const metrics = this.getMetrics(strategy, regime);
        return sum + metrics.totalSignals;
      }, 0);

      const strategiesWithData = this.ALL_STRATEGIES.filter(strategy => {
        const metrics = this.getMetrics(strategy, regime);
        return metrics.totalSignals >= this.MIN_SAMPLES;
      }).length;

      console.log(
        `  ${regime}: ${totalSignals} signals, ${strategiesWithData}/17 strategies have sufficient data`
      );
    }
  }

  /**
   * Persist matrix
   */
  private persist(): void {
    try {
      const data = {
        matrix: Array.from(this.matrix.entries()),
        timestamp: Date.now()
      };

      localStorage.setItem('regime-performance-matrix', JSON.stringify(data));
    } catch (error) {
      console.error('[RegimePerformanceMatrix] Error persisting matrix:', error);
    }
  }

  /**
   * Load matrix from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('regime-performance-matrix');
      if (!stored) return;

      const data = JSON.parse(stored);
      this.matrix = new Map(data.matrix);

      const totalSignals = Array.from(this.matrix.values()).reduce(
        (sum, m) => sum + m.totalSignals,
        0
      );

      console.log(`[RegimePerformanceMatrix] Loaded matrix with ${totalSignals} total signals`);

    } catch (error) {
      console.error('[RegimePerformanceMatrix] Error loading matrix:', error);
    }
  }

  /**
   * Export matrix for analysis
   */
  exportMatrix(): Array<RegimePerformanceMetrics> {
    return Array.from(this.matrix.values()).filter(m => m.totalSignals > 0);
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    totalCells: number;
    cellsWithData: number;
    cellsWithSufficientData: number;
    totalSignals: number;
    avgConfidence: number;
  } {
    const allMetrics = Array.from(this.matrix.values());

    const cellsWithData = allMetrics.filter(m => m.totalSignals > 0).length;
    const cellsWithSufficientData = allMetrics.filter(m => m.totalSignals >= this.MIN_SAMPLES).length;
    const totalSignals = allMetrics.reduce((sum, m) => sum + m.totalSignals, 0);
    const avgConfidence = cellsWithData > 0
      ? allMetrics.reduce((sum, m) => sum + m.confidence, 0) / cellsWithData
      : 0;

    return {
      totalCells: this.matrix.size,
      cellsWithData,
      cellsWithSufficientData,
      totalSignals,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }
}

// Singleton export
export const regimePerformanceMatrix = new RegimePerformanceMatrix();
