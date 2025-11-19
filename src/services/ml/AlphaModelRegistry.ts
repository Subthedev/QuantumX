/**
 * ALPHA MODEL REGISTRY
 * Production-grade ML model versioning, A/B testing, and rollback
 *
 * PURPOSE:
 * - Track all ML model versions with metadata
 * - Enable A/B testing (traffic splitting between model versions)
 * - Allow instant rollback to previous versions
 * - Production-grade: Inspired by Uber's MLOps and Netflix's model management
 *
 * FEATURES:
 * - Version tracking with timestamps
 * - Model promotion (TESTING → ACTIVE → DEPRECATED)
 * - A/B testing with configurable traffic split
 * - Performance metrics per version
 * - IndexedDB persistence for model metadata
 */

export interface MLModel {
  predict(features: number[]): Promise<number>;
  train?(data: TrainingData): Promise<void>;
  evaluate?(data: TrainingData): Promise<ModelMetrics>;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  sampleSize: number;
}

export interface ModelMetadata {
  modelName: string;
  version: string;
  createdAt: number;
  createdBy: string;
  description: string;
  featureNames: string[];
  hyperparameters: Record<string, any>;
  trainingMetrics?: ModelMetrics;
  productionMetrics?: ModelMetrics;
  status: 'TESTING' | 'ACTIVE' | 'DEPRECATED';
  tags: string[];
}

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  model: MLModel;
  metadata: ModelMetadata;
}

export interface ABTestConfig {
  modelName: string;
  modelA: ModelVersion;
  modelB: ModelVersion;
  trafficSplit: number; // 0-1 (0 = all A, 1 = all B, 0.5 = 50/50)
  startedAt: number;
  predictions: {
    A: Array<{ prediction: number; outcome?: 'WIN' | 'LOSS'; timestamp: number }>;
    B: Array<{ prediction: number; outcome?: 'WIN' | 'LOSS'; timestamp: number }>;
  };
}

export class AlphaModelRegistry {
  private models: Map<string, ModelVersion[]> = new Map();
  private activeModels: Map<string, string> = new Map(); // modelName → versionId
  private abTests: Map<string, ABTestConfig> = new Map(); // modelName → config
  private predictionLogs: Array<{
    modelName: string;
    versionId: string;
    variant: 'A' | 'B' | 'ACTIVE';
    prediction: number;
    timestamp: number;
  }> = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register a new model version
   */
  async registerModel(
    modelName: string,
    version: string,
    model: MLModel,
    metadata: Omit<ModelMetadata, 'modelName' | 'version' | 'createdAt' | 'status'>
  ): Promise<string> {
    const versionId = `${modelName}-v${version}`;

    const modelVersion: ModelVersion = {
      id: versionId,
      name: modelName,
      version,
      model,
      metadata: {
        modelName,
        version,
        createdAt: Date.now(),
        status: 'TESTING', // New models start in TESTING
        ...metadata
      }
    };

    // Add to registry
    if (!this.models.has(modelName)) {
      this.models.set(modelName, []);
    }

    this.models.get(modelName)!.push(modelVersion);

    console.log(`[ModelRegistry] Registered ${versionId} (status: TESTING)`);

    // Persist metadata
    await this.persistMetadata();

    return versionId;
  }

  /**
   * Get a specific model version
   */
  getModel(modelName: string, versionId?: string): MLModel | null {
    const versions = this.models.get(modelName);
    if (!versions || versions.length === 0) return null;

    if (versionId) {
      const found = versions.find(v => v.id === versionId);
      return found?.model || null;
    }

    // Return active version
    const activeId = this.activeModels.get(modelName);
    if (activeId) {
      const found = versions.find(v => v.id === activeId);
      return found?.model || null;
    }

    // Fallback to latest ACTIVE or TESTING
    const active = versions.find(v => v.metadata.status === 'ACTIVE');
    if (active) return active.model;

    const testing = versions.find(v => v.metadata.status === 'TESTING');
    return testing?.model || null;
  }

  /**
   * Predict with model (handles A/B testing automatically)
   */
  async predict(modelName: string, features: number[]): Promise<number> {
    const abTest = this.abTests.get(modelName);

    if (abTest) {
      // A/B test active - split traffic
      const useB = Math.random() < abTest.trafficSplit;
      const variant = useB ? 'B' : 'A';
      const model = useB ? abTest.modelB.model : abTest.modelA.model;

      const prediction = await model.predict(features);

      // Log prediction for A/B analysis
      this.logABPrediction(modelName, variant, prediction);
      abTest.predictions[variant].push({ prediction, timestamp: Date.now() });

      console.log(`[ModelRegistry] A/B Test: ${modelName} using variant ${variant}`);

      return prediction;
    } else {
      // Use active model
      const model = this.getModel(modelName);
      if (!model) {
        throw new Error(`[ModelRegistry] No model found for ${modelName}`);
      }

      const prediction = await model.predict(features);

      // Log prediction
      const activeId = this.activeModels.get(modelName) || 'unknown';
      this.logPrediction(modelName, activeId, 'ACTIVE', prediction);

      return prediction;
    }
  }

  /**
   * Promote model to ACTIVE status
   */
  async promoteModel(modelName: string, version: string): Promise<void> {
    const versionId = `${modelName}-v${version}`;
    const versions = this.models.get(modelName);

    if (!versions) {
      throw new Error(`[ModelRegistry] Model ${modelName} not found`);
    }

    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion) {
      throw new Error(`[ModelRegistry] Version ${versionId} not found`);
    }

    // Demote current active model
    const currentActiveId = this.activeModels.get(modelName);
    if (currentActiveId) {
      const currentActive = versions.find(v => v.id === currentActiveId);
      if (currentActive) {
        currentActive.metadata.status = 'DEPRECATED';
        console.log(`[ModelRegistry] Demoted ${currentActiveId} to DEPRECATED`);
      }
    }

    // Promote new model
    targetVersion.metadata.status = 'ACTIVE';
    this.activeModels.set(modelName, versionId);

    console.log(`[ModelRegistry] ✅ Promoted ${versionId} to ACTIVE`);

    await this.persistMetadata();
  }

  /**
   * Rollback to previous version
   */
  async rollback(modelName: string): Promise<void> {
    const versions = this.models.get(modelName);
    if (!versions || versions.length === 0) {
      throw new Error(`[ModelRegistry] No versions found for ${modelName}`);
    }

    const currentActiveId = this.activeModels.get(modelName);
    const currentActive = versions.find(v => v.id === currentActiveId);

    if (!currentActive) {
      throw new Error(`[ModelRegistry] No active version to rollback from`);
    }

    // Find previous DEPRECATED version (most recent before current)
    const previousVersions = versions.filter(v =>
      v.metadata.status === 'DEPRECATED' &&
      v.metadata.createdAt < currentActive.metadata.createdAt
    ).sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);

    if (previousVersions.length === 0) {
      throw new Error(`[ModelRegistry] No previous version available for rollback`);
    }

    const previousVersion = previousVersions[0];

    // Perform rollback
    currentActive.metadata.status = 'DEPRECATED';
    previousVersion.metadata.status = 'ACTIVE';
    this.activeModels.set(modelName, previousVersion.id);

    console.log(`[ModelRegistry] ⏪ Rolled back ${modelName} from ${currentActive.version} to ${previousVersion.version}`);

    await this.persistMetadata();
  }

  /**
   * Start A/B test between two model versions
   */
  async startABTest(
    modelName: string,
    versionA: string,
    versionB: string,
    trafficSplit: number = 0.5
  ): Promise<void> {
    const versions = this.models.get(modelName);
    if (!versions) {
      throw new Error(`[ModelRegistry] Model ${modelName} not found`);
    }

    const modelA = versions.find(v => v.id === `${modelName}-v${versionA}`);
    const modelB = versions.find(v => v.id === `${modelName}-v${versionB}`);

    if (!modelA || !modelB) {
      throw new Error(`[ModelRegistry] One or both versions not found`);
    }

    const abTest: ABTestConfig = {
      modelName,
      modelA,
      modelB,
      trafficSplit,
      startedAt: Date.now(),
      predictions: { A: [], B: [] }
    };

    this.abTests.set(modelName, abTest);

    console.log(`[ModelRegistry] 🧪 A/B Test started: ${modelName}`);
    console.log(`[ModelRegistry]    Version A: ${versionA} (${(1 - trafficSplit) * 100}% traffic)`);
    console.log(`[ModelRegistry]    Version B: ${versionB} (${trafficSplit * 100}% traffic)`);

    await this.persistMetadata();
  }

  /**
   * Stop A/B test and analyze results
   */
  async stopABTest(modelName: string, promoteWinner: boolean = false): Promise<ABTestResults> {
    const abTest = this.abTests.get(modelName);
    if (!abTest) {
      throw new Error(`[ModelRegistry] No A/B test running for ${modelName}`);
    }

    // Calculate metrics for both variants
    const resultsA = this.calculateABTestMetrics(abTest.predictions.A);
    const resultsB = this.calculateABTestMetrics(abTest.predictions.B);

    const results: ABTestResults = {
      modelName,
      versionA: abTest.modelA.version,
      versionB: abTest.modelB.version,
      metricsA: resultsA,
      metricsB: resultsB,
      duration: Date.now() - abTest.startedAt,
      winner: this.determineWinner(resultsA, resultsB),
      statistically_significant: this.isStatisticallySignificant(resultsA, resultsB)
    };

    console.log(`[ModelRegistry] 📊 A/B Test Results for ${modelName}:`);
    console.log(`[ModelRegistry]    Version A: ${resultsA.winRate.toFixed(1)}% win rate (${resultsA.sampleSize} samples)`);
    console.log(`[ModelRegistry]    Version B: ${resultsB.winRate.toFixed(1)}% win rate (${resultsB.sampleSize} samples)`);
    console.log(`[ModelRegistry]    Winner: ${results.winner}`);
    console.log(`[ModelRegistry]    Statistically significant: ${results.statistically_significant}`);

    // Promote winner if requested
    if (promoteWinner && results.winner && results.statistically_significant) {
      const winnerVersion = results.winner === 'A' ? abTest.modelA.version : abTest.modelB.version;
      await this.promoteModel(modelName, winnerVersion);
      console.log(`[ModelRegistry] ✅ Promoted winner: Version ${winnerVersion}`);
    }

    // Stop A/B test
    this.abTests.delete(modelName);
    await this.persistMetadata();

    return results;
  }

  /**
   * Record outcome for A/B test prediction
   */
  recordABTestOutcome(modelName: string, variant: 'A' | 'B', outcome: 'WIN' | 'LOSS'): void {
    const abTest = this.abTests.get(modelName);
    if (!abTest) return;

    const predictions = abTest.predictions[variant];
    if (predictions.length > 0) {
      // Assign outcome to most recent prediction without outcome
      for (let i = predictions.length - 1; i >= 0; i--) {
        if (!predictions[i].outcome) {
          predictions[i].outcome = outcome;
          break;
        }
      }
    }
  }

  /**
   * Get all model versions for a model
   */
  getVersions(modelName: string): ModelVersion[] {
    return this.models.get(modelName) || [];
  }

  /**
   * Get metadata for a specific version
   */
  getMetadata(modelName: string, versionId: string): ModelMetadata | null {
    const versions = this.models.get(modelName);
    if (!versions) return null;

    const version = versions.find(v => v.id === versionId);
    return version?.metadata || null;
  }

  /**
   * Get active model version ID
   */
  getActiveVersion(modelName: string): string | null {
    return this.activeModels.get(modelName) || null;
  }

  /**
   * Check if A/B test is running
   */
  isABTestRunning(modelName: string): boolean {
    return this.abTests.has(modelName);
  }

  // ===== PRIVATE HELPERS =====

  private logPrediction(modelName: string, versionId: string, variant: 'A' | 'B' | 'ACTIVE', prediction: number): void {
    this.predictionLogs.push({
      modelName,
      versionId,
      variant,
      prediction,
      timestamp: Date.now()
    });

    // Keep only last 1000 predictions
    if (this.predictionLogs.length > 1000) {
      this.predictionLogs = this.predictionLogs.slice(-1000);
    }
  }

  private logABPrediction(modelName: string, variant: 'A' | 'B', prediction: number): void {
    const abTest = this.abTests.get(modelName);
    if (!abTest) return;

    const versionId = variant === 'A' ? abTest.modelA.id : abTest.modelB.id;
    this.logPrediction(modelName, versionId, variant, prediction);
  }

  private calculateABTestMetrics(predictions: ABTestConfig['predictions']['A']): ABTestMetrics {
    const withOutcomes = predictions.filter(p => p.outcome);
    const wins = withOutcomes.filter(p => p.outcome === 'WIN').length;
    const losses = withOutcomes.filter(p => p.outcome === 'LOSS').length;
    const total = withOutcomes.length;

    return {
      sampleSize: total,
      winRate: total > 0 ? (wins / total) * 100 : 0,
      avgPrediction: predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length || 0
    };
  }

  private determineWinner(metricsA: ABTestMetrics, metricsB: ABTestMetrics): 'A' | 'B' | 'TIE' | null {
    if (metricsA.sampleSize < 20 || metricsB.sampleSize < 20) {
      return null; // Not enough data
    }

    const diff = Math.abs(metricsA.winRate - metricsB.winRate);
    if (diff < 2) return 'TIE'; // Less than 2% difference

    return metricsA.winRate > metricsB.winRate ? 'A' : 'B';
  }

  private isStatisticallySignificant(metricsA: ABTestMetrics, metricsB: ABTestMetrics): boolean {
    // Simple z-test for proportions
    if (metricsA.sampleSize < 30 || metricsB.sampleSize < 30) return false;

    const p1 = metricsA.winRate / 100;
    const p2 = metricsB.winRate / 100;
    const n1 = metricsA.sampleSize;
    const n2 = metricsB.sampleSize;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    const zScore = Math.abs(p1 - p2) / se;

    // z > 1.96 means p < 0.05 (95% confidence)
    return zScore > 1.96;
  }

  // ===== PERSISTENCE =====

  private async persistMetadata(): Promise<void> {
    try {
      const metadata = {
        models: Array.from(this.models.entries()).map(([name, versions]) => ({
          name,
          versions: versions.map(v => ({
            id: v.id,
            version: v.version,
            metadata: v.metadata
          }))
        })),
        activeModels: Array.from(this.activeModels.entries()),
        abTests: Array.from(this.abTests.entries()).map(([name, config]) => ({
          name,
          config: {
            ...config,
            modelA: { id: config.modelA.id, version: config.modelA.version },
            modelB: { id: config.modelB.id, version: config.modelB.version }
          }
        }))
      };

      localStorage.setItem('alpha-model-registry', JSON.stringify(metadata));
      console.log('[ModelRegistry] Metadata persisted to localStorage');
    } catch (error) {
      console.error('[ModelRegistry] Error persisting metadata:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('alpha-model-registry');
      if (!stored) return;

      const metadata = JSON.parse(stored);

      // Restore active models
      this.activeModels = new Map(metadata.activeModels || []);

      console.log('[ModelRegistry] Metadata loaded from localStorage');
    } catch (error) {
      console.error('[ModelRegistry] Error loading metadata:', error);
    }
  }
}

interface ABTestMetrics {
  sampleSize: number;
  winRate: number;
  avgPrediction: number;
}

interface ABTestResults {
  modelName: string;
  versionA: string;
  versionB: string;
  metricsA: ABTestMetrics;
  metricsB: ABTestMetrics;
  duration: number;
  winner: 'A' | 'B' | 'TIE' | null;
  statistically_significant: boolean;
}

// Singleton export
export const alphaModelRegistry = new AlphaModelRegistry();
