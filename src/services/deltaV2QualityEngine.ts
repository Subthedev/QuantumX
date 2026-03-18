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

import { advancedRejectionFilter } from './AdvancedRejectionFilter';
import { zetaLearningEngine } from './zetaLearningEngine';
import { marketStateDetectionEngine, MarketState } from './marketStateDetectionEngine';
import { liquidationCascadeService } from './liquidationCascadeService';
import { multiExchangeFundingService } from './multiExchangeFundingService';
import { stablecoinFlowService } from './stablecoinFlowService';
import { cryptoSentimentService } from './cryptoSentimentService';

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
    // Original 8 features
    const features = [
      signal.confidence / 100, // 0-1
      qualityScore / 100, // 0-1
      signal.technicals.rsi / 100, // 0-1
      signal.technicals.volatility, // 0-0.1
      Math.min(signal.technicals.volume / 2, 1), // 0-1
      signal.direction === 'LONG' ? 1 : 0, // binary
      this.regimeToNumber(regime), // 0-1
      this.strategyToNumber(signal.strategy) // 0-1
    ];

    // 3 NEW alpha features from free data sources
    try {
      const liqFeature = liquidationCascadeService.getMLFeature();
      features.push(liqFeature.intensity);   // 0-1: cascade intensity
      features.push((liqFeature.direction + 1) / 2); // 0-1: liquidation direction (normalized from -1/+1)
    } catch { features.push(0, 0.5); }

    try {
      const symbol = signal.symbol?.replace('/', '').replace('-', '') || 'BTCUSDT';
      const fundingFeature = multiExchangeFundingService.getMLFeature(symbol);
      features.push((fundingFeature + 1) / 2); // 0-1: funding sentiment (normalized from -1/+1)
    } catch { features.push(0.5); }

    // Feature 12: Composite sentiment from 6 sources
    try {
      const sentimentFeature = cryptoSentimentService.getMLFeature();
      features.push((sentimentFeature + 1) / 2); // 0-1: sentiment (normalized from -1/+1)
    } catch { features.push(0.5); }

    return features;
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

    // Retrain model on every outcome after minimum threshold
    // Frequent training = faster self-improvement compounding
    if (this.outcomes.length >= 10) {
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

  // ✅ TESTING THRESHOLDS - Very low to allow signal flow for testing
  // Note: Made mutable (not readonly) to allow diagnostic panel adjustments
  private QUALITY_THRESHOLD = 20; // Very low for testing (Gamma handles tier filtering)
  private ML_THRESHOLD = 0.25; // TESTING - 25% win probability (very permissive for testing)
  private STRATEGY_WINRATE_THRESHOLD = 0; // TESTING - Disabled (no veto during testing)

  constructor() {
    console.log('[Delta V2 Engine] Initializing...');
    this.regimeDetector = new MarketRegimeDetector();
    this.performanceTracker = new StrategyPerformanceTracker();
    this.mlScorer = new MLSignalScorer();

    // ✅ Load thresholds from localStorage (persist across refreshes)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('igx_delta_thresholds');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.QUALITY_THRESHOLD = parsed.quality || 20;
          this.ML_THRESHOLD = parsed.ml || 0.25;
          this.STRATEGY_WINRATE_THRESHOLD = parsed.strategyWinRate !== undefined ? parsed.strategyWinRate : 0;
          console.log('[Delta V2 Engine] 📂 Loaded saved thresholds from localStorage');
        }
      } catch (error) {
        console.warn('[Delta V2 Engine] Could not load saved thresholds:', error);
      }
    }

    console.log('[Delta V2 Engine] ✅ Initialized with quant-level quality control');
    console.log(`[Delta V2 Engine] Thresholds: Quality ≥${this.QUALITY_THRESHOLD}, ML ≥${(this.ML_THRESHOLD * 100).toFixed(0)}%, Strategy Win Rate ≥${this.STRATEGY_WINRATE_THRESHOLD}%`);

    // Load historical outcomes from Supabase for ML training bootstrap
    this.loadHistoricalOutcomes();
  }

  /**
   * Bootstrap ML from historical outcomes stored in localStorage
   * Prevents losing ML progress on page refresh
   */
  private loadHistoricalOutcomes(): void {
    try {
      const OUTCOMES_KEY = 'signal_outcomes_v1';
      const stored = localStorage.getItem(OUTCOMES_KEY);
      if (!stored) {
        console.log('[Delta V2] No historical outcomes in localStorage yet');
        return;
      }

      const data = JSON.parse(stored);
      if (!Array.isArray(data) || data.length === 0) return;

      let loaded = 0;
      for (const row of data) {
        const win = row.outcome === 'WIN';
        const strategy = (row.strategy || 'MOMENTUM') as StrategyType;
        const regime = (row.market_regime || 'SIDEWAYS') as MarketRegime;

        // Feed into strategy performance tracker
        this.performanceTracker.recordOutcome(strategy, regime, win, row.return_pct || 0);

        // Feed into ML scorer
        const mockSignal: SignalInput = {
          id: row.signal_id,
          symbol: row.symbol,
          direction: (row.direction || 'LONG') as 'LONG' | 'SHORT',
          confidence: row.quality_score || 50,
          grade: 'B',
          strategy,
          technicals: { rsi: 50, macd: 0, volume: 1, volatility: 0.03 },
          timestamp: new Date(row.created_at).getTime()
        };
        this.mlScorer.learn(mockSignal, regime, row.quality_score || 50, win);
        loaded++;
      }

      console.log(`[Delta V2] Loaded ${loaded} historical outcomes from localStorage`);
    } catch (err) {
      console.log('[Delta V2] Could not load historical outcomes:', err);
    }
  }

  /**
   * Auto-adjust thresholds based on Zeta's outcome count (graduated ramp-up)
   * Only ramps UP, never down - prevents regression on page refresh with stale data
   */
  private autoAdjustThresholds(): void {
    const totalOutcomes = zetaLearningEngine.getTotalOutcomes();

    let targetQuality: number;
    let targetML: number;
    let targetWinRate: number;

    if (totalOutcomes <= 20) {
      // Learning phase - permissive
      targetQuality = 20;
      targetML = 0.25;
      targetWinRate = 0;
    } else if (totalOutcomes <= 50) {
      // Calibrating
      targetQuality = 35;
      targetML = 0.35;
      targetWinRate = 20;
    } else if (totalOutcomes <= 100) {
      // Tightening
      targetQuality = 45;
      targetML = 0.45;
      targetWinRate = 30;
    } else if (totalOutcomes <= 200) {
      // Production
      targetQuality = 55;
      targetML = 0.55;
      targetWinRate = 40;
    } else {
      // Optimized
      targetQuality = 60;
      targetML = 0.60;
      targetWinRate = 45;
    }

    // Only ramp up, never down
    if (targetQuality > this.QUALITY_THRESHOLD || targetML > this.ML_THRESHOLD || targetWinRate > this.STRATEGY_WINRATE_THRESHOLD) {
      const newQuality = Math.max(this.QUALITY_THRESHOLD, targetQuality);
      const newML = Math.max(this.ML_THRESHOLD, targetML);
      const newWinRate = Math.max(this.STRATEGY_WINRATE_THRESHOLD, targetWinRate);

      if (newQuality !== this.QUALITY_THRESHOLD || newML !== this.ML_THRESHOLD || newWinRate !== this.STRATEGY_WINRATE_THRESHOLD) {
        console.log(`[Delta V2] Graduated ramp-up (${totalOutcomes} outcomes): Quality ${this.QUALITY_THRESHOLD}→${newQuality}, ML ${(this.ML_THRESHOLD*100).toFixed(0)}→${(newML*100).toFixed(0)}%, WR ${this.STRATEGY_WINRATE_THRESHOLD}→${newWinRate}%`);
        this.setThresholds(newQuality, newML, newWinRate);
      }
    }
  }

  // Main filtering function
  filterSignal(signal: SignalInput): FilteredSignal {
    this.stats.totalProcessed++;

    // Auto-adjust thresholds based on learning progress
    this.autoAdjustThresholds();

    // Detect current market regime
    const regime = this.regimeDetector.detectRegime({
      price: 50000, // Would be real price
      volume: signal.technicals.volume,
      volatility: signal.technicals.volatility,
      rsi: signal.technicals.rsi
    });
    this.regimeDetector.recordRegime(regime, 0.8);
    this.stats.currentRegime = regime;

    // CROSS-VALIDATE: Check per-signal regime against global market state
    // If global says BEARISH and Delta says BULLISH → reduce confidence
    // If both agree → boost confidence
    let regimeCrossValidationAdj = 0;
    try {
      const globalState = marketStateDetectionEngine.getLastDetectedState();
      if (globalState) {
        const globalBullish = globalState.state === MarketState.BULLISH_HIGH_VOL || globalState.state === MarketState.BULLISH_LOW_VOL;
        const globalBearish = globalState.state === MarketState.BEARISH_HIGH_VOL || globalState.state === MarketState.BEARISH_LOW_VOL;
        const localBullish = regime === 'BULLISH_TREND';
        const localBearish = regime === 'BEARISH_TREND';

        if ((globalBullish && localBearish) || (globalBearish && localBullish)) {
          regimeCrossValidationAdj = -15; // Conflicting signals → reduce confidence
        } else if ((globalBullish && localBullish) || (globalBearish && localBearish)) {
          regimeCrossValidationAdj = 5; // Agreement → slight boost
        }
      }
    } catch {}

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

    // Regime-specific threshold adjustments
    let qualityThreshold = this.QUALITY_THRESHOLD;
    if (regime === 'HIGH_VOLATILITY') {
      qualityThreshold = this.QUALITY_THRESHOLD + 10;
    } else if (regime === 'SIDEWAYS') {
      qualityThreshold = this.QUALITY_THRESHOLD + 5;
    } else if (regime === 'LOW_VOLATILITY') {
      qualityThreshold = Math.max(this.QUALITY_THRESHOLD - 5, 15);
    }
    // BULLISH_TREND / BEARISH_TREND use base threshold

    console.log(`[Delta V2] Regime: ${regime} → Quality threshold: ${qualityThreshold} (base: ${this.QUALITY_THRESHOLD})`);

    // SELF-IMPROVEMENT CHECK: Apply Zeta's calibrated confidence + strategy blacklist
    let calibratedConfidence = signal.confidence;
    try {
      calibratedConfidence = zetaLearningEngine.getCalibratedConfidence(signal.confidence);
      // Check strategy blacklist
      if (zetaLearningEngine.isStrategyBlacklisted(signal.strategy, regime)) {
        this.stats.totalRejected++;
        this.stats.passRate = this.stats.totalPassed / this.stats.totalProcessed;
        console.log(`[Delta V2] BLACKLISTED: ${signal.strategy} in ${regime} regime — auto-rejected by self-improvement`);
        return {
          ...signal,
          passed: false,
          qualityScore,
          mlProbability,
          marketRegime: regime,
          strategyPerformance: strategyWinRate,
          rejectionReason: `Strategy ${signal.strategy} blacklisted in ${regime} regime`
        };
      }
    } catch {}

    // Apply regime cross-validation adjustment to calibrated confidence
    if (regimeCrossValidationAdj !== 0) {
      calibratedConfidence = Math.max(0, Math.min(100, calibratedConfidence + regimeCrossValidationAdj));
      if (regimeCrossValidationAdj < 0) {
        console.log(`[Delta V2] ⚠️ Regime conflict: Global vs local disagree → confidence ${regimeCrossValidationAdj}%`);
      } else {
        console.log(`[Delta V2] ✅ Regime agreement: Global + local aligned → confidence +${regimeCrossValidationAdj}%`);
      }
    }

    // ✅ ML-ONLY FILTERING with self-improvement integration
    let passed = false;
    let rejectionReason: string | undefined;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[Delta V2] 📊 EVALUATING: ${signal.symbol} ${signal.direction} (calibrated confidence: ${calibratedConfidence.toFixed(0)}%)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 ML Win Probability: ${(mlProbability * 100).toFixed(1)}% (threshold: ${(this.ML_THRESHOLD * 100).toFixed(1)}%)`);
    console.log(`🎯 Strategy Win Rate: ${strategyWinRate.toFixed(1)}% (veto threshold: ${this.STRATEGY_WINRATE_THRESHOLD}%)`);
    console.log(`🌍 Market Regime: ${regime}`);
    console.log(`📊 Quality Score: ${qualityScore.toFixed(1)} (for reference only, not used in filtering)`);

    // Primary filter: ML probability
    if (mlProbability < this.ML_THRESHOLD) {
      rejectionReason = `ML win probability too low: ${(mlProbability * 100).toFixed(1)}% < ${(this.ML_THRESHOLD * 100).toFixed(1)}%`;
      passed = false;
      console.log(`❌ REJECT: ${rejectionReason}`);
    }
    // Veto filter: Strategy performance (only reject if extremely poor)
    else if (strategyWinRate < this.STRATEGY_WINRATE_THRESHOLD && this.STRATEGY_WINRATE_THRESHOLD > 0) {
      rejectionReason = `Strategy underperforming: ${strategyWinRate.toFixed(1)}% win rate < ${this.STRATEGY_WINRATE_THRESHOLD}% threshold`;
      passed = false;
      console.log(`❌ REJECT (VETO): ${rejectionReason}`);
    }
    else {
      passed = true;
      console.log(`✅ PASS: ML predicts ${(mlProbability * 100).toFixed(1)}% win probability`);
      if (strategyWinRate > 0) {
        console.log(`   Strategy historical win rate: ${strategyWinRate.toFixed(1)}% in ${regime} market`);
      }
    }

    if (passed) {
      this.stats.totalPassed++;
    } else {
      this.stats.totalRejected++;
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
    
    // ✅ LOG REJECTION WITH ADVANCED ML FILTER
    if (!passed && rejectionReason) {
      advancedRejectionFilter.filterAndLog({
        symbol: signal.symbol,
        direction: signal.direction,
        rejectionStage: 'DELTA',
        rejectionReason,
        qualityScore,
        confidenceScore: signal.confidence,
        dataQuality: qualityScore,
        marketRegime: regime,
        volatility: signal.technicals.volatility
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

  getMetrics(): DeltaEngineStats {
    return this.getStats();
  }

  getStrategyPerformance(): StrategyPerformance[] {
    return this.performanceTracker.getAllPerformance();
  }

  // ✅ Threshold management for diagnostic panel
  getThresholds() {
    return {
      quality: this.QUALITY_THRESHOLD,
      ml: this.ML_THRESHOLD,
      strategyWinRate: this.STRATEGY_WINRATE_THRESHOLD
    };
  }

  setThresholds(quality: number, ml: number, strategyWinRate?: number) {
    this.QUALITY_THRESHOLD = quality;
    this.ML_THRESHOLD = ml;
    if (strategyWinRate !== undefined) {
      this.STRATEGY_WINRATE_THRESHOLD = strategyWinRate;
    }

    // ✅ Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('igx_delta_thresholds', JSON.stringify({
          quality,
          ml,
          strategyWinRate: this.STRATEGY_WINRATE_THRESHOLD
        }));
        console.log(`[Delta V2] 💾 Thresholds saved to localStorage`);
      } catch (error) {
        console.warn('[Delta V2] Could not save thresholds:', error);
      }
    }

    console.log(`[Delta V2] 🎚️ Thresholds updated: Quality ≥${quality}, ML ≥${(ml * 100).toFixed(0)}%, Strategy Win Rate ≥${this.STRATEGY_WINRATE_THRESHOLD}%`);
    console.log(`[Delta V2] 🚪 Gate opened! Signals with Quality ≥${quality} AND ML ≥${(ml * 100).toFixed(0)}% AND Strategy Win Rate ≥${this.STRATEGY_WINRATE_THRESHOLD}% will now pass.`);
  }
}

// ===== SINGLETON EXPORT =====

export const deltaV2QualityEngine = new DeltaQualityEngine();
export default deltaV2QualityEngine;
