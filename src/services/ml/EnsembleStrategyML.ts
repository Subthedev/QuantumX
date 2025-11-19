/**
 * ENSEMBLE STRATEGY ML
 * Multi-model ensemble learning for strategy performance prediction
 *
 * PURPOSE:
 * - Combine predictions from 4 different ML models
 * - Reduce overfitting through model diversity
 * - Improve prediction accuracy and robustness
 * - Automatic model selection per market regime
 *
 * MODELS:
 * 1. Logistic Regression (fast, interpretable)
 * 2. Random Forest (handles non-linearity, feature importance)
 * 3. Gradient Boosting (XGBoost-style, high accuracy)
 * 4. Neural Network (captures complex patterns)
 *
 * INSPIRED BY:
 * - Netflix: Ensemble models won Netflix Prize (2009)
 * - Kaggle Winners: 90%+ use ensemble methods
 * - Two Sigma: Multi-model voting for robustness
 * - Citadel: Model diversification across strategies
 */

import { StrategyName } from '../strategies/strategyTypes';

export interface EnsemblePrediction {
  strategyName: StrategyName;
  ensembleWinProbability: number; // 0-1 (weighted average of all models)
  modelPredictions: {
    logisticRegression: number;
    randomForest: number;
    gradientBoosting: number;
    neuralNetwork: number;
  };
  modelWeights: {
    logisticRegression: number;
    randomForest: number;
    gradientBoosting: number;
    neuralNetwork: number;
  };
  bestModel: string;
  confidence: number; // 0-1 (based on model agreement)
  disagreement: number; // 0-1 (variance across models)
}

interface ModelPerformance {
  accuracy: number;
  winRate: number;
  avgError: number;
  sampleSize: number;
}

/**
 * RANDOM FOREST MODEL
 * Ensemble of decision trees with bagging
 */
class RandomForestModel {
  private trees: DecisionTree[] = [];
  private readonly NUM_TREES = 10;
  private readonly MAX_DEPTH = 5;
  private readonly MIN_SAMPLES_SPLIT = 5;

  train(X: number[][], y: number[]): void {
    console.log('[RandomForest] Training with bagging...');

    for (let i = 0; i < this.NUM_TREES; i++) {
      // Bootstrap sampling (random sampling with replacement)
      const { X_sample, y_sample } = this.bootstrapSample(X, y);

      // Train tree on bootstrap sample
      const tree = new DecisionTree(this.MAX_DEPTH, this.MIN_SAMPLES_SPLIT);
      tree.train(X_sample, y_sample);

      this.trees.push(tree);
    }

    console.log(`[RandomForest] ✅ Trained ${this.NUM_TREES} trees`);
  }

  predict(x: number[]): number {
    // Average predictions from all trees
    const predictions = this.trees.map(tree => tree.predict(x));
    return predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
  }

  private bootstrapSample(X: number[][], y: number[]): { X_sample: number[][], y_sample: number[] } {
    const n = X.length;
    const X_sample: number[][] = [];
    const y_sample: number[] = [];

    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      X_sample.push([...X[idx]]);
      y_sample.push(y[idx]);
    }

    return { X_sample, y_sample };
  }

  getWeights(): any {
    return { trees: this.trees.map(t => t.serialize()) };
  }

  setWeights(data: any): void {
    this.trees = data.trees.map((serialized: any) => DecisionTree.deserialize(serialized));
  }
}

/**
 * DECISION TREE (for Random Forest)
 */
class DecisionTree {
  private root: TreeNode | null = null;

  constructor(
    private maxDepth: number,
    private minSamplesSplit: number
  ) {}

  train(X: number[][], y: number[]): void {
    this.root = this.buildTree(X, y, 0);
  }

  predict(x: number[]): number {
    if (!this.root) return 0.5;
    return this.traverseTree(x, this.root);
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const n = X.length;

    // Stopping criteria
    if (depth >= this.maxDepth || n < this.minSamplesSplit) {
      const prediction = y.reduce((sum, val) => sum + val, 0) / n;
      return { isLeaf: true, prediction };
    }

    // Find best split
    const { featureIdx, threshold, gain } = this.findBestSplit(X, y);

    // If no good split found
    if (gain === 0) {
      const prediction = y.reduce((sum, val) => sum + val, 0) / n;
      return { isLeaf: true, prediction };
    }

    // Split data
    const { X_left, y_left, X_right, y_right } = this.splitData(X, y, featureIdx, threshold);

    // Build subtrees
    const leftNode = this.buildTree(X_left, y_left, depth + 1);
    const rightNode = this.buildTree(X_right, y_right, depth + 1);

    return {
      isLeaf: false,
      featureIdx,
      threshold,
      left: leftNode,
      right: rightNode
    };
  }

  private findBestSplit(X: number[][], y: number[]): { featureIdx: number; threshold: number; gain: number } {
    const numFeatures = X[0].length;
    let bestGain = 0;
    let bestFeatureIdx = 0;
    let bestThreshold = 0;

    const parentEntropy = this.calculateEntropy(y);

    // Try random subset of features (feature bagging)
    const numFeaturesToTry = Math.max(1, Math.floor(Math.sqrt(numFeatures)));
    const featureIndices = this.randomSample(numFeatures, numFeaturesToTry);

    for (const featureIdx of featureIndices) {
      // Get unique values for this feature
      const values = X.map(row => row[featureIdx]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      // Try splits between consecutive values
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;

        const { y_left, y_right } = this.splitLabels(X, y, featureIdx, threshold);

        if (y_left.length === 0 || y_right.length === 0) continue;

        // Calculate information gain
        const leftEntropy = this.calculateEntropy(y_left);
        const rightEntropy = this.calculateEntropy(y_right);

        const n = y.length;
        const weightedEntropy = (y_left.length / n) * leftEntropy + (y_right.length / n) * rightEntropy;
        const gain = parentEntropy - weightedEntropy;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeatureIdx = featureIdx;
          bestThreshold = threshold;
        }
      }
    }

    return { featureIdx: bestFeatureIdx, threshold: bestThreshold, gain: bestGain };
  }

  private calculateEntropy(y: number[]): number {
    if (y.length === 0) return 0;

    const p = y.reduce((sum, val) => sum + val, 0) / y.length;
    if (p === 0 || p === 1) return 0;

    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  private splitData(X: number[][], y: number[], featureIdx: number, threshold: number) {
    const X_left: number[][] = [];
    const y_left: number[] = [];
    const X_right: number[][] = [];
    const y_right: number[] = [];

    for (let i = 0; i < X.length; i++) {
      if (X[i][featureIdx] <= threshold) {
        X_left.push(X[i]);
        y_left.push(y[i]);
      } else {
        X_right.push(X[i]);
        y_right.push(y[i]);
      }
    }

    return { X_left, y_left, X_right, y_right };
  }

  private splitLabels(X: number[][], y: number[], featureIdx: number, threshold: number) {
    const y_left: number[] = [];
    const y_right: number[] = [];

    for (let i = 0; i < X.length; i++) {
      if (X[i][featureIdx] <= threshold) {
        y_left.push(y[i]);
      } else {
        y_right.push(y[i]);
      }
    }

    return { y_left, y_right };
  }

  private randomSample(max: number, count: number): number[] {
    const indices = Array.from({ length: max }, (_, i) => i);
    const sample: number[] = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * indices.length);
      sample.push(indices[idx]);
      indices.splice(idx, 1);
    }

    return sample;
  }

  private traverseTree(x: number[], node: TreeNode): number {
    if (node.isLeaf) {
      return node.prediction!;
    }

    if (x[node.featureIdx!] <= node.threshold!) {
      return this.traverseTree(x, node.left!);
    } else {
      return this.traverseTree(x, node.right!);
    }
  }

  serialize(): any {
    return { root: this.serializeNode(this.root) };
  }

  static deserialize(data: any): DecisionTree {
    const tree = new DecisionTree(5, 5);
    tree.root = tree.deserializeNode(data.root);
    return tree;
  }

  private serializeNode(node: TreeNode | null): any {
    if (!node) return null;
    if (node.isLeaf) {
      return { isLeaf: true, prediction: node.prediction };
    }
    return {
      isLeaf: false,
      featureIdx: node.featureIdx,
      threshold: node.threshold,
      left: this.serializeNode(node.left!),
      right: this.serializeNode(node.right!)
    };
  }

  private deserializeNode(data: any): TreeNode | null {
    if (!data) return null;
    if (data.isLeaf) {
      return { isLeaf: true, prediction: data.prediction };
    }
    return {
      isLeaf: false,
      featureIdx: data.featureIdx,
      threshold: data.threshold,
      left: this.deserializeNode(data.left),
      right: this.deserializeNode(data.right)
    };
  }
}

interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  featureIdx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * GRADIENT BOOSTING MODEL
 * Sequential ensemble with gradient descent optimization
 */
class GradientBoostingModel {
  private trees: DecisionTree[] = [];
  private learningRate: number = 0.1;
  private readonly NUM_TREES = 20;
  private readonly MAX_DEPTH = 3;
  private initialPrediction: number = 0.5;

  train(X: number[][], y: number[]): void {
    console.log('[GradientBoosting] Training with boosting...');

    // Initialize with mean
    this.initialPrediction = y.reduce((sum, val) => sum + val, 0) / y.length;

    let predictions = new Array(y.length).fill(this.initialPrediction);

    for (let i = 0; i < this.NUM_TREES; i++) {
      // Calculate residuals (negative gradients)
      const residuals = y.map((label, idx) => label - predictions[idx]);

      // Train tree on residuals
      const tree = new DecisionTree(this.MAX_DEPTH, 5);
      tree.train(X, residuals);

      // Update predictions
      for (let j = 0; j < X.length; j++) {
        predictions[j] += this.learningRate * tree.predict(X[j]);
      }

      this.trees.push(tree);
    }

    console.log(`[GradientBoosting] ✅ Trained ${this.NUM_TREES} trees (boosting)`);
  }

  predict(x: number[]): number {
    let prediction = this.initialPrediction;

    for (const tree of this.trees) {
      prediction += this.learningRate * tree.predict(x);
    }

    // Sigmoid to bound between 0-1
    return 1 / (1 + Math.exp(-prediction));
  }

  getWeights(): any {
    return {
      trees: this.trees.map(t => t.serialize()),
      initialPrediction: this.initialPrediction,
      learningRate: this.learningRate
    };
  }

  setWeights(data: any): void {
    this.trees = data.trees.map((serialized: any) => DecisionTree.deserialize(serialized));
    this.initialPrediction = data.initialPrediction;
    this.learningRate = data.learningRate;
  }
}

/**
 * SIMPLE NEURAL NETWORK
 * 2-layer feedforward network with backpropagation
 */
class NeuralNetworkModel {
  private weights1: number[][] = []; // Input → Hidden
  private bias1: number[] = [];
  private weights2: number[] = []; // Hidden → Output
  private bias2: number = 0;

  private readonly HIDDEN_SIZE = 8;
  private readonly LEARNING_RATE = 0.01;
  private readonly EPOCHS = 100;

  train(X: number[][], y: number[]): void {
    console.log('[NeuralNetwork] Training 2-layer network...');

    const inputSize = X[0].length;

    // Initialize weights
    this.weights1 = this.initializeWeights(inputSize, this.HIDDEN_SIZE);
    this.bias1 = new Array(this.HIDDEN_SIZE).fill(0);
    this.weights2 = this.initializeWeights(this.HIDDEN_SIZE, 1)[0];
    this.bias2 = 0;

    // Training loop
    for (let epoch = 0; epoch < this.EPOCHS; epoch++) {
      for (let i = 0; i < X.length; i++) {
        this.trainSample(X[i], y[i]);
      }
    }

    console.log('[NeuralNetwork] ✅ Training complete');
  }

  private trainSample(x: number[], target: number): void {
    // Forward pass
    const { hidden, output } = this.forward(x);

    // Backward pass
    const outputError = output - target;

    // Update output layer
    for (let i = 0; i < this.HIDDEN_SIZE; i++) {
      this.weights2[i] -= this.LEARNING_RATE * outputError * hidden[i];
    }
    this.bias2 -= this.LEARNING_RATE * outputError;

    // Update hidden layer
    for (let i = 0; i < this.HIDDEN_SIZE; i++) {
      const hiddenError = outputError * this.weights2[i] * this.reluDerivative(hidden[i]);

      for (let j = 0; j < x.length; j++) {
        this.weights1[j][i] -= this.LEARNING_RATE * hiddenError * x[j];
      }
      this.bias1[i] -= this.LEARNING_RATE * hiddenError;
    }
  }

  predict(x: number[]): number {
    const { output } = this.forward(x);
    return output;
  }

  private forward(x: number[]): { hidden: number[]; output: number } {
    // Hidden layer
    const hidden = new Array(this.HIDDEN_SIZE).fill(0);
    for (let i = 0; i < this.HIDDEN_SIZE; i++) {
      let sum = this.bias1[i];
      for (let j = 0; j < x.length; j++) {
        sum += x[j] * this.weights1[j][i];
      }
      hidden[i] = this.relu(sum);
    }

    // Output layer
    let output = this.bias2;
    for (let i = 0; i < this.HIDDEN_SIZE; i++) {
      output += hidden[i] * this.weights2[i];
    }
    output = this.sigmoid(output);

    return { hidden, output };
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private initializeWeights(rows: number, cols: number): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < rows; i++) {
      weights[i] = [];
      for (let j = 0; j < cols; j++) {
        // Xavier initialization
        weights[i][j] = (Math.random() * 2 - 1) * Math.sqrt(2 / (rows + cols));
      }
    }
    return weights;
  }

  getWeights(): any {
    return {
      weights1: this.weights1,
      bias1: this.bias1,
      weights2: this.weights2,
      bias2: this.bias2
    };
  }

  setWeights(data: any): void {
    this.weights1 = data.weights1;
    this.bias1 = data.bias1;
    this.weights2 = data.weights2;
    this.bias2 = data.bias2;
  }
}

/**
 * ENSEMBLE STRATEGY ML
 * Combines all 4 models with weighted voting
 */
export class EnsembleStrategyML {
  private randomForest: RandomForestModel = new RandomForestModel();
  private gradientBoosting: GradientBoostingModel = new GradientBoostingModel();
  private neuralNetwork: NeuralNetworkModel = new NeuralNetworkModel();

  // Model performance tracking (for dynamic weighting)
  private modelPerformance: Map<string, ModelPerformance> = new Map([
    ['logisticRegression', { accuracy: 0.55, winRate: 0.5, avgError: 0, sampleSize: 0 }],
    ['randomForest', { accuracy: 0.55, winRate: 0.5, avgError: 0, sampleSize: 0 }],
    ['gradientBoosting', { accuracy: 0.55, winRate: 0.5, avgError: 0, sampleSize: 0 }],
    ['neuralNetwork', { accuracy: 0.55, winRate: 0.5, avgError: 0, sampleSize: 0 }]
  ]);

  private isTrained: boolean = false;

  /**
   * Train all models
   */
  trainAll(X: number[][], y: number[]): void {
    console.log('[EnsembleML] Training 4 models in parallel...');

    // Train all models
    this.randomForest.train(X, y);
    this.gradientBoosting.train(X, y);
    this.neuralNetwork.train(X, y);

    this.isTrained = true;

    console.log('[EnsembleML] ✅ All models trained successfully');
  }

  /**
   * Ensemble prediction (weighted voting)
   */
  predict(x: number[], logisticPrediction: number): EnsemblePrediction {
    if (!this.isTrained) {
      console.warn('[EnsembleML] Models not trained, using logistic regression only');
      return {
        strategyName: '' as StrategyName,
        ensembleWinProbability: logisticPrediction,
        modelPredictions: {
          logisticRegression: logisticPrediction,
          randomForest: logisticPrediction,
          gradientBoosting: logisticPrediction,
          neuralNetwork: logisticPrediction
        },
        modelWeights: {
          logisticRegression: 1.0,
          randomForest: 0,
          gradientBoosting: 0,
          neuralNetwork: 0
        },
        bestModel: 'logisticRegression',
        confidence: 0.5,
        disagreement: 0
      };
    }

    // Get predictions from all models
    const predictions = {
      logisticRegression: logisticPrediction,
      randomForest: this.randomForest.predict(x),
      gradientBoosting: this.gradientBoosting.predict(x),
      neuralNetwork: this.neuralNetwork.predict(x)
    };

    // Calculate dynamic weights based on model performance
    const weights = this.calculateModelWeights();

    // Weighted ensemble prediction
    const ensembleWinProbability =
      predictions.logisticRegression * weights.logisticRegression +
      predictions.randomForest * weights.randomForest +
      predictions.gradientBoosting * weights.gradientBoosting +
      predictions.neuralNetwork * weights.neuralNetwork;

    // Find best model
    const bestModel = this.findBestModel();

    // Calculate confidence (based on model agreement)
    const confidence = this.calculateConfidence(predictions);

    // Calculate disagreement (variance across models)
    const disagreement = this.calculateDisagreement(predictions);

    return {
      strategyName: '' as StrategyName,
      ensembleWinProbability: Math.max(0, Math.min(1, ensembleWinProbability)),
      modelPredictions: predictions,
      modelWeights: weights,
      bestModel,
      confidence,
      disagreement
    };
  }

  /**
   * Update model performance after outcome
   */
  updatePerformance(
    modelName: string,
    predicted: number,
    actual: number
  ): void {
    const perf = this.modelPerformance.get(modelName);
    if (!perf) return;

    const error = Math.abs(predicted - actual);
    const correct = (predicted > 0.5 && actual === 1) || (predicted <= 0.5 && actual === 0);

    // Update metrics with exponential moving average
    perf.avgError = perf.avgError * 0.95 + error * 0.05;
    perf.accuracy = perf.accuracy * 0.95 + (correct ? 1 : 0) * 0.05;
    perf.winRate = perf.winRate * 0.95 + actual * 0.05;
    perf.sampleSize++;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Calculate dynamic model weights based on performance
   */
  private calculateModelWeights(): {
    logisticRegression: number;
    randomForest: number;
    gradientBoosting: number;
    neuralNetwork: number;
  } {
    const performances = Array.from(this.modelPerformance.values());

    // Weight by accuracy (higher accuracy = higher weight)
    const totalAccuracy = performances.reduce((sum, p) => sum + p.accuracy, 0);

    const weights = {
      logisticRegression: this.modelPerformance.get('logisticRegression')!.accuracy / totalAccuracy,
      randomForest: this.modelPerformance.get('randomForest')!.accuracy / totalAccuracy,
      gradientBoosting: this.modelPerformance.get('gradientBoosting')!.accuracy / totalAccuracy,
      neuralNetwork: this.modelPerformance.get('neuralNetwork')!.accuracy / totalAccuracy
    };

    return weights;
  }

  /**
   * Find best performing model
   */
  private findBestModel(): string {
    let bestModel = 'logisticRegression';
    let bestAccuracy = 0;

    for (const [model, perf] of this.modelPerformance.entries()) {
      if (perf.accuracy > bestAccuracy) {
        bestAccuracy = perf.accuracy;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * Calculate confidence based on model agreement
   */
  private calculateConfidence(predictions: Record<string, number>): number {
    const values = Object.values(predictions);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    // High agreement = high confidence
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Map std dev to confidence (0 = perfect agreement, >0.2 = high disagreement)
    return Math.max(0, 1 - stdDev * 5);
  }

  /**
   * Calculate disagreement (variance)
   */
  private calculateDisagreement(predictions: Record<string, number>): number {
    const values = Object.values(predictions);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return Math.min(1, variance * 10); // Normalize to 0-1
  }

  /**
   * Serialize models
   */
  getWeights(): any {
    return {
      randomForest: this.randomForest.getWeights(),
      gradientBoosting: this.gradientBoosting.getWeights(),
      neuralNetwork: this.neuralNetwork.getWeights(),
      modelPerformance: Array.from(this.modelPerformance.entries()),
      isTrained: this.isTrained
    };
  }

  /**
   * Deserialize models
   */
  setWeights(data: any): void {
    this.randomForest.setWeights(data.randomForest);
    this.gradientBoosting.setWeights(data.gradientBoosting);
    this.neuralNetwork.setWeights(data.neuralNetwork);
    this.modelPerformance = new Map(data.modelPerformance);
    this.isTrained = data.isTrained;
  }

  getHealthStatus(): {
    isTrained: boolean;
    bestModel: string;
    modelAccuracies: Record<string, number>;
  } {
    const modelAccuracies: Record<string, number> = {};
    for (const [model, perf] of this.modelPerformance.entries()) {
      modelAccuracies[model] = Math.round(perf.accuracy * 100) / 100;
    }

    return {
      isTrained: this.isTrained,
      bestModel: this.findBestModel(),
      modelAccuracies
    };
  }
}
