/**
 * MODEL EXPLAINABILITY ENGINE
 * SHAP-style feature importance and prediction explanations
 *
 * PURPOSE:
 * - Explain WHY the model made a specific prediction
 * - Calculate feature importance for each prediction
 * - Provide human-readable reasoning
 * - Build trust in ML predictions
 *
 * TECHNIQUES:
 * - SHAP-inspired: Shapley value approximation
 * - Permutation importance
 * - Local interpretable model (LIME-style)
 * - Feature contribution analysis
 *
 * INSPIRED BY:
 * - SHAP (Lundberg & Lee, 2017)
 * - LIME (Ribeiro et al., 2016)
 * - Google Explainable AI
 * - Microsoft InterpretML
 */

import { AlphaFeatures } from './AlphaFeatureStore';

export interface FeatureImportance {
  featureName: string;
  importance: number; // -1 to 1 (negative = pushes down, positive = pushes up)
  contribution: number; // Absolute contribution to final prediction
  value: number; // Actual feature value
  rank: number; // 1 = most important
}

export interface PredictionExplanation {
  prediction: number; // Final prediction (0-1)
  basePrediction: number; // Baseline (average) prediction

  featureImportances: FeatureImportance[];
  topPositiveFeatures: FeatureImportance[]; // Push prediction UP
  topNegativeFeatures: FeatureImportance[]; // Push prediction DOWN

  humanReadableReasons: string[];
  confidence: number; // 0-1 (based on feature agreement)
  uncertainty: number; // 0-1 (based on feature variance)
}

export class ModelExplainabilityEngine {
  private readonly FEATURE_NAMES = [
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

  // Baseline predictions (global averages)
  private baselinePredictions: Map<string, number> = new Map();

  constructor() {
    // Initialize with neutral baselines
    this.baselinePredictions.set('default', 0.50);
    console.log('[ModelExplainability] Initialized');
  }

  /**
   * Explain a prediction using SHAP-inspired approach
   */
  explainPrediction(
    modelPredict: (features: number[]) => number,
    features: number[],
    strategyName: string,
    alphaFeatures?: AlphaFeatures
  ): PredictionExplanation {
    // Get baseline prediction (average of all features at neutral values)
    const basePrediction = this.baselinePredictions.get(strategyName) || 0.50;

    // Get actual prediction
    const prediction = modelPredict(features);

    // Calculate Shapley values (approximation)
    const shapleyValues = this.calculateShapleyValues(modelPredict, features, basePrediction);

    // Create feature importances
    const featureImportances: FeatureImportance[] = shapleyValues.map((value, index) => ({
      featureName: this.FEATURE_NAMES[index],
      importance: value,
      contribution: Math.abs(value),
      value: features[index],
      rank: 0 // Will be set later
    }));

    // Sort by contribution and assign ranks
    const sorted = [...featureImportances].sort((a, b) => b.contribution - a.contribution);
    sorted.forEach((fi, index) => {
      const original = featureImportances.find(f => f.featureName === fi.featureName);
      if (original) original.rank = index + 1;
    });

    // Get top positive and negative features
    const topPositiveFeatures = featureImportances
      .filter(f => f.importance > 0)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3);

    const topNegativeFeatures = featureImportances
      .filter(f => f.importance < 0)
      .sort((a, b) => a.importance - b.importance)
      .slice(0, 3);

    // Generate human-readable reasons
    const humanReadableReasons = this.generateHumanReadableReasons(
      featureImportances,
      topPositiveFeatures,
      topNegativeFeatures,
      alphaFeatures
    );

    // Calculate confidence (feature agreement)
    const confidence = this.calculateExplanationConfidence(featureImportances);

    // Calculate uncertainty (feature variance)
    const uncertainty = this.calculateExplanationUncertainty(featureImportances);

    return {
      prediction,
      basePrediction,
      featureImportances,
      topPositiveFeatures,
      topNegativeFeatures,
      humanReadableReasons,
      confidence,
      uncertainty
    };
  }

  /**
   * Calculate global feature importance for a model
   */
  calculateGlobalFeatureImportance(
    modelPredict: (features: number[]) => number,
    testData: number[][]
  ): FeatureImportance[] {
    const numFeatures = this.FEATURE_NAMES.length;
    const importances = new Array(numFeatures).fill(0);

    // Permutation importance: Shuffle each feature and measure impact
    for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
      let totalImpact = 0;

      for (const testSample of testData) {
        const originalPrediction = modelPredict(testSample);

        // Permute this feature (randomize it)
        const permuted = [...testSample];
        permuted[featureIdx] = Math.random() * 100; // Random value

        const permutedPrediction = modelPredict(permuted);

        // Impact = change in prediction
        totalImpact += Math.abs(originalPrediction - permutedPrediction);
      }

      importances[featureIdx] = totalImpact / testData.length;
    }

    // Normalize to 0-1
    const maxImportance = Math.max(...importances);
    const normalized = importances.map(imp => maxImportance > 0 ? imp / maxImportance : 0);

    // Create feature importances
    const featureImportances: FeatureImportance[] = normalized.map((importance, index) => ({
      featureName: this.FEATURE_NAMES[index],
      importance,
      contribution: importance,
      value: 0,
      rank: 0
    }));

    // Sort and rank
    const sorted = [...featureImportances].sort((a, b) => b.importance - a.importance);
    sorted.forEach((fi, index) => {
      const original = featureImportances.find(f => f.featureName === fi.featureName);
      if (original) original.rank = index + 1;
    });

    return featureImportances;
  }

  /**
   * Update baseline prediction for a strategy
   */
  updateBaseline(strategyName: string, averagePrediction: number): void {
    this.baselinePredictions.set(strategyName, averagePrediction);
  }

  // ===== PRIVATE METHODS =====

  /**
   * Calculate Shapley values (simplified approximation)
   */
  private calculateShapleyValues(
    modelPredict: (features: number[]) => number,
    features: number[],
    basePrediction: number
  ): number[] {
    const numFeatures = features.length;
    const shapleyValues = new Array(numFeatures).fill(0);

    // Monte Carlo approximation of Shapley values
    const numSamples = 20; // Reduced for performance

    for (let i = 0; i < numSamples; i++) {
      // Random permutation of feature indices
      const permutation = this.randomPermutation(numFeatures);

      let currentFeatures = new Array(numFeatures).fill(0); // Start with baseline
      let currentPrediction = basePrediction;

      for (const featureIdx of permutation) {
        // Add this feature
        currentFeatures[featureIdx] = features[featureIdx];

        // Get new prediction
        const newPrediction = modelPredict(currentFeatures);

        // Contribution of this feature = change in prediction
        const contribution = newPrediction - currentPrediction;
        shapleyValues[featureIdx] += contribution;

        currentPrediction = newPrediction;
      }
    }

    // Average over samples
    return shapleyValues.map(val => val / numSamples);
  }

  /**
   * Generate random permutation
   */
  private randomPermutation(n: number): number[] {
    const arr = Array.from({ length: n }, (_, i) => i);

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Generate human-readable reasons
   */
  private generateHumanReadableReasons(
    allFeatures: FeatureImportance[],
    topPositive: FeatureImportance[],
    topNegative: FeatureImportance[],
    alphaFeatures?: AlphaFeatures
  ): string[] {
    const reasons: string[] = [];

    // Positive factors
    if (topPositive.length > 0) {
      reasons.push('🟢 Positive factors:');

      for (const feature of topPositive) {
        const explanation = this.explainFeature(feature, alphaFeatures);
        reasons.push(`  • ${explanation} (+${(feature.importance * 100).toFixed(0)}%)`);
      }
    }

    // Negative factors
    if (topNegative.length > 0) {
      reasons.push('🔴 Negative factors:');

      for (const feature of topNegative) {
        const explanation = this.explainFeature(feature, alphaFeatures);
        reasons.push(`  • ${explanation} (${(feature.importance * 100).toFixed(0)}%)`);
      }
    }

    // Overall assessment
    const netImportance = allFeatures.reduce((sum, f) => sum + f.importance, 0);
    if (netImportance > 0.2) {
      reasons.push('📊 Overall: Strong bullish indicators');
    } else if (netImportance < -0.2) {
      reasons.push('📊 Overall: Strong bearish indicators');
    } else {
      reasons.push('📊 Overall: Mixed signals');
    }

    return reasons;
  }

  /**
   * Explain a specific feature in human terms
   */
  private explainFeature(feature: FeatureImportance, alphaFeatures?: AlphaFeatures): string {
    switch (feature.featureName) {
      case 'rsi':
        if (feature.value > 70) return 'RSI indicates overbought conditions';
        if (feature.value < 30) return 'RSI indicates oversold conditions';
        return `RSI at ${feature.value.toFixed(0)} (neutral)`;

      case 'macd':
        return feature.value > 0
          ? 'MACD showing bullish momentum'
          : 'MACD showing bearish momentum';

      case 'bollingerWidth':
        return feature.value > 0.05
          ? 'High volatility (wide Bollinger Bands)'
          : 'Low volatility (tight Bollinger Bands)';

      case 'volume24h':
        return feature.importance > 0
          ? 'High volume supporting move'
          : 'Low volume weakening move';

      case 'volatility24h':
        return feature.value > 0.05
          ? 'Elevated volatility'
          : 'Low volatility';

      case 'priceChange24h':
        return feature.value > 5
          ? `Strong uptrend (+${feature.value.toFixed(1)}%)`
          : feature.value < -5
          ? `Strong downtrend (${feature.value.toFixed(1)}%)`
          : 'Sideways price action';

      case 'fundingRate':
        if (!alphaFeatures || alphaFeatures.fundingRate === null) {
          return 'Funding rate unavailable';
        }
        return alphaFeatures.fundingRate > 0.01
          ? 'High funding rate (longs paying shorts)'
          : alphaFeatures.fundingRate < -0.01
          ? 'Negative funding rate (shorts paying longs)'
          : 'Neutral funding rate';

      case 'orderBookImbalance':
        return feature.value > 0.3
          ? 'Strong buy pressure in order book'
          : feature.value < -0.3
          ? 'Strong sell pressure in order book'
          : 'Balanced order book';

      case 'buyPressure':
        return feature.value > 70
          ? 'High buy pressure'
          : feature.value < 30
          ? 'Low buy pressure'
          : 'Moderate buy pressure';

      case 'regime':
        return alphaFeatures
          ? `Market regime: ${alphaFeatures.regime}`
          : 'Market regime detected';

      case 'volumeTrend':
        return feature.value > 0.3
          ? 'Rising volume trend'
          : feature.value < -0.3
          ? 'Falling volume trend'
          : 'Stable volume';

      case 'volatilityTrend':
        return feature.value > 0.3
          ? 'Increasing volatility'
          : feature.value < -0.3
          ? 'Decreasing volatility'
          : 'Stable volatility';

      default:
        return `${feature.featureName}: ${feature.value.toFixed(2)}`;
    }
  }

  /**
   * Calculate explanation confidence (feature agreement)
   */
  private calculateExplanationConfidence(features: FeatureImportance[]): number {
    // Confidence = alignment of top features
    const topFeatures = features.slice(0, 5);

    if (topFeatures.length === 0) return 0.5;

    // Check if features agree in direction
    const positiveCount = topFeatures.filter(f => f.importance > 0).length;
    const agreement = Math.abs(positiveCount - topFeatures.length / 2) / (topFeatures.length / 2);

    return Math.min(1, 0.5 + agreement * 0.5);
  }

  /**
   * Calculate explanation uncertainty (feature variance)
   */
  private calculateExplanationUncertainty(features: FeatureImportance[]): number {
    const importances = features.map(f => f.importance);
    const mean = importances.reduce((sum, i) => sum + i, 0) / importances.length;
    const variance = importances.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / importances.length;

    return Math.min(1, variance * 5); // Scale to 0-1
  }

  /**
   * Export feature importance as chart data
   */
  exportFeatureImportanceChart(featureImportances: FeatureImportance[]): {
    labels: string[];
    values: number[];
    colors: string[];
  } {
    const sorted = [...featureImportances].sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance));

    return {
      labels: sorted.map(f => f.featureName),
      values: sorted.map(f => f.importance),
      colors: sorted.map(f => f.importance > 0 ? '#22c55e' : '#ef4444') // green/red
    };
  }
}

// Singleton export
export const modelExplainabilityEngine = new ModelExplainabilityEngine();
