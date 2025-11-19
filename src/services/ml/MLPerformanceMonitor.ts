/**
 * ML PERFORMANCE MONITOR
 * Real-time monitoring and analytics for all ML systems
 *
 * PURPOSE:
 * - Track accuracy, latency, and prediction distribution for all models
 * - Detect model drift and performance degradation
 * - Provide comprehensive health dashboards
 * - Alert on critical issues
 *
 * MONITORS:
 * - Strategy Performance ML (17 ensemble models)
 * - Regime Predictor ML (HMM)
 * - Regime Performance Matrix (17×5 cells)
 * - Circuit Breakers (model safety)
 *
 * INSPIRED BY:
 * - Google TFX: ML pipeline monitoring
 * - AWS SageMaker Model Monitor
 * - DataDog ML monitoring
 * - Evidently AI: ML monitoring platform
 */

import { strategyPerformanceML } from './StrategyPerformancePredictorML';
import { marketRegimePredictorML } from './MarketRegimePredictorML';
import { regimePerformanceMatrix } from './RegimePerformanceMatrix';
import { mlCircuitBreaker } from './MLCircuitBreaker';
import { StrategyName } from '../strategies/strategyTypes';

export interface MLSystemHealth {
  timestamp: number;
  overallHealth: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL';
  overallScore: number; // 0-100

  strategyML: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    trainedModels: number;
    totalModels: number;
    avgAccuracy: number;
    avgEnsembleAccuracy: number;
    modelsNeedingRetrain: number;
    circuitBreakersOpen: number;
  };

  regimeML: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    currentRegime: string;
    confidence: number;
    observationCount: number;
    timeInRegime: number; // hours
  };

  regimeMatrix: {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    cellsWithData: number;
    totalCells: number;
    dataCompleteness: number; // 0-100%
    avgConfidence: number;
  };

  performance: {
    avgPredictionLatency: number; // ms
    predictionsPerMinute: number;
    errorRate: number; // 0-1
  };

  alerts: MLAlert[];
}

export interface MLAlert {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'ACCURACY' | 'LATENCY' | 'DRIFT' | 'CIRCUIT_BREAKER' | 'DATA';
  message: string;
  timestamp: number;
  metadata?: any;
}

export interface ModelMetrics {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  predictions: number;
  avgLatency: number;
  lastPrediction: number;

  // Ensemble-specific
  ensembleAccuracy?: number;
  bestSubModel?: string;
  avgModelAgreement?: number;

  // Drift detection
  recentAccuracy: number; // Last 20 predictions
  driftScore: number; // 0-1 (0 = no drift, 1 = severe drift)
}

export interface PredictionDistribution {
  bins: Array<{ range: string; count: number }>;
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
}

export class MLPerformanceMonitor {
  private predictionHistory: Map<string, Array<{
    prediction: number;
    actual?: number;
    timestamp: number;
    latency: number;
  }>> = new Map();

  private readonly MAX_HISTORY = 100;
  private alerts: MLAlert[] = [];
  private readonly MAX_ALERTS = 50;

  // Performance tracking
  private lastMinutePredictions: number = 0;
  private lastMinuteReset: number = Date.now();

  constructor() {
    console.log('[MLPerformanceMonitor] Initialized - monitoring all ML systems');
    this.startPeriodicChecks();
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth(): Promise<MLSystemHealth> {
    const timestamp = Date.now();

    // Strategy ML health
    const strategyHealth = strategyPerformanceML.getHealthStatus();
    const strategyStatus = this.assessStrategyMLStatus(strategyHealth);

    // Regime ML health
    const regimeHealth = marketRegimePredictorML.getHealthStatus();
    const regimeStatus = this.assessRegimeMLStatus(regimeHealth);

    // Regime Matrix health
    const matrixHealth = regimePerformanceMatrix.getHealthStatus();
    const matrixStatus = this.assessMatrixStatus(matrixHealth);

    // Performance metrics
    const performance = this.calculatePerformanceMetrics();

    // Overall health
    const overallScore = this.calculateOverallScore(
      strategyStatus,
      regimeStatus,
      matrixStatus,
      performance
    );
    const overallHealth = this.scoreToHealth(overallScore);

    return {
      timestamp,
      overallHealth,
      overallScore,
      strategyML: {
        status: strategyStatus.status,
        trainedModels: strategyHealth.trainedModels,
        totalModels: strategyHealth.totalModels,
        avgAccuracy: strategyHealth.avgAccuracy,
        avgEnsembleAccuracy: this.calculateAvgEnsembleAccuracy(strategyHealth),
        modelsNeedingRetrain: strategyHealth.needsRetraining.length,
        circuitBreakersOpen: await this.countOpenCircuitBreakers()
      },
      regimeML: {
        status: regimeStatus.status,
        currentRegime: regimeHealth.currentRegime,
        confidence: regimeHealth.confidence,
        observationCount: regimeHealth.observationCount,
        timeInRegime: regimeHealth.timeInRegime
      },
      regimeMatrix: {
        status: matrixStatus.status,
        cellsWithData: matrixHealth.cellsWithData,
        totalCells: matrixHealth.totalCells,
        dataCompleteness: (matrixHealth.cellsWithData / matrixHealth.totalCells) * 100,
        avgConfidence: matrixHealth.avgConfidence
      },
      performance,
      alerts: this.getRecentAlerts(10)
    };
  }

  /**
   * Get detailed metrics for specific model
   */
  getModelMetrics(modelName: string): ModelMetrics | null {
    const history = this.predictionHistory.get(modelName);
    if (!history || history.length === 0) return null;

    // Calculate metrics
    const predictions = history.length;
    const withActuals = history.filter(h => h.actual !== undefined);

    let accuracy = 0;
    let precision = 0;
    let recall = 0;
    let f1Score = 0;

    if (withActuals.length > 0) {
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (const h of withActuals) {
        const predicted = h.prediction > 0.5 ? 1 : 0;
        const actual = h.actual! > 0.5 ? 1 : 0;

        if (predicted === 1 && actual === 1) truePositives++;
        else if (predicted === 1 && actual === 0) falsePositives++;
        else if (predicted === 0 && actual === 0) trueNegatives++;
        else if (predicted === 0 && actual === 1) falseNegatives++;
      }

      accuracy = (truePositives + trueNegatives) / withActuals.length;
      precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
      recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
      f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    }

    // Recent accuracy (last 20)
    const recent = withActuals.slice(-20);
    let recentAccuracy = 0;
    if (recent.length > 0) {
      const recentCorrect = recent.filter(h => {
        const predicted = h.prediction > 0.5 ? 1 : 0;
        const actual = h.actual! > 0.5 ? 1 : 0;
        return predicted === actual;
      }).length;
      recentAccuracy = recentCorrect / recent.length;
    }

    // Drift score (difference between overall and recent accuracy)
    const driftScore = Math.abs(accuracy - recentAccuracy);

    // Average latency
    const avgLatency = history.reduce((sum, h) => sum + h.latency, 0) / history.length;

    return {
      modelName,
      accuracy,
      precision,
      recall,
      f1Score,
      predictions,
      avgLatency,
      lastPrediction: history[history.length - 1].timestamp,
      recentAccuracy,
      driftScore
    };
  }

  /**
   * Get prediction distribution
   */
  getPredictionDistribution(modelName: string): PredictionDistribution | null {
    const history = this.predictionHistory.get(modelName);
    if (!history || history.length === 0) return null;

    const predictions = history.map(h => h.prediction);

    // Create bins
    const bins = [
      { range: '0-10%', count: 0 },
      { range: '10-20%', count: 0 },
      { range: '20-30%', count: 0 },
      { range: '30-40%', count: 0 },
      { range: '40-50%', count: 0 },
      { range: '50-60%', count: 0 },
      { range: '60-70%', count: 0 },
      { range: '70-80%', count: 0 },
      { range: '80-90%', count: 0 },
      { range: '90-100%', count: 0 }
    ];

    for (const pred of predictions) {
      const binIndex = Math.min(9, Math.floor(pred * 10));
      bins[binIndex].count++;
    }

    // Statistics
    const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
    const sorted = [...predictions].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
    const stdDev = Math.sqrt(variance);
    const skewness = this.calculateSkewness(predictions, mean, stdDev);

    return {
      bins,
      mean,
      median,
      stdDev,
      skewness
    };
  }

  /**
   * Record a prediction for monitoring
   */
  recordPrediction(
    modelName: string,
    prediction: number,
    latency: number,
    actual?: number
  ): void {
    if (!this.predictionHistory.has(modelName)) {
      this.predictionHistory.set(modelName, []);
    }

    const history = this.predictionHistory.get(modelName)!;
    history.push({
      prediction,
      actual,
      timestamp: Date.now(),
      latency
    });

    // Trim history
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    // Track predictions per minute
    this.lastMinutePredictions++;
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.lastMinuteReset = now;
      this.lastMinutePredictions = 0;
    }

    // Check for alerts
    this.checkForAlerts(modelName);
  }

  /**
   * Record actual outcome (for accuracy tracking)
   */
  recordOutcome(modelName: string, predictionIndex: number, actual: number): void {
    const history = this.predictionHistory.get(modelName);
    if (history && history[predictionIndex]) {
      history[predictionIndex].actual = actual;
    }
  }

  /**
   * Add custom alert
   */
  addAlert(
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    category: 'ACCURACY' | 'LATENCY' | 'DRIFT' | 'CIRCUIT_BREAKER' | 'DATA',
    message: string,
    metadata?: any
  ): void {
    this.alerts.push({
      severity,
      category,
      message,
      timestamp: Date.now(),
      metadata
    });

    // Trim alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    // Log critical alerts
    if (severity === 'CRITICAL') {
      console.error(`[MLPerformanceMonitor] 🚨 CRITICAL ALERT: ${message}`);
    } else if (severity === 'WARNING') {
      console.warn(`[MLPerformanceMonitor] ⚠️ WARNING: ${message}`);
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): MLAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  // ===== PRIVATE METHODS =====

  /**
   * Assess Strategy ML status
   */
  private assessStrategyMLStatus(health: any): { status: 'HEALTHY' | 'WARNING' | 'CRITICAL'; score: number } {
    const coverage = health.trainedModels / health.totalModels;
    const accuracy = health.avgAccuracy;
    const needsRetrain = health.needsRetraining.length / health.totalModels;

    let score = 100;
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Deduct for coverage
    if (coverage < 1.0) score -= (1 - coverage) * 30;
    if (coverage < 0.5) status = 'CRITICAL';
    else if (coverage < 0.8) status = 'WARNING';

    // Deduct for accuracy
    if (accuracy < 0.55) score -= 30;
    if (accuracy < 0.50) status = 'CRITICAL';
    else if (accuracy < 0.55) status = 'WARNING';

    // Deduct for stale models
    if (needsRetrain > 0.3) score -= 20;

    return { status, score: Math.max(0, score) };
  }

  /**
   * Assess Regime ML status
   */
  private assessRegimeMLStatus(health: any): { status: 'HEALTHY' | 'WARNING' | 'CRITICAL'; score: number } {
    const confidence = health.confidence;
    const observations = health.observationCount;

    let score = 100;
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Deduct for low confidence
    if (confidence < 0.7) score -= (0.7 - confidence) * 100;
    if (confidence < 0.5) status = 'CRITICAL';
    else if (confidence < 0.6) status = 'WARNING';

    // Deduct for insufficient data
    if (observations < 50) score -= 30;
    if (observations < 20) status = 'WARNING';

    return { status, score: Math.max(0, score) };
  }

  /**
   * Assess Matrix status
   */
  private assessMatrixStatus(health: any): { status: 'HEALTHY' | 'WARNING' | 'CRITICAL'; score: number } {
    const completeness = health.cellsWithData / health.totalCells;
    const confidence = health.avgConfidence;

    let score = 100;
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Deduct for data completeness
    if (completeness < 0.7) score -= (0.7 - completeness) * 100;
    if (completeness < 0.3) status = 'CRITICAL';
    else if (completeness < 0.5) status = 'WARNING';

    // Deduct for low confidence
    if (confidence < 0.5) score -= 20;

    return { status, score: Math.max(0, score) };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): {
    avgPredictionLatency: number;
    predictionsPerMinute: number;
    errorRate: number;
  } {
    const allLatencies: number[] = [];
    let totalPredictions = 0;
    let totalErrors = 0;

    for (const history of this.predictionHistory.values()) {
      totalPredictions += history.length;

      for (const h of history) {
        allLatencies.push(h.latency);

        // Count errors (predictions with actual outcomes that were wrong)
        if (h.actual !== undefined) {
          const predicted = h.prediction > 0.5 ? 1 : 0;
          const actual = h.actual > 0.5 ? 1 : 0;
          if (predicted !== actual) totalErrors++;
        }
      }
    }

    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length
      : 0;

    const errorRate = totalPredictions > 0 ? totalErrors / totalPredictions : 0;

    return {
      avgPredictionLatency: Math.round(avgLatency * 100) / 100,
      predictionsPerMinute: this.lastMinutePredictions,
      errorRate: Math.round(errorRate * 1000) / 1000
    };
  }

  /**
   * Calculate overall system score
   */
  private calculateOverallScore(...components: Array<{ score: number }>): number {
    const scores = components.map(c => c.score);
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  }

  /**
   * Convert score to health status
   */
  private scoreToHealth(score: number): 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'DEGRADED';
    return 'CRITICAL';
  }

  /**
   * Calculate average ensemble accuracy
   */
  private calculateAvgEnsembleAccuracy(health: any): number {
    if (!health.ensembleStatus) return 0;

    const statuses = Object.values(health.ensembleStatus) as any[];
    const accuracies = statuses
      .map((s: any) => s.modelAccuracies)
      .filter(Boolean)
      .flatMap((acc: any) => Object.values(acc) as number[]);

    return accuracies.length > 0
      ? Math.round((accuracies.reduce((sum: number, a: number) => sum + a, 0) / accuracies.length) * 100) / 100
      : 0;
  }

  /**
   * Count open circuit breakers
   */
  private async countOpenCircuitBreakers(): Promise<number> {
    // This would check all strategy circuit breakers
    // Simplified for now
    return 0;
  }

  /**
   * Calculate skewness
   */
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;

    const n = values.length;
    const sum = values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * Check for alerts based on model performance
   */
  private checkForAlerts(modelName: string): void {
    const metrics = this.getModelMetrics(modelName);
    if (!metrics) return;

    // Alert on low accuracy
    if (metrics.accuracy < 0.50 && metrics.predictions > 20) {
      this.addAlert(
        'WARNING',
        'ACCURACY',
        `${modelName}: Low accuracy (${(metrics.accuracy * 100).toFixed(0)}%)`,
        { modelName, accuracy: metrics.accuracy }
      );
    }

    // Alert on model drift
    if (metrics.driftScore > 0.15 && metrics.predictions > 50) {
      this.addAlert(
        'WARNING',
        'DRIFT',
        `${modelName}: Model drift detected (${(metrics.driftScore * 100).toFixed(0)}% difference)`,
        { modelName, driftScore: metrics.driftScore }
      );
    }

    // Alert on high latency
    if (metrics.avgLatency > 200) {
      this.addAlert(
        'WARNING',
        'LATENCY',
        `${modelName}: High prediction latency (${metrics.avgLatency.toFixed(0)}ms)`,
        { modelName, latency: metrics.avgLatency }
      );
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicChecks(): void {
    // Check system health every 5 minutes
    setInterval(async () => {
      const health = await this.getSystemHealth();

      if (health.overallHealth === 'CRITICAL') {
        this.addAlert(
          'CRITICAL',
          'ACCURACY',
          `System health CRITICAL (score: ${health.overallScore}/100)`,
          { health }
        );
      } else if (health.overallHealth === 'DEGRADED') {
        this.addAlert(
          'WARNING',
          'ACCURACY',
          `System health degraded (score: ${health.overallScore}/100)`,
          { health }
        );
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Export monitoring data
   */
  exportMonitoringData(): {
    systemHealth: any;
    allMetrics: Record<string, ModelMetrics | null>;
    distributions: Record<string, PredictionDistribution | null>;
    alerts: MLAlert[];
  } {
    const allModels = Array.from(this.predictionHistory.keys());

    const allMetrics: Record<string, ModelMetrics | null> = {};
    const distributions: Record<string, PredictionDistribution | null> = {};

    for (const model of allModels) {
      allMetrics[model] = this.getModelMetrics(model);
      distributions[model] = this.getPredictionDistribution(model);
    }

    return {
      systemHealth: null, // Would call getSystemHealth() async
      allMetrics,
      distributions,
      alerts: this.alerts
    };
  }
}

// Singleton export
export const mlPerformanceMonitor = new MLPerformanceMonitor();
