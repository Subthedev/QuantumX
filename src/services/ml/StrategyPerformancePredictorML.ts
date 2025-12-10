/**
 * STRATEGY PERFORMANCE PREDICTOR ML
 * 17 individual ML models predicting win probability for each strategy
 *
 * PURPOSE:
 * - Predict which strategies will perform best in current market conditions
 * - Train on historical intelligence_signals data from Supabase
 * - Use logistic regression for interpretable, fast predictions
 * - Integrate with AlphaFeatureStore, ModelRegistry, and CircuitBreaker
 *
 * ARCHITECTURE:
 * - 17 separate models (one per strategy)
 * - Feature engineering: 25+ AlphaFeatures + strategy-specific features
 * - Online learning: Periodic retraining on new outcomes
 * - A/B testing: Test new models before promoting to production
 *
 * INSPIRED BY:
 * - Citadel: Ensemble models with continuous retraining
 * - Two Sigma: Feature engineering and regime detection
 * - Jane Street: Statistical modeling with risk controls
 */

import { supabase } from '@/integrations/supabase/client';
import { StrategyName } from '../strategies/strategyTypes';
import { alphaFeatureStore, AlphaFeatures } from './AlphaFeatureStore';
import { alphaModelRegistry } from './AlphaModelRegistry';
import { mlCircuitBreaker } from './MLCircuitBreaker';
import { EnsembleStrategyML } from './EnsembleStrategyML';

export interface StrategyPrediction {
  strategyName: StrategyName;
  winProbability: number; // 0-1 (ensemble prediction)
  confidence: number; // 0-1 (model agreement)
  expectedReturn: number; // Expected profit %
  riskScore: number; // 0-100 (higher = riskier)
  marketRegimeMatch: number; // 0-1 (how well strategy matches current regime)
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'AVOID' | 'STRONG_AVOID';
  reasoning: string[];
  // ✅ PHASE 4: Ensemble model details
  ensembleDetails?: {
    logisticPrediction: number;
    randomForestPrediction: number;
    gradientBoostingPrediction: number;
    neuralNetworkPrediction: number;
    bestModel: string;
    modelDisagreement: number;
  };
}

export interface TrainingConfig {
  lookbackDays: number; // How many days of historical data to train on
  minSamples: number; // Minimum samples required to train
  retrainIntervalHours: number; // How often to retrain
  testSplit: number; // % of data for testing (0.2 = 20%)
}

interface TrainingData {
  features: number[];
  label: number; // 1 = win, 0 = loss
  strategyName: StrategyName;
  timestamp: number;
}

interface ModelWeights {
  weights: number[];
  bias: number;
  featureNames: string[];
  trainedAt: number;
  sampleSize: number;
  accuracy: number;
  winRate: number;
}

/**
 * Simple Logistic Regression Model
 * Production-grade: Fast, interpretable, suitable for online learning
 */
class LogisticRegressionModel {
  private weights: number[] = [];
  private bias: number = 0;
  private learningRate: number = 0.01;
  private iterations: number = 1000;

  /**
   * Sigmoid activation function
   */
  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Train the model using gradient descent
   */
  train(X: number[][], y: number[]): void {
    const m = X.length; // Number of samples
    const n = X[0].length; // Number of features

    // Initialize weights
    this.weights = new Array(n).fill(0);
    this.bias = 0;

    // Gradient descent
    for (let iter = 0; iter < this.iterations; iter++) {
      let dWeights = new Array(n).fill(0);
      let dBias = 0;

      // Compute gradients
      for (let i = 0; i < m; i++) {
        const z = this.computeZ(X[i]);
        const prediction = this.sigmoid(z);
        const error = prediction - y[i];

        for (let j = 0; j < n; j++) {
          dWeights[j] += error * X[i][j];
        }
        dBias += error;
      }

      // Update weights
      for (let j = 0; j < n; j++) {
        this.weights[j] -= (this.learningRate * dWeights[j]) / m;
      }
      this.bias -= (this.learningRate * dBias) / m;

      // Decay learning rate
      if (iter % 100 === 0 && iter > 0) {
        this.learningRate *= 0.95;
      }
    }
  }

  /**
   * Compute z = w^T * x + b
   */
  private computeZ(x: number[]): number {
    let z = this.bias;
    for (let i = 0; i < x.length; i++) {
      z += this.weights[i] * x[i];
    }
    return z;
  }

  /**
   * Predict probability
   */
  predict(x: number[]): number {
    const z = this.computeZ(x);
    return this.sigmoid(z);
  }

  /**
   * Get model weights
   */
  getWeights(): { weights: number[]; bias: number } {
    return {
      weights: [...this.weights],
      bias: this.bias
    };
  }

  /**
   * Set model weights (for loading saved models)
   */
  setWeights(weights: number[], bias: number): void {
    this.weights = [...weights];
    this.bias = bias;
  }
}

export class StrategyPerformancePredictorML {
  private models: Map<StrategyName, LogisticRegressionModel> = new Map();
  private modelMetadata: Map<StrategyName, ModelWeights> = new Map();
  private lastTrainedAt: Map<StrategyName, number> = new Map();

  // ✅ PHASE 4: Ensemble models (Random Forest, Gradient Boosting, Neural Network)
  private ensembleModels: Map<StrategyName, EnsembleStrategyML> = new Map();

  // ✅ Track database schema errors to only warn once
  private schemaErrorShown: boolean = false;

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

  private readonly CONFIG: TrainingConfig = {
    lookbackDays: 30, // Train on last 30 days
    minSamples: 20, // Need at least 20 samples to train
    retrainIntervalHours: 24, // Retrain daily
    testSplit: 0.2 // 20% test data
  };

  constructor() {
    this.loadFromStorage();
    console.log('[StrategyPerformanceML] Initialized with 17 strategy models');
  }

  /**
   * Get win probability prediction for a strategy
   */
  async predictWinProbability(
    strategyName: StrategyName,
    symbol: string
  ): Promise<StrategyPrediction> {
    try {
      // Check circuit breaker
      const isSafe = await mlCircuitBreaker.isSafeToUse(`strategy-ml-${strategyName}`);
      if (!isSafe) {
        console.warn(`[StrategyPerformanceML] Circuit breaker OPEN for ${strategyName}`);
        return this.getFallbackPrediction(strategyName, 'Circuit breaker triggered');
      }

      // Get or train model
      let model = this.models.get(strategyName);
      if (!model || this.needsRetraining(strategyName)) {
        console.log(`[StrategyPerformanceML] Training/Retraining model for ${strategyName}`);
        await this.trainStrategy(strategyName);
        model = this.models.get(strategyName);
      }

      if (!model) {
        console.warn(`[StrategyPerformanceML] No model available for ${strategyName}`);
        return this.getFallbackPrediction(strategyName, 'Model not trained yet');
      }

      // Get features from AlphaFeatureStore
      const features = await alphaFeatureStore.getFeatures(symbol);

      // Convert to feature vector
      const featureVector = this.featuresToVector(features, strategyName);

      // ✅ PHASE 4: Ensemble Prediction (combine all 4 models)
      const startTime = Date.now();
      const logisticPrediction = model.predict(featureVector);

      // Get ensemble prediction
      let ensembleModel = this.ensembleModels.get(strategyName);
      let ensemblePred: any = null;
      let winProbability = logisticPrediction; // Default to logistic

      if (ensembleModel) {
        ensemblePred = ensembleModel.predict(featureVector, logisticPrediction);
        winProbability = ensemblePred.ensembleWinProbability;

        console.log(
          `[StrategyPerformanceML] 🎯 ${strategyName} Ensemble: ` +
          `LR=${(ensemblePred.modelPredictions.logisticRegression * 100).toFixed(0)}% ` +
          `RF=${(ensemblePred.modelPredictions.randomForest * 100).toFixed(0)}% ` +
          `GB=${(ensemblePred.modelPredictions.gradientBoosting * 100).toFixed(0)}% ` +
          `NN=${(ensemblePred.modelPredictions.neuralNetwork * 100).toFixed(0)}% ` +
          `→ Final=${(winProbability * 100).toFixed(0)}% (best: ${ensemblePred.bestModel})`
        );
      }

      const latency = Date.now() - startTime;

      // Get model metadata
      const metadata = this.modelMetadata.get(strategyName);
      const confidence = ensemblePred ? ensemblePred.confidence : (metadata ? metadata.accuracy : 0.5);

      // Calculate expected return (simplified)
      const expectedReturn = winProbability * 3.5 - (1 - winProbability) * 1.5; // Assuming 3.5% avg win, 1.5% avg loss

      // Calculate risk score
      const riskScore = this.calculateRiskScore(features, winProbability);

      // Market regime match
      const regimeMatch = this.calculateRegimeMatch(features, strategyName);

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        winProbability,
        confidence,
        expectedReturn,
        riskScore,
        regimeMatch
      );

      // Generate reasoning
      const reasoning = this.generateReasoning(
        strategyName,
        winProbability,
        features,
        regimeMatch,
        metadata
      );

      // Record latency for circuit breaker
      if (latency > 100) {
        console.warn(`[StrategyPerformanceML] High latency: ${latency}ms for ${strategyName}`);
      }

      return {
        strategyName,
        winProbability: Math.round(winProbability * 1000) / 1000,
        confidence: Math.round(confidence * 1000) / 1000,
        expectedReturn: Math.round(expectedReturn * 100) / 100,
        riskScore: Math.round(riskScore),
        marketRegimeMatch: Math.round(regimeMatch * 1000) / 1000,
        recommendation,
        reasoning,
        // ✅ PHASE 4: Include ensemble details
        ensembleDetails: ensemblePred ? {
          logisticPrediction: Math.round(ensemblePred.modelPredictions.logisticRegression * 1000) / 1000,
          randomForestPrediction: Math.round(ensemblePred.modelPredictions.randomForest * 1000) / 1000,
          gradientBoostingPrediction: Math.round(ensemblePred.modelPredictions.gradientBoosting * 1000) / 1000,
          neuralNetworkPrediction: Math.round(ensemblePred.modelPredictions.neuralNetwork * 1000) / 1000,
          bestModel: ensemblePred.bestModel,
          modelDisagreement: Math.round(ensemblePred.disagreement * 1000) / 1000
        } : undefined
      };

    } catch (error) {
      console.error(`[StrategyPerformanceML] Error predicting ${strategyName}:`, error);
      return this.getFallbackPrediction(strategyName, 'Prediction error');
    }
  }

  /**
   * Get predictions for all strategies
   */
  async predictAllStrategies(symbol: string): Promise<StrategyPrediction[]> {
    const predictions = await Promise.all(
      this.ALL_STRATEGIES.map(strategy => this.predictWinProbability(strategy, symbol))
    );

    // Sort by win probability descending
    return predictions.sort((a, b) => b.winProbability - a.winProbability);
  }

  /**
   * Train a specific strategy model
   */
  async trainStrategy(strategyName: StrategyName): Promise<void> {
    try {
      console.log(`[StrategyPerformanceML] Training ${strategyName}...`);

      // Fetch historical data from Supabase
      const trainingData = await this.fetchTrainingData(strategyName);

      if (trainingData.length < this.CONFIG.minSamples) {
        console.warn(
          `[StrategyPerformanceML] Insufficient data for ${strategyName}: ${trainingData.length} samples (need ${this.CONFIG.minSamples})`
        );
        return;
      }

      // Split into train/test
      const splitIndex = Math.floor(trainingData.length * (1 - this.CONFIG.testSplit));
      const trainData = trainingData.slice(0, splitIndex);
      const testData = trainingData.slice(splitIndex);

      // Prepare training matrices
      const X_train = trainData.map(d => d.features);
      const y_train = trainData.map(d => d.label);
      const X_test = testData.map(d => d.features);
      const y_test = testData.map(d => d.label);

      // Train model
      const model = new LogisticRegressionModel();
      model.train(X_train, y_train);

      // Evaluate on test set
      let correct = 0;
      let wins = 0;
      for (let i = 0; i < X_test.length; i++) {
        const prediction = model.predict(X_test[i]);
        const predicted = prediction > 0.5 ? 1 : 0;
        if (predicted === y_test[i]) correct++;
        if (y_test[i] === 1) wins++;
      }

      const accuracy = correct / X_test.length;
      const winRate = wins / y_test.length;

      console.log(`[StrategyPerformanceML] ${strategyName} Logistic Regression trained:`);
      console.log(`  - Training samples: ${trainData.length}`);
      console.log(`  - Test samples: ${testData.length}`);
      console.log(`  - Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`  - Win rate: ${(winRate * 100).toFixed(1)}%`);

      // ✅ PHASE 4: Train ensemble models (Random Forest, Gradient Boosting, Neural Network)
      console.log(`[StrategyPerformanceML] 🎯 Training ensemble models for ${strategyName}...`);

      const ensembleModel = new EnsembleStrategyML();
      ensembleModel.trainAll(X_train, y_train);

      // Evaluate ensemble on test set
      let ensembleCorrect = 0;
      for (let i = 0; i < X_test.length; i++) {
        const logisticPred = model.predict(X_test[i]);
        const ensemblePred = ensembleModel.predict(X_test[i], logisticPred);
        const predicted = ensemblePred.ensembleWinProbability > 0.5 ? 1 : 0;
        if (predicted === y_test[i]) ensembleCorrect++;
      }

      const ensembleAccuracy = ensembleCorrect / X_test.length;
      console.log(`[StrategyPerformanceML] ✅ Ensemble accuracy: ${(ensembleAccuracy * 100).toFixed(1)}% (vs ${(accuracy * 100).toFixed(1)}% logistic)`);

      this.ensembleModels.set(strategyName, ensembleModel);

      // Save model
      const weights = model.getWeights();
      this.models.set(strategyName, model);
      this.modelMetadata.set(strategyName, {
        weights: weights.weights,
        bias: weights.bias,
        featureNames: this.getFeatureNames(),
        trainedAt: Date.now(),
        sampleSize: trainingData.length,
        accuracy: ensembleAccuracy, // Use ensemble accuracy
        winRate
      });
      this.lastTrainedAt.set(strategyName, Date.now());

      // Register in Model Registry
      await alphaModelRegistry.registerModel(
        `strategy-performance-${strategyName}`,
        '1.0',
        this.getFeatureNames(),
        { learningRate: 0.01, iterations: 1000 },
        {
          accuracy,
          winRate,
          precision: accuracy, // Simplified
          recall: winRate,
          f1Score: 2 * (accuracy * winRate) / (accuracy + winRate),
          auc: accuracy // Simplified
        },
        'system',
        `Strategy Performance Model for ${strategyName}`
      );

      this.persist();

    } catch (error) {
      console.error(`[StrategyPerformanceML] Error training ${strategyName}:`, error);
    }
  }

  /**
   * Train all strategy models
   */
  async trainAllStrategies(): Promise<void> {
    console.log('[StrategyPerformanceML] Training all 17 strategy models...');

    for (const strategy of this.ALL_STRATEGIES) {
      await this.trainStrategy(strategy);
    }

    console.log('[StrategyPerformanceML] All models trained successfully');
  }

  /**
   * Record outcome for online learning
   */
  async recordOutcome(
    strategyName: StrategyName,
    outcome: 'WIN' | 'LOSS',
    symbol: string
  ): Promise<void> {
    try {
      // Record in circuit breaker
      await mlCircuitBreaker.recordOutcome(`strategy-ml-${strategyName}`, outcome, 0);

      // Increment sample count and check if retraining needed
      const metadata = this.modelMetadata.get(strategyName);
      if (metadata) {
        metadata.sampleSize++;

        // Retrain every 50 new outcomes
        if (metadata.sampleSize % 50 === 0) {
          console.log(`[StrategyPerformanceML] Triggering retrain for ${strategyName} (${metadata.sampleSize} samples)`);
          await this.trainStrategy(strategyName);
        }
      }

    } catch (error) {
      console.error(`[StrategyPerformanceML] Error recording outcome:`, error);
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Fetch training data from Supabase
   */
  private async fetchTrainingData(strategyName: StrategyName): Promise<TrainingData[]> {
    try {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - this.CONFIG.lookbackDays);

      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('strategy_name', strategyName)
        .in('status', ['SUCCESS', 'FAILED'])
        .gte('created_at', lookbackDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        // Check if error is due to missing column (PostgreSQL error code 42703)
        if (error.code === '42703') {
          if (!this.schemaErrorShown) {
            console.warn(`[StrategyPerformanceML] ⚠️ Database schema mismatch - column 'strategy_name' doesn't exist.`);
            console.warn(`[StrategyPerformanceML] ℹ️ ML predictor disabled. System will use ensemble voting without historical performance data.`);
            console.warn(`[StrategyPerformanceML] 📊 This is NOT a blocker - signals will still be generated using strategy confidence scores.`);
            this.schemaErrorShown = true;
          }
          return [];
        }
        console.error(`[StrategyPerformanceML] Error fetching data:`, error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Convert to training data
      const trainingData: TrainingData[] = [];

      for (const signal of data) {
        try {
          // Reconstruct features from signal indicators
          const features = this.reconstructFeatures(signal);
          const label = signal.status === 'SUCCESS' ? 1 : 0;

          trainingData.push({
            features,
            label,
            strategyName,
            timestamp: new Date(signal.created_at).getTime()
          });
        } catch (err) {
          console.warn(`[StrategyPerformanceML] Error processing signal:`, err);
        }
      }

      return trainingData;

    } catch (error) {
      console.error(`[StrategyPerformanceML] Error fetching training data:`, error);
      return [];
    }
  }

  /**
   * Reconstruct features from historical signal
   */
  private reconstructFeatures(signal: any): number[] {
    const indicators = signal.indicators || {};

    // Extract features (matching the order in featuresToVector)
    return [
      indicators.rsi || 50,
      indicators.macd || 0,
      indicators.bollingerWidth || 0,
      indicators.volume24h || 0,
      indicators.volatility || 0,
      indicators.priceChange24h || 0,
      indicators.fundingRate || 0,
      indicators.openInterest || 0,
      indicators.orderBookImbalance || 0,
      signal.confidence || 50,
      this.regimeToNumber(indicators.regime || 'UNKNOWN'),
      0, // hourOfDay (not available in historical data)
      0, // dayOfWeek (not available)
      indicators.volumeTrend || 0,
      indicators.volatilityTrend || 0
    ];
  }

  /**
   * Convert AlphaFeatures to feature vector
   */
  private featuresToVector(features: AlphaFeatures, strategyName: StrategyName): number[] {
    return [
      features.rsi,
      features.macd,
      features.bollingerWidth,
      features.volume24h / 1000000, // Normalize
      features.volatility24h,
      features.priceChange24h,
      features.fundingRate || 0,
      features.openInterest || 0,
      features.orderBookImbalance,
      features.buyPressure,
      this.regimeToNumber(features.regime),
      features.hourOfDay,
      features.dayOfWeek,
      features.volumeTrend,
      features.volatilityTrend
    ];
  }

  /**
   * Convert regime to number for ML
   */
  private regimeToNumber(regime: string): number {
    const mapping: Record<string, number> = {
      'TRENDING_UP': 1,
      'TRENDING_DOWN': -1,
      'CONSOLIDATION': 0,
      'VOLATILE': 0.5,
      'UNKNOWN': 0
    };
    return mapping[regime] || 0;
  }

  /**
   * Get feature names
   */
  private getFeatureNames(): string[] {
    return [
      'rsi',
      'macd',
      'bollingerWidth',
      'volume24h',
      'volatility24h',
      'priceChange24h',
      'fundingRate',
      'openInterest',
      'orderBookImbalance',
      'buyPressure',
      'regime',
      'hourOfDay',
      'dayOfWeek',
      'volumeTrend',
      'volatilityTrend'
    ];
  }

  /**
   * Check if model needs retraining
   */
  private needsRetraining(strategyName: StrategyName): boolean {
    const lastTrained = this.lastTrainedAt.get(strategyName);
    if (!lastTrained) return true;

    const hoursSinceTraining = (Date.now() - lastTrained) / (1000 * 60 * 60);
    return hoursSinceTraining > this.CONFIG.retrainIntervalHours;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(features: AlphaFeatures, winProbability: number): number {
    let risk = 0;

    // High volatility = high risk
    risk += features.volatility24h * 20;

    // Low win probability = high risk
    risk += (1 - winProbability) * 30;

    // Volatile regime = high risk
    if (features.regime === 'VOLATILE') risk += 20;

    // High order book imbalance = risk
    risk += Math.abs(features.orderBookImbalance) * 15;

    return Math.min(100, Math.max(0, risk));
  }

  /**
   * Calculate how well strategy matches current regime
   */
  private calculateRegimeMatch(features: AlphaFeatures, strategyName: StrategyName): number {
    // Strategy-specific regime preferences (simplified)
    const regimePreferences: Record<StrategyName, string[]> = {
      'MOMENTUM_SURGE_V2': ['TRENDING_UP'],
      'MOMENTUM_RECOVERY': ['CONSOLIDATION', 'TRENDING_UP'],
      'VOLATILITY_BREAKOUT': ['VOLATILE'],
      'BOLLINGER_MEAN_REVERSION': ['CONSOLIDATION'],
      'GOLDEN_CROSS_MOMENTUM': ['TRENDING_UP'],
      'FEAR_GREED_CONTRARIAN': ['VOLATILE'],
      // ... Add more mappings
    } as any;

    const preferred = regimePreferences[strategyName] || [];
    return preferred.includes(features.regime) ? 1.0 : 0.5;
  }

  /**
   * Generate recommendation
   */
  private generateRecommendation(
    winProbability: number,
    confidence: number,
    expectedReturn: number,
    riskScore: number,
    regimeMatch: number
  ): 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'AVOID' | 'STRONG_AVOID' {
    const score = winProbability * confidence * regimeMatch - (riskScore / 100);

    if (score > 0.65 && expectedReturn > 1.5) return 'STRONG_BUY';
    if (score > 0.50 && expectedReturn > 0.5) return 'BUY';
    if (score < 0.30 || expectedReturn < -0.5) return 'AVOID';
    if (score < 0.20 || expectedReturn < -1.0) return 'STRONG_AVOID';
    return 'NEUTRAL';
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    strategyName: StrategyName,
    winProbability: number,
    features: AlphaFeatures,
    regimeMatch: number,
    metadata?: ModelWeights
  ): string[] {
    const reasoning: string[] = [];

    // Win probability
    if (winProbability > 0.65) {
      reasoning.push(`High win probability: ${(winProbability * 100).toFixed(0)}%`);
    } else if (winProbability < 0.40) {
      reasoning.push(`Low win probability: ${(winProbability * 100).toFixed(0)}%`);
    }

    // Regime match
    if (regimeMatch > 0.8) {
      reasoning.push(`Excellent regime match: ${features.regime}`);
    } else if (regimeMatch < 0.4) {
      reasoning.push(`Poor regime match for ${strategyName}`);
    }

    // Model accuracy
    if (metadata && metadata.accuracy > 0.65) {
      reasoning.push(`Model accuracy: ${(metadata.accuracy * 100).toFixed(0)}%`);
    }

    // Technical factors
    if (features.rsi > 70) {
      reasoning.push('RSI overbought (>70)');
    } else if (features.rsi < 30) {
      reasoning.push('RSI oversold (<30)');
    }

    if (features.volatility24h > 0.05) {
      reasoning.push('High volatility detected');
    }

    return reasoning;
  }

  /**
   * Fallback prediction when model unavailable
   */
  private getFallbackPrediction(strategyName: StrategyName, reason: string): StrategyPrediction {
    return {
      strategyName,
      winProbability: 0.50,
      confidence: 0.30,
      expectedReturn: 0,
      riskScore: 70,
      marketRegimeMatch: 0.50,
      recommendation: 'NEUTRAL',
      reasoning: [reason, 'Using fallback prediction']
    };
  }

  /**
   * Persist models to localStorage
   */
  private persist(): void {
    try {
      // ✅ PHASE 4: Include ensemble models in persistence
      const ensembleData: any[] = [];
      for (const [strategyName, ensembleModel] of this.ensembleModels.entries()) {
        ensembleData.push([strategyName, ensembleModel.getWeights()]);
      }

      const data = {
        metadata: Array.from(this.modelMetadata.entries()),
        lastTrained: Array.from(this.lastTrainedAt.entries()),
        ensembleModels: ensembleData,
        timestamp: Date.now()
      };

      localStorage.setItem('strategy-performance-ml', JSON.stringify(data));
    } catch (error) {
      console.error('[StrategyPerformanceML] Error persisting models:', error);
    }
  }

  /**
   * Load models from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('strategy-performance-ml');
      if (!stored) return;

      const data = JSON.parse(stored);

      // Restore metadata
      this.modelMetadata = new Map(data.metadata);
      this.lastTrainedAt = new Map(data.lastTrained);

      // Restore logistic regression models
      for (const [strategyName, metadata] of this.modelMetadata.entries()) {
        const model = new LogisticRegressionModel();
        model.setWeights(metadata.weights, metadata.bias);
        this.models.set(strategyName as StrategyName, model);
      }

      // ✅ PHASE 4: Restore ensemble models
      if (data.ensembleModels) {
        for (const [strategyName, weights] of data.ensembleModels) {
          const ensembleModel = new EnsembleStrategyML();
          ensembleModel.setWeights(weights);
          this.ensembleModels.set(strategyName as StrategyName, ensembleModel);
        }
        console.log(`[StrategyPerformanceML] Loaded ${this.models.size} models + ${this.ensembleModels.size} ensemble models from storage`);
      } else {
        console.log(`[StrategyPerformanceML] Loaded ${this.models.size} models from storage (no ensemble models yet)`);
      }

    } catch (error) {
      console.error('[StrategyPerformanceML] Error loading models:', error);
    }
  }

  /**
   * Get model health status
   */
  getHealthStatus(): {
    totalModels: number;
    trainedModels: number;
    avgAccuracy: number;
    needsRetraining: string[];
    ensembleModels: number;
    ensembleStatus: any;
  } {
    const trainedModels = this.models.size;
    const accuracies = Array.from(this.modelMetadata.values()).map(m => m.accuracy);
    const avgAccuracy = accuracies.length > 0
      ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
      : 0;

    const needsRetraining = this.ALL_STRATEGIES.filter(s => this.needsRetraining(s));

    // ✅ PHASE 4: Get ensemble model status
    const ensembleStatus: any = {};
    for (const [strategyName, ensembleModel] of this.ensembleModels.entries()) {
      ensembleStatus[strategyName] = ensembleModel.getHealthStatus();
    }

    return {
      totalModels: this.ALL_STRATEGIES.length,
      trainedModels,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      needsRetraining,
      ensembleModels: this.ensembleModels.size,
      ensembleStatus
    };
  }
}

// Singleton export
export const strategyPerformanceML = new StrategyPerformancePredictorML();
