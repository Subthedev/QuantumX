/**
 * DELTA V2 QUALITY ENGINE - Quant-Level Signal Filtering
 *
 * Implements ML-based signal quality filtering with:
 * - Market regime detection
 * - Strategy performance tracking
 * - Continuous learning from outcomes
 * - Feedback loops for adaptation
 * - Quant-level quality control
 *
 * This engine ensures only high-quality signals reach users
 *
 * Version 2: Enhanced with real outcome tracking integration
 */

import { rejectionLogger } from './RejectionLoggerService';

// ===== TYPES =====

export type MarketRegime = 'BULLISH_TREND' | 'BEARISH_TREND' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
export type StrategyType = 'MEAN_REVERSION' | 'MOMENTUM' | 'BREAKOUT' | 'SUPPORT_RESISTANCE' | 'VOLUME_SPIKE' | 'SMART_MONEY' | 'ARBITRAGE' | 'CORRELATION';

export interface SignalInput {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  grade: string;
  strategy: StrategyType;
  technicals: {
    rsi: number;
    macd: number;
    volume: number;
    volatility: number;
  };
  timestamp: number;
}

export interface FilteredSignal extends SignalInput {
  qualityScore: number; // 0-100
  mlProbability: number; // 0-1 (probability of WIN)
  marketRegime: MarketRegime;
  strategyPerformance: number; // Historical win rate for this strategy in this regime
  passed: boolean;
  rejectionReason?: string;
}

export interface StrategyPerformance {
  strategy: StrategyType;
  regime: MarketRegime;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  avgReturn: number;
  lastUpdated: number;
}

export interface DeltaEngineStats {
  totalProcessed: number;
  totalPassed: number;
  totalRejected: number;
  passRate: number;
  currentRegime: MarketRegime;
  avgQualityScore: number;
  topStrategies: StrategyPerformance[];
  mlAccuracy: number;
  learningProgress: number;
}

// ===== MARKET REGIME DETECTOR =====

class MarketRegimeDetector {
  private history: { regime: MarketRegime; timestamp: number; confidence: number }[] = [];

  detectRegime(data: { price: number; volume: number; volatility: number; rsi: number }): MarketRegime {
    const { rsi, volatility } = data;

    // High volatility regime
    if (volatility > 0.05) {
      return 'HIGH_VOLATILITY';
    }

    // Low volatility regime
    if (volatility < 0.02) {
      return 'LOW_VOLATILITY';
    }

    // Trend detection based on RSI
    if (rsi > 60) {
      return 'BULLISH_TREND';
    } else if (rsi < 40) {
      return 'BEARISH_TREND';
    } else {
      return 'SIDEWAYS';
    }
  }

  getCurrentRegime(): MarketRegime {
    if (this.history.length === 0) {
      return 'SIDEWAYS';
    }
    return this.history[this.history.length - 1].regime;
  }

  recordRegime(regime: MarketRegime, confidence: number) {
    this.history.push({ regime, timestamp: Date.now(), confidence });

    // Keep last 100 regime readings
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }
}

// ===== STRATEGY PERFORMANCE TRACKER =====

class StrategyPerformanceTracker {
  private performance: Map<string, StrategyPerformance> = new Map();
  private readonly STORAGE_KEY = 'delta-strategy-performance-v2';

  constructor() {
    this.loadFromStorage();
    console.log(`[Delta V2 StrategyTracker] Initialized with ${this.performance.size} strategy-regime combinations`);
  }

  private getKey(strategy: StrategyType, regime: MarketRegime): string {
    return `${strategy}-${regime}`;
  }

  recordOutcome(strategy: StrategyType, regime: MarketRegime, win: boolean, returnPct: number) {
    const key = this.getKey(strategy, regime);
    let perf = this.performance.get(key);

    if (!perf) {
      perf = {
        strategy,
        regime,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgReturn: 0,
        lastUpdated: Date.now()
      };
    }

    perf.totalSignals++;
    if (win) {
      perf.wins++;
    } else {
      perf.losses++;
    }

    perf.winRate = (perf.wins / perf.totalSignals) * 100;
    perf.avgReturn = ((perf.avgReturn * (perf.totalSignals - 1)) + returnPct) / perf.totalSignals;
    perf.lastUpdated = Date.now();

    this.performance.set(key, perf);
    this.saveToStorage();
  }

  getPerformance(strategy: StrategyType, regime: MarketRegime): StrategyPerformance | null {
    const key = this.getKey(strategy, regime);
    return this.performance.get(key) || null;
  }

  getWinRate(strategy: StrategyType, regime: MarketRegime): number {
    const perf = this.getPerformance(strategy, regime);
    return perf ? perf.winRate : 50; // Default 50% if no history
  }

  getTopStrategies(regime: MarketRegime, limit: number = 3): StrategyPerformance[] {
    const strategiesForRegime = Array.from(this.performance.values())
      .filter(p => p.regime === regime && p.totalSignals >= 5) // Min 5 signals
      .sort((a, b) => b.winRate - a.winRate);

    return strategiesForRegime.slice(0, limit);
  }

  getAllPerformance(): StrategyPerformance[] {
    return Array.from(this.performance.values());
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.performance = new Map(Object.entries(data));
        console.log(`[Delta V2 StrategyTracker] Loaded ${this.performance.size} strategies from localStorage`);

        // Log sample data for verification
        if (this.performance.size > 0) {
          const firstEntry = Array.from(this.performance.values())[0];
          console.log(`[Delta V2 StrategyTracker] Sample: ${firstEntry.strategy} in ${firstEntry.regime} - ${firstEntry.wins}W/${firstEntry.losses}L (${firstEntry.winRate.toFixed(1)}%)`);
        }
      } else {
        console.log('[Delta V2 StrategyTracker] No saved data found - starting fresh');
      }
    } catch (error) {
      console.error('[Delta V2 StrategyTracker] Error loading strategy performance:', error);
      this.performance = new Map(); // Reset to empty on error
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.performance);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`[Delta V2 StrategyTracker] Saved ${this.performance.size} strategies to localStorage`);
    } catch (error) {
      console.error('[Delta V2 StrategyTracker] Error saving strategy performance:', error);
    }
  }
}

// ===== ML-BASED SIGNAL SCORER =====

class MLSignalScorer {
  private outcomes: Array<{ features: number[]; outcome: boolean }> = [];
  private weights: number[] = [];
  private readonly STORAGE_KEY = 'delta-ml-model-v2';
  private accuracy: number = 0.5;

  constructor() {
    this.loadModel();
    console.log(`[Delta V2 ML] Initialized with ${this.outcomes.length} training samples, accuracy: ${(this.accuracy * 100).toFixed(1)}%`);
  }

  // Calculate signal quality score (0-100)
  calculateQualityScore(signal: SignalInput, regime: MarketRegime, strategyWinRate: number): number {
    let score = 0;

    // Base confidence (0-40 points)
    score += (signal.confidence / 100) * 40;

    // Strategy historical performance (0-30 points)
    score += (strategyWinRate / 100) * 30;

    // Technical indicators (0-20 points)
    const { rsi, volatility, volume } = signal.technicals;

    // RSI in good range (30-70)
    if (rsi >= 30 && rsi <= 70) {
      score += 7;
    }

    // Volume confirmation
    if (volume > 1.2) { // 20% above average
      score += 7;
    }

    // Volatility not too high
    if (volatility < 0.04) {
      score += 6;
    }

    // Regime alignment (0-10 points)
    if (this.isStrategyAlignedWithRegime(signal.strategy, regime)) {
      score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  // ML-based probability prediction
  predictWinProbability(signal: SignalInput, regime: MarketRegime, qualityScore: number): number {
    // Extract features
    const features = this.extractFeatures(signal, regime, qualityScore);

    // If no training data yet, use quality score as proxy
    if (this.weights.length === 0) {
      return qualityScore / 100;
    }

    // Simple linear model: P(win) = sigmoid(weights · features)
    let logit = 0;
    for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
      logit += features[i] * this.weights[i];
    }

    // Sigmoid function
    return 1 / (1 + Math.exp(-logit));
  }

  private extractFeatures(signal: SignalInput, regime: MarketRegime, qualityScore: number): number[] {
    return [
      signal.confidence / 100, // 0-1
      qualityScore / 100, // 0-1
      signal.technicals.rsi / 100, // 0-1
      signal.technicals.volatility, // 0-0.1
      Math.min(signal.technicals.volume / 2, 1), // 0-1
      signal.direction === 'LONG' ? 1 : 0, // binary
      this.regimeToNumber(regime), // 0-1
      this.strategyToNumber(signal.strategy) // 0-1
    ];
  }

  private regimeToNumber(regime: MarketRegime): number {
    const regimes: MarketRegime[] = ['BULLISH_TREND', 'BEARISH_TREND', 'SIDEWAYS', 'HIGH_VOLATILITY', 'LOW_VOLATILITY'];
    return regimes.indexOf(regime) / (regimes.length - 1);
  }

  private strategyToNumber(strategy: StrategyType): number {
    const strategies: StrategyType[] = ['MEAN_REVERSION', 'MOMENTUM', 'BREAKOUT', 'SUPPORT_RESISTANCE', 'VOLUME_SPIKE', 'SMART_MONEY', 'ARBITRAGE', 'CORRELATION'];
    return strategies.indexOf(strategy) / (strategies.length - 1);
  }

  private isStrategyAlignedWithRegime(strategy: StrategyType, regime: MarketRegime): boolean {
    // Quant-level strategy-regime alignment
    const alignments: Record<StrategyType, MarketRegime[]> = {
      'MOMENTUM': ['BULLISH_TREND', 'BEARISH_TREND'],
      'MEAN_REVERSION': ['SIDEWAYS', 'LOW_VOLATILITY'],
      'BREAKOUT': ['LOW_VOLATILITY', 'SIDEWAYS'],
      'SUPPORT_RESISTANCE': ['SIDEWAYS', 'LOW_VOLATILITY'],
      'VOLUME_SPIKE': ['HIGH_VOLATILITY', 'BULLISH_TREND'],
      'SMART_MONEY': ['BULLISH_TREND', 'BEARISH_TREND'],
      'ARBITRAGE': ['LOW_VOLATILITY', 'SIDEWAYS'],
      'CORRELATION': ['HIGH_VOLATILITY', 'BULLISH_TREND']
    };

    return alignments[strategy]?.includes(regime) || false;
  }

  // Continuous learning from outcomes
  learn(signal: SignalInput, regime: MarketRegime, qualityScore: number, outcome: boolean) {
    const features = this.extractFeatures(signal, regime, qualityScore);
    this.outcomes.push({ features, outcome });

    // Keep last 500 outcomes
    if (this.outcomes.length > 500) {
      this.outcomes = this.outcomes.slice(-500);
    }

    // Retrain model if we have enough data
    if (this.outcomes.length >= 20 && this.outcomes.length % 10 === 0) {
      this.trainModel();
    }
  }

  private trainModel() {
    // Simple gradient descent for logistic regression
    const learningRate = 0.01;
    const iterations = 100;
    const featureCount = this.outcomes[0].features.length;

    // Initialize weights if needed
    if (this.weights.length === 0) {
      this.weights = new Array(featureCount).fill(0);
    }

    // Training loop
    for (let iter = 0; iter < iterations; iter++) {
      for (const sample of this.outcomes) {
        const { features, outcome } = sample;

        // Forward pass
        let logit = 0;
        for (let i = 0; i < featureCount; i++) {
          logit += features[i] * this.weights[i];
        }
        const prediction = 1 / (1 + Math.exp(-logit));

        // Backward pass (gradient descent)
        const error = prediction - (outcome ? 1 : 0);
        for (let i = 0; i < featureCount; i++) {
          this.weights[i] -= learningRate * error * features[i];
        }
      }
    }

    // Calculate accuracy
    this.calculateAccuracy();

    // Save model
    this.saveModel();

    console.log('[Delta V2 ML] Model retrained. Accuracy:', (this.accuracy * 100).toFixed(1) + '%');
  }

  private calculateAccuracy() {
    if (this.outcomes.length === 0) {
      this.accuracy = 0.5;
      return;
    }

    let correct = 0;
    for (const sample of this.outcomes) {
      let logit = 0;
      for (let i = 0; i < sample.features.length; i++) {
        logit += sample.features[i] * this.weights[i];
      }
      const prediction = 1 / (1 + Math.exp(-logit));
      const predictedOutcome = prediction > 0.5;
      if (predictedOutcome === sample.outcome) {
        correct++;
      }
    }

    this.accuracy = correct / this.outcomes.length;
  }

  getAccuracy(): number {
    return this.accuracy;
  }

  getLearningProgress(): number {
    // Progress from 0-100 based on training data size
    return Math.min((this.outcomes.length / 500) * 100, 100);
  }

  private loadModel() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.weights = data.weights || [];
        this.outcomes = data.outcomes || [];
        this.accuracy = data.accuracy || 0.5;

        console.log(`[Delta V2 ML] Loaded model from localStorage:`);
        console.log(`  - Weights: ${this.weights.length} features`);
        console.log(`  - Outcomes: ${this.outcomes.length} samples`);
        console.log(`  - Accuracy: ${(this.accuracy * 100).toFixed(1)}%`);
      } else {
        console.log('[Delta V2 ML] No saved model found - starting fresh');
      }
    } catch (error) {
      console.error('[Delta V2 ML] Error loading model:', error);
      // Reset to defaults on error
      this.weights = [];
      this.outcomes = [];
      this.accuracy = 0.5;
    }
  }

  private saveModel() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        weights: this.weights,
        outcomes: this.outcomes.slice(-500), // Keep last 500
        accuracy: this.accuracy
      }));
      console.log(`[Delta V2 ML] Saved model: ${this.weights.length} weights, ${this.outcomes.length} samples, ${(this.accuracy * 100).toFixed(1)}% accuracy`);
    } catch (error) {
      console.error('[Delta V2 ML] Error saving model:', error);
    }
  }
}

// ===== DELTA QUALITY ENGINE =====

class DeltaQualityEngine {
  private regimeDetector: MarketRegimeDetector;
  private performanceTracker: StrategyPerformanceTracker;
  private mlScorer: MLSignalScorer;

  private stats: DeltaEngineStats = {
    totalProcessed: 0,
    totalPassed: 0,
    totalRejected: 0,
    passRate: 0,
    currentRegime: 'SIDEWAYS',
    avgQualityScore: 0,
    topStrategies: [],
    mlAccuracy: 0.5,
    learningProgress: 0
  };

  private readonly QUALITY_THRESHOLD = 60; // Minimum quality score to pass
  private readonly ML_THRESHOLD = 0.55; // Minimum ML probability to pass

  constructor() {
    console.log('[Delta V2 Engine] Initializing...');
    this.regimeDetector = new MarketRegimeDetector();
    this.performanceTracker = new StrategyPerformanceTracker();
    this.mlScorer = new MLSignalScorer();

    console.log('[Delta V2 Engine] ✅ Initialized with quant-level quality control');
    console.log(`[Delta V2 Engine] Thresholds: Quality ≥${this.QUALITY_THRESHOLD}, ML ≥${(this.ML_THRESHOLD * 100).toFixed(0)}%`);
  }

  // Main filtering function
  filterSignal(signal: SignalInput): FilteredSignal {
    this.stats.totalProcessed++;

    // Detect current market regime
    const regime = this.regimeDetector.detectRegime({
      price: 50000, // Would be real price
      volume: signal.technicals.volume,
      volatility: signal.technicals.volatility,
      rsi: signal.technicals.rsi
    });
    this.regimeDetector.recordRegime(regime, 0.8);
    this.stats.currentRegime = regime;

    // Get strategy historical performance
    const strategyWinRate = this.performanceTracker.getWinRate(signal.strategy, regime);

    // Calculate quality score
    const qualityScore = this.mlScorer.calculateQualityScore(signal, regime, strategyWinRate);

    // Get ML prediction
    const mlProbability = this.mlScorer.predictWinProbability(signal, regime, qualityScore);

    // Update stats
    this.stats.avgQualityScore = (
      (this.stats.avgQualityScore * (this.stats.totalProcessed - 1) + qualityScore) /
      this.stats.totalProcessed
    );
    this.stats.mlAccuracy = this.mlScorer.getAccuracy();
    this.stats.learningProgress = this.mlScorer.getLearningProgress();

    // ✅ PHASE 1: Regime-Aware Quality Threshold
    // SIDEWAYS/LOW_VOLATILITY markets → Accept quality ≥ 50 (MEDIUM signals appropriate)
    // TRENDING/HIGH_VOLATILITY markets → Require quality ≥ 60 (HIGH signals only)
    let qualityThreshold = this.QUALITY_THRESHOLD; // Default: 60

    if (regime === 'SIDEWAYS' || regime === 'LOW_VOLATILITY') {
      qualityThreshold = 50; // Lower threshold for consolidation markets
      console.log(`[Delta V2] 🎯 Regime-Aware Threshold: ${regime} → Quality ≥ ${qualityThreshold} (accepting MEDIUM)`);
    } else if (regime === 'BULLISH_TREND' || regime === 'BEARISH_TREND' || regime === 'HIGH_VOLATILITY') {
      qualityThreshold = 60; // Strict threshold for trending/volatile markets
      console.log(`[Delta V2] 🎯 Regime-Aware Threshold: ${regime} → Quality ≥ ${qualityThreshold} (HIGH only)`);
    }

    // Decision logic
    let passed = false;
    let rejectionReason: string | undefined;

    if (qualityScore < qualityThreshold) {
      rejectionReason = `Quality score too low: ${qualityScore.toFixed(1)} < ${qualityThreshold} (${regime} market)`;
    } else if (mlProbability < this.ML_THRESHOLD) {
      rejectionReason = `ML probability too low: ${(mlProbability * 100).toFixed(1)}% < ${(this.ML_THRESHOLD * 100).toFixed(1)}%`;
    } else if (strategyWinRate < 45) {
      rejectionReason = `Strategy underperforming in ${regime}: ${strategyWinRate.toFixed(1)}% win rate`;
    } else {
      passed = true;
      this.stats.totalPassed++;
    }

    if (!passed) {
      this.stats.totalRejected++;
    }

    this.stats.passRate = (this.stats.totalPassed / this.stats.totalProcessed) * 100;
    this.stats.topStrategies = this.performanceTracker.getTopStrategies(regime, 3);

    const filteredSignal: FilteredSignal = {
      ...signal,
      qualityScore,
      mlProbability,
      marketRegime: regime,
      strategyPerformance: strategyWinRate,
      passed,
      rejectionReason
    };

    console.log(
      `[Delta V2] Signal ${signal.id}: ${passed ? 'PASSED' : 'REJECTED'} | ` +
      `Quality: ${qualityScore.toFixed(1)} | ML: ${(mlProbability * 100).toFixed(1)}% | ` +
      `Regime: ${regime} | Strategy: ${signal.strategy} (${strategyWinRate.toFixed(1)}% WR)`
    );
    
    // ✅ LOG REJECTION
    if (!passed && rejectionReason) {
      rejectionLogger.logRejection({
        symbol: signal.symbol,
        direction: signal.direction as 'LONG' | 'SHORT' | 'NEUTRAL',
        rejectionStage: 'DELTA',
        rejectionReason,
        qualityScore,
        confidenceScore: signal.confidence,
        dataQuality: signal.dataQuality
      });
    }

    return filteredSignal;
  }

  // Feedback loop - learn from outcomes
  recordOutcome(signalId: string, signal: SignalInput, outcome: 'WIN' | 'LOSS', returnPct: number) {
    const win = outcome === 'WIN';

    // Update strategy performance
    const regime = this.stats.currentRegime; // Would track per signal
    this.performanceTracker.recordOutcome(signal.strategy, regime, win, returnPct);

    // Feed back to ML model
    const strategyWinRate = this.performanceTracker.getWinRate(signal.strategy, regime);
    const qualityScore = this.mlScorer.calculateQualityScore(signal, regime, strategyWinRate);
    this.mlScorer.learn(signal, regime, qualityScore, win);

    console.log(`[Delta V2 Feedback] Signal ${signalId} → ${outcome} (${returnPct.toFixed(1)}%)`);
  }

  getStats(): DeltaEngineStats {
    return { ...this.stats };
  }

  getStrategyPerformance(): StrategyPerformance[] {
    return this.performanceTracker.getAllPerformance();
  }
}

// ===== SINGLETON EXPORT =====

export const deltaV2QualityEngine = new DeltaQualityEngine();
export default deltaV2QualityEngine;
