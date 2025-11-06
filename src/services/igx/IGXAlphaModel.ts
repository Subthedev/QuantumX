/**
 * IGX ALPHA MODEL
 * Intelligent planning and threshold adjustment system
 * Dynamically controls signal frequency and quality to achieve 25%+ monthly profitability
 *
 * CORE RESPONSIBILITY:
 * - Monitor current month's performance
 * - Calculate required signal rate to hit 25% target
 * - Adjust quality thresholds in real-time
 * - Balance quality vs quantity for optimal results
 *
 * HYBRID APPROACH:
 * - High Quality Mode: Strict thresholds, 3-4% per trade, lower frequency
 * - Medium Quality Mode: Balanced thresholds, 2-3% per trade, moderate frequency
 * - Volume Mode: Relaxed thresholds, 1-2% per trade, higher frequency
 */

export interface ProfitTarget {
  monthly: number; // 25% target
  weekly: number; // Calculated based on monthly
  daily: number; // Calculated based on weekly
  perTrade: number; // Dynamic based on mode
}

export interface TradingMode {
  name: 'HIGH_QUALITY' | 'BALANCED' | 'VOLUME';
  minPatternStrength: number;
  minConsensus: number;
  minRiskReward: number;
  expectedProfitPerTrade: number;
  expectedFrequency: number; // signals per day
  description: string;
}

export interface MonthlyPlan {
  targetProfit: number; // 25%
  currentProfit: number; // Actual so far
  remainingDays: number;
  requiredDailyProfit: number;
  currentMode: TradingMode;
  adjustmentReason: string;
  projectedMonthlyProfit: number;
  confidenceScore: number; // 0-100
}

export interface AlphaDecision {
  timestamp: number;
  decision: 'ADJUST_THRESHOLDS' | 'MAINTAIN' | 'EMERGENCY_MODE';
  currentPerformance: {
    monthlyProfit: number;
    winRate: number;
    avgProfitPerTrade: number;
    totalTrades: number;
    successfulTrades: number;
  };
  newThresholds: {
    patternStrength: number;
    consensus: number;
    riskReward: number;
  };
  reasoning: string;
}

export class IGXAlphaModel {
  private readonly TARGET_MONTHLY_PROFIT = 0.25; // 25%
  private readonly MIN_ACCEPTABLE_PROFIT = 0.20; // 20% minimum
  private readonly SAFETY_MARGIN = 1.2; // 20% buffer

  private tradingModes: Map<string, TradingMode> = new Map([
    ['HIGH_QUALITY', {
      name: 'HIGH_QUALITY',
      minPatternStrength: 75,
      minConsensus: 0.70,
      minRiskReward: 2.5,
      expectedProfitPerTrade: 0.035, // 3.5%
      expectedFrequency: 3, // 3 signals per day
      description: 'Premium signals only - highest win rate'
    }],
    ['BALANCED', {
      name: 'BALANCED',
      minPatternStrength: 60,
      minConsensus: 0.55,
      minRiskReward: 2.0,
      expectedProfitPerTrade: 0.025, // 2.5%
      expectedFrequency: 6, // 6 signals per day
      description: 'Balanced approach - good quality with reasonable frequency'
    }],
    ['VOLUME', {
      name: 'VOLUME',
      minPatternStrength: 50,
      minConsensus: 0.50,
      minRiskReward: 1.5,
      expectedProfitPerTrade: 0.015, // 1.5%
      expectedFrequency: 12, // 12 signals per day
      description: 'High frequency - more opportunities, lower per-trade profit'
    }]
  ]);

  private currentMode: TradingMode;
  private monthlyStats = {
    startDate: new Date(),
    startBalance: 100000, // Starting capital
    currentBalance: 100000,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfit: 0,
    dailyProfits: new Map<string, number>()
  };

  private performanceHistory: AlphaDecision[] = [];
  private lastAdjustment = Date.now();
  private readonly ADJUSTMENT_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours minimum between adjustments

  constructor() {
    // Start in balanced mode
    this.currentMode = this.tradingModes.get('BALANCED')!;

    // Reset monthly stats at month start
    this.scheduleMonthlyReset();
  }

  /**
   * Main decision engine - called periodically to adjust strategy
   */
  analyzeAndAdjust(): AlphaDecision {
    const now = Date.now();

    // Calculate current performance
    const performance = this.calculatePerformance();

    // Determine if adjustment is needed
    const needsAdjustment = this.shouldAdjust(performance);

    if (!needsAdjustment) {
      return this.createDecision('MAINTAIN', performance, this.currentMode,
        'Performance on track - no adjustment needed');
    }

    // Check cooldown
    if (now - this.lastAdjustment < this.ADJUSTMENT_COOLDOWN) {
      return this.createDecision('MAINTAIN', performance, this.currentMode,
        'Adjustment cooldown active - waiting before next change');
    }

    // Calculate optimal mode based on performance
    const optimalMode = this.calculateOptimalMode(performance);

    if (optimalMode.name === this.currentMode.name) {
      return this.createDecision('MAINTAIN', performance, this.currentMode,
        'Current mode is already optimal');
    }

    // Apply new mode
    this.currentMode = optimalMode;
    this.lastAdjustment = now;

    const reasoning = this.generateAdjustmentReasoning(performance, optimalMode);

    return this.createDecision('ADJUST_THRESHOLDS', performance, optimalMode, reasoning);
  }

  /**
   * Calculate current month's performance
   */
  private calculatePerformance() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const currentProfit = (this.monthlyStats.currentBalance - this.monthlyStats.startBalance) /
                          this.monthlyStats.startBalance;

    const winRate = this.monthlyStats.totalTrades > 0 ?
      this.monthlyStats.successfulTrades / this.monthlyStats.totalTrades : 0;

    const avgProfitPerTrade = this.monthlyStats.totalTrades > 0 ?
      currentProfit / this.monthlyStats.totalTrades : 0;

    return {
      monthlyProfit: currentProfit,
      winRate,
      avgProfitPerTrade,
      totalTrades: this.monthlyStats.totalTrades,
      successfulTrades: this.monthlyStats.successfulTrades,
      daysPassed,
      daysRemaining,
      dailyAverage: daysPassed > 0 ? currentProfit / daysPassed : 0,
      requiredDailyProfit: this.calculateRequiredDailyProfit(currentProfit, daysRemaining)
    };
  }

  /**
   * Calculate required daily profit to hit target
   */
  private calculateRequiredDailyProfit(currentProfit: number, daysRemaining: number): number {
    if (daysRemaining <= 0) return 0;

    const remainingProfit = this.TARGET_MONTHLY_PROFIT - currentProfit;

    // Apply safety margin
    const adjustedRemaining = remainingProfit * this.SAFETY_MARGIN;

    return adjustedRemaining / daysRemaining;
  }

  /**
   * Determine if strategy adjustment is needed
   */
  private shouldAdjust(performance: any): boolean {
    // Emergency adjustment if way behind
    if (performance.daysPassed > 7) {
      const expectedProfit = (this.TARGET_MONTHLY_PROFIT / 30) * performance.daysPassed;
      if (performance.monthlyProfit < expectedProfit * 0.7) {
        console.log('[IGX Alpha] ⚠️ Behind target - adjustment needed');
        return true;
      }
    }

    // Adjust if win rate is too low
    if (performance.totalTrades > 10 && performance.winRate < 0.5) {
      console.log('[IGX Alpha] ⚠️ Low win rate - adjustment needed');
      return true;
    }

    // Adjust if required daily profit is too high for current mode
    const currentExpectedDaily = this.currentMode.expectedProfitPerTrade *
                                 this.currentMode.expectedFrequency;

    if (performance.requiredDailyProfit > currentExpectedDaily * 1.5) {
      console.log('[IGX Alpha] ⚠️ Need higher frequency - adjustment needed');
      return true;
    }

    // Adjust if we're exceeding target (can use stricter mode)
    if (performance.monthlyProfit > this.TARGET_MONTHLY_PROFIT * 1.2 &&
        performance.daysRemaining > 10) {
      console.log('[IGX Alpha] ✅ Exceeding target - can use higher quality mode');
      return true;
    }

    return false;
  }

  /**
   * Calculate optimal trading mode based on performance
   */
  private calculateOptimalMode(performance: any): TradingMode {
    const requiredDailyProfit = performance.requiredDailyProfit;

    // Calculate required trades per day for each mode
    const modesWithScore = Array.from(this.tradingModes.values()).map(mode => {
      const requiredTrades = requiredDailyProfit / mode.expectedProfitPerTrade;
      const feasibility = requiredTrades <= mode.expectedFrequency ? 1 : 0.5;

      // Score based on feasibility and quality
      const qualityScore = mode.minPatternStrength / 100;
      const score = feasibility * qualityScore;

      return { mode, score, requiredTrades };
    });

    // Sort by score and pick best
    modesWithScore.sort((a, b) => b.score - a.score);

    // If we're ahead of schedule, prefer quality
    if (performance.monthlyProfit > this.TARGET_MONTHLY_PROFIT * 0.8 &&
        performance.daysPassed < 20) {
      return this.tradingModes.get('HIGH_QUALITY')!;
    }

    // If we're behind, need volume
    if (requiredDailyProfit > 0.015) {
      return this.tradingModes.get('VOLUME')!;
    }

    // Default to balanced
    return modesWithScore[0].mode;
  }

  /**
   * Generate reasoning for adjustment
   */
  private generateAdjustmentReasoning(performance: any, newMode: TradingMode): string {
    const currentProfitPercent = (performance.monthlyProfit * 100).toFixed(1);
    const targetPercent = (this.TARGET_MONTHLY_PROFIT * 100).toFixed(0);
    const requiredDaily = (performance.requiredDailyProfit * 100).toFixed(2);

    let reasoning = `Current profit: ${currentProfitPercent}% | Target: ${targetPercent}% | `;
    reasoning += `Days remaining: ${performance.daysRemaining} | `;
    reasoning += `Required daily: ${requiredDaily}% | `;

    switch (newMode.name) {
      case 'HIGH_QUALITY':
        reasoning += 'Switching to HIGH QUALITY mode - we are ahead of target, focusing on premium signals';
        break;
      case 'BALANCED':
        reasoning += 'Using BALANCED mode - optimal mix of quality and frequency';
        break;
      case 'VOLUME':
        reasoning += 'Switching to VOLUME mode - need more signals to catch up to target';
        break;
    }

    return reasoning;
  }

  /**
   * Create decision object
   */
  private createDecision(
    type: 'ADJUST_THRESHOLDS' | 'MAINTAIN' | 'EMERGENCY_MODE',
    performance: any,
    mode: TradingMode,
    reasoning: string
  ): AlphaDecision {
    const decision: AlphaDecision = {
      timestamp: Date.now(),
      decision: type,
      currentPerformance: {
        monthlyProfit: performance.monthlyProfit,
        winRate: performance.winRate,
        avgProfitPerTrade: performance.avgProfitPerTrade,
        totalTrades: performance.totalTrades,
        successfulTrades: performance.successfulTrades
      },
      newThresholds: {
        patternStrength: mode.minPatternStrength,
        consensus: mode.minConsensus,
        riskReward: mode.minRiskReward
      },
      reasoning
    };

    this.performanceHistory.push(decision);

    // Log decision
    console.log('\n[IGX Alpha] ========== STRATEGIC DECISION ==========');
    console.log(`📊 Decision: ${type}`);
    console.log(`📈 Monthly Profit: ${(performance.monthlyProfit * 100).toFixed(2)}%`);
    console.log(`🎯 Win Rate: ${(performance.winRate * 100).toFixed(1)}%`);
    console.log(`📉 Mode: ${mode.name}`);
    console.log(`💭 Reasoning: ${reasoning}`);
    console.log('================================================\n');

    return decision;
  }

  /**
   * Record trade outcome for learning
   */
  recordTradeOutcome(
    symbol: string,
    profit: number,
    success: boolean,
    strategy: string
  ) {
    this.monthlyStats.totalTrades++;

    if (success) {
      this.monthlyStats.successfulTrades++;
    }

    this.monthlyStats.currentBalance += profit;
    this.monthlyStats.totalProfit += profit;

    // Record daily profit
    const today = new Date().toISOString().split('T')[0];
    const dailyProfit = this.monthlyStats.dailyProfits.get(today) || 0;
    this.monthlyStats.dailyProfits.set(today, dailyProfit + profit);

    console.log(`[IGX Alpha] Trade recorded: ${symbol} | Profit: $${profit.toFixed(2)} | Success: ${success}`);
  }

  /**
   * Get current trading plan
   */
  getMonthlyPlan(): MonthlyPlan {
    const performance = this.calculatePerformance();
    const projectedProfit = this.projectMonthlyProfit(performance);

    return {
      targetProfit: this.TARGET_MONTHLY_PROFIT,
      currentProfit: performance.monthlyProfit,
      remainingDays: performance.daysRemaining,
      requiredDailyProfit: performance.requiredDailyProfit,
      currentMode: this.currentMode,
      adjustmentReason: this.performanceHistory[this.performanceHistory.length - 1]?.reasoning || 'Initial state',
      projectedMonthlyProfit: projectedProfit,
      confidenceScore: this.calculateConfidence(performance)
    };
  }

  /**
   * Project end-of-month profit
   */
  private projectMonthlyProfit(performance: any): number {
    if (performance.daysPassed === 0) {
      return this.TARGET_MONTHLY_PROFIT; // Assume we'll hit target
    }

    const dailyRate = performance.monthlyProfit / performance.daysPassed;
    const totalDays = performance.daysPassed + performance.daysRemaining;

    return dailyRate * totalDays;
  }

  /**
   * Calculate confidence in hitting target
   */
  private calculateConfidence(performance: any): number {
    let confidence = 50; // Base confidence

    // Adjust based on current performance
    if (performance.monthlyProfit >= this.TARGET_MONTHLY_PROFIT) {
      confidence = 95; // Already hit target
    } else if (performance.monthlyProfit > 0) {
      // Linear interpolation
      confidence = 50 + (performance.monthlyProfit / this.TARGET_MONTHLY_PROFIT) * 45;
    }

    // Adjust based on win rate
    if (performance.winRate > 0.6) confidence += 10;
    else if (performance.winRate < 0.4) confidence -= 10;

    // Adjust based on days remaining
    if (performance.daysRemaining > 20) confidence += 5;
    else if (performance.daysRemaining < 5) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Get current thresholds for quality checker
   */
  getCurrentThresholds() {
    return {
      patternStrength: this.currentMode.minPatternStrength,
      consensus: this.currentMode.minConsensus,
      riskReward: this.currentMode.minRiskReward,
      mode: this.currentMode.name,
      expectedFrequency: this.currentMode.expectedFrequency
    };
  }

  /**
   * Schedule monthly reset
   */
  private scheduleMonthlyReset() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeUntilReset = nextMonth.getTime() - now.getTime();

    setTimeout(() => {
      this.resetMonthlyStats();
      this.scheduleMonthlyReset(); // Schedule next reset
    }, timeUntilReset);
  }

  /**
   * Reset monthly statistics
   */
  private resetMonthlyStats() {
    console.log('[IGX Alpha] 📅 Monthly reset - starting new profit cycle');

    this.monthlyStats = {
      startDate: new Date(),
      startBalance: this.monthlyStats.currentBalance, // Carry forward balance
      currentBalance: this.monthlyStats.currentBalance,
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      dailyProfits: new Map()
    };

    // Start fresh in balanced mode
    this.currentMode = this.tradingModes.get('BALANCED')!;
  }

  /**
   * Get detailed statistics
   */
  getStats() {
    const performance = this.calculatePerformance();
    const plan = this.getMonthlyPlan();

    return {
      currentMode: this.currentMode.name,
      monthlyProfit: `${(performance.monthlyProfit * 100).toFixed(2)}%`,
      targetProfit: `${(this.TARGET_MONTHLY_PROFIT * 100).toFixed(0)}%`,
      winRate: `${(performance.winRate * 100).toFixed(1)}%`,
      totalTrades: performance.totalTrades,
      daysRemaining: performance.daysRemaining,
      projectedMonthlyProfit: `${(plan.projectedMonthlyProfit * 100).toFixed(1)}%`,
      confidence: `${plan.confidenceScore.toFixed(0)}%`,
      currentThresholds: this.getCurrentThresholds()
    };
  }
}

// Singleton instance
export const igxAlphaModel = new IGXAlphaModel();