/**
 * DATA FLOW DIAGNOSTICS
 * Deep analysis tool to identify why signals aren't generating
 * Traces entire pipeline from WebSocket → V3 Engine → Signal Generation
 */

import { realTimeMonitoringService } from '@/services/realTimeMonitoringService';
import { realTimeSignalEngineV3 } from '@/services/realTimeSignalEngineV3';
import { multiExchangeAggregator } from '@/services/dataStreams/multiExchangeAggregator';
import { persistentStatsManager } from '@/services/persistentStatsManager';
import { adaptiveTierManager } from '@/services/adaptive/AdaptiveTierManager';
import { volatilityAwareThresholds } from '@/services/adaptive/VolatilityAwareThresholds';
import { ohlcDataManager } from '@/services/ohlcDataManager';

export interface DataFlowDiagnostic {
  timestamp: number;
  component: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  details: Record<string, any>;
  issues: string[];
  recommendations: string[];
}

/**
 * Comprehensive system health check
 */
export async function diagnoseDataFlow(): Promise<DataFlowDiagnostic[]> {
  const diagnostics: DataFlowDiagnostic[] = [];
  const timestamp = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          DATA FLOW DIAGNOSTICS - DEEP ANALYSIS               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Check Monitoring Service
  const monitoringStatus = realTimeMonitoringService.getStatus();
  const monitoringDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'Real-Time Monitoring Service',
    status: monitoringStatus.isRunning ? 'HEALTHY' : 'CRITICAL',
    details: {
      isRunning: monitoringStatus.isRunning,
      uptime: monitoringStatus.startTime ? (Date.now() - monitoringStatus.startTime) / 1000 : 0,
      monitoredCoins: monitoringStatus.monitoredCoins.length
    },
    issues: [],
    recommendations: []
  };

  if (!monitoringStatus.isRunning) {
    monitoringDiag.issues.push('Monitoring service is NOT running');
    monitoringDiag.recommendations.push('Call realTimeMonitoringService.start() with coin list');
  }

  diagnostics.push(monitoringDiag);
  console.log(`[1/8] Monitoring Service: ${monitoringDiag.status}`);

  // 2. Check WebSocket Connections
  const aggregatorStats = multiExchangeAggregator.getStats();
  const wsConnected = aggregatorStats.binanceStatus === 'CONNECTED' || aggregatorStats.okxStatus === 'CONNECTED';

  const wsDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'WebSocket Connections',
    status: wsConnected ? 'HEALTHY' : 'CRITICAL',
    details: {
      binanceStatus: aggregatorStats.binanceStatus,
      okxStatus: aggregatorStats.okxStatus,
      totalDataPoints: aggregatorStats.totalDataPoints,
      binanceData: aggregatorStats.binanceData,
      okxData: aggregatorStats.okxData,
      fallbackData: aggregatorStats.fallbackData,
      lastDataReceived: aggregatorStats.lastDataReceived,
      timeSinceLastData: Date.now() - aggregatorStats.lastDataReceived
    },
    issues: [],
    recommendations: []
  };

  if (!wsConnected) {
    wsDiag.issues.push('NO WebSocket connections active');
    wsDiag.recommendations.push('Check network connectivity and WebSocket availability');
  }

  if (aggregatorStats.totalDataPoints === 0) {
    wsDiag.issues.push('ZERO data points received');
    wsDiag.recommendations.push('Check if coins are properly mapped to exchange symbols');
    wsDiag.status = 'CRITICAL';
  }

  const timeSinceData = Date.now() - aggregatorStats.lastDataReceived;
  if (timeSinceData > 60000 && aggregatorStats.lastDataReceived > 0) {
    wsDiag.issues.push(`No data for ${Math.round(timeSinceData / 1000)}s - data flow stopped`);
    wsDiag.status = 'WARNING';
  }

  diagnostics.push(wsDiag);
  console.log(`[2/8] WebSocket Connections: ${wsDiag.status}`);
  console.log(`     Binance: ${aggregatorStats.binanceStatus}, OKX: ${aggregatorStats.okxStatus}`);
  console.log(`     Data Points: ${aggregatorStats.totalDataPoints} (B:${aggregatorStats.binanceData}, O:${aggregatorStats.okxData})`);

  // 3. Check OHLC Data
  const ohlcStats = ohlcDataManager.getStats();
  const ohlcDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'OHLC Historical Data',
    status: ohlcStats.coinsWithData > 0 ? 'HEALTHY' : 'WARNING',
    details: {
      totalCoins: ohlcStats.totalCoins,
      coinsWithData: ohlcStats.coinsWithData,
      avgCandlesPerCoin: ohlcStats.avgCandlesPerCoin,
      minCandles: ohlcStats.minCandles,
      maxCandles: ohlcStats.maxCandles
    },
    issues: [],
    recommendations: []
  };

  if (ohlcStats.coinsWithData === 0) {
    ohlcDiag.issues.push('NO OHLC data loaded - strategies need historical candles');
    ohlcDiag.recommendations.push('Call ohlcDataManager.initializeCoins() with coin list');
    ohlcDiag.status = 'CRITICAL';
  } else if (ohlcStats.avgCandlesPerCoin < 50) {
    ohlcDiag.issues.push('Insufficient OHLC data - strategies may not work properly');
    ohlcDiag.status = 'WARNING';
  }

  diagnostics.push(ohlcDiag);
  console.log(`[3/8] OHLC Data: ${ohlcDiag.status}`);
  console.log(`     ${ohlcStats.coinsWithData}/${ohlcStats.totalCoins} coins with data (avg ${Math.round(ohlcStats.avgCandlesPerCoin)} candles)`);

  // 4. Check V3 Engine Stats
  const engineStats = realTimeSignalEngineV3.getStats();
  const engineDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'V3 Signal Engine',
    status: engineStats.totalTicks > 0 ? 'HEALTHY' : 'CRITICAL',
    details: {
      totalTicks: engineStats.totalTicks,
      microAnomalies: engineStats.microAnomalies,
      tierUpgrades: engineStats.tierUpgrades,
      triggersEvaluated: engineStats.triggersEvaluated,
      triggersFiltered: engineStats.triggersFiltered,
      signalsGenerated: engineStats.signalsGenerated,
      signalsRejected: engineStats.signalsRejected,
      avgChecksPerSecond: engineStats.avgChecksPerSecond,
      uptime: (Date.now() - engineStats.startTime) / 1000
    },
    issues: [],
    recommendations: []
  };

  if (engineStats.totalTicks === 0) {
    engineDiag.issues.push('CRITICAL: V3 engine receiving ZERO ticks - data pipeline broken');
    engineDiag.recommendations.push('Check if multiExchangeAggregator callback is properly connected');
    engineDiag.status = 'CRITICAL';
  } else if (engineStats.triggersEvaluated === 0) {
    engineDiag.issues.push('No triggers evaluated - either no anomalies OR tier check blocking all');
    engineDiag.recommendations.push('Check adaptive tier intervals - might be too slow');
    engineDiag.status = 'WARNING';
  } else if (engineStats.signalsGenerated === 0 && engineStats.signalsRejected > 0) {
    engineDiag.issues.push(`All signals rejected (${engineStats.signalsRejected} rejected)`);
    engineDiag.recommendations.push('Check confidence thresholds, data enrichment, strategy analysis');
    engineDiag.status = 'WARNING';
  }

  // Calculate filter rate
  const filterRate = engineStats.triggersEvaluated + engineStats.triggersFiltered > 0
    ? (engineStats.triggersFiltered / (engineStats.triggersEvaluated + engineStats.triggersFiltered) * 100)
    : 0;

  if (filterRate > 90) {
    engineDiag.issues.push(`${filterRate.toFixed(0)}% of triggers filtered as noise - significance filter too aggressive?`);
    engineDiag.status = 'WARNING';
  }

  diagnostics.push(engineDiag);
  console.log(`[4/8] V3 Signal Engine: ${engineDiag.status}`);
  console.log(`     Ticks: ${engineStats.totalTicks}, Triggers: ${engineStats.triggersEvaluated}, Signals: ${engineStats.signalsGenerated}`);
  console.log(`     Rejected: ${engineStats.signalsRejected}, Filtered: ${engineStats.triggersFiltered} (${filterRate.toFixed(0)}% filter rate)`);

  // 5. Check Adaptive Tier Distribution
  const tierStats = adaptiveTierManager.getStats();
  const tierDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'Adaptive Tier System',
    status: 'HEALTHY',
    details: {
      tier1Count: tierStats.tier1Count,
      tier2Count: tierStats.tier2Count,
      tier3Count: tierStats.tier3Count,
      totalUpgrades: tierStats.totalUpgrades,
      totalDowngrades: tierStats.totalDowngrades
    },
    issues: [],
    recommendations: []
  };

  if (tierStats.tier1Count === tierStats.tier1Count + tierStats.tier2Count + tierStats.tier3Count) {
    tierDiag.issues.push('ALL coins in CALM tier (5s scanning) - might miss opportunities');
    tierDiag.recommendations.push('Check if micro-pattern detector is working properly');
    tierDiag.status = 'WARNING';
  }

  diagnostics.push(tierDiag);
  console.log(`[5/8] Adaptive Tiers: ${tierDiag.status}`);
  console.log(`     CALM: ${tierStats.tier1Count}, ALERT: ${tierStats.tier2Count}, OPPORTUNITY: ${tierStats.tier3Count}`);
  console.log(`     Upgrades: ${tierStats.totalUpgrades}, Downgrades: ${tierStats.totalDowngrades}`);

  // 6. Check Volatility Awareness
  const volStats = volatilityAwareThresholds.getStats();
  const volDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'Volatility Awareness',
    status: 'HEALTHY',
    details: {
      avgVolatility: volStats.avgVolatility,
      regimeDistribution: volStats.regimeDistribution,
      trackedCoins: volStats.trackedCoins
    },
    issues: [],
    recommendations: []
  };

  if (volStats.trackedCoins === 0) {
    volDiag.issues.push('No coins tracked for volatility - thresholds won\'t adapt');
    volDiag.status = 'WARNING';
  }

  diagnostics.push(volDiag);
  console.log(`[6/8] Volatility Tracking: ${volDiag.status}`);
  console.log(`     Avg Volatility: ${volStats.avgVolatility.toFixed(3)}%, Tracked Coins: ${volStats.trackedCoins}`);
  console.log(`     Regimes: CALM=${volStats.regimeDistribution.CALM}, NORMAL=${volStats.regimeDistribution.NORMAL}, VOLATILE=${volStats.regimeDistribution.VOLATILE}`);

  // 7. Check Persistent Stats
  const persistStats = persistentStatsManager.getStats();
  const persistDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'Persistent Statistics',
    status: 'HEALTHY',
    details: {
      dataPoints24h: persistStats.dataPoints24h,
      triggers24h: persistStats.triggers24h,
      signals24h: persistStats.signals24h,
      dataRate: persistStats.dataRate,
      signalRate: persistStats.signalRate,
      lastReset: persistStats.lastReset
    },
    issues: [],
    recommendations: []
  };

  if (persistStats.dataPoints24h === 0) {
    persistDiag.issues.push('No data points recorded in 24h - persistent stats not being updated');
    persistDiag.status = 'WARNING';
  }

  diagnostics.push(persistDiag);
  console.log(`[7/8] Persistent Stats (24h): ${persistDiag.status}`);
  console.log(`     Data Points: ${persistStats.dataPoints24h}, Triggers: ${persistStats.triggers24h}, Signals: ${persistStats.signals24h}`);
  console.log(`     Rates: ${persistStats.dataRate.toFixed(1)} pts/min, ${persistStats.signalRate.toFixed(1)} signals/hr`);

  // 8. Overall System Health
  const criticalIssues = diagnostics.filter(d => d.status === 'CRITICAL').length;
  const warnings = diagnostics.filter(d => d.status === 'WARNING').length;

  const overallDiag: DataFlowDiagnostic = {
    timestamp,
    component: 'Overall System Health',
    status: criticalIssues > 0 ? 'CRITICAL' : warnings > 0 ? 'WARNING' : 'HEALTHY',
    details: {
      totalComponents: diagnostics.length,
      healthyComponents: diagnostics.filter(d => d.status === 'HEALTHY').length,
      warningComponents: warnings,
      criticalComponents: criticalIssues
    },
    issues: [],
    recommendations: []
  };

  diagnostics.push(overallDiag);
  console.log(`\n[8/8] Overall Health: ${overallDiag.status}`);
  console.log(`     ${overallDiag.details.healthyComponents}/${diagnostics.length - 1} components healthy`);

  if (criticalIssues > 0) {
    console.log(`\n⚠️  CRITICAL ISSUES DETECTED: ${criticalIssues}`);
  }
  if (warnings > 0) {
    console.log(`⚠️  WARNINGS: ${warnings}`);
  }

  // Print all issues and recommendations
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    ISSUES & RECOMMENDATIONS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  diagnostics.forEach(diag => {
    if (diag.issues.length > 0 || diag.recommendations.length > 0) {
      console.log(`\n[${diag.component}]:`);
      diag.issues.forEach(issue => console.log(`  ❌ ISSUE: ${issue}`));
      diag.recommendations.forEach(rec => console.log(`  💡 RECOMMENDATION: ${rec}`));
    }
  });

  console.log('\n═════════════════════════════════════════════════════════════\n');

  return diagnostics;
}

/**
 * Export to window for console debugging
 */
if (typeof window !== 'undefined') {
  (window as any).diagnoseDataFlow = diagnoseDataFlow;
  console.log('📊 Data flow diagnostics loaded! Run: diagnoseDataFlow()');
}
