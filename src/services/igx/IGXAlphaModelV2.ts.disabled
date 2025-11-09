/**
 * IGX Alpha Model V2 - Enhanced
 * Goal-oriented, statistically-driven threshold management
 * Dynamically adjusts to achieve 25% monthly returns
 */

import { marketConditionAnalyzer } from './MarketConditionAnalyzer';
import { statisticalThresholdCalculator } from './StatisticalThresholdCalculator';
import { goalAchievementEngine } from './GoalAchievementEngine';
import { alphaGammaCommunicator } from './AlphaGammaCommunicator';
import type {
  AlphaModeV2,
  AlphaStrategyV2,
  AlphaDecision,
  AlphaPerformance,
  GammaCommand,
  GammaMode,
  MarketRegime,
  ThresholdSet
} from '@/types/igx-enhanced';

export class IGXAlphaModelV2 {
  private currentMode: AlphaModeV2 = 'BALANCED';
  private lastDecision: AlphaDecision | null = null;
  private lastDecisionTime = 0;
  private readonly MIN_DECISION_INTERVAL = 14400000; // 4 hours minimum

  // Performance tracking
  private performance: AlphaPerformance = {
    totalDecisions: 0,
    modeHistory: [],
    averageDecisionLatency: 0,
    thresholdAdjustments: 0,
    gammaCommandsIssued: 0,
    goalsMet: 0,
    goalsMissed: 0
  };

  // Strategy configurations
  private readonly STRATEGIES: Record<AlphaModeV2, AlphaStrategyV2> = {
    ULTRA_QUALITY: {
      mode: 'ULTRA_QUALITY',
      thresholds: {
        patternStrength: 80,
        consensusThreshold: 0.70,
        riskReward: 3.0,
        liquidityMin: 100,
        dataQualityMin: 80
      },
      targets: {
        signalsPerDay: 2,
        minWinRate: 70,
        targetReturnPerTrade: 4.0
      },
      gammaCommand: 'STRICT',
      description: 'Ultra-high quality, perfect execution only'
    },
    HIGH_QUALITY: {
      mode: 'HIGH_QUALITY',
      thresholds: {
        patternStrength: 70,
        consensusThreshold: 0.65,
        riskReward: 2.5,
        liquidityMin: 75,
        dataQualityMin: 70
      },
      targets: {
        signalsPerDay: 4,
        minWinRate: 65,
        targetReturnPerTrade: 3.0
      },
      gammaCommand: 'STRICT',
      description: 'High-quality signals, strong confidence'
    },
    BALANCED: {
      mode: 'BALANCED',
      thresholds: {
        patternStrength: 60,
        consensusThreshold: 0.55,
        riskReward: 2.0,
        liquidityMin: 50,
        dataQualityMin: 60
      },
      targets: {
        signalsPerDay: 8,
        minWinRate: 55,
        targetReturnPerTrade: 2.0
      },
      gammaCommand: 'SELECTIVE',
      description: 'Balanced approach, quality and quantity'
    },
    VOLUME: {
      mode: 'VOLUME',
      thresholds: {
        patternStrength: 50,
        consensusThreshold: 0.50,
        riskReward: 1.8,
        liquidityMin: 40,
        dataQualityMin: 50
      },
      targets: {
        signalsPerDay: 12,
        minWinRate: 50,
        targetReturnPerTrade: 1.5
      },
      gammaCommand: 'SELECTIVE',
      description: 'Volume mode, more signals with acceptable quality'
    },
    FLOOD: {
      mode: 'FLOOD',
      thresholds: {
        patternStrength: 40,
        consensusThreshold: 0.45,
        riskReward: 1.5,
        liquidityMin: 30,
        dataQualityMin: 40
      },
      targets: {
        signalsPerDay: 20,
        minWinRate: 45,
        targetReturnPerTrade: 1.0
      },
      gammaCommand: 'FLOOD',
      description: 'Signal flooding, aggressive catch-up mode'
    }
  };

  private isRunning = false;
  private analysisTimer: NodeJS.Timeout | null = null;

  /**
   * Start the Alpha Model
   */
  start() {
    if (this.isRunning) {
      console.warn('[Alpha V2] Already running');
      return;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 IGX ALPHA MODEL V2 - INITIALIZING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.isRunning = true;

    // Make initial decision
    this.analyzeAndDecide();

    // Schedule periodic analysis (every 4 hours)
    this.analysisTimer = setInterval(() => {
      this.analyzeAndDecide();
    }, this.MIN_DECISION_INTERVAL);

    console.log('[Alpha V2] ✅ Started successfully\n');
  }

  /**
   * Stop the Alpha Model
   */
  stop() {
    console.log('\n[Alpha V2] Shutting down...');

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }

    this.isRunning = false;
    console.log('[Alpha V2] ✅ Stopped\n');
  }

  /**
   * Main decision engine - analyzes conditions and makes strategic decisions
   */
  analyzeAndDecide(): AlphaDecision {
    const startTime = Date.now();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 ALPHA MODEL V2 - DECISION ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Analyze market conditions
    const marketMetrics = marketConditionAnalyzer.analyzeMarket('BTCUSDT');
    const regime = marketConditionAnalyzer.detectRegime();

    console.log('[Alpha V2] 📊 Market Analysis:');
    console.log(`  Composite Score: ${marketMetrics.compositeScore.toFixed(1)}/100`);
    console.log(`  Regime: ${regime.regime} (${regime.confidence.toFixed(0)}% confidence)`);
    console.log(`  ${regime.description}\n`);

    // Publish market updates
    alphaGammaCommunicator.publishMarketUpdate(marketMetrics);
    alphaGammaCommunicator.publishRegimeChange(regime);

    // 2. Get goal progress
    const goalProgress = goalAchievementEngine.getGoalProgress();
    const strategicRec = goalAchievementEngine.getStrategicRecommendation();

    console.log('[Alpha V2] 🎯 Goal Progress:');
    console.log(`  Monthly: ${goalProgress.monthly.currentReturn.toFixed(2)}% / ${goalProgress.monthly.targetReturn}%`);
    console.log(`  Status: ${goalProgress.monthly.onTrack ? '✅ ON TRACK' : '⚠️  BEHIND'}`);
    console.log(`  Deviation: ${goalProgress.monthly.deviation > 0 ? '+' : ''}${goalProgress.monthly.deviation.toFixed(1)}%`);
    console.log(`  Required Daily: ${goalProgress.monthly.requiredDailyReturn.toFixed(2)}%\n`);

    console.log('[Alpha V2] 💡 Strategic Recommendation:');
    console.log(`  Strategy: ${strategicRec.strategy}`);
    console.log(`  Risk Level: ${strategicRec.riskLevel}`);
    console.log(`  Reasoning:`);
    strategicRec.reasoning.forEach(r => console.log(`    ${r}`));
    console.log('');

    // 3. Select mode based on strategy recommendation
    const selectedMode = this.selectMode(strategicRec.strategy, regime.regime, marketMetrics.compositeScore);

    console.log(`[Alpha V2] 🎚️  Mode Selected: ${selectedMode}`);
    console.log(`  Previous: ${this.currentMode}\n`);

    // 4. Calculate dynamic thresholds
    const thresholds = statisticalThresholdCalculator.calculateThresholds({
      marketCompositeScore: marketMetrics.compositeScore,
      regime: regime.regime,
      goalProgressPercent: goalProgress.monthly.deviation,
      daysRemainingInMonth: goalProgress.monthly.daysRemaining
    });

    console.log('[Alpha V2] 📐 Dynamic Thresholds:');
    console.log(`  Pattern Strength: ${thresholds.patternStrength.finalValue.toFixed(1)}`);
    console.log(`  Consensus: ${(thresholds.consensusThreshold.finalValue / 100).toFixed(2)}`);
    console.log(`  Risk/Reward: ${(thresholds.riskReward.finalValue / 50).toFixed(2)}:1`);
    console.log(`  Liquidity: ${thresholds.liquidityMin.finalValue.toFixed(0)}`);
    console.log(`  Data Quality: ${thresholds.dataQualityMin.finalValue.toFixed(0)}\n`);

    // 5. Generate Gamma command
    const gammaCommand = this.generateGammaCommand(
      selectedMode,
      strategicRec,
      goalProgress.monthly.deviation,
      goalProgress.monthly.daysRemaining
    );

    console.log('[Alpha V2] 📡 Gamma Command:');
    console.log(`  Mode: ${gammaCommand.mode}`);
    console.log(`  Priority: ${gammaCommand.priority}`);
    console.log(`  Duration: ${(gammaCommand.duration / 60000).toFixed(0)} minutes`);
    console.log(`  Reason: ${gammaCommand.reason}\n`);

    // 6. Construct decision
    const reasoning: string[] = [];
    reasoning.push(`Market composite score: ${marketMetrics.compositeScore.toFixed(1)}/100`);
    reasoning.push(`Regime: ${regime.regime} (${regime.confidence.toFixed(0)}% confidence)`);
    reasoning.push(`Goal deviation: ${goalProgress.monthly.deviation > 0 ? '+' : ''}${goalProgress.monthly.deviation.toFixed(1)}%`);
    reasoning.push(`Days remaining: ${goalProgress.monthly.daysRemaining}`);
    reasoning.push(`Strategic recommendation: ${strategicRec.strategy}`);
    reasoning.push(`Selected mode: ${selectedMode}`);

    const decision: AlphaDecision = {
      mode: selectedMode,
      reasoning,
      thresholds,
      gammaCommand,
      marketCondition: marketMetrics,
      goalProgress,
      confidence: this.calculateConfidence(marketMetrics, regime, goalProgress),
      validUntil: Date.now() + this.MIN_DECISION_INTERVAL,
      timestamp: Date.now()
    };

    // 7. Track mode change
    if (selectedMode !== this.currentMode) {
      this.trackModeChange(this.currentMode, selectedMode);
      alphaGammaCommunicator.notifyAlphaModeChange(this.currentMode, selectedMode, reasoning.join('; '));
    }

    this.currentMode = selectedMode;
    this.lastDecision = decision;
    this.lastDecisionTime = Date.now();
    this.performance.totalDecisions++;
    this.performance.thresholdAdjustments++;

    // 8. Publish decision and issue command
    alphaGammaCommunicator.publishAlphaDecision(decision);
    alphaGammaCommunicator.issueGammaCommand(gammaCommand);
    this.performance.gammaCommandsIssued++;

    const latency = Date.now() - startTime;
    this.performance.averageDecisionLatency =
      (this.performance.averageDecisionLatency * (this.performance.totalDecisions - 1) + latency) /
      this.performance.totalDecisions;

    console.log(`[Alpha V2] ✅ Decision complete (${latency}ms)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return decision;
  }

  /**
   * Select appropriate mode based on strategy and market conditions
   */
  private selectMode(
    strategy: string,
    regime: MarketRegime,
    marketScore: number
  ): AlphaModeV2 {
    // Map strategy recommendation to mode
    let baseMode: AlphaModeV2;

    switch (strategy) {
      case 'ULTRA_CONSERVATIVE':
        baseMode = 'ULTRA_QUALITY';
        break;
      case 'CONSERVATIVE':
        baseMode = 'HIGH_QUALITY';
        break;
      case 'BALANCED':
        baseMode = 'BALANCED';
        break;
      case 'AGGRESSIVE':
        baseMode = 'VOLUME';
        break;
      case 'ULTRA_AGGRESSIVE':
        baseMode = 'FLOOD';
        break;
      default:
        baseMode = 'BALANCED';
    }

    // Adjust for market regime
    if (regime === 'HIGH_VOLATILITY' && baseMode === 'FLOOD') {
      // Don't flood in high volatility - too risky
      baseMode = 'VOLUME';
    }

    if (regime === 'BULL_TRENDING' && marketScore > 70 && baseMode === 'BALANCED') {
      // In strong bull markets, we can take more volume
      baseMode = 'VOLUME';
    }

    if (regime === 'BEAR_TRENDING' && baseMode === 'FLOOD') {
      // Don't flood in bear markets
      baseMode = 'BALANCED';
    }

    return baseMode;
  }

  /**
   * Generate Gamma command based on mode and conditions
   */
  private generateGammaCommand(
    mode: AlphaModeV2,
    strategicRec: any,
    deviation: number,
    daysRemaining: number
  ): GammaCommand {
    const strategy = this.STRATEGIES[mode];
    let gammaMode: GammaMode = strategy.gammaCommand;
    let adjustments: GammaCommand['adjustments'];
    let reason: string;
    let duration: number;
    let priority: GammaCommand['priority'];

    // ULTRA_QUALITY / HIGH_QUALITY
    if (mode === 'ULTRA_QUALITY' || mode === 'HIGH_QUALITY') {
      adjustments = {
        patternStrengthMultiplier: 1.15,    // Increase thresholds
        consensusThresholdAdjust: 10,       // +10%
        riskRewardMultiplier: 1.10,
        maxSignalsPerSector: 2,             // Limit diversification
        dedupWindowMinutes: 180             // Longer dedup window
      };
      reason = `Ahead of target (+${deviation.toFixed(1)}%). Locking in profits with strict quality gates.`;
      duration = 14400000; // 4 hours
      priority = 'LOW';
    }
    // BALANCED
    else if (mode === 'BALANCED') {
      adjustments = {
        patternStrengthMultiplier: 1.0,
        consensusThresholdAdjust: 0,
        riskRewardMultiplier: 1.0,
        maxSignalsPerSector: 3,
        dedupWindowMinutes: 120
      };
      reason = `On track. Maintaining balanced quality gates.`;
      duration = 14400000; // 4 hours
      priority = 'MEDIUM';
    }
    // VOLUME
    else if (mode === 'VOLUME') {
      adjustments = {
        patternStrengthMultiplier: 0.90,    // Lower thresholds slightly
        consensusThresholdAdjust: -5,       // -5%
        riskRewardMultiplier: 0.95,
        maxSignalsPerSector: 4,
        dedupWindowMinutes: 90
      };
      reason = `Behind target (${deviation.toFixed(1)}%). Increasing signal volume while maintaining quality.`;
      duration: 10800000; // 3 hours
      priority = 'HIGH';
    }
    // FLOOD
    else {
      adjustments = {
        patternStrengthMultiplier: 0.75,    // Significantly lower thresholds
        consensusThresholdAdjust: -15,      // -15%
        riskRewardMultiplier: 0.85,
        maxSignalsPerSector: 5,
        dedupWindowMinutes: 60
      };
      reason = `Critical: ${Math.abs(deviation).toFixed(1)}% behind with ${daysRemaining} days left. FLOODING signals to catch up.`;
      duration = 7200000; // 2 hours (shorter for aggressive mode)
      priority = 'CRITICAL';
    }

    return {
      mode: gammaMode,
      adjustments,
      reason,
      duration,
      expiresAt: Date.now() + duration,
      priority,
      issuedBy: 'ALPHA_MODEL',
      timestamp: Date.now()
    };
  }

  /**
   * Calculate decision confidence score
   */
  private calculateConfidence(
    marketMetrics: any,
    regime: any,
    goalProgress: any
  ): number {
    // Confidence based on:
    // 1. Data quality (30%)
    // 2. Regime confidence (30%)
    // 3. Goal progress confidence (20%)
    // 4. Sample size (20%)

    const dataConfidence = marketMetrics.qualityScore;
    const regimeConfidence = regime.confidence;
    const goalConfidence = goalProgress.monthly.confidence;
    const sampleConfidence = Math.min((goalProgress.monthly.daysElapsed / 15) * 100, 100);

    const composite =
      dataConfidence * 0.30 +
      regimeConfidence * 0.30 +
      goalConfidence * 0.20 +
      sampleConfidence * 0.20;

    return Math.round(composite);
  }

  /**
   * Track mode change for performance analysis
   */
  private trackModeChange(oldMode: AlphaModeV2, newMode: AlphaModeV2) {
    // Close out old mode
    if (this.performance.modeHistory.length > 0) {
      const lastEntry = this.performance.modeHistory[this.performance.modeHistory.length - 1];
      if (!lastEntry.endTime) {
        lastEntry.endTime = Date.now();
      }
    }

    // Start new mode
    this.performance.modeHistory.push({
      mode: newMode,
      startTime: Date.now(),
      endTime: 0,
      tradesGenerated: 0,
      winRate: 0,
      profitGenerated: 0
    });
  }

  /**
   * Record trade outcome for learning
   */
  recordTradeOutcome(params: {
    isWin: boolean;
    profitPercent: number;
  }) {
    // Record to goal tracker
    goalAchievementEngine.recordTrade(params);

    // Update current mode performance
    if (this.performance.modeHistory.length > 0) {
      const current = this.performance.modeHistory[this.performance.modeHistory.length - 1];
      current.tradesGenerated++;
      current.profitGenerated += params.profitPercent;
      if (params.isWin) {
        current.winRate = ((current.winRate * (current.tradesGenerated - 1)) + 100) / current.tradesGenerated;
      } else {
        current.winRate = (current.winRate * (current.tradesGenerated - 1)) / current.tradesGenerated;
      }
    }
  }

  /**
   * Get current mode
   */
  getCurrentMode(): AlphaModeV2 {
    return this.currentMode;
  }

  /**
   * Get last decision
   */
  getLastDecision(): AlphaDecision | null {
    return this.lastDecision;
  }

  /**
   * Get performance metrics
   */
  getPerformance(): AlphaPerformance {
    return { ...this.performance };
  }

  /**
   * Get current thresholds
   */
  getCurrentThresholds(): any {
    if (!this.lastDecision) {
      return this.STRATEGIES[this.currentMode].thresholds;
    }

    // Convert dynamic thresholds to simple format for Gamma
    return {
      patternStrength: this.lastDecision.thresholds.patternStrength.finalValue,
      consensusThreshold: this.lastDecision.thresholds.consensusThreshold.finalValue / 100,
      riskReward: this.lastDecision.thresholds.riskReward.finalValue / 50,
      liquidityMin: this.lastDecision.thresholds.liquidityMin.finalValue,
      dataQualityMin: this.lastDecision.thresholds.dataQualityMin.finalValue
    };
  }

  /**
   * Force immediate re-analysis (for testing or manual trigger)
   */
  forceAnalysis(): AlphaDecision {
    console.log('[Alpha V2] ⚡ Forced analysis triggered\n');
    return this.analyzeAndDecide();
  }

  /**
   * Get detailed status report
   */
  getStatusReport(): string {
    const mode = this.STRATEGIES[this.currentMode];
    const decision = this.lastDecision;

    return `
IGX Alpha Model V2 - Status Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running:           ${this.isRunning ? '✅' : '❌'}
Current Mode:      ${this.currentMode}
Description:       ${mode.description}

Performance:
  Total Decisions:     ${this.performance.totalDecisions}
  Threshold Adjusts:   ${this.performance.thresholdAdjustments}
  Gamma Commands:      ${this.performance.gammaCommandsIssued}
  Avg Decision Time:   ${this.performance.averageDecisionLatency.toFixed(0)}ms
  Goals Met:           ${this.performance.goalsMet}
  Goals Missed:        ${this.performance.goalsMissed}

Last Decision:
  Time:              ${decision ? new Date(decision.timestamp).toLocaleString() : 'N/A'}
  Confidence:        ${decision?.confidence || 0}%
  Valid Until:       ${decision ? new Date(decision.validUntil).toLocaleString() : 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const igxAlphaModelV2 = new IGXAlphaModelV2();
