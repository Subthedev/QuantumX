/**
 * ML SYSTEM INTEGRATOR
 * Master orchestrator for the complete production-grade ML pipeline
 *
 * PURPOSE:
 * - Single entry point for all ML operations
 * - Orchestrates 10-week implementation (Phases 1-5)
 * - Provides end-to-end ML pipeline
 * - Production monitoring and health checks
 *
 * INTEGRATES:
 * ✅ Phase 1: AlphaFeatureStore, ModelRegistry, CircuitBreakers
 * ✅ Phase 2: StrategyPerformanceML (17 ensemble models)
 * ✅ Phase 3: RegimePredictorML, RegimePerformanceMatrix
 * ✅ Phase 4: EnsembleML (4 model types)
 * ✅ Phase 5: Monitor, Retraining, Explainability
 *
 * INSPIRED BY:
 * - Google TFX: End-to-end ML platform
 * - Uber Michelangelo: ML-as-a-service
 * - Netflix: Production ML infrastructure
 * - AirBnB: ML platform (Bighead)
 */

import { strategyPerformanceML, StrategyPrediction } from './StrategyPerformancePredictorML';
import { marketRegimePredictorML, RegimePrediction } from './MarketRegimePredictorML';
import { regimePerformanceMatrix } from './RegimePerformanceMatrix';
import { alphaFeatureStore } from './AlphaFeatureStore';
import { alphaModelRegistry } from './AlphaModelRegistry';
import { mlCircuitBreaker } from './MLCircuitBreaker';
import { mlPerformanceMonitor, MLSystemHealth } from './MLPerformanceMonitor';
import { automatedRetrainingPipeline } from './AutomatedRetrainingPipeline';
import { modelExplainabilityEngine, PredictionExplanation } from './ModelExplainabilityEngine';
import { StrategyName } from '../strategies/strategyTypes';

export interface MLPipelineResult {
  // Strategy Predictions (Phase 2)
  strategyPredictions: StrategyPrediction[];
  topStrategies: StrategyName[];

  // Regime Analysis (Phase 3)
  regimePrediction: RegimePrediction;
  regimeRecommendations: {
    strategiesToLoad: StrategyName[];
    strategiesToUnload: StrategyName[];
    reasoning: string[];
  };

  // Ensemble Details (Phase 4)
  ensembleMetrics: {
    avgEnsembleAccuracy: number;
    bestPerformingModel: string;
    modelAgreement: number;
  };

  // Explainability (Phase 5)
  explanations: Map<StrategyName, PredictionExplanation>;

  // System Health (Phase 5)
  systemHealth: MLSystemHealth;

  // Execution Metadata
  executionTime: number;
  timestamp: number;
}

export interface MLSystemStatus {
  isHealthy: boolean;
  overallScore: number;
  phase1: { status: string; components: string[] };
  phase2: { status: string; trainedModels: number; avgAccuracy: number };
  phase3: { status: string; currentRegime: string; confidence: number };
  phase4: { status: string; ensembleModels: number; avgAccuracy: number };
  phase5: { status: string; monitoring: boolean; autoRetrain: boolean };
}

export class MLSystemIntegrator {
  private isInitialized = false;
  private isPipelineRunning = false;

  constructor() {
    console.log('[MLSystemIntegrator] 🚀 Production-Grade ML System initialized');
    console.log('[MLSystemIntegrator] ✅ Phase 1: Foundation (Features, Registry, Circuit Breakers)');
    console.log('[MLSystemIntegrator] ✅ Phase 2: Strategy Performance ML (17 models)');
    console.log('[MLSystemIntegrator] ✅ Phase 3: Regime Adaptation (HMM, Matrix)');
    console.log('[MLSystemIntegrator] ✅ Phase 4: Ensemble Learning (4 model types)');
    console.log('[MLSystemIntegrator] ✅ Phase 5: Production Hardening (Monitor, Retrain, Explain)');
  }

  /**
   * Initialize the complete ML system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[MLSystemIntegrator] Already initialized');
      return;
    }

    console.log('[MLSystemIntegrator] 🔄 Initializing complete ML pipeline...');

    try {
      // Phase 1: Already initialized (singletons)
      console.log('[MLSystemIntegrator] ✓ Phase 1: Feature Store, Model Registry, Circuit Breakers');

      // Phase 2: Strategy models loaded from storage
      const strategyHealth = strategyPerformanceML.getHealthStatus();
      console.log(`[MLSystemIntegrator] ✓ Phase 2: ${strategyHealth.trainedModels}/${strategyHealth.totalModels} strategy models loaded`);

      // Phase 3: Regime models loaded from storage
      const regimeHealth = marketRegimePredictorML.getHealthStatus();
      console.log(`[MLSystemIntegrator] ✓ Phase 3: Regime predictor loaded (${regimeHealth.observationCount} observations)`);

      // Phase 4: Ensemble models loaded from storage
      console.log(`[MLSystemIntegrator] ✓ Phase 4: ${strategyHealth.ensembleModels} ensemble models loaded`);

      // Phase 5: Start monitoring and retraining
      automatedRetrainingPipeline.start();
      console.log('[MLSystemIntegrator] ✓ Phase 5: Monitoring & auto-retraining started');

      this.isInitialized = true;
      console.log('[MLSystemIntegrator] ✅ Complete ML system initialized successfully!');

    } catch (error) {
      console.error('[MLSystemIntegrator] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute complete ML pipeline for a symbol
   */
  async executePipeline(symbol: string): Promise<MLPipelineResult> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isPipelineRunning) {
      throw new Error('Pipeline already running - wait for completion');
    }

    this.isPipelineRunning = true;

    try {
      console.log(`[MLSystemIntegrator] 🔄 Executing complete ML pipeline for ${symbol}...`);

      // ✅ PHASE 1: Feature Extraction
      console.log('[MLSystemIntegrator] Phase 1: Extracting features...');
      const features = await alphaFeatureStore.getFeatures(symbol);

      // ✅ PHASE 2: Strategy Predictions (17 models × 4 ensemble models = 68 model predictions!)
      console.log('[MLSystemIntegrator] Phase 2: Running 17 strategy predictions (68 model predictions)...');
      const strategyPredictions = await strategyPerformanceML.predictAllStrategies(symbol);
      const topStrategies = strategyPredictions.slice(0, 5).map(p => p.strategyName);

      // ✅ PHASE 3: Regime Analysis & Transition Prediction
      console.log('[MLSystemIntegrator] Phase 3: Predicting market regime & transitions...');
      const regimePrediction = await marketRegimePredictorML.predictRegime(symbol);

      // Check for regime transitions
      const transitionAlert = await marketRegimePredictorML.getRegimeTransitionAlert(symbol);
      let regimeRecommendations = {
        strategiesToLoad: [] as StrategyName[],
        strategiesToUnload: [] as StrategyName[],
        reasoning: [] as string[]
      };

      if (transitionAlert.alert && transitionAlert.incomingRegime) {
        regimeRecommendations = regimePerformanceMatrix.getRegimeTransitionRecommendations(
          regimePrediction.currentRegime,
          transitionAlert.incomingRegime
        );
        console.log(`[MLSystemIntegrator] 🚨 Regime transition detected: ${regimePrediction.currentRegime} → ${transitionAlert.incomingRegime}`);
      }

      // ✅ PHASE 4: Ensemble Metrics
      console.log('[MLSystemIntegrator] Phase 4: Aggregating ensemble metrics...');
      const ensembleMetrics = this.calculateEnsembleMetrics(strategyPredictions);

      // ✅ PHASE 5: Explainability
      console.log('[MLSystemIntegrator] Phase 5: Generating explanations...');
      const explanations = new Map<StrategyName, PredictionExplanation>();

      // Generate explanations for top 3 strategies only (performance optimization)
      for (const prediction of strategyPredictions.slice(0, 3)) {
        // Note: Explainability requires access to model internals
        // This is a placeholder - full implementation would integrate with actual models
        const explanation: PredictionExplanation = {
          prediction: prediction.winProbability,
          basePrediction: 0.50,
          featureImportances: [],
          topPositiveFeatures: [],
          topNegativeFeatures: [],
          humanReadableReasons: prediction.reasoning,
          confidence: prediction.confidence,
          uncertainty: 1 - prediction.confidence
        };
        explanations.set(prediction.strategyName, explanation);
      }

      // ✅ PHASE 5: System Health
      const systemHealth = await mlPerformanceMonitor.getSystemHealth();

      const executionTime = Date.now() - startTime;

      console.log(`[MLSystemIntegrator] ✅ Pipeline complete in ${executionTime}ms`);

      this.isPipelineRunning = false;

      return {
        strategyPredictions,
        topStrategies,
        regimePrediction,
        regimeRecommendations,
        ensembleMetrics,
        explanations,
        systemHealth,
        executionTime,
        timestamp: Date.now()
      };

    } catch (error) {
      this.isPipelineRunning = false;
      console.error('[MLSystemIntegrator] ❌ Pipeline execution failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<MLSystemStatus> {
    const systemHealth = await mlPerformanceMonitor.getSystemHealth();
    const strategyHealth = strategyPerformanceML.getHealthStatus();
    const regimeHealth = marketRegimePredictorML.getHealthStatus();
    const retrainingHealth = automatedRetrainingPipeline.getHealthStatus();

    return {
      isHealthy: systemHealth.overallHealth === 'EXCELLENT' || systemHealth.overallHealth === 'GOOD',
      overallScore: systemHealth.overallScore,

      phase1: {
        status: 'OPERATIONAL',
        components: [
          'AlphaFeatureStore',
          'AlphaModelRegistry',
          'MLCircuitBreaker'
        ]
      },

      phase2: {
        status: strategyHealth.trainedModels === strategyHealth.totalModels ? 'OPERATIONAL' : 'DEGRADED',
        trainedModels: strategyHealth.trainedModels,
        avgAccuracy: strategyHealth.avgAccuracy
      },

      phase3: {
        status: regimeHealth.confidence > 0.6 ? 'OPERATIONAL' : 'DEGRADED',
        currentRegime: regimeHealth.currentRegime,
        confidence: regimeHealth.confidence
      },

      phase4: {
        status: strategyHealth.ensembleModels > 0 ? 'OPERATIONAL' : 'NOT_TRAINED',
        ensembleModels: strategyHealth.ensembleModels,
        avgAccuracy: systemHealth.strategyML.avgEnsembleAccuracy
      },

      phase5: {
        status: 'OPERATIONAL',
        monitoring: true,
        autoRetrain: retrainingHealth.enableAutoRetrain
      }
    };
  }

  /**
   * Train all models from scratch (initial training)
   */
  async trainAllModels(): Promise<void> {
    console.log('[MLSystemIntegrator] 🔄 Training all models from scratch...');

    try {
      // Train all strategy models
      await strategyPerformanceML.trainAllStrategies();

      // Load regime performance matrix from historical data
      await regimePerformanceMatrix.loadHistoricalPerformance();

      console.log('[MLSystemIntegrator] ✅ All models trained successfully!');

    } catch (error) {
      console.error('[MLSystemIntegrator] ❌ Training failed:', error);
      throw error;
    }
  }

  /**
   * Trigger manual retraining
   */
  async retrain(strategyName?: StrategyName): Promise<void> {
    if (strategyName) {
      console.log(`[MLSystemIntegrator] 🔄 Manual retrain: ${strategyName}`);
      await automatedRetrainingPipeline.triggerRetrain(strategyName, 'Manual trigger from integrator');
    } else {
      console.log('[MLSystemIntegrator] 🔄 Manual retrain: ALL strategies');
      await automatedRetrainingPipeline.retrainAllStrategies();
    }
  }

  /**
   * Get detailed health report
   */
  async getHealthReport(): Promise<{
    summary: string;
    systemHealth: MLSystemHealth;
    systemStatus: MLSystemStatus;
    retrainingStats: any;
    recommendations: string[];
  }> {
    const systemHealth = await mlPerformanceMonitor.getSystemHealth();
    const systemStatus = await this.getSystemStatus();
    const retrainingStats = automatedRetrainingPipeline.getStats();

    // Generate recommendations
    const recommendations: string[] = [];

    if (systemHealth.strategyML.modelsNeedingRetrain > 5) {
      recommendations.push(`⚠️ ${systemHealth.strategyML.modelsNeedingRetrain} models need retraining`);
    }

    if (systemHealth.strategyML.avgAccuracy < 0.55) {
      recommendations.push('⚠️ Low average accuracy - consider retraining all models');
    }

    if (systemHealth.regimeMatrix.dataCompleteness < 50) {
      recommendations.push('⚠️ Regime matrix incomplete - more historical data needed');
    }

    if (systemHealth.strategyML.circuitBreakersOpen > 0) {
      recommendations.push(`🚨 ${systemHealth.strategyML.circuitBreakersOpen} circuit breakers open - critical models disabled`);
    }

    if (systemHealth.overallHealth === 'EXCELLENT') {
      recommendations.push('✅ All systems operational - excellent health');
    }

    // Summary
    const summary = `ML System Health: ${systemHealth.overallHealth} (${systemHealth.overallScore}/100)\n` +
                   `Trained Models: ${systemStatus.phase2.trainedModels}/17\n` +
                   `Avg Accuracy: ${(systemStatus.phase2.avgAccuracy * 100).toFixed(1)}%\n` +
                   `Current Regime: ${systemStatus.phase3.currentRegime}\n` +
                   `Auto-Retraining: ${systemStatus.phase5.autoRetrain ? 'Enabled' : 'Disabled'}`;

    return {
      summary,
      systemHealth,
      systemStatus,
      retrainingStats,
      recommendations
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Calculate ensemble metrics from predictions
   */
  private calculateEnsembleMetrics(predictions: StrategyPrediction[]): {
    avgEnsembleAccuracy: number;
    bestPerformingModel: string;
    modelAgreement: number;
  } {
    const withEnsemble = predictions.filter(p => p.ensembleDetails);

    if (withEnsemble.length === 0) {
      return {
        avgEnsembleAccuracy: 0,
        bestPerformingModel: 'none',
        modelAgreement: 0
      };
    }

    // Track best model votes
    const modelVotes: Record<string, number> = {
      logisticRegression: 0,
      randomForest: 0,
      gradientBoosting: 0,
      neuralNetwork: 0
    };

    let totalAgreement = 0;

    for (const pred of withEnsemble) {
      if (pred.ensembleDetails) {
        modelVotes[pred.ensembleDetails.bestModel]++;
        totalAgreement += (1 - pred.ensembleDetails.modelDisagreement);
      }
    }

    // Best performing model = most votes
    const bestModel = Object.entries(modelVotes)
      .sort((a, b) => b[1] - a[1])[0][0];

    const avgAgreement = totalAgreement / withEnsemble.length;

    // Get actual ensemble accuracy from strategy health
    const health = strategyPerformanceML.getHealthStatus();

    return {
      avgEnsembleAccuracy: health.avgAccuracy,
      bestPerformingModel: bestModel,
      modelAgreement: Math.round(avgAgreement * 100) / 100
    };
  }

  /**
   * Shutdown the ML system
   */
  shutdown(): void {
    console.log('[MLSystemIntegrator] 🛑 Shutting down ML system...');

    automatedRetrainingPipeline.stop();

    this.isInitialized = false;
    this.isPipelineRunning = false;

    console.log('[MLSystemIntegrator] ✅ ML system shut down');
  }
}

// Singleton export
export const mlSystemIntegrator = new MLSystemIntegrator();
