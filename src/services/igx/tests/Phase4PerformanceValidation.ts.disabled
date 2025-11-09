/**
 * Phase 4 Performance Validation Test
 * Validates production readiness through long-running performance tests
 *
 * OBJECTIVES:
 * 1. Run 24-hour production test (or configurable duration)
 * 2. Measure Sharpe ratio improvements
 * 3. Validate adaptive behavior across market regimes
 * 4. Compare opportunity capture rate
 * 5. Track system stability and error rates
 * 6. Generate comprehensive performance report
 */

import { igxDataEngineV4Enhanced } from '../IGXDataEngineV4Enhanced';
import { marketConditionAnalyzer } from '../MarketConditionAnalyzer';
import { eventDrivenAlphaV3 } from '../EventDrivenAlphaV3';
import { opportunityScorer } from '../OpportunityScorer';
import { alphaGammaCommunicator } from '../AlphaGammaCommunicator';
import { igxQualityChecker } from '../IGXQualityChecker';
import { featureCache } from '../FeatureCache';
import { featureEngineWorker } from '../FeatureEngineWorker';
import type { IGXSignal, AlphaDecision, RegimeCharacteristics } from '@/types/igx-enhanced';

export interface PerformanceSnapshot {
  timestamp: number;
  elapsedMinutes: number;

  // Signal metrics
  signalsGenerated: number;
  signalsApproved: number;
  signalsRejected: number;
  approvalRate: number;

  // Quality metrics
  avgQualityScore: number;
  avgConfidence: number;
  avgRiskReward: number;

  // Market regime
  currentRegime: string;
  regimeConfidence: number;
  regimeChanges: number;

  // Alpha decisions
  alphaMode: string;
  gammaCommands: number;

  // Performance metrics
  cumulativeReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;

  // System health
  cacheHitRate: number;
  workerUpdateCount: number;
  errorsEncountered: number;
  systemUptime: number;

  // Opportunity capture
  opportunitiesDetected: number;
  opportunitiesCaptured: number;
  captureRate: number;
}

export interface AdaptiveBehaviorLog {
  timestamp: number;
  event: string;
  trigger: string;
  oldState: any;
  newState: any;
  reason: string;
  successful: boolean;
}

export interface Phase4ValidationReport {
  testStartTime: number;
  testEndTime: number;
  durationHours: number;

  // Summary metrics
  totalSignalsGenerated: number;
  totalSignalsApproved: number;
  overallApprovalRate: number;

  // Performance metrics
  finalCumulativeReturn: number;
  finalSharpeRatio: number;
  maxDrawdownObserved: number;
  overallWinRate: number;

  // Adaptive behavior
  totalRegimeChanges: number;
  totalModeChanges: number;
  totalGammaCommands: number;
  adaptiveBehaviorLogs: AdaptiveBehaviorLog[];

  // Opportunity capture
  totalOpportunitiesDetected: number;
  totalOpportunitiesCaptured: number;
  overallCaptureRate: number;

  // System stability
  totalErrors: number;
  avgSystemUptime: number;
  longestErrorFreeStreak: number;

  // Time series data
  snapshots: PerformanceSnapshot[];

  // Comparisons (vs baseline)
  improvements: {
    sharpeRatioImprovement: number;
    captureRateImprovement: number;
    signalQualityImprovement: number;
    adaptiveResponseTime: number;
  };

  // Recommendations
  recommendations: string[];
  productionReady: boolean;
  criticalIssues: string[];
}

export class Phase4PerformanceValidation {
  private snapshots: PerformanceSnapshot[] = [];
  private adaptiveBehaviorLogs: AdaptiveBehaviorLog[] = [];
  private tradeHistory: Array<{
    signal: IGXSignal;
    outcome: 'WIN' | 'LOSS' | 'PENDING';
    pnl: number;
    timestamp: number;
  }> = [];

  private regimeChanges = 0;
  private modeChanges = 0;
  private gammaCommands = 0;
  private errorsEncountered = 0;

  private testStartTime = 0;
  private isRunning = false;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Baseline metrics for comparison (from pre-Phase 1-3 system)
  private readonly BASELINE_SHARPE = 0.5;
  private readonly BASELINE_CAPTURE_RATE = 0.15; // 15%
  private readonly BASELINE_SIGNAL_QUALITY = 60;

  /**
   * Start 24-hour production validation test
   */
  async start24HourTest(): Promise<void> {
    return this.startTest(24 * 60); // 24 hours in minutes
  }

  /**
   * Start test with custom duration
   * @param durationMinutes Test duration in minutes
   */
  async startTest(durationMinutes: number): Promise<void> {
    if (this.isRunning) {
      console.warn('[Phase 4] Test already running');
      return;
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 4 PERFORMANCE VALIDATION TEST                         ║');
    console.log('║  24-Hour Production Readiness Validation                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`⏱️  Test Duration: ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(1)} hours)`);
    console.log(`📊 Snapshot Interval: Every 5 minutes`);
    console.log(`🎯 Objectives:`);
    console.log(`   - Measure Sharpe ratio improvements`);
    console.log(`   - Validate adaptive behavior`);
    console.log(`   - Compare opportunity capture rate`);
    console.log(`   - Track system stability`);
    console.log('');

    // Reset state
    this.snapshots = [];
    this.adaptiveBehaviorLogs = [];
    this.tradeHistory = [];
    this.regimeChanges = 0;
    this.modeChanges = 0;
    this.gammaCommands = 0;
    this.errorsEncountered = 0;
    this.testStartTime = Date.now();
    this.isRunning = true;

    // Initialize systems
    console.log('🚀 Initializing all IGX systems...');
    const allSymbols = [
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'DOGE', 'AVAX', 'MATIC',
      'LINK', 'UNI', 'ATOM', 'LTC', 'ETC', 'FIL', 'NEAR', 'ALGO', 'VET', 'ICP'
    ];

    try {
      await igxDataEngineV4Enhanced.start(allSymbols);
      featureEngineWorker.start();
      eventDrivenAlphaV3.start();
      console.log('✅ All systems initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize systems:', error);
      this.errorsEncountered++;
      throw error;
    }

    // Set up event listeners for adaptive behavior tracking
    this.setupEventListeners();

    // Take snapshots every 5 minutes
    console.log('\n📸 Starting snapshot collection (every 5 minutes)...');
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot();
    }, 5 * 60 * 1000); // 5 minutes

    // Take initial snapshot
    await this.sleep(10000); // Wait 10s for initial data
    this.takeSnapshot();

    // Monitor for test completion
    this.monitoringInterval = setInterval(() => {
      const elapsed = Date.now() - this.testStartTime;
      const elapsedMinutes = elapsed / (60 * 1000);

      if (elapsedMinutes >= durationMinutes) {
        console.log(`\n⏰ Test duration reached: ${durationMinutes} minutes`);
        this.stopTest();
      } else {
        // Log progress every 30 minutes
        if (elapsedMinutes % 30 < 0.1) {
          console.log(`\n⏳ Test progress: ${elapsedMinutes.toFixed(0)}/${durationMinutes} minutes (${((elapsedMinutes / durationMinutes) * 100).toFixed(1)}%)`);
        }
      }
    }, 60 * 1000); // Check every minute

    console.log(`\n✅ Phase 4 test started. Running for ${durationMinutes} minutes...`);
    console.log(`📊 Monitor progress in IGXMonitoringDashboard\n`);
  }

  /**
   * Stop the running test and generate report
   */
  stopTest(): Phase4ValidationReport | null {
    if (!this.isRunning) {
      console.warn('[Phase 4] No test is currently running');
      return null;
    }

    console.log('\n🛑 Stopping Phase 4 performance test...');

    // Clear intervals
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Take final snapshot
    this.takeSnapshot();

    // Stop systems
    try {
      eventDrivenAlphaV3.stop();
      featureEngineWorker.stop();
      igxDataEngineV4Enhanced.stop();
      console.log('✅ All systems stopped successfully');
    } catch (error) {
      console.error('⚠️  Error stopping systems:', error);
    }

    this.isRunning = false;

    // Generate report
    const report = this.generateReport();
    this.printReport(report);

    return report;
  }

  /**
   * Take a performance snapshot
   */
  private takeSnapshot(): void {
    const elapsed = Date.now() - this.testStartTime;
    const elapsedMinutes = elapsed / (60 * 1000);

    try {
      // Get current stats
      const alphaStats = eventDrivenAlphaV3.getStats();
      const cacheStats = featureCache.getStats();
      const workerStats = featureEngineWorker.getStats();
      const oppMetrics = opportunityScorer.getMetrics();
      const regime = marketConditionAnalyzer.detectRegime();

      // Calculate metrics
      const signalsGenerated = this.tradeHistory.length;
      const signalsApproved = this.tradeHistory.filter(t => t.outcome !== 'PENDING').length;
      const signalsRejected = signalsGenerated - signalsApproved;
      const approvalRate = signalsGenerated > 0 ? (signalsApproved / signalsGenerated) * 100 : 0;

      // Calculate returns
      const wins = this.tradeHistory.filter(t => t.outcome === 'WIN');
      const losses = this.tradeHistory.filter(t => t.outcome === 'LOSS');
      const totalTrades = wins.length + losses.length;
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      const totalPnL = this.tradeHistory.reduce((sum, t) => sum + t.pnl, 0);
      const returns = this.tradeHistory.map(t => t.pnl);
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const maxDrawdown = this.calculateMaxDrawdown(returns);

      // Opportunity capture
      const opportunitiesDetected = oppMetrics?.totalEvaluations || 0;
      const opportunitiesCaptured = signalsApproved;
      const captureRate = opportunitiesDetected > 0 ? (opportunitiesCaptured / opportunitiesDetected) * 100 : 0;

      const snapshot: PerformanceSnapshot = {
        timestamp: Date.now(),
        elapsedMinutes: elapsedMinutes,

        signalsGenerated,
        signalsApproved,
        signalsRejected,
        approvalRate,

        avgQualityScore: oppMetrics?.averageQualityScore || 0,
        avgConfidence: oppMetrics?.averageConfidence || 0,
        avgRiskReward: 2.5, // TODO: Track this

        currentRegime: regime?.regime || 'UNKNOWN',
        regimeConfidence: regime?.confidence || 0,
        regimeChanges: this.regimeChanges,

        alphaMode: alphaStats?.currentMode || 'UNKNOWN',
        gammaCommands: this.gammaCommands,

        cumulativeReturn: totalPnL,
        sharpeRatio,
        maxDrawdown,
        winRate,

        cacheHitRate: cacheStats?.hitRate || 0,
        workerUpdateCount: workerStats?.successCount || 0,
        errorsEncountered: this.errorsEncountered,
        systemUptime: 100, // TODO: Calculate actual uptime

        opportunitiesDetected,
        opportunitiesCaptured,
        captureRate
      };

      this.snapshots.push(snapshot);

      // Log summary (every 30 minutes)
      if (this.snapshots.length % 6 === 0) {
        console.log(`\n📊 Snapshot #${this.snapshots.length} (${elapsedMinutes.toFixed(0)} min):`);
        console.log(`   Signals: ${signalsGenerated} generated, ${signalsApproved} approved (${approvalRate.toFixed(1)}%)`);
        console.log(`   Performance: Return=${totalPnL.toFixed(2)}%, Sharpe=${sharpeRatio.toFixed(2)}, Win Rate=${winRate.toFixed(1)}%`);
        console.log(`   Capture Rate: ${captureRate.toFixed(1)}% (${opportunitiesCaptured}/${opportunitiesDetected})`);
        console.log(`   Regime: ${snapshot.currentRegime} (${snapshot.regimeConfidence.toFixed(0)}%)`);
      }
    } catch (error) {
      console.error('Error taking snapshot:', error);
      this.errorsEncountered++;
    }
  }

  /**
   * Set up event listeners for adaptive behavior tracking
   */
  private setupEventListeners(): void {
    // Track regime changes
    alphaGammaCommunicator.onRegimeChange((regime: RegimeCharacteristics) => {
      this.regimeChanges++;
      this.adaptiveBehaviorLogs.push({
        timestamp: Date.now(),
        event: 'REGIME_CHANGE',
        trigger: 'Market Condition Analyzer',
        oldState: { regime: 'PREVIOUS' },
        newState: { regime: regime.regime, confidence: regime.confidence },
        reason: `Regime changed to ${regime.regime} with ${regime.confidence.toFixed(0)}% confidence`,
        successful: true
      });
    });

    // Track Alpha mode changes
    alphaGammaCommunicator.on('alpha:mode_change', (data: any) => {
      this.modeChanges++;
      this.adaptiveBehaviorLogs.push({
        timestamp: Date.now(),
        event: 'MODE_CHANGE',
        trigger: 'Event-Driven Alpha V3',
        oldState: { mode: data.oldMode },
        newState: { mode: data.newMode },
        reason: data.reason,
        successful: true
      });
    });

    // Track Gamma commands
    alphaGammaCommunicator.onAlphaCommand((command: any) => {
      this.gammaCommands++;
      this.adaptiveBehaviorLogs.push({
        timestamp: Date.now(),
        event: 'GAMMA_COMMAND',
        trigger: 'Alpha Model',
        oldState: {},
        newState: { mode: command.mode, adjustments: command.adjustments },
        reason: command.reason,
        successful: true
      });
    });
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe ratio (assuming daily returns)
    const sharpe = (avgReturn / stdDev) * Math.sqrt(365);
    return sharpe;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const ret of returns) {
      cumulative += ret;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Generate comprehensive performance report
   */
  private generateReport(): Phase4ValidationReport {
    const testEndTime = Date.now();
    const durationHours = (testEndTime - this.testStartTime) / (60 * 60 * 1000);

    // Get final snapshot
    const finalSnapshot = this.snapshots[this.snapshots.length - 1] || {
      signalsGenerated: 0,
      signalsApproved: 0,
      approvalRate: 0,
      cumulativeReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      opportunitiesDetected: 0,
      opportunitiesCaptured: 0,
      captureRate: 0,
      errorsEncountered: 0,
      systemUptime: 0
    };

    // Calculate improvements vs baseline
    const sharpeImprovement = ((finalSnapshot.sharpeRatio - this.BASELINE_SHARPE) / this.BASELINE_SHARPE) * 100;
    const captureRateImprovement = ((finalSnapshot.captureRate / 100 - this.BASELINE_CAPTURE_RATE) / this.BASELINE_CAPTURE_RATE) * 100;
    const qualityImprovement = ((finalSnapshot.avgQualityScore - this.BASELINE_SIGNAL_QUALITY) / this.BASELINE_SIGNAL_QUALITY) * 100;

    // Calculate average adaptive response time
    const avgResponseTime = this.adaptiveBehaviorLogs.length > 0
      ? this.adaptiveBehaviorLogs.reduce((sum, log) => {
          const nextLog = this.adaptiveBehaviorLogs.find(l => l.timestamp > log.timestamp);
          return sum + (nextLog ? (nextLog.timestamp - log.timestamp) / 1000 : 0);
        }, 0) / this.adaptiveBehaviorLogs.length
      : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];
    let productionReady = true;

    if (finalSnapshot.sharpeRatio < 1.0) {
      recommendations.push('⚠️  Sharpe ratio below 1.0 - consider improving signal quality');
      if (finalSnapshot.sharpeRatio < 0.5) {
        criticalIssues.push('❌ Sharpe ratio critically low - not production ready');
        productionReady = false;
      }
    } else {
      recommendations.push(`✅ Sharpe ratio ${finalSnapshot.sharpeRatio.toFixed(2)} - excellent risk-adjusted returns`);
    }

    if (finalSnapshot.captureRate < 30) {
      recommendations.push('⚠️  Opportunity capture rate below 30% - system may be too conservative');
    } else if (finalSnapshot.captureRate > 80) {
      recommendations.push('⚠️  Opportunity capture rate above 80% - system may be too aggressive');
    } else {
      recommendations.push(`✅ Opportunity capture rate ${finalSnapshot.captureRate.toFixed(1)}% - well balanced`);
    }

    if (finalSnapshot.winRate < 50) {
      criticalIssues.push('❌ Win rate below 50% - strategy needs improvement');
      productionReady = false;
    } else if (finalSnapshot.winRate > 60) {
      recommendations.push(`✅ Win rate ${finalSnapshot.winRate.toFixed(1)}% - strong performance`);
    }

    if (this.errorsEncountered > 10) {
      recommendations.push(`⚠️  ${this.errorsEncountered} errors encountered - investigate error logs`);
      if (this.errorsEncountered > 50) {
        criticalIssues.push('❌ Too many errors - system stability concerns');
        productionReady = false;
      }
    } else {
      recommendations.push(`✅ Only ${this.errorsEncountered} errors - system stable`);
    }

    if (this.adaptiveBehaviorLogs.length < 5 && durationHours > 12) {
      recommendations.push('⚠️  Low adaptive behavior activity - verify event-driven system');
    } else {
      recommendations.push(`✅ ${this.adaptiveBehaviorLogs.length} adaptive responses - system responding to market changes`);
    }

    if (productionReady) {
      recommendations.push('🎉 PRODUCTION READY: All critical metrics passed');
    } else {
      recommendations.push('🔴 NOT PRODUCTION READY: Address critical issues before deployment');
    }

    return {
      testStartTime: this.testStartTime,
      testEndTime,
      durationHours,

      totalSignalsGenerated: finalSnapshot.signalsGenerated,
      totalSignalsApproved: finalSnapshot.signalsApproved,
      overallApprovalRate: finalSnapshot.approvalRate,

      finalCumulativeReturn: finalSnapshot.cumulativeReturn,
      finalSharpeRatio: finalSnapshot.sharpeRatio,
      maxDrawdownObserved: finalSnapshot.maxDrawdown,
      overallWinRate: finalSnapshot.winRate,

      totalRegimeChanges: this.regimeChanges,
      totalModeChanges: this.modeChanges,
      totalGammaCommands: this.gammaCommands,
      adaptiveBehaviorLogs: this.adaptiveBehaviorLogs,

      totalOpportunitiesDetected: finalSnapshot.opportunitiesDetected,
      totalOpportunitiesCaptured: finalSnapshot.opportunitiesCaptured,
      overallCaptureRate: finalSnapshot.captureRate,

      totalErrors: this.errorsEncountered,
      avgSystemUptime: finalSnapshot.systemUptime,
      longestErrorFreeStreak: 0, // TODO: Calculate this

      snapshots: this.snapshots,

      improvements: {
        sharpeRatioImprovement: sharpeImprovement,
        captureRateImprovement: captureRateImprovement,
        signalQualityImprovement: qualityImprovement,
        adaptiveResponseTime: avgResponseTime
      },

      recommendations,
      productionReady,
      criticalIssues
    };
  }

  /**
   * Print comprehensive report to console
   */
  private printReport(report: Phase4ValidationReport): void {
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 4 PERFORMANCE VALIDATION REPORT                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`📅 Test Period: ${new Date(report.testStartTime).toLocaleString()} - ${new Date(report.testEndTime).toLocaleString()}`);
    console.log(`⏱️  Duration: ${report.durationHours.toFixed(2)} hours`);
    console.log(`📸 Snapshots: ${report.snapshots.length}`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  SIGNAL GENERATION                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Total Signals Generated:  ${report.totalSignalsGenerated}`);
    console.log(`Total Signals Approved:   ${report.totalSignalsApproved}`);
    console.log(`Overall Approval Rate:    ${report.overallApprovalRate.toFixed(1)}%`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PERFORMANCE METRICS                                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Cumulative Return:        ${report.finalCumulativeReturn.toFixed(2)}%`);
    console.log(`Sharpe Ratio:             ${report.finalSharpeRatio.toFixed(2)}`);
    console.log(`Maximum Drawdown:         ${report.maxDrawdownObserved.toFixed(2)}%`);
    console.log(`Win Rate:                 ${report.overallWinRate.toFixed(1)}%`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ADAPTIVE BEHAVIOR                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Regime Changes:           ${report.totalRegimeChanges}`);
    console.log(`Mode Changes:             ${report.totalModeChanges}`);
    console.log(`Gamma Commands:           ${report.totalGammaCommands}`);
    console.log(`Total Adaptive Responses: ${report.adaptiveBehaviorLogs.length}`);
    console.log(`Avg Response Time:        ${report.improvements.adaptiveResponseTime.toFixed(2)}s`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  OPPORTUNITY CAPTURE                                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Opportunities Detected:   ${report.totalOpportunitiesDetected}`);
    console.log(`Opportunities Captured:   ${report.totalOpportunitiesCaptured}`);
    console.log(`Capture Rate:             ${report.overallCaptureRate.toFixed(1)}%`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  IMPROVEMENTS VS BASELINE                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Sharpe Ratio:             ${report.improvements.sharpeRatioImprovement >= 0 ? '+' : ''}${report.improvements.sharpeRatioImprovement.toFixed(1)}%`);
    console.log(`Capture Rate:             ${report.improvements.captureRateImprovement >= 0 ? '+' : ''}${report.improvements.captureRateImprovement.toFixed(1)}%`);
    console.log(`Signal Quality:           ${report.improvements.signalQualityImprovement >= 0 ? '+' : ''}${report.improvements.signalQualityImprovement.toFixed(1)}%`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  SYSTEM STABILITY                                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Total Errors:             ${report.totalErrors}`);
    console.log(`Avg System Uptime:        ${report.avgSystemUptime.toFixed(1)}%`);
    console.log('');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PRODUCTION READINESS                                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Status: ${report.productionReady ? '🟢 PRODUCTION READY' : '🔴 NOT READY'}`);
    console.log('');

    if (report.criticalIssues.length > 0) {
      console.log('🔴 CRITICAL ISSUES:');
      report.criticalIssues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }

    console.log('📋 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    console.log('');

    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Get current test status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      elapsedMinutes: this.isRunning ? (Date.now() - this.testStartTime) / (60 * 1000) : 0,
      snapshotCount: this.snapshots.length,
      signalsGenerated: this.tradeHistory.length,
      adaptiveResponses: this.adaptiveBehaviorLogs.length,
      errorsEncountered: this.errorsEncountered
    };
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): PerformanceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const phase4PerformanceValidation = new Phase4PerformanceValidation();
