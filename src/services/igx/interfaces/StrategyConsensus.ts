/**
 * IGX BETA V5 INTERFACES
 * Strategy consensus output and related types
 * Production-grade quant trading system
 */

import type { MarketRegime } from '../AdaptiveFrequencyController';

/**
 * Individual strategy signal/recommendation
 */
export interface StrategySignal {
  strategyName: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number; // 0-100 raw confidence
  reasoning: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
  riskReward?: number;
  timestamp: number;
}

/**
 * Strategy health status
 */
export interface StrategyHealth {
  name: string;
  healthy: boolean;
  lastExecutionTime: number; // ms
  errorRate: number; // 0-1
  avgExecutionTime: number; // ms
  consecutiveErrors: number;
  lastError?: string;
  lastSuccess: number; // timestamp
  disabled: boolean;
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformance {
  name: string;
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number; // 0-1
  avgProfit: number; // percentage
  avgLoss: number; // percentage
  profitFactor: number;
  sharpeRatio: number;
  currentWeight: number; // ML weight 0.05-0.3
  lastUpdated: number;
}

/**
 * Main output from Beta V5
 * This is what gets sent to Gamma V2
 */
export interface StrategyConsensus {
  // Basic info
  symbol: string;
  timestamp: number;

  // Direction decision
  direction: 'LONG' | 'SHORT' | null;
  confidence: number; // ML-weighted confidence 0-100
  consensusStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';

  // Quality tier classification for adaptive filtering
  qualityTier: 'HIGH' | 'MEDIUM' | 'LOW';

  // Market regime (for Gamma's regime-aware filtering)
  marketRegime: MarketRegime | null;

  // Winning strategy (highest confidence)
  winningStrategy: string;
  winningStrategyConfidence: number;

  // Vote breakdown (ML-weighted)
  strategyVotes: {
    long: number;    // Weighted votes for LONG
    short: number;   // Weighted votes for SHORT
    neutral: number; // Weighted votes for NEUTRAL
  };

  // Raw vote counts (unweighted)
  rawVotes: {
    long: number;
    short: number;
    neutral: number;
  };

  // Agreement score
  agreementScore: number; // 0-100, how much strategies agree

  // All individual strategy recommendations
  individualRecommendations: StrategySignal[];

  // ML context
  mlWeights: Map<string, number>; // Current ML weights per strategy
  performanceScores: Map<string, number>; // Recent performance scores

  // Reasoning
  reasoning: string[]; // Human-readable explanations

  // Quality metrics
  dataQuality: number; // From input ticker
  executionTime: number; // ms taken to analyze
  strategiesExecuted: number; // How many strategies ran
  strategiesFailed: number; // How many failed
}

/**
 * Beta V5 statistics (for monitoring)
 */
export interface BetaV5Stats {
  // Basic stats
  isRunning: boolean;
  uptime: number; // ms

  // Processing stats
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;

  // Performance
  avgExecutionTime: number; // ms
  p95ExecutionTime: number; // ms
  p99ExecutionTime: number; // ms

  // Strategy stats
  strategiesActive: number;
  strategiesDisabled: number;
  strategiesHealthy: number;
  strategiesUnhealthy: number;

  // ML stats
  currentWeights: Map<string, number>;
  lastWeightUpdate: number;
  totalWeightUpdates: number;

  // Recent performance
  recentWinRate: number; // Last 50 signals
  recentAvgProfit: number;
  recentSharpeRatio: number;

  // Health
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  healthScore: number; // 0-100

  timestamp: number;
}

/**
 * Configuration for Beta V5
 */
export interface BetaV5Config {
  // Execution settings
  strategyTimeout: number; // ms, kill slow strategies
  maxConcurrentStrategies: number; // Parallel execution limit

  // ML settings
  learningRate: number; // Gradient descent learning rate
  momentum: number; // Momentum for gradient descent
  weightDecay: number; // Prevent overfitting
  minWeight: number; // Minimum strategy weight (e.g., 0.05)
  maxWeight: number; // Maximum strategy weight (e.g., 0.3)

  // Health settings
  maxConsecutiveErrors: number; // Auto-disable after N errors
  autoDisableErrorRate: number; // Auto-disable if error rate > X
  healthCheckInterval: number; // ms between health checks

  // Performance settings
  performanceWindowSize: number; // Number of signals to track
  minSignalsForLearning: number; // Need N signals before updating weights

  // Circuit breaker settings
  circuitBreakerThreshold: number; // Disable if win rate < X
  circuitBreakerWindow: number; // Check last N signals
}
