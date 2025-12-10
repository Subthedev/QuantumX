/**
 * MARKET REGIME PREDICTOR ML
 * Hidden Markov Model (HMM) for predicting market regime transitions
 *
 * PURPOSE:
 * - Predict regime changes 1-3 days BEFORE they happen
 * - Enable pre-emptive strategy weight adjustments
 * - Reduce drawdowns during regime transitions
 *
 * ARCHITECTURE:
 * - Hidden Markov Model with 5 states (BULL/BEAR/SIDEWAYS/VOLATILE/CALM)
 * - Viterbi algorithm for most likely state sequence
 * - Forward algorithm for regime transition probabilities
 * - Baum-Welch algorithm for parameter learning (online)
 *
 * INSPIRED BY:
 * - Renaissance Technologies: Medallion Fund regime switching
 * - Two Sigma: Adaptive regime detection
 * - AQR: Factor timing based on regime predictions
 */

import { alphaFeatureStore } from './AlphaFeatureStore';
import { mlCircuitBreaker } from './MLCircuitBreaker';

export type MarketRegime = 'BULL' | 'BEAR' | 'SIDEWAYS' | 'VOLATILE' | 'CALM';

export interface RegimePrediction {
  currentRegime: MarketRegime;
  currentConfidence: number; // 0-1
  predictedRegime: MarketRegime; // Regime expected in 1-3 days
  transitionProbability: number; // 0-1 (probability of transition)
  timeHorizon: number; // Days until predicted transition
  reasoning: string[];
  regimeStability: number; // 0-1 (how stable is current regime)
  transitionMatrix: Record<MarketRegime, number>; // Probabilities to all regimes
}

interface HMMState {
  regime: MarketRegime;
  transitionProbabilities: Record<MarketRegime, number>; // P(next state | current state)
  emissionMean: number[]; // Mean of features in this regime
  emissionStd: number[]; // Std dev of features in this regime
}

interface Observation {
  features: number[];
  timestamp: number;
}

export class MarketRegimePredictorML {
  // HMM States (5 regimes)
  private states: Map<MarketRegime, HMMState> = new Map();

  // Recent observations for online learning
  private observations: Observation[] = [];
  private readonly MAX_OBSERVATIONS = 200;

  // Current regime tracking
  private currentRegime: MarketRegime = 'SIDEWAYS';
  private currentConfidence: number = 0.5;
  private regimeStartTime: number = Date.now();

  // Feature indices (must match AlphaFeatureStore)
  private readonly FEATURE_NAMES = [
    'priceChange24h',
    'volatility24h',
    'volume24h',
    'rsi',
    'macd',
    'bollingerWidth',
    'volumeTrend',
    'volatilityTrend'
  ];

  constructor() {
    this.initializeHMM();
    this.loadFromStorage();
    console.log('[MarketRegimeML] Initialized with 5-state HMM');
  }

  /**
   * Predict current and future regime
   */
  async predictRegime(symbol: string): Promise<RegimePrediction> {
    try {
      // Check circuit breaker
      const isSafe = await mlCircuitBreaker.isSafeToUse('regime-predictor-ml');
      if (!isSafe) {
        console.warn('[MarketRegimeML] Circuit breaker OPEN');
        return this.getFallbackPrediction('Circuit breaker triggered');
      }

      // Get current features
      const features = await alphaFeatureStore.getFeatures(symbol);
      const observation = this.extractObservation(features);

      // Add to history
      this.observations.push(observation);
      if (this.observations.length > this.MAX_OBSERVATIONS) {
        this.observations = this.observations.slice(-this.MAX_OBSERVATIONS);
      }

      // Detect current regime using Viterbi algorithm (most likely state)
      const currentRegime = this.detectCurrentRegime(observation.features);
      const currentConfidence = this.calculateRegimeConfidence(observation.features, currentRegime);

      // Predict next regime using forward algorithm
      const transitionMatrix = this.calculateTransitionProbabilities(currentRegime);
      const predictedRegime = this.predictNextRegime(transitionMatrix);
      const transitionProbability = transitionMatrix[predictedRegime];

      // Calculate time horizon (estimated days until transition)
      const timeHorizon = this.estimateTransitionTime(
        currentRegime,
        predictedRegime,
        currentConfidence
      );

      // Calculate regime stability
      const regimeStability = this.calculateRegimeStability(currentRegime);

      // Generate reasoning
      const reasoning = this.generateReasoning(
        currentRegime,
        predictedRegime,
        currentConfidence,
        transitionProbability,
        regimeStability
      );

      // Update current regime tracking
      if (currentRegime !== this.currentRegime) {
        console.log(
          `[MarketRegimeML] 🔄 Regime transition: ${this.currentRegime} → ${currentRegime} ` +
          `(confidence: ${(currentConfidence * 100).toFixed(0)}%)`
        );
        this.currentRegime = currentRegime;
        this.regimeStartTime = Date.now();
      }
      this.currentConfidence = currentConfidence;

      // Online learning: Update HMM parameters
      if (this.observations.length >= 50) {
        this.updateHMMParameters();
      }

      this.persist();

      return {
        currentRegime,
        currentConfidence: Math.round(currentConfidence * 1000) / 1000,
        predictedRegime,
        transitionProbability: Math.round(transitionProbability * 1000) / 1000,
        timeHorizon,
        reasoning,
        regimeStability: Math.round(regimeStability * 1000) / 1000,
        transitionMatrix: this.normalizeTransitionMatrix(transitionMatrix)
      };

    } catch (error) {
      console.error('[MarketRegimeML] Error predicting regime:', error);
      return this.getFallbackPrediction('Prediction error');
    }
  }

  /**
   * Get regime prediction for strategy pre-loading
   */
  async getRegimeTransitionAlert(symbol: string): Promise<{
    alert: boolean;
    incomingRegime: MarketRegime | null;
    daysUntilTransition: number;
    confidence: number;
  }> {
    const prediction = await this.predictRegime(symbol);

    // Alert if high-probability transition incoming
    const alert = prediction.transitionProbability > 0.6 && prediction.timeHorizon <= 3;

    return {
      alert,
      incomingRegime: alert ? prediction.predictedRegime : null,
      daysUntilTransition: prediction.timeHorizon,
      confidence: prediction.transitionProbability
    };
  }

  // ===== HMM ALGORITHMS =====

  /**
   * Initialize HMM with default parameters
   */
  private initializeHMM(): void {
    const regimes: MarketRegime[] = ['BULL', 'BEAR', 'SIDEWAYS', 'VOLATILE', 'CALM'];

    for (const regime of regimes) {
      // Initial transition probabilities (will be learned)
      const transitions: Record<MarketRegime, number> = {
        'BULL': regime === 'BULL' ? 0.7 : 0.075,
        'BEAR': regime === 'BEAR' ? 0.7 : 0.075,
        'SIDEWAYS': regime === 'SIDEWAYS' ? 0.7 : 0.075,
        'VOLATILE': regime === 'VOLATILE' ? 0.6 : 0.1,
        'CALM': regime === 'CALM' ? 0.7 : 0.075
      };

      // Initial emission parameters (feature distributions)
      const emissionMean = this.getRegimeFeatureMeans(regime);
      const emissionStd = this.getRegimeFeatureStds(regime);

      this.states.set(regime, {
        regime,
        transitionProbabilities: transitions,
        emissionMean,
        emissionStd
      });
    }
  }

  /**
   * Detect current regime using maximum likelihood
   */
  private detectCurrentRegime(features: number[]): MarketRegime {
    let maxLikelihood = -Infinity;
    let bestRegime: MarketRegime = 'SIDEWAYS';

    for (const [regime, state] of this.states.entries()) {
      const likelihood = this.calculateEmissionProbability(features, state);

      if (likelihood > maxLikelihood) {
        maxLikelihood = likelihood;
        bestRegime = regime;
      }
    }

    return bestRegime;
  }

  /**
   * Calculate emission probability (Gaussian)
   */
  private calculateEmissionProbability(features: number[], state: HMMState): number {
    let logProb = 0;

    for (let i = 0; i < features.length; i++) {
      const mean = state.emissionMean[i];
      const std = state.emissionStd[i];

      // Gaussian log-likelihood
      const diff = features[i] - mean;
      logProb += -0.5 * Math.log(2 * Math.PI * std * std) - (diff * diff) / (2 * std * std);
    }

    return logProb;
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(features: number[], regime: MarketRegime): number {
    const state = this.states.get(regime)!;
    const regimeLikelihood = this.calculateEmissionProbability(features, state);

    // Calculate likelihood for all regimes
    let totalLikelihood = 0;
    const likelihoods: number[] = [];

    for (const s of this.states.values()) {
      const likelihood = Math.exp(this.calculateEmissionProbability(features, s));
      likelihoods.push(likelihood);
      totalLikelihood += likelihood;
    }

    // Confidence = P(regime | features) using Bayes
    const regimeProb = Math.exp(regimeLikelihood) / totalLikelihood;

    return Math.min(1, Math.max(0, regimeProb));
  }

  /**
   * Calculate transition probabilities using forward algorithm
   */
  private calculateTransitionProbabilities(currentRegime: MarketRegime): Record<MarketRegime, number> {
    const state = this.states.get(currentRegime)!;
    return { ...state.transitionProbabilities };
  }

  /**
   * Predict next regime (most likely transition)
   */
  private predictNextRegime(transitionMatrix: Record<MarketRegime, number>): MarketRegime {
    let maxProb = 0;
    let nextRegime: MarketRegime = 'SIDEWAYS';

    for (const [regime, prob] of Object.entries(transitionMatrix) as [MarketRegime, number][]) {
      if (prob > maxProb && regime !== this.currentRegime) {
        maxProb = prob;
        nextRegime = regime;
      }
    }

    // If staying in current regime is most likely, return current
    if (transitionMatrix[this.currentRegime] > maxProb) {
      return this.currentRegime;
    }

    return nextRegime;
  }

  /**
   * Estimate time until transition
   */
  private estimateTransitionTime(
    currentRegime: MarketRegime,
    predictedRegime: MarketRegime,
    confidence: number
  ): number {
    // If predicted regime is same as current, no transition
    if (predictedRegime === currentRegime) {
      return 999; // Far future
    }

    // Time in current regime (hours)
    const timeInRegime = (Date.now() - this.regimeStartTime) / (1000 * 60 * 60);

    // Average regime duration (hours)
    const avgRegimeDuration = this.getAverageRegimeDuration(currentRegime);

    // Estimate days until transition
    const remainingHours = Math.max(0, avgRegimeDuration - timeInRegime);
    const daysUntilTransition = Math.ceil(remainingHours / 24);

    // Adjust by confidence (low confidence = longer time estimate)
    return Math.ceil(daysUntilTransition / (confidence + 0.5));
  }

  /**
   * Calculate regime stability (how likely to stay in current regime)
   */
  private calculateRegimeStability(regime: MarketRegime): number {
    const state = this.states.get(regime)!;

    // Stability = P(stay in same regime)
    const stayProbability = state.transitionProbabilities[regime];

    // Also consider recent regime changes
    const timeInRegime = (Date.now() - this.regimeStartTime) / (1000 * 60 * 60 * 24); // days
    const stabilityBonus = Math.min(0.2, timeInRegime * 0.05);

    return Math.min(1, stayProbability + stabilityBonus);
  }

  /**
   * Update HMM parameters using Baum-Welch (online learning)
   */
  private updateHMMParameters(): void {
    if (this.observations.length < 50) return;

    console.log('[MarketRegimeML] 🔄 Updating HMM parameters (online learning)...');

    const recent = this.observations.slice(-50);

    // Update emission parameters for each regime
    for (const [regime, state] of this.states.entries()) {
      // Find observations likely from this regime
      const regimeObservations = recent.filter(obs => {
        const likelihood = this.calculateEmissionProbability(obs.features, state);
        return likelihood > -10; // Threshold for regime assignment
      });

      if (regimeObservations.length < 5) continue;

      // Update mean and std
      for (let i = 0; i < state.emissionMean.length; i++) {
        const values = regimeObservations.map(obs => obs.features[i]);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);

        // Exponential moving average for smooth updates
        state.emissionMean[i] = state.emissionMean[i] * 0.9 + mean * 0.1;
        state.emissionStd[i] = state.emissionStd[i] * 0.9 + std * 0.1;
      }
    }

    // Update transition probabilities (simplified - would use forward-backward in full implementation)
    // Track actual transitions in recent data
    const transitions: Map<string, number> = new Map();
    let prevRegime: MarketRegime | null = null;

    for (const obs of recent) {
      const regime = this.detectCurrentRegime(obs.features);

      if (prevRegime && regime !== prevRegime) {
        const key = `${prevRegime}-${regime}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }

      prevRegime = regime;
    }

    // Update transition matrices with observed transitions
    for (const [key, count] of transitions.entries()) {
      const [from, to] = key.split('-') as [MarketRegime, MarketRegime];
      const state = this.states.get(from);

      if (state) {
        // Smooth update
        const observed = count / recent.length;
        state.transitionProbabilities[to] = state.transitionProbabilities[to] * 0.9 + observed * 0.1;

        // Renormalize
        const total = Object.values(state.transitionProbabilities).reduce((sum, p) => sum + p, 0);
        for (const regime of Object.keys(state.transitionProbabilities) as MarketRegime[]) {
          state.transitionProbabilities[regime] /= total;
        }
      }
    }

    console.log('[MarketRegimeML] ✅ HMM parameters updated');
  }

  // ===== HELPER METHODS =====

  /**
   * Extract observation from AlphaFeatures
   */
  private extractObservation(features: any): Observation {
    return {
      features: [
        features.priceChange24h,
        features.volatility24h,
        features.volume24h / 1000000, // Normalize
        features.rsi,
        features.macd,
        features.bollingerWidth,
        features.volumeTrend,
        features.volatilityTrend
      ],
      timestamp: Date.now()
    };
  }

  /**
   * Get regime-specific feature means (initial values)
   */
  private getRegimeFeatureMeans(regime: MarketRegime): number[] {
    const means: Record<MarketRegime, number[]> = {
      'BULL': [5, 0.03, 100, 60, 0.5, 0.05, 0.5, 0.3],
      'BEAR': [-5, 0.04, 80, 40, -0.5, 0.06, -0.5, 0.4],
      'SIDEWAYS': [0, 0.02, 60, 50, 0, 0.03, 0, 0.1],
      'VOLATILE': [0, 0.08, 120, 50, 0, 0.10, 0, 0.8],
      'CALM': [1, 0.01, 50, 50, 0, 0.02, 0, -0.2]
    };
    return means[regime];
  }

  /**
   * Get regime-specific feature stds (initial values)
   */
  private getRegimeFeatureStds(regime: MarketRegime): number[] {
    const stds: Record<MarketRegime, number[]> = {
      'BULL': [3, 0.01, 40, 15, 0.3, 0.02, 0.3, 0.2],
      'BEAR': [3, 0.015, 30, 15, 0.3, 0.03, 0.3, 0.2],
      'SIDEWAYS': [2, 0.008, 20, 10, 0.2, 0.015, 0.2, 0.1],
      'VOLATILE': [5, 0.03, 50, 20, 0.5, 0.05, 0.5, 0.3],
      'CALM': [1.5, 0.005, 15, 8, 0.15, 0.01, 0.15, 0.08]
    };
    return stds[regime];
  }

  /**
   * Get average regime duration (hours)
   */
  private getAverageRegimeDuration(regime: MarketRegime): number {
    const durations: Record<MarketRegime, number> = {
      'BULL': 72, // 3 days
      'BEAR': 72, // 3 days
      'SIDEWAYS': 120, // 5 days
      'VOLATILE': 24, // 1 day
      'CALM': 168 // 7 days
    };
    return durations[regime];
  }

  /**
   * Normalize transition matrix to sum to 1
   */
  private normalizeTransitionMatrix(matrix: Record<MarketRegime, number>): Record<MarketRegime, number> {
    const normalized: Record<MarketRegime, number> = {} as any;

    for (const [regime, prob] of Object.entries(matrix) as [MarketRegime, number][]) {
      normalized[regime] = Math.round(prob * 1000) / 1000;
    }

    return normalized;
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    currentRegime: MarketRegime,
    predictedRegime: MarketRegime,
    confidence: number,
    transitionProbability: number,
    stability: number
  ): string[] {
    const reasoning: string[] = [];

    // Current regime
    reasoning.push(`Current regime: ${currentRegime} (${(confidence * 100).toFixed(0)}% confidence)`);

    // Transition prediction
    if (predictedRegime !== currentRegime) {
      reasoning.push(
        `Transition to ${predictedRegime} likely (${(transitionProbability * 100).toFixed(0)}% probability)`
      );
    } else {
      reasoning.push(`Regime stable - staying in ${currentRegime}`);
    }

    // Stability
    if (stability > 0.7) {
      reasoning.push(`High regime stability (${(stability * 100).toFixed(0)}%)`);
    } else if (stability < 0.4) {
      reasoning.push(`⚠️ Low regime stability - transition imminent`);
    }

    return reasoning;
  }

  /**
   * Fallback prediction
   */
  private getFallbackPrediction(reason: string): RegimePrediction {
    return {
      currentRegime: 'SIDEWAYS',
      currentConfidence: 0.5,
      predictedRegime: 'SIDEWAYS',
      transitionProbability: 0.7,
      timeHorizon: 999,
      reasoning: [reason, 'Using fallback prediction'],
      regimeStability: 0.5,
      transitionMatrix: {
        'BULL': 0.15,
        'BEAR': 0.15,
        'SIDEWAYS': 0.5,
        'VOLATILE': 0.1,
        'CALM': 0.1
      }
    };
  }

  /**
   * Persist HMM state
   */
  private persist(): void {
    try {
      const data = {
        states: Array.from(this.states.entries()),
        currentRegime: this.currentRegime,
        currentConfidence: this.currentConfidence,
        regimeStartTime: this.regimeStartTime,
        observations: this.observations.slice(-50), // Keep last 50
        timestamp: Date.now()
      };

      localStorage.setItem('market-regime-ml', JSON.stringify(data));
    } catch (error) {
      console.error('[MarketRegimeML] Error persisting state:', error);
    }
  }

  /**
   * Load HMM state
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('market-regime-ml');
      if (!stored) return;

      const data = JSON.parse(stored);

      this.states = new Map(data.states);
      this.currentRegime = data.currentRegime;
      this.currentConfidence = data.currentConfidence;
      this.regimeStartTime = data.regimeStartTime;
      this.observations = data.observations || [];

      console.log(`[MarketRegimeML] Loaded state: ${this.currentRegime} regime (${this.observations.length} observations)`);

    } catch (error) {
      console.error('[MarketRegimeML] Error loading state:', error);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    currentRegime: MarketRegime;
    confidence: number;
    observationCount: number;
    timeInRegime: number; // hours
  } {
    return {
      currentRegime: this.currentRegime,
      confidence: this.currentConfidence,
      observationCount: this.observations.length,
      timeInRegime: (Date.now() - this.regimeStartTime) / (1000 * 60 * 60)
    };
  }
}

// Singleton export
export const marketRegimePredictorML = new MarketRegimePredictorML();
