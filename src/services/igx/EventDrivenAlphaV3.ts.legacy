/**
 * Event-Driven Alpha V3
 *
 * PARADIGM SHIFT: From goal-chasing to opportunity-maximizing
 *
 * KEY CHANGES:
 * - Reacts to events in SECONDS (not 4-hour timer)
 * - No monthly target pressure
 * - No FLOOD mode when "behind schedule"
 * - Optimizes for Sharpe ratio and edge preservation
 * - Event-driven + 15-minute background review
 */

import { marketConditionAnalyzer } from './MarketConditionAnalyzer';
import { statisticalThresholdCalculator } from './StatisticalThresholdCalculator';
import { alphaGammaCommunicator } from './AlphaGammaCommunicator';
import { igxDataEngineV4Enhanced } from './IGXDataEngineV4Enhanced';
import type {
  AlphaModeV2,
  AlphaDecision,
  GammaCommand,
  GammaMode,
  MarketRegime,
  ThresholdSet,
  MarketMetrics,
  RegimeCharacteristics
} from '@/types/igx-enhanced';

// New risk-focused metrics (not goal-focused)
interface RiskMetrics {
  sharpeRatio: number;           // Target > 2.0
  maxDrawdown: number;           // Keep < 5%
  currentDrawdown: number;       // From peak
  winRate: number;               // Maintain > 60%
  avgRiskReward: number;         // Target > 3:1
  opportunitiesCaptured: number; // High-score opportunities taken
  opportunitiesMissed: number;   // High-score opportunities skipped
}

interface EventTrigger {
  type: 'REGIME_CHANGE' | 'VOLATILITY_SPIKE' | 'WHALE_ALERT' | 'FUNDING_ANOMALY' | 'SCHEDULED_REVIEW';
  urgency: 'IMMEDIATE' | 'RAPID' | 'ROUTINE';
  data: any;
  timestamp: number;
}

export class EventDrivenAlphaV3 {
  private currentMode: AlphaModeV2 = 'BALANCED';
  private lastDecision: AlphaDecision | null = null;
  private lastDecisionTime = 0;

  // Risk metrics (replaces goal tracking)
  private riskMetrics: RiskMetrics = {
    sharpeRatio: 0,
    maxDrawdown: 0,
    currentDrawdown: 0,
    winRate: 0,
    avgRiskReward: 0,
    opportunitiesCaptured: 0,
    opportunitiesMissed: 0
  };

  // Event cooldowns (prevent spam)
  private lastRegimeChangeResponse = 0;
  private lastVolatilityResponse = 0;
  private lastWhaleResponse = 0;

  private readonly EVENT_COOLDOWNS = {
    REGIME_CHANGE: 300000,      // 5 minutes
    VOLATILITY_SPIKE: 180000,   // 3 minutes
    WHALE_ALERT: 60000,         // 1 minute
    FUNDING_ANOMALY: 120000     // 2 minutes
  };

  // Trigger thresholds
  private readonly THRESHOLDS = {
    volatilitySpike: 2.0,        // 2 standard deviations
    whaleAlert: 5000000,         // $5M
    regimeConfidence: 80,        // 80% confidence
    fundingAnomaly: 0.003        // 0.3% funding rate
  };

  // Background review (15 min, not 4 hours)
  private readonly REVIEW_INTERVAL = 900000; // 15 minutes
  private reviewTimer: NodeJS.Timeout | null = null;

  private isRunning = false;
  private eventListeners: Array<() => void> = [];

  /**
   * Start the event-driven Alpha V3
   */
  start() {
    if (this.isRunning) {
      console.warn('[Alpha V3] Already running');
      return;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 EVENT-DRIVEN ALPHA V3 - INITIALIZING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚡ Paradigm: OPPORTUNITY-MAXIMIZING (not goal-chasing)');
    console.log('⚡ Response: EVENT-DRIVEN (not time-based)');
    console.log('⚡ Focus: SHARPE RATIO (not monthly target)');
    console.log('⚡ Review: 15 MINUTES (not 4 hours)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.isRunning = true;

    // Subscribe to market events from communicator
    const unsubRegime = alphaGammaCommunicator.onRegimeChange(this.handleRegimeChange.bind(this));
    const unsubMarket = alphaGammaCommunicator.onMarketUpdate(this.handleMarketUpdate.bind(this));

    this.eventListeners.push(unsubRegime, unsubMarket);

    // Subscribe to Data Engine events (if available)
    this.subscribeToDataEngineEvents();

    // Background review every 15 minutes
    this.reviewTimer = setInterval(() => {
      this.handleScheduledReview();
    }, this.REVIEW_INTERVAL);

    // Make initial decision
    this.analyzeAndDecide({
      type: 'SCHEDULED_REVIEW',
      urgency: 'ROUTINE',
      data: null,
      timestamp: Date.now()
    });

    console.log('[Alpha V3] ✅ Event subscriptions active');
    console.log('[Alpha V3] ✅ Background review: every 15 minutes');
    console.log('[Alpha V3] ✅ Started successfully\n');
  }

  /**
   * Stop the Alpha V3
   */
  stop() {
    console.log('\n[Alpha V3] Shutting down...');

    if (this.reviewTimer) {
      clearInterval(this.reviewTimer);
      this.reviewTimer = null;
    }

    // Unsubscribe from all events
    this.eventListeners.forEach(unsub => unsub());
    this.eventListeners = [];

    this.isRunning = false;
    console.log('[Alpha V3] ✅ Stopped\n');
  }

  /**
   * Subscribe to Data Engine events
   */
  private subscribeToDataEngineEvents() {
    // Subscribe to whale alerts and funding anomalies
    const whaleListener = (data: any) => this.handleWhaleAlert(data);
    const fundingListener = (data: any) => this.handleFundingAnomaly(data);

    alphaGammaCommunicator.on('whale:alert', whaleListener);
    alphaGammaCommunicator.on('funding:anomaly', fundingListener);

    // Store unsub functions
    this.eventListeners.push(
      () => alphaGammaCommunicator.off('whale:alert', whaleListener),
      () => alphaGammaCommunicator.off('funding:anomaly', fundingListener)
    );

    console.log('[Alpha V3] ✅ Subscribed to Data Engine events (whale alerts, funding anomalies)');
  }

  /**
   * Handle regime change event
   */
  private handleRegimeChange(regime: RegimeCharacteristics) {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastRegimeChangeResponse < this.EVENT_COOLDOWNS.REGIME_CHANGE) {
      console.log('[Alpha V3] 🔇 Regime change cooldown active, skipping');
      return;
    }

    // Check confidence threshold
    if (regime.confidence < this.THRESHOLDS.regimeConfidence) {
      console.log(`[Alpha V3] 🔇 Regime change confidence too low: ${regime.confidence}%`);
      return;
    }

    console.log('\n[Alpha V3] ⚡ REGIME CHANGE DETECTED - Immediate response');
    console.log(`  Regime: ${regime.regime} (${regime.confidence}% confidence)`);
    console.log(`  Description: ${regime.description}\n`);

    this.lastRegimeChangeResponse = now;

    // Immediate re-analysis
    this.analyzeAndDecide({
      type: 'REGIME_CHANGE',
      urgency: 'IMMEDIATE',
      data: regime,
      timestamp: now
    });
  }

  /**
   * Handle market update (check for volatility spikes)
   */
  private handleMarketUpdate(metrics: MarketMetrics) {
    const now = Date.now();

    // Check for volatility spike
    if (metrics.volatilityScore > 70) { // High volatility
      // Check cooldown
      if (now - this.lastVolatilityResponse < this.EVENT_COOLDOWNS.VOLATILITY_SPIKE) {
        return;
      }

      console.log('\n[Alpha V3] ⚡ VOLATILITY SPIKE - Rapid response');
      console.log(`  Volatility score: ${metrics.volatilityScore.toFixed(1)}/100\n`);

      this.lastVolatilityResponse = now;

      // Rapid re-analysis
      this.analyzeAndDecide({
        type: 'VOLATILITY_SPIKE',
        urgency: 'RAPID',
        data: metrics,
        timestamp: now
      });
    }
  }

  /**
   * Handle whale alert (called externally when Data Engine detects large transaction)
   */
  handleWhaleAlert(data: { symbol: string; amountUSD: number; type: string }) {
    const now = Date.now();

    // Check threshold
    if (data.amountUSD < this.THRESHOLDS.whaleAlert) {
      return;
    }

    // Check cooldown
    if (now - this.lastWhaleResponse < this.EVENT_COOLDOWNS.WHALE_ALERT) {
      return;
    }

    console.log('\n[Alpha V3] ⚡ WHALE ALERT - Immediate response');
    console.log(`  Symbol: ${data.symbol}`);
    console.log(`  Amount: $${(data.amountUSD / 1000000).toFixed(1)}M`);
    console.log(`  Type: ${data.type}\n`);

    this.lastWhaleResponse = now;

    // Immediate re-analysis
    this.analyzeAndDecide({
      type: 'WHALE_ALERT',
      urgency: 'IMMEDIATE',
      data,
      timestamp: now
    });
  }

  /**
   * Handle funding rate anomaly (called when Data Engine detects unusual funding)
   */
  handleFundingAnomaly(data: { symbol: string; fundingRate: number; fundingRatePercent: number }) {
    const now = Date.now();

    // Check threshold
    if (Math.abs(data.fundingRate) < this.THRESHOLDS.fundingAnomaly) {
      return;
    }

    // Check cooldown
    if (now - this.lastFundingResponse < this.EVENT_COOLDOWNS.FUNDING_ANOMALY) {
      return;
    }

    console.log('\n[Alpha V3] ⚡ FUNDING ANOMALY - Rapid response');
    console.log(`  Symbol: ${data.symbol}`);
    console.log(`  Funding Rate: ${data.fundingRatePercent.toFixed(4)}%`);
    console.log(`  Direction: ${data.fundingRate > 0 ? 'Longs paying shorts (bullish pressure)' : 'Shorts paying longs (bearish pressure)'}\n`);

    this.lastFundingResponse = now;

    // Rapid re-analysis
    this.analyzeAndDecide({
      type: 'FUNDING_ANOMALY',
      urgency: 'RAPID',
      data,
      timestamp: now
    });
  }

  /**
   * Handle scheduled 15-minute review
   */
  private handleScheduledReview() {
    console.log('\n[Alpha V3] 📅 Scheduled 15-minute review');

    this.analyzeAndDecide({
      type: 'SCHEDULED_REVIEW',
      urgency: 'ROUTINE',
      data: null,
      timestamp: Date.now()
    });
  }

  /**
   * Main decision engine - now event-driven
   */
  private analyzeAndDecide(trigger: EventTrigger): AlphaDecision {
    const startTime = Date.now();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🧠 ALPHA V3 - ${trigger.type} ANALYSIS`);
    console.log(`⚡ Urgency: ${trigger.urgency}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Analyze market conditions
    const marketMetrics = marketConditionAnalyzer.analyzeMarket('BTCUSDT');
    const regime = marketConditionAnalyzer.detectRegime();

    console.log('[Alpha V3] 📊 Market Analysis:');
    console.log(`  Composite Score: ${marketMetrics.compositeScore.toFixed(1)}/100`);
    console.log(`  Regime: ${regime.regime} (${regime.confidence.toFixed(0)}% confidence)`);
    console.log(`  ${regime.description}\n`);

    // Publish market updates
    alphaGammaCommunicator.publishMarketUpdate(marketMetrics);
    if (trigger.type === 'REGIME_CHANGE') {
      alphaGammaCommunicator.publishRegimeChange(regime);
    }

    // 2. Check risk metrics (not goal progress)
    const riskStatus = this.evaluateRiskStatus();

    console.log('[Alpha V3] 📊 Risk Metrics:');
    console.log(`  Sharpe Ratio: ${riskStatus.sharpeRatio.toFixed(2)} (target > 2.0)`);
    console.log(`  Max Drawdown: ${riskStatus.maxDrawdown.toFixed(2)}% (limit < 5%)`);
    console.log(`  Current Drawdown: ${riskStatus.currentDrawdown.toFixed(2)}%`);
    console.log(`  Win Rate: ${riskStatus.winRate.toFixed(1)}% (target > 60%)`);
    console.log(`  Avg R:R: ${riskStatus.avgRiskReward.toFixed(2)}:1 (target > 3:1)\n`);

    // 3. Select mode based on RISK, not goals
    const selectedMode = this.selectModeByRisk(marketMetrics, regime, riskStatus);

    console.log(`[Alpha V3] 🎚️  Mode Selected: ${selectedMode}`);
    console.log(`  Reasoning: ${this.getModeReasoning(selectedMode, riskStatus)}\n`);

    // 4. Calculate dynamic thresholds (without goal pressure)
    const thresholds = this.calculateRiskAdjustedThresholds(
      marketMetrics,
      regime,
      riskStatus
    );

    console.log('[Alpha V3] 📐 Dynamic Thresholds:');
    console.log(`  Pattern Strength: ${thresholds.patternStrength.finalValue.toFixed(1)}`);
    console.log(`  Consensus: ${(thresholds.consensusThreshold.finalValue / 100).toFixed(2)}`);
    console.log(`  Risk/Reward: ${(thresholds.riskReward.finalValue / 50).toFixed(2)}:1\n`);

    // 5. Generate Gamma command
    const gammaCommand = this.generateRiskBasedCommand(
      selectedMode,
      riskStatus,
      trigger.urgency
    );

    console.log('[Alpha V3] 📡 Gamma Command:');
    console.log(`  Mode: ${gammaCommand.mode}`);
    console.log(`  Priority: ${gammaCommand.priority}`);
    console.log(`  Reason: ${gammaCommand.reason}\n`);

    // 6. Construct decision
    const reasoning: string[] = [];
    reasoning.push(`Trigger: ${trigger.type} (${trigger.urgency})`);
    reasoning.push(`Market score: ${marketMetrics.compositeScore.toFixed(1)}/100`);
    reasoning.push(`Regime: ${regime.regime} (${regime.confidence.toFixed(0)}%)`);
    reasoning.push(`Sharpe ratio: ${riskStatus.sharpeRatio.toFixed(2)}`);
    reasoning.push(`Drawdown: ${riskStatus.currentDrawdown.toFixed(2)}%`);
    reasoning.push(`Win rate: ${riskStatus.winRate.toFixed(1)}%`);
    reasoning.push(`Mode: ${selectedMode}`);

    const decision: AlphaDecision = {
      mode: selectedMode,
      reasoning,
      thresholds,
      gammaCommand,
      marketCondition: marketMetrics,
      goalProgress: {
        monthly: {
          targetReturn: 0,
          currentReturn: 0,
          daysElapsed: 0,
          daysRemaining: 0,
          requiredDailyReturn: 0,
          actualDailyReturn: 0,
          onTrack: true,
          deviation: 0,
          projectedReturn: 0,
          confidence: 100,
          timestamp: Date.now()
        },
        weekly: [],
        daily: [],
        lastUpdated: Date.now()
      },
      confidence: this.calculateConfidence(marketMetrics, regime, riskStatus),
      validUntil: Date.now() + this.REVIEW_INTERVAL,
      timestamp: Date.now()
    };

    // 7. Update tracking
    if (selectedMode !== this.currentMode) {
      alphaGammaCommunicator.notifyAlphaModeChange(this.currentMode, selectedMode, reasoning.join('; '));
    }

    this.currentMode = selectedMode;
    this.lastDecision = decision;
    this.lastDecisionTime = Date.now();

    // 8. Publish decision and issue command
    alphaGammaCommunicator.publishAlphaDecision(decision);
    alphaGammaCommunicator.issueGammaCommand(gammaCommand);

    const latency = Date.now() - startTime;
    console.log(`[Alpha V3] ✅ Decision complete (${latency}ms)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return decision;
  }

  /**
   * Select mode based on RISK metrics (not goal pressure)
   */
  private selectModeByRisk(
    metrics: MarketMetrics,
    regime: RegimeCharacteristics,
    risk: RiskMetrics
  ): AlphaModeV2 {
    // HIGH DRAWDOWN → Risk-off
    if (risk.currentDrawdown < -10) {
      return 'ULTRA_QUALITY'; // Preserve capital
    }

    // MODERATE DRAWDOWN → Reduce exposure
    if (risk.currentDrawdown < -5) {
      return 'HIGH_QUALITY';
    }

    // HIGH VOLATILITY → Be selective
    if (regime.regime === 'HIGH_VOLATILITY') {
      return 'HIGH_QUALITY';
    }

    // STRONG BULL + Good metrics → Increase exposure
    if (regime.regime === 'BULL_TRENDING' &&
        metrics.compositeScore > 70 &&
        risk.winRate > 60) {
      return 'VOLUME';
    }

    // BEAR MARKET → Conservative
    if (regime.regime === 'BEAR_TRENDING') {
      return 'BALANCED';
    }

    // DEFAULT: Balanced approach
    return 'BALANCED';
  }

  /**
   * Get mode reasoning string
   */
  private getModeReasoning(mode: AlphaModeV2, risk: RiskMetrics): string {
    if (risk.currentDrawdown < -10) {
      return 'Deep drawdown detected, preserving capital';
    }
    if (risk.currentDrawdown < -5) {
      return 'Moderate drawdown, reducing exposure';
    }
    if (mode === 'VOLUME') {
      return 'Favorable conditions with strong performance';
    }
    return 'Risk-neutral balanced approach';
  }

  /**
   * Evaluate current risk status
   */
  private evaluateRiskStatus(): RiskMetrics {
    // TODO: Calculate from actual trade outcomes
    // For now, return current state
    return { ...this.riskMetrics };
  }

  /**
   * Calculate risk-adjusted thresholds (no goal pressure)
   */
  private calculateRiskAdjustedThresholds(
    metrics: MarketMetrics,
    regime: RegimeCharacteristics,
    risk: RiskMetrics
  ): ThresholdSet {
    return statisticalThresholdCalculator.calculateThresholds({
      marketCompositeScore: metrics.compositeScore,
      regime: regime.regime,
      goalProgressPercent: 0, // NO GOAL PRESSURE
      daysRemainingInMonth: 30 // Irrelevant now
    });
  }

  /**
   * Generate risk-based Gamma command
   */
  private generateRiskBasedCommand(
    mode: AlphaModeV2,
    risk: RiskMetrics,
    urgency: string
  ): GammaCommand {
    let gammaMode: GammaMode;
    let adjustments: GammaCommand['adjustments'];
    let reason: string;
    let duration: number;
    let priority: GammaCommand['priority'];

    // Drawdown-based logic
    if (risk.currentDrawdown < -10) {
      gammaMode = 'STRICT';
      adjustments = {
        patternStrengthMultiplier: 1.30,
        consensusThresholdAdjust: 15,
        riskRewardMultiplier: 1.20,
        maxSignalsPerSector: 1,
        dedupWindowMinutes: 240
      };
      reason = `Deep drawdown (${risk.currentDrawdown.toFixed(1)}%). Capital preservation mode.`;
      duration = 3600000; // 1 hour
      priority = 'CRITICAL';
    }
    else if (risk.currentDrawdown < -5) {
      gammaMode = 'STRICT';
      adjustments = {
        patternStrengthMultiplier: 1.15,
        consensusThresholdAdjust: 10,
        riskRewardMultiplier: 1.10,
        maxSignalsPerSector: 2,
        dedupWindowMinutes: 180
      };
      reason = `Moderate drawdown (${risk.currentDrawdown.toFixed(1)}%). Reducing exposure.`;
      duration = 1800000; // 30 min
      priority = 'HIGH';
    }
    else if (mode === 'VOLUME') {
      gammaMode = 'SELECTIVE';
      adjustments = {
        patternStrengthMultiplier: 0.95,
        consensusThresholdAdjust: -5,
        riskRewardMultiplier: 1.0,
        maxSignalsPerSector: 4,
        dedupWindowMinutes: 90
      };
      reason = `Favorable conditions. Win rate: ${risk.winRate.toFixed(1)}%. Increasing exposure.`;
      duration = 900000; // 15 min
      priority = 'MEDIUM';
    }
    else {
      gammaMode = 'SELECTIVE';
      adjustments = {
        patternStrengthMultiplier: 1.0,
        consensusThresholdAdjust: 0,
        riskRewardMultiplier: 1.0,
        maxSignalsPerSector: 3,
        dedupWindowMinutes: 120
      };
      reason = `Balanced approach. Sharpe: ${risk.sharpeRatio.toFixed(2)}.`;
      duration = 900000; // 15 min
      priority = 'MEDIUM';
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
   * Calculate decision confidence
   */
  private calculateConfidence(
    metrics: MarketMetrics,
    regime: RegimeCharacteristics,
    risk: RiskMetrics
  ): number {
    const dataConfidence = metrics.qualityScore;
    const regimeConfidence = regime.confidence;
    const performanceConfidence = Math.min(risk.winRate / 60 * 100, 100);

    return Math.round((dataConfidence * 0.4 + regimeConfidence * 0.4 + performanceConfidence * 0.2));
  }

  /**
   * Record trade outcome for risk metrics
   */
  recordTradeOutcome(params: {
    isWin: boolean;
    profitPercent: number;
    riskReward: number;
  }) {
    // Update win rate
    const totalTrades = this.riskMetrics.opportunitiesCaptured + 1;
    const wins = params.isWin ? 1 : 0;
    this.riskMetrics.winRate = ((this.riskMetrics.winRate * this.riskMetrics.opportunitiesCaptured) + (wins * 100)) / totalTrades;

    // Update avg R:R
    this.riskMetrics.avgRiskReward = ((this.riskMetrics.avgRiskReward * this.riskMetrics.opportunitiesCaptured) + params.riskReward) / totalTrades;

    // Update drawdown
    // TODO: Implement proper drawdown tracking from equity curve

    this.riskMetrics.opportunitiesCaptured++;

    console.log(`\n[Alpha V3] Trade outcome recorded:`);
    console.log(`  Win: ${params.isWin ? '✅' : '❌'} | P/L: ${params.profitPercent > 0 ? '+' : ''}${params.profitPercent.toFixed(2)}%`);
    console.log(`  R:R: ${params.riskReward.toFixed(2)}:1`);
    console.log(`  Updated Win Rate: ${this.riskMetrics.winRate.toFixed(1)}%`);
    console.log(`  Updated Avg R:R: ${this.riskMetrics.avgRiskReward.toFixed(2)}:1\n`);
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
   * Get risk metrics
   */
  getRiskMetrics(): RiskMetrics {
    return { ...this.riskMetrics };
  }

  /**
   * Get current thresholds
   */
  getCurrentThresholds(): any {
    if (!this.lastDecision) {
      return {
        patternStrength: 60,
        consensusThreshold: 0.55,
        riskReward: 2.0,
        mode: 'BALANCED'
      };
    }

    return {
      patternStrength: this.lastDecision.thresholds.patternStrength.finalValue,
      consensusThreshold: this.lastDecision.thresholds.consensusThreshold.finalValue / 100,
      riskReward: this.lastDecision.thresholds.riskReward.finalValue / 50,
      mode: this.currentMode
    };
  }

  /**
   * Force immediate re-analysis
   */
  forceAnalysis(): AlphaDecision {
    console.log('[Alpha V3] ⚡ Forced analysis triggered\n');
    return this.analyzeAndDecide({
      type: 'SCHEDULED_REVIEW',
      urgency: 'IMMEDIATE',
      data: null,
      timestamp: Date.now()
    });
  }

  /**
   * Get stats for monitoring dashboard
   */
  getStats() {
    const risk = this.riskMetrics;
    return {
      isRunning: this.isRunning,
      currentMode: this.currentMode,
      totalDecisions: 0, // TODO: track decision history
      signalsGenerated: risk.opportunitiesCaptured,
      eventResponses: {
        regimeChange: 0, // TODO: track this
        volatilitySpike: 0, // TODO: track this
        whaleAlert: 0, // TODO: track this
        fundingAnomaly: 0 // TODO: track this
      }
    };
  }

  /**
   * Get status report
   */
  getStatusReport(): string {
    const risk = this.riskMetrics;
    return `
Event-Driven Alpha V3 - Status Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running:           ${this.isRunning ? '✅' : '❌'}
Current Mode:      ${this.currentMode}
Review Interval:   15 minutes (not 4 hours)

Risk Metrics (NOT Goal Metrics):
  Sharpe Ratio:      ${risk.sharpeRatio.toFixed(2)} (target > 2.0)
  Max Drawdown:      ${risk.maxDrawdown.toFixed(2)}% (limit < 5%)
  Current Drawdown:  ${risk.currentDrawdown.toFixed(2)}%
  Win Rate:          ${risk.winRate.toFixed(1)}% (target > 60%)
  Avg R:R:           ${risk.avgRiskReward.toFixed(2)}:1 (target > 3:1)

Opportunities:
  Captured:          ${risk.opportunitiesCaptured}
  Missed:            ${risk.opportunitiesMissed}

Event Response:
  Last Regime:       ${new Date(this.lastRegimeChangeResponse || 0).toLocaleTimeString()}
  Last Volatility:   ${new Date(this.lastVolatilityResponse || 0).toLocaleTimeString()}
  Last Whale:        ${new Date(this.lastWhaleResponse || 0).toLocaleTimeString()}

Last Decision:
  Time:              ${this.lastDecision ? new Date(this.lastDecision.timestamp).toLocaleString() : 'N/A'}
  Confidence:        ${this.lastDecision?.confidence || 0}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const eventDrivenAlphaV3 = new EventDrivenAlphaV3();
