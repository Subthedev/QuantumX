/**
 * Goal Achievement Engine
 * Tracks 25% monthly return target and provides strategic guidance
 */

import type {
  MonthlyTarget,
  WeeklyCheckpoint,
  DailyPerformance,
  GoalProgress
} from '@/types/igx-enhanced';

export class GoalAchievementEngine {
  private readonly MONTHLY_TARGET = 25; // 25% return target
  private dailyPerformance: Map<string, DailyPerformance> = new Map();
  private weeklyCheckpoints: WeeklyCheckpoint[] = [];

  // Persistent storage for month-to-month tracking
  private monthlyHistory: Array<{
    month: string;
    target: number;
    actual: number;
    achieved: boolean;
  }> = [];

  /**
   * Get current goal progress
   */
  getGoalProgress(): GoalProgress {
    const monthlyTarget = this.calculateMonthlyTarget();
    const weekly = this.getWeeklyCheckpoints();
    const daily = this.getDailyPerformanceArray();

    return {
      monthly: monthlyTarget,
      weekly,
      daily,
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate monthly target status
   */
  private calculateMonthlyTarget(): MonthlyTarget {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Get first and last day of current month
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const today = new Date(year, month, now.getDate());

    // Calculate days
    const totalDaysInMonth = monthEnd.getDate();
    const daysElapsed = today.getDate();
    const daysRemaining = totalDaysInMonth - daysElapsed;

    // Calculate current return from daily performance
    const currentReturn = this.calculateCurrentMonthReturn();

    // Calculate required daily return
    const remainingReturn = this.MONTHLY_TARGET - currentReturn;
    const requiredDailyReturn = daysRemaining > 0
      ? remainingReturn / daysRemaining
      : 0;

    // Calculate actual daily return average
    const tradingDays = this.getTradingDaysThisMonth();
    const actualDailyReturn = tradingDays > 0
      ? currentReturn / tradingDays
      : 0;

    // Calculate if on track
    const expectedReturnByNow = this.MONTHLY_TARGET * (daysElapsed / totalDaysInMonth);
    const onTrack = currentReturn >= expectedReturnByNow * 0.95; // 95% tolerance

    // Calculate deviation
    const deviation = ((currentReturn - expectedReturnByNow) / expectedReturnByNow) * 100;

    // Project return if trend continues
    const projectedReturn = actualDailyReturn * totalDaysInMonth;

    // Confidence in projection (based on sample size)
    const confidence = Math.min((tradingDays / 20) * 100, 100); // 20+ days = 100% confidence

    return {
      targetReturn: this.MONTHLY_TARGET,
      currentReturn: Math.round(currentReturn * 100) / 100,
      daysElapsed,
      daysRemaining,
      requiredDailyReturn: Math.round(requiredDailyReturn * 100) / 100,
      actualDailyReturn: Math.round(actualDailyReturn * 100) / 100,
      onTrack,
      deviation: Math.round(deviation * 100) / 100,
      projectedReturn: Math.round(projectedReturn * 100) / 100,
      confidence: Math.round(confidence),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate current month's cumulative return
   */
  private calculateCurrentMonthReturn(): number {
    const monthKey = this.getCurrentMonthKey();
    let cumulativeReturn = 0;

    for (const [key, perf] of this.dailyPerformance.entries()) {
      if (key.startsWith(monthKey)) {
        cumulativeReturn += perf.returnOnDay;
      }
    }

    return cumulativeReturn;
  }

  /**
   * Get number of trading days this month
   */
  private getTradingDaysThisMonth(): number {
    const monthKey = this.getCurrentMonthKey();
    let count = 0;

    for (const [key, perf] of this.dailyPerformance.entries()) {
      if (key.startsWith(monthKey) && perf.trades > 0) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get weekly checkpoints for current month
   */
  private getWeeklyCheckpoints(): WeeklyCheckpoint[] {
    // If already calculated this month, return cached
    if (this.weeklyCheckpoints.length > 0) {
      return this.weeklyCheckpoints;
    }

    // Calculate weekly targets (assuming 4 weeks per month)
    // Week 1: 5%, Week 2: 10%, Week 3: 15%, Week 4: 20%, Week 5: 25%
    const weeklyTargets = [5, 10, 15, 20, 25];
    const checkpoints: WeeklyCheckpoint[] = [];

    const now = new Date();
    const currentWeek = Math.ceil(now.getDate() / 7);

    for (let week = 1; week <= 5; week++) {
      const targetReturn = weeklyTargets[week - 1];

      // Calculate actual return up to end of this week
      let actualReturn = 0;
      if (week <= currentWeek) {
        actualReturn = this.calculateReturnUpToWeek(week);
      }

      const passed = actualReturn >= targetReturn;

      // Determine adjustment needed
      let adjustment: 'NONE' | 'MINOR' | 'MODERATE' | 'AGGRESSIVE' = 'NONE';
      if (week === currentWeek) {
        const deviation = targetReturn - actualReturn;
        if (deviation > 5) adjustment = 'AGGRESSIVE';
        else if (deviation > 3) adjustment = 'MODERATE';
        else if (deviation > 1) adjustment = 'MINOR';
      }

      checkpoints.push({
        week,
        targetReturn,
        actualReturn,
        passed,
        adjustment
      });
    }

    this.weeklyCheckpoints = checkpoints;
    return checkpoints;
  }

  /**
   * Calculate return up to a specific week
   */
  private calculateReturnUpToWeek(week: number): number {
    const monthKey = this.getCurrentMonthKey();
    const endDay = week * 7;
    let cumulativeReturn = 0;

    for (const [key, perf] of this.dailyPerformance.entries()) {
      if (key.startsWith(monthKey)) {
        const day = parseInt(key.split('-')[2], 10);
        if (day <= endDay) {
          cumulativeReturn += perf.returnOnDay;
        }
      }
    }

    return cumulativeReturn;
  }

  /**
   * Get daily performance as array
   */
  private getDailyPerformanceArray(): DailyPerformance[] {
    const monthKey = this.getCurrentMonthKey();
    const performances: DailyPerformance[] = [];

    for (const [key, perf] of this.dailyPerformance.entries()) {
      if (key.startsWith(monthKey)) {
        performances.push(perf);
      }
    }

    // Sort by date
    performances.sort((a, b) => a.date.localeCompare(b.date));

    return performances;
  }

  /**
   * Record a trade outcome
   */
  recordTrade(params: {
    date?: string;
    isWin: boolean;
    profitPercent: number;
  }) {
    const date = params.date || this.getCurrentDateKey();

    // Get or create daily performance
    let daily = this.dailyPerformance.get(date);
    if (!daily) {
      daily = {
        date,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        profit: 0,
        returnOnDay: 0,
        cumulativeReturn: 0
      };
      this.dailyPerformance.set(date, daily);
    }

    // Update stats
    daily.trades++;
    if (params.isWin) {
      daily.wins++;
    } else {
      daily.losses++;
    }
    daily.winRate = (daily.wins / daily.trades) * 100;
    daily.profit += params.profitPercent;
    daily.returnOnDay += params.profitPercent;

    // Update cumulative return
    daily.cumulativeReturn = this.calculateCumulativeReturnUpToDate(date);

    console.log(`\n[Goal Tracker] Trade recorded for ${date}:`);
    console.log(`  Win: ${params.isWin ? '✅' : '❌'} | Profit: ${params.profitPercent > 0 ? '+' : ''}${params.profitPercent.toFixed(2)}%`);
    console.log(`  Daily: ${daily.wins}W-${daily.losses}L (${daily.winRate.toFixed(1)}% WR) | ${daily.returnOnDay > 0 ? '+' : ''}${daily.returnOnDay.toFixed(2)}%`);
    console.log(`  Monthly: ${daily.cumulativeReturn.toFixed(2)}% / ${this.MONTHLY_TARGET}%`);
  }

  /**
   * Calculate cumulative return up to a specific date
   */
  private calculateCumulativeReturnUpToDate(targetDate: string): number {
    const monthKey = this.getCurrentMonthKey();
    let cumulative = 0;

    for (const [key, perf] of this.dailyPerformance.entries()) {
      if (key.startsWith(monthKey) && key <= targetDate) {
        cumulative += perf.returnOnDay;
      }
    }

    return cumulative;
  }

  /**
   * Get strategic recommendation based on goal progress
   */
  getStrategicRecommendation(): {
    strategy: 'ULTRA_CONSERVATIVE' | 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'ULTRA_AGGRESSIVE';
    reasoning: string[];
    targetSignalsPerDay: number;
    minWinRate: number;
    riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  } {
    const target = this.calculateMonthlyTarget();
    const reasoning: string[] = [];

    // Determine strategy based on goal progress
    let strategy: 'ULTRA_CONSERVATIVE' | 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'ULTRA_AGGRESSIVE';
    let targetSignalsPerDay: number;
    let minWinRate: number;
    let riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

    // ULTRA AGGRESSIVE: Very behind with little time left
    if (target.deviation < -15 && target.daysRemaining < 10) {
      strategy = 'ULTRA_AGGRESSIVE';
      targetSignalsPerDay = 20;
      minWinRate = 40;
      riskLevel = 'VERY_HIGH';
      reasoning.push(`🔴 Critical: ${Math.abs(target.deviation).toFixed(0)}% behind target`);
      reasoning.push(`Only ${target.daysRemaining} days remaining`);
      reasoning.push(`Need ${target.requiredDailyReturn.toFixed(2)}% per day to catch up`);
      reasoning.push(`Flooding signals, accepting lower quality`);
    }
    // AGGRESSIVE: Behind and need to catch up
    else if (target.deviation < -10 || (target.deviation < -5 && target.daysRemaining < 15)) {
      strategy = 'AGGRESSIVE';
      targetSignalsPerDay = 15;
      minWinRate = 45;
      riskLevel = 'HIGH';
      reasoning.push(`⚠️  Behind target by ${Math.abs(target.deviation).toFixed(0)}%`);
      reasoning.push(`Need ${target.requiredDailyReturn.toFixed(2)}% daily return`);
      reasoning.push(`Increasing signal volume to catch up`);
    }
    // BALANCED: On track or slightly behind
    else if (target.deviation >= -5 && target.deviation <= 5) {
      strategy = 'BALANCED';
      targetSignalsPerDay = 8;
      minWinRate = 50;
      riskLevel = 'MEDIUM';
      reasoning.push(`✅ On track: ${target.currentReturn.toFixed(2)}% of ${target.targetReturn}%`);
      reasoning.push(`Maintaining balanced approach`);
      reasoning.push(`Target ${target.requiredDailyReturn.toFixed(2)}% per day`);
    }
    // CONSERVATIVE: Ahead of schedule
    else if (target.deviation > 5 && target.deviation <= 15) {
      strategy = 'CONSERVATIVE';
      targetSignalsPerDay = 5;
      minWinRate = 60;
      riskLevel = 'LOW';
      reasoning.push(`🎯 Ahead of target by ${target.deviation.toFixed(0)}%`);
      reasoning.push(`Locking in profits with high-quality signals`);
      reasoning.push(`Projected ${target.projectedReturn.toFixed(2)}% month`);
    }
    // ULTRA CONSERVATIVE: Way ahead
    else {
      strategy = 'ULTRA_CONSERVATIVE';
      targetSignalsPerDay = 3;
      minWinRate = 70;
      riskLevel = 'VERY_LOW';
      reasoning.push(`🏆 Significantly ahead: +${target.deviation.toFixed(0)}%`);
      reasoning.push(`Goal already achieved or near completion`);
      reasoning.push(`Only taking exceptional opportunities`);
    }

    return {
      strategy,
      reasoning,
      targetSignalsPerDay,
      minWinRate,
      riskLevel
    };
  }

  /**
   * Get detailed progress report
   */
  getProgressReport(): string {
    const target = this.calculateMonthlyTarget();
    const strategy = this.getStrategicRecommendation();
    const weekly = this.getWeeklyCheckpoints();

    const currentWeek = Math.ceil(new Date().getDate() / 7);
    const thisWeek = weekly.find(w => w.week === currentWeek);

    return `
Goal Achievement Progress Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MONTHLY TARGET: ${target.targetReturn}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Return:    ${target.currentReturn.toFixed(2)}% (${target.onTrack ? '✅ ON TRACK' : '⚠️  BEHIND'})
Projected Return:  ${target.projectedReturn.toFixed(2)}% (${target.confidence}% confidence)
Deviation:         ${target.deviation > 0 ? '+' : ''}${target.deviation.toFixed(2)}%

TIMELINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Days Elapsed:      ${target.daysElapsed} days
Days Remaining:    ${target.daysRemaining} days
Required Daily:    ${target.requiredDailyReturn.toFixed(2)}% per day
Actual Daily Avg:  ${target.actualDailyReturn.toFixed(2)}% per day

WEEKLY CHECKPOINTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${weekly.map(w =>
  `Week ${w.week}: ${w.actualReturn.toFixed(1)}% / ${w.targetReturn}% ${w.passed ? '✅' : w.week <= currentWeek ? '❌' : '⏳'} ${w.adjustment !== 'NONE' ? `(${w.adjustment})` : ''}`
).join('\n')}

STRATEGIC RECOMMENDATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strategy:          ${strategy.strategy}
Risk Level:        ${strategy.riskLevel}
Target Signals:    ${strategy.targetSignalsPerDay} per day
Min Win Rate:      ${strategy.minWinRate}%

Reasoning:
${strategy.reasoning.map(r => `  • ${r}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Close out the month and archive results
   */
  closeMonth(): {
    achieved: boolean;
    finalReturn: number;
    target: number;
  } {
    const target = this.calculateMonthlyTarget();
    const achieved = target.currentReturn >= target.targetReturn;

    // Archive to history
    this.monthlyHistory.push({
      month: this.getCurrentMonthKey(),
      target: target.targetReturn,
      actual: target.currentReturn,
      achieved
    });

    console.log(`\n[Goal Tracker] Month closed: ${this.getCurrentMonthKey()}`);
    console.log(`  Target: ${target.targetReturn}%`);
    console.log(`  Actual: ${target.currentReturn.toFixed(2)}%`);
    console.log(`  Result: ${achieved ? '✅ ACHIEVED' : '❌ MISSED'}`);

    // Clear weekly checkpoints for next month
    this.weeklyCheckpoints = [];

    return {
      achieved,
      finalReturn: target.currentReturn,
      target: target.targetReturn
    };
  }

  /**
   * Get monthly history
   */
  getMonthlyHistory(): Array<{
    month: string;
    target: number;
    actual: number;
    achieved: boolean;
  }> {
    return [...this.monthlyHistory];
  }

  /**
   * Helper: Get current month key (YYYY-MM format)
   */
  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Helper: Get current date key (YYYY-MM-DD format)
   */
  private getCurrentDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Clear all data (for testing)
   */
  reset() {
    this.dailyPerformance.clear();
    this.weeklyCheckpoints = [];
    this.monthlyHistory = [];
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const goalAchievementEngine = new GoalAchievementEngine();
