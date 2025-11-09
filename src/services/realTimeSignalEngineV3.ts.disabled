/**
 * REAL-TIME SIGNAL ENGINE V3 - INTELLIGENT MULTI-STRATEGY SELECTION
 * Production-grade signal detection with intelligent best-signal selection
 *
 * PHILOSOPHY:
 * - All 10 strategies analyze market independently
 * - Each generates its own analysis and potential signal
 * - IntelligentSignalSelector chooses THE BEST opportunity per coin
 * - Only ONE signal per coin shown to user (prevents confusion, builds trust)
 * - Selection based on: consensus direction, confidence, risk/reward, strength
 * - Track winning strategy for performance monitoring and improvement
 *
 * ARCHITECTURE:
 * 1. MicroPatternDetector: Runs on EVERY WebSocket tick (<1ms) for anomaly detection
 * 2. AdaptiveTierManager: Controls scanning frequency per coin (CALM/ALERT/OPPORTUNITY)
 * 3. VolatilityAwareThresholds: Dynamic thresholds based on market regime
 * 4. MultiStrategyEngine: Runs all 10 specialized strategies in parallel
 * 5. IntelligentSignalSelector: Chooses best signal using multi-factor scoring
 *
 * SIGNAL SELECTION LOGIC:
 * - If 6 LONG + 3 SHORT signals → Dominant direction LONG, select best LONG signal
 * - If 5 LONG + 5 SHORT signals → CONFLICTED, reject all (don't confuse user)
 * - Quality Score = Confidence (40%) + Consensus (30%) + Risk/Reward (20%) + Strength (10%)
 * - Highest scoring signal in dominant direction wins
 * - Strategy name tracked for performance analytics
 *
 * QUALITY CONTROLS:
 * - Each strategy must meet its own threshold (64-70%)
 * - Majority consensus required (>50% must agree on direction)
 * - Conflicted markets rejected (equal LONG/SHORT = no clear opportunity)
 * - 2-hour deduplication per coin (quality > quantity)
 * - Only best-of-best signals shown to user
 *
 * PERFORMANCE:
 * - Expected signals: 3-8 high-quality signals per day
 * - Confidence range: 65-95% (post-selection)
 * - User sees: Single best opportunity per coin, clear direction, high conviction
 */

import { CanonicalTicker } from './dataStreams/canonicalDataTypes';
import { multiStrategyEngine } from './strategies/multiStrategyEngine';
import { intelligentSignalSelector } from './intelligentSignalSelector';
import { dataEnrichmentService } from './dataEnrichmentService';
import { microPatternDetector } from './adaptive/MicroPatternDetector';
import { adaptiveTierManager } from './adaptive/AdaptiveTierManager';
import { volatilityAwareThresholds } from './adaptive/VolatilityAwareThresholds';
import { significanceFilter } from './adaptive/SignificanceFilter';
import { persistentStatsManager } from './persistentStatsManager';
import { strategyReputationManager } from './strategies/StrategyReputationManager';
import { supabase } from '@/integrations/supabase/client';
import type { MarketDataInput } from './smartMoneySignalEngine';
import type { StrategySignal } from './strategies/strategyTypes';

export interface SignalEngineStats {
  totalTicks: number;
  microAnomalies: number;
  tierUpgrades: number;
  tierDowngrades: number;
  triggersEvaluated: number;
  triggersFiltered: number; // New: count of triggers filtered as noise
  signalsGenerated: number;
  signalsRejected: number;
  avgChecksPerSecond: number;
  startTime: number;
}

export class RealTimeSignalEngineV3 {
  private previousTickerMap: Map<string, CanonicalTicker> = new Map();
  private lastAnalysisTime: Map<string, number> = new Map();
  private recentSignals: Set<string> = new Set(); // Deduplication: symbol:timestamp_bucket

  private stats: SignalEngineStats = {
    totalTicks: 0,
    microAnomalies: 0,
    tierUpgrades: 0,
    tierDowngrades: 0,
    triggersEvaluated: 0,
    triggersFiltered: 0,
    signalsGenerated: 0,
    signalsRejected: 0,
    avgChecksPerSecond: 0,
    startTime: Date.now()
  };

  private readonly MIN_ANALYSIS_INTERVAL = 30000; // 30 seconds cooldown between trigger evaluations
  private readonly SIGNAL_DEDUP_WINDOW = 7200000; // 2 hour deduplication per coin (one signal per coin per 2 hours)
  // Note: No global MIN_CONFIDENCE - each strategy has its own threshold (64-70%)

  /**
   * Process incoming WebSocket tick (called on EVERY tick)
   */
  processTick(ticker: CanonicalTicker) {
    this.stats.totalTicks++;
    const symbol = ticker.symbol;

    // STEP 1: Micro-pattern anomaly detection (runs on EVERY tick, <1ms)
    let anomalyDetected = false;
    const previous = this.previousTickerMap.get(symbol);
    if (previous) {
      const anomalyDetection = microPatternDetector.detectAnomalies(ticker, previous);

      // Update volatility tracker with price change
      const priceChangePercent = ((ticker.price - previous.price) / previous.price) * 100;
      volatilityAwareThresholds.updateVolatility(symbol, priceChangePercent);

      // If anomaly detected, upgrade tier
      if (anomalyDetection.severity !== 'NONE') {
        this.stats.microAnomalies++;
        adaptiveTierManager.upgradeTier(
          symbol,
          anomalyDetection.severity,
          anomalyDetection.reasons.join(', ')
        );
        this.stats.tierUpgrades++;
        anomalyDetected = true; // Force trigger evaluation
      }
    }

    // Store current ticker for next comparison
    this.previousTickerMap.set(symbol, ticker);

    // STEP 2: Check if we should perform trigger analysis
    // CRITICAL FIX: If anomaly just detected, FORCE evaluation (bypass interval check)
    const shouldCheck = anomalyDetected || adaptiveTierManager.shouldCheck(symbol);
    if (!shouldCheck) {
      return; // Not time to check yet based on current tier
    }

    // STEP 3: Evaluate triggers with volatility-aware thresholds
    this.evaluateTriggers(ticker);
  }

  /**
   * Evaluate triggers using dynamic thresholds with significance filtering
   */
  private evaluateTriggers(ticker: CanonicalTicker) {
    const symbol = ticker.symbol;
    const now = Date.now();

    // Get previous ticker for comparison
    const previous = this.previousTickerMap.get(symbol);
    if (!previous) return;

    // Get dynamic thresholds for current volatility regime
    const thresholds = volatilityAwareThresholds.getThresholds(symbol);
    const regime = volatilityAwareThresholds.getRegime(symbol);

    // Calculate changes
    const priceChangePercent = ((ticker.price - previous.price) / previous.price) * 100;
    const timeDelta = (ticker.timestamp - previous.timestamp) / 1000; // seconds
    const priceVelocity = timeDelta > 0 ? Math.abs(priceChangePercent) / timeDelta : 0;

    // Calculate volume and order book metrics for significance check
    const currentVolume = ticker.volume24h || 0;
    const previousVolume = previous.volume24h || 0;
    const bidAskRatio = ticker.bid > 0 && ticker.ask > 0 ? ticker.bid / ticker.ask : 1.0;
    const buyPressure = ticker.bid > 0 && ticker.ask > 0
      ? (ticker.bid / (ticker.bid + ticker.ask)) * 100
      : 50;

    // TRIGGER EVALUATION
    let triggerDetected = false;
    let triggerReason = '';
    let triggerPriority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let spreadMultiplier = 1.0;

    // TRIGGER 1: Price change exceeds dynamic threshold
    if (volatilityAwareThresholds.exceedsThreshold(symbol, priceChangePercent)) {
      triggerDetected = true;
      triggerReason = `Price ${priceChangePercent > 0 ? 'surge' : 'drop'}: ${Math.abs(priceChangePercent).toFixed(2)}% (threshold: ${thresholds.priceChange.toFixed(2)}%)`;
      triggerPriority = 'MEDIUM';
    }

    // TRIGGER 2: Price velocity exceeds dynamic threshold
    if (volatilityAwareThresholds.exceedsVelocityThreshold(symbol, priceVelocity)) {
      triggerDetected = true;
      triggerReason = `Extreme velocity: ${priceVelocity.toFixed(2)}%/s (threshold: ${thresholds.priceVelocity.toFixed(2)}%/s)`;
      triggerPriority = 'HIGH';
    }

    // TRIGGER 3: Spread widening (if bid/ask available)
    if (ticker.bid > 0 && ticker.ask > 0 && previous.bid > 0 && previous.ask > 0) {
      const currentSpread = (ticker.ask - ticker.bid) / ticker.bid;
      const previousSpread = (previous.ask - previous.bid) / previous.bid;
      spreadMultiplier = currentSpread / previousSpread;

      if (volatilityAwareThresholds.exceedsSpreadThreshold(symbol, spreadMultiplier)) {
        triggerDetected = true;
        triggerReason = `Spread widening: ${spreadMultiplier.toFixed(2)}x (threshold: ${thresholds.spreadWidening.toFixed(2)}x)`;
        triggerPriority = 'HIGH';
      }
    }

    // TRIGGER 4: Volume surge (capture what micro-pattern detector found)
    const volumeMultiplier = previousVolume > 0 ? currentVolume / previousVolume : 1.0;
    if (volumeMultiplier >= thresholds.volumeSurge) {
      triggerDetected = true;
      triggerReason = triggerReason
        ? `${triggerReason} + Volume surge: ${volumeMultiplier.toFixed(2)}x (threshold: ${thresholds.volumeSurge.toFixed(2)}x)`
        : `Volume surge: ${volumeMultiplier.toFixed(2)}x (threshold: ${thresholds.volumeSurge.toFixed(2)}x)`;
      triggerPriority = triggerPriority === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    if (!triggerDetected) {
      return; // No trigger, skip analysis
    }

    // 🎯 SIGNIFICANCE FILTER: Check if trigger is actually significant (not noise)
    const significanceResult = significanceFilter.evaluateTriggerSignificance(
      symbol,
      priceChangePercent,
      priceVelocity,
      currentVolume,
      previousVolume,
      bidAskRatio,
      buyPressure,
      spreadMultiplier
    );

    if (!significanceResult.isSignificant) {
      // Trigger detected but filtered as noise
      this.stats.triggersFiltered++;

      // Log only if it's the first filtered trigger for this symbol in 5 minutes
      const lastLogKey = `${symbol}:filtered`;
      const lastLogTime = this.lastAnalysisTime.get(lastLogKey) || 0;
      if (now - lastLogTime > 300000) { // 5 minute cooldown for noise logs
        console.log(
          `[RealTimeEngineV3] 🔇 TRIGGER FILTERED (Noise): ${symbol.toUpperCase()}\n` +
          `  Original trigger: ${triggerReason}\n` +
          `  Filter reason: ${significanceResult.reason}\n` +
          `  Severity: ${significanceResult.severity}`
        );
        this.lastAnalysisTime.set(lastLogKey, now);
      }

      return; // Skip analysis for noisy triggers
    }

    // Update trigger priority based on significance severity
    if (significanceResult.severity === 'CRITICAL') {
      triggerPriority = 'HIGH';
    } else if (significanceResult.severity === 'HIGH') {
      triggerPriority = 'HIGH';
    } else if (significanceResult.severity === 'MEDIUM') {
      triggerPriority = 'MEDIUM';
    }

    // Add significance info to trigger reason
    triggerReason = `${triggerReason} | Significance: ${significanceResult.severity} (${significanceResult.confidence}% confidence)`;

    this.stats.triggersEvaluated++;

    // Record trigger in persistent stats (survives page refresh)
    persistentStatsManager.recordTrigger();

    console.log(
      `\n[RealTimeEngineV3] 🎯 TRIGGER DETECTED: ${symbol.toUpperCase()}\n` +
      `  Reason: ${triggerReason}\n` +
      `  Priority: ${triggerPriority}\n` +
      `  Regime: ${regime?.regime || 'UNKNOWN'} (volatility: ${regime?.volatility.toFixed(3)}%)\n` +
      `  Current Tier: ${adaptiveTierManager.getTier(symbol)} | Price: $${ticker.price}`
    );

    // Check cooldown (prevent spam analysis)
    const lastAnalysis = this.lastAnalysisTime.get(symbol) || 0;
    const timeSinceLastAnalysis = now - lastAnalysis;

    if (timeSinceLastAnalysis < this.MIN_ANALYSIS_INTERVAL) {
      const remainingSeconds = Math.ceil((this.MIN_ANALYSIS_INTERVAL - timeSinceLastAnalysis) / 1000);
      console.log(`[RealTimeEngineV3] ${symbol}: Cooldown active (${remainingSeconds}s remaining)`);

      // Log trigger but don't analyze
      this.logTrigger(symbol, triggerReason, triggerPriority, ticker, true, 'Cooldown active');
      return;
    }

    // Perform deep analysis
    this.performAnalysis(symbol, ticker, triggerReason, triggerPriority);
  }

  /**
   * Perform Intelligent Multi-Strategy Analysis with Best Signal Selection
   * All 10 strategies analyze independently, IntelligentSignalSelector chooses THE BEST ONE
   */
  private async performAnalysis(
    symbol: string,
    ticker: CanonicalTicker,
    triggerReason: string,
    triggerPriority: 'HIGH' | 'MEDIUM' | 'LOW'
  ) {
    const now = Date.now();
    this.lastAnalysisTime.set(symbol, now);

    console.log(`\n[RealTimeEngineV3] 🔍 Running Multi-Strategy Analysis for ${symbol.toUpperCase()}...`);
    console.log(`  Trigger: ${triggerReason} (Priority: ${triggerPriority})`);

    try {
      // CRITICAL: Enrich ticker data with ALL required strategy inputs
      console.log(`[RealTimeEngineV3] Enriching market data with technical indicators, sentiment, on-chain proxies...`);
      const enrichedData = await dataEnrichmentService.enrichMarketData(ticker);

      console.log(`[RealTimeEngineV3] Enriched data ready:`);
      console.log(`  - RSI: ${enrichedData.technicalData?.rsi || 'N/A'}`);
      console.log(`  - Fear & Greed: ${enrichedData.sentimentData?.fearGreedIndex || 'N/A'}`);
      console.log(`  - Exchange Flow: ${enrichedData.onChainData?.exchangeFlowRatio || 'N/A'}`);

      // Run all 10 strategies in parallel with COMPLETE data
      const multiStrategyResult = await multiStrategyEngine.analyzeWithAllStrategies(enrichedData);

      // Filter to get valid signals (each strategy's own threshold)
      const validSignals = multiStrategyResult.signals.filter(
        signal => !signal.rejected && signal.type !== null
      );

      console.log(`[RealTimeEngineV3] ${symbol.toUpperCase()} Strategy Results:`);
      console.log(`  - Total Strategies Run: 10`);
      console.log(`  - Valid Signals: ${validSignals.length}`);

      if (validSignals.length === 0) {
        this.stats.signalsRejected++;
        console.log(`[RealTimeEngineV3] ❌ No strategies met their thresholds`);
        await this.logTrigger(symbol, triggerReason, triggerPriority, ticker, false, 'No valid signals');
        return;
      }

      // Detect market condition for reputation scoring
      const regime = volatilityAwareThresholds.getRegime(symbol);
      let marketCondition: 'trending' | 'ranging' | 'volatile' | undefined;

      if (regime) {
        if (regime.volatility > 5) {
          marketCondition = 'volatile';
        } else if (regime.volatility < 2) {
          marketCondition = 'ranging';
        } else {
          marketCondition = 'trending'; // Default for medium volatility
        }
      }

      // Use IntelligentSignalSelector to choose THE BEST signal with reputation adjustment
      const selectionResult = intelligentSignalSelector.selectBestSignal(symbol, validSignals, marketCondition);

      // Check if selector rejected all signals (e.g., conflicted market)
      if (!selectionResult.selectedSignal) {
        this.stats.signalsRejected++;
        console.log(`[RealTimeEngineV3] ❌ ${selectionResult.selectionReason}`);
        await this.logTrigger(symbol, triggerReason, triggerPriority, ticker, false, selectionResult.selectionReason);
        return;
      }

      // Check deduplication (2-hour window per coin)
      const dedupKey = `${symbol}:${Math.floor(now / this.SIGNAL_DEDUP_WINDOW)}`;
      if (this.recentSignals.has(dedupKey)) {
        console.log(`[RealTimeEngineV3] ${symbol}: Signal already generated within 2-hour window`);
        return;
      }

      this.recentSignals.add(dedupKey);
      setTimeout(() => this.recentSignals.delete(dedupKey), this.SIGNAL_DEDUP_WINDOW);

      // 🎉 BEST SIGNAL SELECTED!
      this.stats.signalsGenerated++;

      // Record signal in persistent stats (survives page refresh)
      persistentStatsManager.recordSignal();

      const bestSignal = selectionResult.selectedSignal;
      const consensus = selectionResult.consensusMetrics;

      console.log(
        `\n[RealTimeEngineV3] ✅ 🚀 BEST SIGNAL SELECTED: ${symbol.toUpperCase()} ${bestSignal.type}\n` +
        `  Winning Strategy: ${bestSignal.strategyName}\n` +
        `  Quality Score: ${selectionResult.qualityScore}/100\n` +
        `  Consensus: ${consensus.dominantDirection} (${consensus.longSignals} LONG, ${consensus.shortSignals} SHORT)\n` +
        `  Consensus Strength: ${consensus.consensusStrength}\n` +
        `  Confidence: ${bestSignal.confidence}%\n` +
        `  Strength: ${bestSignal.strength}\n` +
        `  Entry Range: $${bestSignal.entryMin.toFixed(6)} - $${bestSignal.entryMax.toFixed(6)}\n` +
        `  Stop Loss: $${bestSignal.stopLoss?.toFixed(6)}\n` +
        `  Targets: T1=$${bestSignal.targets.target1.toFixed(6)}, T2=$${bestSignal.targets.target2.toFixed(6)}, T3=$${bestSignal.targets.target3.toFixed(6)}\n` +
        `  Risk/Reward: ${bestSignal.riskRewardRatio.toFixed(2)}:1\n` +
        `  Selection Reason: ${selectionResult.selectionReason}\n`
      );

      // Log successful trigger
      const triggerId = await this.logTrigger(symbol, triggerReason, triggerPriority, ticker, true);

      // Save the best signal to database
      await this.saveBestSignal(symbol, bestSignal, selectionResult, ticker, triggerId, marketCondition);

      // Emit event for UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('igx-signal-generated', {
          detail: {
            symbol,
            signalType: bestSignal.type,
            strategyName: bestSignal.strategyName,
            confidence: bestSignal.confidence,
            qualityScore: selectionResult.qualityScore,
            strength: bestSignal.strength,
            consensusMetrics: consensus,
            entryMin: bestSignal.entryMin,
            entryMax: bestSignal.entryMax,
            currentPrice: ticker.price,
            stopLoss: bestSignal.stopLoss,
            targets: bestSignal.targets,
            riskRewardRatio: bestSignal.riskRewardRatio,
            timeframe: bestSignal.timeframe,
            reasoning: bestSignal.reasoning,
            selectionReason: selectionResult.selectionReason,
            timestamp: now
          }
        }));
      }

    } catch (error) {
      console.error(`[RealTimeEngineV3] Error analyzing ${symbol}:`, error);
      await this.logTrigger(symbol, triggerReason, triggerPriority, ticker, false, 'Analysis error: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  }

  /**
   * Log strategy trigger to database
   * TEMPORARILY DISABLED: strategy_triggers table not created yet
   *
   * TODO: Re-enable when strategy_triggers table is created in Supabase
   * This function logs trigger events for analytics and debugging
   */
  private async logTrigger(
    symbol: string,
    triggerReason: string,
    triggerPriority: 'HIGH' | 'MEDIUM' | 'LOW',
    ticker: CanonicalTicker,
    signalGenerated: boolean,
    rejectionReason?: string
  ): Promise<string | undefined> {
    // DISABLED: Table not created yet, avoiding 404 errors in console
    // When re-enabling, this will log triggers to strategy_triggers table
    return undefined;
  }

  /**
   * Save best selected signal to database and track in reputation manager
   */
  private async saveBestSignal(
    symbol: string,
    signal: StrategySignal,
    selectionResult: any,
    ticker: CanonicalTicker,
    linkedTriggerId?: string,
    marketCondition?: 'trending' | 'ranging' | 'volatile'
  ) {
    try {
      // Calculate expiry (7 days for swing trades, 24h for day trades, 2h for scalps)
      const timeframeHours = this.parseTimeframeToHours(signal.timeframe);
      let expiryHours = 24; // Default 24 hours
      if (timeframeHours >= 240) expiryHours = 168; // 7 days for weekly+
      else if (timeframeHours >= 24) expiryHours = 72; // 3 days for daily
      else if (timeframeHours < 1) expiryHours = 2; // 2 hours for scalps

      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

      // Calculate risk level based on stop loss distance
      const stopLossPercent = Math.abs((signal.stopLoss - ticker.price) / ticker.price * 100);
      let riskLevel = 'MODERATE';
      if (stopLossPercent < 3) riskLevel = 'LOW';
      else if (stopLossPercent > 7) riskLevel = 'HIGH';

      // TEMPORARY: Encode strategy name in timeframe as "STRATEGY:timeframe" until schema updated
      const timeframeWithStrategy = `${signal.strategyName}:${signal.timeframe || '4H'}`;

      const insertData = {
        symbol: symbol.toUpperCase(),
        signal_type: signal.type, // 'LONG' or 'SHORT'
        timeframe: timeframeWithStrategy, // TEMPORARY: "WHALE_SHADOW:4H" format for tracking
        entry_min: signal.entryMin,
        entry_max: signal.entryMax,
        current_price: ticker.price,
        stop_loss: signal.stopLoss,
        target_1: signal.targets.target1,
        target_2: signal.targets.target2,
        target_3: signal.targets.target3,
        confidence: Math.round(signal.confidence),
        strength: signal.strength, // 'STRONG', 'MODERATE', 'WEAK'
        risk_level: riskLevel,
        status: 'ACTIVE',
        expires_at: expiresAt
      };

      const { data, error } = await supabase
        .from('intelligence_signals')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[RealTimeEngineV3] Database insertion error:', error);
        console.error('[RealTimeEngineV3] Attempted insert data:', insertData);
        return;
      }

      console.log(`[RealTimeEngineV3] 💾 Best Signal saved to database (ID: ${data.id})`);
      console.log(`  - Winning Strategy: ${signal.strategyName}`);
      console.log(`  - Quality Score: ${selectionResult.qualityScore}/100`);
      console.log(`  - Confidence: ${signal.confidence}%`);
      console.log(`  - Risk/Reward: ${signal.riskRewardRatio.toFixed(2)}:1`);
      console.log(`  - Expires: ${expiresAt}`);

      // Track signal in reputation manager for performance monitoring
      strategyReputationManager.recordSignal(
        data.id, // Use database ID as signal ID
        signal.strategyName,
        symbol.toUpperCase(),
        signal.type,
        ticker.price, // Use current price as entry
        marketCondition
      );

      console.log(`[RealTimeEngineV3] 📊 Signal tracked for reputation monitoring`);

    } catch (error) {
      console.error('[RealTimeEngineV3] Error saving signal:', error);
    }
  }

  /**
   * Parse timeframe string to hours
   */
  private parseTimeframeToHours(timeframe: string): number {
    const match = timeframe.match(/(\d+)([mhDW])/);
    if (!match) return 4; // Default 4 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value / 60;
      case 'h': return value;
      case 'D': return value * 24;
      case 'W': return value * 24 * 7;
      default: return 4;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): SignalEngineStats {
    const uptimeSeconds = (Date.now() - this.stats.startTime) / 1000;
    const avgChecksPerSecond = uptimeSeconds > 0 ? this.stats.triggersEvaluated / uptimeSeconds : 0;

    return {
      ...this.stats,
      avgChecksPerSecond
    };
  }

  /**
   * Get combined system stats (engine + tiers + volatility)
   */
  getCombinedStats() {
    return {
      engine: this.getStats(),
      tiers: adaptiveTierManager.getStats(),
      volatility: volatilityAwareThresholds.getStats()
    };
  }

  /**
   * Emit stats event for monitoring
   */
  emitStatsEvent() {
    if (typeof window !== 'undefined') {
      const stats = this.getCombinedStats();
      window.dispatchEvent(new CustomEvent('igx-engine-stats', {
        detail: stats
      }));
    }
  }

  /**
   * Reset all state (for testing)
   */
  resetAll() {
    this.previousTickerMap.clear();
    this.lastAnalysisTime.clear();
    this.recentSignals.clear();
    adaptiveTierManager.resetAll();
    volatilityAwareThresholds.resetAll();
    microPatternDetector.resetAll();
    significanceFilter.resetStats();

    this.stats = {
      totalTicks: 0,
      microAnomalies: 0,
      tierUpgrades: 0,
      tierDowngrades: 0,
      triggersEvaluated: 0,
      triggersFiltered: 0,
      signalsGenerated: 0,
      signalsRejected: 0,
      avgChecksPerSecond: 0,
      startTime: Date.now()
    };

    console.log('[RealTimeEngineV3] All state reset');
  }
}

// Singleton instance
export const realTimeSignalEngineV3 = new RealTimeSignalEngineV3();
