/**
 * IGX QUALITY CHECKER V3 - OPPORTUNITY-BASED
 * Dynamic quality gate system with opportunity scoring
 *
 * PARADIGM SHIFT:
 * - FROM: Goal-based filtering ("Are we behind? Lower thresholds!")
 * - TO:   Opportunity-based validation ("Is this a high-quality opportunity?")
 *
 * RESPONSIBILITIES:
 * - Receive signals from Beta Model
 * - Apply dynamic quality gates (adjusted by Alpha V3)
 * - Score opportunities using OpportunityScorer
 * - Respond to Alpha commands for adaptive thresholds
 * - Validate signal quality before execution
 * - Track quality metrics and opportunity scores for feedback to Alpha
 */

import type { IGXSignal } from './IGXBetaModel';
import { igxAlphaModel } from './IGXAlphaModel';
import { alphaGammaCommunicator } from './AlphaGammaCommunicator';
import { marketConditionAnalyzer } from './MarketConditionAnalyzer';
import { opportunityScorer } from './OpportunityScorer';
import type { GammaCommand, GammaStats, GammaMode, SignalCandidate } from '@/types/igx-enhanced';

export interface QualityCheckResult {
  passed: boolean;
  signal: IGXSignal | null;
  rejectionReasons: string[];
  qualityMetrics: {
    patternScore: number;
    consensusScore: number;
    riskRewardScore: number;
    liquidityScore: number;
    dataQualityScore: number;
    overallScore: number;
  };
  opportunityScore?: {
    total: number;
    grade: string;
    recommendation: string;
    reasoning: string;
  };
  adjustedForMode: boolean;
  modeUsed: 'HIGH_QUALITY' | 'BALANCED' | 'VOLUME';
}

export interface QualityStats {
  totalChecked: number;
  totalPassed: number;
  totalRejected: number;
  passRate: number;
  rejectionsByReason: Map<string, number>;
  avgQualityScore: number;
  modeDistribution: {
    highQuality: number;
    balanced: number;
    volume: number;
  };
}

export class IGXQualityChecker {
  private stats: QualityStats = {
    totalChecked: 0,
    totalPassed: 0,
    totalRejected: 0,
    passRate: 0,
    rejectionsByReason: new Map(),
    avgQualityScore: 0,
    modeDistribution: {
      highQuality: 0,
      balanced: 0,
      volume: 0
    }
  };

  // Base thresholds (will be adjusted by Alpha)
  private baseThresholds = {
    minPatternStrength: 60,
    minConsensus: 0.55,
    minRiskReward: 2.0,
    minLiquidity: 50,
    minDataQuality: 60,
    maxSpread: 0.5,
    minConfidence: 50
  };

  // Recent signals for deduplication
  private recentSignals = new Map<string, number>(); // symbol -> last signal time
  private readonly BASE_DEDUP_WINDOW = 2 * 60 * 60 * 1000; // 2 hours base
  private dedupWindow = this.BASE_DEDUP_WINDOW; // Can be adjusted by Alpha

  // Active positions for correlation control
  private activePositions = new Map<string, { sector: string; entryTime: number }>();
  private readonly BASE_MAX_CORRELATED_POSITIONS = 3;
  private maxCorrelatedPositions = this.BASE_MAX_CORRELATED_POSITIONS; // Can be adjusted

  // Alpha command tracking
  private activeCommand: GammaCommand | null = null;
  private currentMode: GammaMode = 'SELECTIVE';
  private commandUnsubscribe: (() => void) | null = null;
  private statsReportInterval: NodeJS.Timeout | null = null;

  // Approved signals today
  private signalsApprovedToday = 0;
  private signalsRejectedToday = 0;
  private lastDayReset = new Date().getDate();

  private isRunning = false;

  /**
   * Start the quality checker
   */
  start() {
    if (this.isRunning) {
      console.log('[IGX Quality] Already running');
      return;
    }

    console.log('\n✅ ========== STARTING IGX QUALITY CHECKER V2 ==========');
    console.log('🎯 Dynamic Thresholds: Controlled by Alpha Model V2');
    console.log('📊 Quality Gates: 6-stage adaptive validation');
    console.log('📡 Command Receiver: Alpha → Gamma communication');
    console.log('💰 Target: 25%+ monthly profitability');
    console.log('=======================================================\n');

    this.isRunning = true;

    // Subscribe to Alpha commands
    this.commandUnsubscribe = alphaGammaCommunicator.onAlphaCommand(this.handleAlphaCommand.bind(this));

    console.log('[IGX Quality] ✅ Subscribed to Alpha commands');

    // Report stats to Alpha periodically
    this.statsReportInterval = setInterval(() => {
      this.reportStatsToAlpha();
    }, 60000); // Every minute

    // Listen for signals from Beta Model
    if (typeof window !== 'undefined') {
      window.addEventListener('igx-signal-generated', this.handleSignal.bind(this));
    }

    // Periodic cleanup
    setInterval(() => this.cleanupOldData(), 60000); // Every minute

    // Daily reset
    setInterval(() => this.checkDailyReset(), 60000); // Every minute
  }

  /**
   * Handle command from Alpha Model
   */
  private handleAlphaCommand(command: GammaCommand) {
    console.log(`\n[Gamma] 📡 Received command from Alpha:`);
    console.log(`  Mode: ${command.mode}`);
    console.log(`  Priority: ${command.priority}`);
    console.log(`  Reason: ${command.reason}`);
    console.log(`  Duration: ${(command.duration / 60000).toFixed(0)} minutes\n`);

    // Store active command
    const oldMode = this.currentMode;
    this.activeCommand = command;
    this.currentMode = command.mode;

    // Apply adjustments
    this.applyCommandAdjustments(command);

    // Acknowledge command
    alphaGammaCommunicator.acknowledgeCommand(command, true, `Mode changed: ${oldMode} → ${command.mode}`);

    // Notify mode change
    if (oldMode !== command.mode) {
      alphaGammaCommunicator.notifyGammaModeChange(oldMode, command.mode);
    }
  }

  /**
   * Apply adjustments from Alpha command
   */
  private applyCommandAdjustments(command: GammaCommand) {
    const adj = command.adjustments;

    // Adjust dedup window
    this.dedupWindow = this.BASE_DEDUP_WINDOW * (adj.dedupWindowMinutes / 120);

    // Adjust max correlated positions
    this.maxCorrelatedPositions = adj.maxSignalsPerSector;

    console.log('[Gamma] 🔧 Applied adjustments:');
    console.log(`  Pattern multiplier: ${adj.patternStrengthMultiplier}x`);
    console.log(`  Consensus adjust: ${adj.consensusThresholdAdjust > 0 ? '+' : ''}${adj.consensusThresholdAdjust}%`);
    console.log(`  R:R multiplier: ${adj.riskRewardMultiplier}x`);
    console.log(`  Max signals/sector: ${adj.maxSignalsPerSector}`);
    console.log(`  Dedup window: ${(this.dedupWindow / 60000).toFixed(0)} minutes\n`);
  }

  /**
   * Report stats to Alpha
   */
  private reportStatsToAlpha() {
    const stats: GammaStats = {
      currentMode: this.currentMode,
      passRate: this.stats.passRate,
      approvedToday: this.signalsApprovedToday,
      rejectedToday: this.signalsRejectedToday,
      averageQualityScore: this.stats.avgQualityScore,
      estimatedSignalsPerDay: this.estimateSignalsPerDay(),
      rejectionReasons: new Map(this.stats.rejectionsByReason),
      activeCommand: this.activeCommand,
      lastUpdated: Date.now()
    };

    alphaGammaCommunicator.reportGammaStats(stats);
  }

  /**
   * Estimate signals per day based on current pass rate
   */
  private estimateSignalsPerDay(): number {
    // Assume Beta generates ~30 candidates per day
    const candidatesPerDay = 30;
    return Math.round(candidatesPerDay * (this.stats.passRate / 100));
  }

  /**
   * Check and reset daily counters
   */
  private checkDailyReset() {
    const today = new Date().getDate();
    if (today !== this.lastDayReset) {
      this.signalsApprovedToday = 0;
      this.signalsRejectedToday = 0;
      this.lastDayReset = today;
      console.log('[Gamma] 🔄 Daily counters reset');
    }
  }

  /**
   * Handle signal from Beta Model
   */
  private async handleSignal(event: CustomEvent) {
    const signal: IGXSignal = event.detail;

    if (!signal || !this.isRunning) return;

    console.log(`\n[IGX Quality] 🔍 Checking signal: ${signal.symbol} ${signal.direction}`);

    // Perform quality check
    const result = await this.checkQuality(signal);

    this.stats.totalChecked++;

    if (result.passed) {
      this.stats.totalPassed++;
      this.recordPass(result);
      this.emitApprovedSignal(result.signal!);
    } else {
      this.stats.totalRejected++;
      this.recordRejection(result);
    }

    this.updateStats();
  }

  /**
   * Perform comprehensive quality check with Alpha V2 adjustments
   */
  private async checkQuality(signal: IGXSignal): Promise<QualityCheckResult> {
    // Get dynamic thresholds from Alpha Model
    const alphaThresholds = igxAlphaModel.getCurrentThresholds();

    // Apply Gamma command adjustments if active
    const adjustedThresholds = this.applyGammaAdjustments(alphaThresholds);

    const result: QualityCheckResult = {
      passed: false,
      signal: null,
      rejectionReasons: [],
      qualityMetrics: {
        patternScore: 0,
        consensusScore: 0,
        riskRewardScore: 0,
        liquidityScore: 0,
        dataQualityScore: 0,
        overallScore: 0
      },
      adjustedForMode: true,
      modeUsed: alphaThresholds.mode as any
    };

    // Track mode usage
    switch (alphaThresholds.mode) {
      case 'HIGH_QUALITY':
        this.stats.modeDistribution.highQuality++;
        break;
      case 'BALANCED':
        this.stats.modeDistribution.balanced++;
        break;
      case 'VOLUME':
        this.stats.modeDistribution.volume++;
        break;
    }

    // GATE 1: Pattern Strength (with Gamma adjustment)
    result.qualityMetrics.patternScore = this.checkPatternStrength(
      signal,
      adjustedThresholds.patternStrength,
      result.rejectionReasons
    );

    // GATE 2: Strategy Consensus (with Gamma adjustment)
    result.qualityMetrics.consensusScore = this.checkConsensus(
      signal,
      adjustedThresholds.consensus,
      result.rejectionReasons
    );

    // GATE 3: Risk/Reward Ratio (with Gamma adjustment)
    result.qualityMetrics.riskRewardScore = this.checkRiskReward(
      signal,
      adjustedThresholds.riskReward,
      result.rejectionReasons
    );

    // GATE 4: Liquidity Check
    result.qualityMetrics.liquidityScore = this.checkLiquidity(
      signal,
      result.rejectionReasons
    );

    // GATE 5: Data Quality
    result.qualityMetrics.dataQualityScore = this.checkDataQuality(
      signal,
      result.rejectionReasons
    );

    // GATE 6: Deduplication & Correlation (uses adjusted windows)
    this.checkDeduplication(signal, result.rejectionReasons);
    this.checkCorrelation(signal, result.rejectionReasons);

    // Calculate overall score
    result.qualityMetrics.overallScore = this.calculateOverallScore(result.qualityMetrics);

    // 🆕 OPPORTUNITY SCORING (NEW - not goal-based)
    // Score this opportunity for quality, regardless of "monthly targets"
    const opportunityScore = this.scoreOpportunity(signal, result.qualityMetrics);
    if (opportunityScore) {
      result.opportunityScore = {
        total: opportunityScore.total,
        grade: opportunityScore.grade,
        recommendation: opportunityScore.recommendation,
        reasoning: opportunityScore.reasoning
      };

      console.log(`[Gamma] 📊 Opportunity Score: ${opportunityScore.grade} (${opportunityScore.total}/100)`);
      console.log(`[Gamma] 💡 ${opportunityScore.reasoning}`);

      // If opportunity score says SKIP, add rejection reason
      if (opportunityScore.recommendation === 'SKIP' && result.rejectionReasons.length === 0) {
        result.rejectionReasons.push(`Low opportunity score: ${opportunityScore.grade} (${opportunityScore.total}/100)`);
      }
    }

    // Determine if passed
    result.passed = result.rejectionReasons.length === 0;

    if (result.passed) {
      result.signal = signal;
      this.signalsApprovedToday++;
      console.log(`[Gamma] ✅ PASSED (Mode: ${this.currentMode}) - Quality: ${result.qualityMetrics.overallScore.toFixed(0)}/100`);
    } else {
      this.signalsRejectedToday++;
      console.log(`[Gamma] ❌ REJECTED (Mode: ${this.currentMode}): ${result.rejectionReasons.join(', ')}`);
    }

    return result;
  }

  /**
   * Score opportunity using OpportunityScorer (Phase 3 - with real market data)
   */
  private scoreOpportunity(signal: IGXSignal, metrics: any): any {
    try {
      // Convert IGXSignal to SignalCandidate format for OpportunityScorer
      const candidate: Partial<SignalCandidate> = {
        symbol: signal.symbol,
        direction: signal.direction,
        patternStrength: metrics.patternScore,
        consensus: metrics.consensusScore / 100, // Convert to 0-1
        riskReward: signal.takeProfit && signal.stopLoss
          ? Math.abs((signal.takeProfit - signal.entry) / (signal.entry - signal.stopLoss))
          : 2.0,
        liquidityScore: metrics.liquidityScore,
        dataQuality: metrics.dataQualityScore,
        timestamp: signal.timestamp || Date.now()
      };

      // 🆕 PHASE 3: Get REAL market data from MarketConditionAnalyzer
      const marketMetrics = marketConditionAnalyzer.analyzeMarket(signal.symbol);
      const regime = marketConditionAnalyzer.detectRegime();

      // Get risk context from Alpha's latest decision
      const alphaDecision = alphaGammaCommunicator.getLatestAlphaDecision();
      const riskContext = {
        currentDrawdown: alphaDecision?.marketCondition?.compositeScore
          ? (50 - alphaDecision.marketCondition.compositeScore) / 5  // Convert to drawdown %
          : 0,
        winRate: 50, // TODO: Calculate from actual trade history
        correlationWithPortfolio: 0, // TODO: Calculate from active positions
        concentrationRisk: this.calculateConcentrationRisk(signal.symbol)
      };

      console.log(`[Gamma] 🎯 Phase 3 Opportunity Scoring:`);
      console.log(`  Market Score: ${marketMetrics.compositeScore.toFixed(1)}/100`);
      console.log(`  Regime: ${regime.regime} (${regime.confidence.toFixed(0)}%)`);
      console.log(`  Risk Context: Drawdown ${riskContext.currentDrawdown.toFixed(2)}%, WinRate ${riskContext.winRate.toFixed(0)}%`);

      return opportunityScorer.scoreOpportunity(
        candidate as SignalCandidate,
        marketMetrics,
        regime,
        riskContext
      );
    } catch (error) {
      console.error('[Gamma] Error scoring opportunity:', error);
      return null;
    }
  }

  /**
   * Calculate concentration risk for a symbol
   */
  private calculateConcentrationRisk(symbol: string): number {
    // Calculate risk based on active positions in same sector
    const sector = this.getSectorForSymbol(symbol);
    const sectorPositions = Array.from(this.activePositions.values())
      .filter(p => p.sector === sector);

    // More positions in same sector = higher concentration risk
    return Math.min((sectorPositions.length / this.maxCorrelatedPositions) * 100, 100);
  }

  /**
   * Get sector classification for a symbol
   */
  private getSectorForSymbol(symbol: string): string {
    // Simplified sector mapping - expand as needed
    const sectorMap: { [key: string]: string } = {
      'BTC': 'Store of Value',
      'ETH': 'Smart Contract Platform',
      'SOL': 'Smart Contract Platform',
      'BNB': 'Exchange Token',
      'XRP': 'Payment',
      'ADA': 'Smart Contract Platform',
      'DOT': 'Interoperability',
      'AVAX': 'Smart Contract Platform',
      'MATIC': 'Scaling Solution',
      'LINK': 'Oracle'
    };

    const base = symbol.replace('USDT', '').replace('USD', '');
    return sectorMap[base] || 'Other';
  }

  /**
   * Apply Gamma command adjustments to thresholds
   */
  private applyGammaAdjustments(baseThresholds: any): any {
    if (!this.activeCommand) {
      return baseThresholds;
    }

    const adj = this.activeCommand.adjustments;

    return {
      patternStrength: baseThresholds.patternStrength * adj.patternStrengthMultiplier,
      consensus: baseThresholds.consensus + (adj.consensusThresholdAdjust / 100),
      riskReward: baseThresholds.riskReward * adj.riskRewardMultiplier,
      mode: baseThresholds.mode
    };
  }

  /**
   * Check pattern strength
   */
  private checkPatternStrength(
    signal: IGXSignal,
    threshold: number,
    rejectionReasons: string[]
  ): number {
    if (!signal.patterns || signal.patterns.length === 0) {
      rejectionReasons.push('No patterns detected');
      return 0;
    }

    const avgStrength = signal.patterns.reduce((sum, p) => sum + p.strength, 0) / signal.patterns.length;

    // Apply bonus for multiple patterns
    let adjustedStrength = avgStrength;
    if (signal.patterns.length >= 3) {
      adjustedStrength *= 1.3;
    } else if (signal.patterns.length >= 2) {
      adjustedStrength *= 1.15;
    }

    const score = Math.min(adjustedStrength, 100);

    if (score < threshold) {
      rejectionReasons.push(`Pattern strength ${score.toFixed(0)} < ${threshold} required`);
    }

    return score;
  }

  /**
   * Check strategy consensus
   */
  private checkConsensus(
    signal: IGXSignal,
    threshold: number,
    rejectionReasons: string[]
  ): number {
    const { long, short, neutral } = signal.strategyVotes;
    const total = long + short + neutral;

    if (total === 0) {
      rejectionReasons.push('No strategy votes');
      return 0;
    }

    const expectedVotes = signal.direction === 'LONG' ? long : short;
    const consensusRatio = expectedVotes / total;
    const score = consensusRatio * 100;

    if (consensusRatio < threshold) {
      rejectionReasons.push(
        `Consensus ${(consensusRatio * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}% required`
      );
    }

    return score;
  }

  /**
   * Check risk/reward ratio
   */
  private checkRiskReward(
    signal: IGXSignal,
    threshold: number,
    rejectionReasons: string[]
  ): number {
    const rrRatio = signal.riskRewardRatio;

    // Convert to score (2:1 = 50, 4:1 = 100)
    const score = Math.min((rrRatio / 4) * 100, 100);

    if (rrRatio < threshold) {
      rejectionReasons.push(`R:R ${rrRatio.toFixed(2)}:1 < ${threshold}:1 required`);
    }

    return score;
  }

  /**
   * Check liquidity
   */
  private checkLiquidity(
    signal: IGXSignal,
    rejectionReasons: string[]
  ): number {
    const liquidity = signal.marketConditions?.liquidity || 0;

    if (liquidity < this.baseThresholds.minLiquidity) {
      rejectionReasons.push(`Liquidity score ${liquidity} < ${this.baseThresholds.minLiquidity} required`);
    }

    return liquidity;
  }

  /**
   * Check data quality
   */
  private checkDataQuality(
    signal: IGXSignal,
    rejectionReasons: string[]
  ): number {
    const quality = signal.dataQuality || 0;

    if (quality < this.baseThresholds.minDataQuality) {
      rejectionReasons.push(`Data quality ${quality} < ${this.baseThresholds.minDataQuality} required`);
    }

    // Bonus for multiple exchanges
    let adjustedQuality = quality;
    if (signal.exchangeSources.length >= 5) {
      adjustedQuality = Math.min(quality * 1.2, 100);
    }

    return adjustedQuality;
  }

  /**
   * Check deduplication (prevent spam)
   */
  private checkDeduplication(
    signal: IGXSignal,
    rejectionReasons: string[]
  ) {
    const lastSignalTime = this.recentSignals.get(signal.symbol);

    if (lastSignalTime) {
      const timeSince = Date.now() - lastSignalTime;

      // Use adjusted dedup window from Gamma command
      if (timeSince < this.dedupWindow) {
        const remainingMinutes = Math.ceil((this.dedupWindow - timeSince) / 60000);
        rejectionReasons.push(`Signal already generated ${Math.floor(timeSince / 60000)}m ago (wait ${remainingMinutes}m)`);
      }
    }
  }

  /**
   * Check correlation (diversification)
   */
  private checkCorrelation(
    signal: IGXSignal,
    rejectionReasons: string[]
  ) {
    // Simple sector classification based on symbol
    const sector = this.classifySector(signal.symbol);

    // Count active positions in same sector
    let sectorCount = 0;
    for (const [, position] of this.activePositions) {
      if (position.sector === sector) {
        sectorCount++;
      }
    }

    // Use adjusted max from Gamma command
    if (sectorCount >= this.maxCorrelatedPositions) {
      rejectionReasons.push(`Already have ${sectorCount} positions in ${sector} sector (max ${this.maxCorrelatedPositions})`);
    }
  }

  /**
   * Classify sector (simplified)
   */
  private classifySector(symbol: string): string {
    // Simple classification
    if (['BTC', 'ETH', 'BNB'].includes(symbol)) return 'MAJOR';
    if (['AVAX', 'SOL', 'DOT', 'ATOM'].includes(symbol)) return 'L1';
    if (['ARB', 'OP', 'MATIC'].includes(symbol)) return 'L2';
    if (['UNI', 'AAVE', 'LINK'].includes(symbol)) return 'DEFI';
    return 'OTHER';
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(metrics: any): number {
    // Weighted average
    const weights = {
      pattern: 0.25,
      consensus: 0.20,
      riskReward: 0.25,
      liquidity: 0.15,
      dataQuality: 0.15
    };

    return (
      metrics.patternScore * weights.pattern +
      metrics.consensusScore * weights.consensus +
      metrics.riskRewardScore * weights.riskReward +
      metrics.liquidityScore * weights.liquidity +
      metrics.dataQualityScore * weights.dataQuality
    );
  }

  /**
   * Record passed signal
   */
  private recordPass(result: QualityCheckResult) {
    const signal = result.signal!;

    // Update deduplication tracker
    this.recentSignals.set(signal.symbol, Date.now());

    // Add to active positions
    this.activePositions.set(signal.id, {
      sector: this.classifySector(signal.symbol),
      entryTime: Date.now()
    });

    // Update average quality score
    const n = this.stats.totalPassed - 1;
    this.stats.avgQualityScore = (this.stats.avgQualityScore * n + result.qualityMetrics.overallScore) / this.stats.totalPassed;

    console.log(`[IGX Quality] 📊 Pass recorded - Avg quality: ${this.stats.avgQualityScore.toFixed(1)}/100`);
  }

  /**
   * Record rejection
   */
  private recordRejection(result: QualityCheckResult) {
    // Track rejection reasons
    for (const reason of result.rejectionReasons) {
      const key = reason.split(' ')[0]; // First word as key
      const count = this.stats.rejectionsByReason.get(key) || 0;
      this.stats.rejectionsByReason.set(key, count + 1);
    }
  }

  /**
   * Update statistics
   */
  private updateStats() {
    this.stats.passRate = this.stats.totalChecked > 0 ?
      this.stats.totalPassed / this.stats.totalChecked : 0;

    // Log periodic summary
    if (this.stats.totalChecked % 10 === 0) {
      console.log('\n[IGX Quality] ========== QUALITY STATS ==========');
      console.log(`✅ Pass Rate: ${(this.stats.passRate * 100).toFixed(1)}%`);
      console.log(`📊 Total Checked: ${this.stats.totalChecked}`);
      console.log(`✨ Avg Quality: ${this.stats.avgQualityScore.toFixed(1)}/100`);
      console.log(`🎯 Mode Distribution:`);
      console.log(`   High Quality: ${this.stats.modeDistribution.highQuality}`);
      console.log(`   Balanced: ${this.stats.modeDistribution.balanced}`);
      console.log(`   Volume: ${this.stats.modeDistribution.volume}`);
      console.log('============================================\n');
    }
  }

  /**
   * Emit approved signal for execution
   */
  private emitApprovedSignal(signal: IGXSignal) {
    console.log(`\n[IGX Quality] 🚀 ========== APPROVED SIGNAL ==========`);
    console.log(`📊 Symbol: ${signal.symbol} ${signal.direction}`);
    console.log(`💰 Entry: $${signal.entryPrice.toFixed(2)}`);
    console.log(`🛡️ Stop Loss: $${signal.stopLoss.toFixed(2)}`);
    console.log(`🎯 Target 1: $${signal.targets[0].toFixed(2)}`);
    console.log(`📈 R:R Ratio: ${signal.riskRewardRatio.toFixed(2)}:1`);
    console.log(`✨ Quality: ${signal.qualityScore.toFixed(0)}/100`);
    console.log(`🧠 Strategy: ${signal.winningStrategy}`);
    console.log('================================================\n');

    // Emit for execution/display
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-signal-approved', {
        detail: signal
      }));
    }
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData() {
    const now = Date.now();

    // Clean old dedupe entries
    for (const [symbol, time] of this.recentSignals.entries()) {
      if (now - time > this.DEDUP_WINDOW) {
        this.recentSignals.delete(symbol);
      }
    }

    // Clean old positions (assume 24h max)
    const MAX_POSITION_AGE = 24 * 60 * 60 * 1000;
    for (const [id, position] of this.activePositions.entries()) {
      if (now - position.entryTime > MAX_POSITION_AGE) {
        this.activePositions.delete(id);
      }
    }
  }

  /**
   * Mark position as closed
   */
  closePosition(signalId: string) {
    this.activePositions.delete(signalId);
    console.log(`[IGX Quality] Position ${signalId} closed`);
  }

  /**
   * Get current statistics
   */
  getStats(): QualityStats {
    return {
      ...this.stats,
      rejectionsByReason: new Map(this.stats.rejectionsByReason) // Copy
    };
  }

  /**
   * Stop the quality checker
   */
  stop() {
    console.log('[IGX Quality] Stopping...');
    this.isRunning = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('igx-signal-generated', this.handleSignal.bind(this));
    }

    console.log('[IGX Quality] ✅ Stopped successfully');
  }
}

// Singleton instance
export const igxQualityChecker = new IGXQualityChecker();