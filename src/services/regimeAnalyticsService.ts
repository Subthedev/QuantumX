/**
 * REGIME ANALYTICS SERVICE - PHASE 8
 *
 * Historical analysis of market regime performance for long-term insights.
 * Provides trend analysis, regime change impact, and strategy evolution tracking.
 *
 * Data Source: Supabase tables (market_state_history, agent_performance, arena_trade_history)
 */

import { supabase } from '@/integrations/supabase/client';
import { MarketState } from './marketStateDetectionEngine';

// ===================== INTERFACES =====================

export interface RegimePerformanceSnapshot {
  timestamp: string;
  marketState: MarketState;
  winRate: number;
  totalPnL: number;
  totalTrades: number;
  adaptabilityScore: number;
}

export interface RegimeChangeImpact {
  regimeChange: {
    from: MarketState;
    to: MarketState;
    timestamp: string;
  };
  performanceBefore: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  performanceAfter: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  impactScore: number; // -100 to +100 (negative = worse, positive = better)
  adaptationSpeed: number; // trades until win rate stabilizes
}

export interface StrategyRegimeEvolution {
  strategy: string;
  regime: MarketState;
  dataPoints: {
    date: string;
    winRate: number;
    trades: number;
    avgPnL: number;
  }[];
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // 0-100
}

export interface RegimeDistribution {
  regime: MarketState;
  durationMinutes: number;
  percentageOfTime: number;
  transitionCount: number;
  avgDurationMinutes: number;
}

// ===================== SERVICE CLASS =====================

class RegimeAnalyticsService {
  /**
   * Fetch historical per-regime performance from Supabase
   * @param agentId - Agent to analyze (e.g., 'alphax', 'betax', 'gammax')
   * @param days - Number of days to look back
   * @returns Array of performance snapshots over time
   */
  async getRegimePerformanceHistory(
    agentId: string,
    days: number
  ): Promise<RegimePerformanceSnapshot[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('agent_performance')
        .select('timestamp, market_state, win_rate, total_pnl, total_trades, regime_adaptability_score')
        .eq('agent_id', agentId)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ getRegimePerformanceHistory error:', error);
        return [];
      }

      return (data || []).map(row => ({
        timestamp: row.timestamp,
        marketState: row.market_state as MarketState,
        winRate: row.win_rate || 0,
        totalPnL: row.total_pnl || 0,
        totalTrades: row.total_trades || 0,
        adaptabilityScore: row.regime_adaptability_score || 0,
      }));
    } catch (error) {
      console.error('❌ getRegimePerformanceHistory exception:', error);
      return [];
    }
  }

  /**
   * Analyze P&L impact before and after regime changes
   * @param agentId - Agent to analyze
   * @returns Array of regime change impacts
   */
  async getRegimeChangeImpact(agentId: string): Promise<RegimeChangeImpact[]> {
    try {
      // Fetch regime changes from last 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const { data: regimeChanges, error: regimeError } = await supabase
        .from('market_state_history')
        .select('timestamp, market_state, previous_state')
        .gte('timestamp', cutoffDate.toISOString())
        .not('previous_state', 'is', null)
        .order('timestamp', { ascending: true });

      if (regimeError || !regimeChanges) {
        console.error('❌ getRegimeChangeImpact error:', regimeError);
        return [];
      }

      // Fetch all trades for this agent
      const { data: trades, error: tradesError } = await supabase
        .from('arena_trade_history')
        .select('timestamp, market_state, is_win, pnl_percent')
        .eq('agent_id', agentId)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: true });

      if (tradesError || !trades) {
        console.error('❌ getRegimeChangeImpact trades error:', tradesError);
        return [];
      }

      const impacts: RegimeChangeImpact[] = [];

      for (let i = 0; i < regimeChanges.length; i++) {
        const change = regimeChanges[i];
        const changeTime = new Date(change.timestamp).getTime();

        // Get trades 1 hour before regime change
        const tradesBeforeWindow = 60 * 60 * 1000; // 1 hour in ms
        const tradesBefore = trades.filter(t => {
          const tradeTime = new Date(t.timestamp).getTime();
          return tradeTime >= changeTime - tradesBeforeWindow && tradeTime < changeTime;
        });

        // Get trades 1 hour after regime change
        const tradesAfter = trades.filter(t => {
          const tradeTime = new Date(t.timestamp).getTime();
          return tradeTime >= changeTime && tradeTime < changeTime + tradesBeforeWindow;
        });

        if (tradesBefore.length < 3 || tradesAfter.length < 3) {
          continue; // Not enough data for reliable comparison
        }

        const calcMetrics = (tradeSet: typeof trades) => ({
          trades: tradeSet.length,
          winRate: (tradeSet.filter(t => t.is_win).length / tradeSet.length) * 100,
          avgPnL: tradeSet.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / tradeSet.length,
        });

        const perfBefore = calcMetrics(tradesBefore);
        const perfAfter = calcMetrics(tradesAfter);

        // Calculate impact score (-100 to +100)
        const winRateImpact = (perfAfter.winRate - perfBefore.winRate) * 2; // Double weight for win rate
        const pnlImpact = (perfAfter.avgPnL - perfBefore.avgPnL) * 10; // Scale P&L impact
        const impactScore = Math.max(-100, Math.min(100, winRateImpact + pnlImpact));

        // Calculate adaptation speed (how many trades until win rate stabilizes)
        let adaptationSpeed = tradesAfter.length;
        let stabilized = false;
        for (let j = 5; j < tradesAfter.length; j++) {
          const recentWinRate = (tradesAfter.slice(j - 5, j).filter(t => t.is_win).length / 5) * 100;
          if (Math.abs(recentWinRate - perfAfter.winRate) < 10) {
            adaptationSpeed = j;
            stabilized = true;
            break;
          }
        }
        if (!stabilized) adaptationSpeed = tradesAfter.length;

        impacts.push({
          regimeChange: {
            from: change.previous_state as MarketState,
            to: change.market_state as MarketState,
            timestamp: change.timestamp,
          },
          performanceBefore: perfBefore,
          performanceAfter: perfAfter,
          impactScore,
          adaptationSpeed,
        });
      }

      return impacts;
    } catch (error) {
      console.error('❌ getRegimeChangeImpact exception:', error);
      return [];
    }
  }

  /**
   * Track how a strategy's effectiveness in each regime changes over time
   * @param strategy - Strategy name (e.g., 'Momentum Breakout')
   * @param days - Number of days to analyze
   * @returns Evolution data for each regime
   */
  async getStrategyRegimeEvolution(
    strategy: string,
    days: number
  ): Promise<StrategyRegimeEvolution[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fetch all trades for this strategy
      const { data: trades, error } = await supabase
        .from('arena_trade_history')
        .select('timestamp, market_state, is_win, pnl_percent')
        .eq('strategy', strategy)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error || !trades) {
        console.error('❌ getStrategyRegimeEvolution error:', error);
        return [];
      }

      // Group by regime
      const regimeMap = new Map<MarketState, typeof trades>();
      for (const trade of trades) {
        const regime = trade.market_state as MarketState;
        if (!regimeMap.has(regime)) {
          regimeMap.set(regime, []);
        }
        regimeMap.get(regime)!.push(trade);
      }

      const evolutions: StrategyRegimeEvolution[] = [];

      for (const [regime, regimeTrades] of regimeMap.entries()) {
        if (regimeTrades.length < 10) continue; // Need minimum data

        // Group by week for trend analysis
        const weeklyData: { [week: string]: typeof trades } = {};
        for (const trade of regimeTrades) {
          const tradeDate = new Date(trade.timestamp);
          const weekStart = new Date(tradeDate);
          weekStart.setDate(tradeDate.getDate() - tradeDate.getDay()); // Start of week
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = [];
          }
          weeklyData[weekKey].push(trade);
        }

        // Calculate weekly metrics
        const dataPoints = Object.entries(weeklyData)
          .filter(([, weekTrades]) => weekTrades.length >= 3) // Minimum 3 trades per week
          .map(([week, weekTrades]) => ({
            date: week,
            winRate: (weekTrades.filter(t => t.is_win).length / weekTrades.length) * 100,
            trades: weekTrades.length,
            avgPnL: weekTrades.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / weekTrades.length,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (dataPoints.length < 2) continue; // Need at least 2 weeks for trend

        // Calculate linear regression for trend
        const xValues = dataPoints.map((_, idx) => idx);
        const yValues = dataPoints.map(d => d.winRate);
        const slope = this.calculateLinearRegressionSlope(xValues, yValues);

        // Determine trend
        let trend: 'improving' | 'declining' | 'stable';
        let trendStrength: number;
        if (slope > 2) {
          trend = 'improving';
          trendStrength = Math.min(100, slope * 10);
        } else if (slope < -2) {
          trend = 'declining';
          trendStrength = Math.min(100, Math.abs(slope) * 10);
        } else {
          trend = 'stable';
          trendStrength = 100 - Math.abs(slope) * 20;
        }

        evolutions.push({
          strategy,
          regime,
          dataPoints,
          trend,
          trendStrength,
        });
      }

      return evolutions;
    } catch (error) {
      console.error('❌ getStrategyRegimeEvolution exception:', error);
      return [];
    }
  }

  /**
   * Show what percentage of time market spent in each regime
   * @param days - Number of days to analyze
   * @returns Distribution of time across regimes
   */
  async getRegimeDistribution(days: number): Promise<RegimeDistribution[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('market_state_history')
        .select('timestamp, market_state')
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error || !data || data.length === 0) {
        console.error('❌ getRegimeDistribution error:', error);
        return [];
      }

      const regimeStats = new Map<MarketState, { durations: number[]; transitions: number }>();

      // Calculate durations between regime changes
      for (let i = 0; i < data.length - 1; i++) {
        const current = data[i];
        const next = data[i + 1];
        const regime = current.market_state as MarketState;

        const duration = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
        const durationMinutes = Math.round(duration / 60000);

        if (!regimeStats.has(regime)) {
          regimeStats.set(regime, { durations: [], transitions: 0 });
        }

        regimeStats.get(regime)!.durations.push(durationMinutes);
        regimeStats.get(regime)!.transitions += 1;
      }

      // Calculate total time
      let totalMinutes = 0;
      for (const [, stats] of regimeStats.entries()) {
        totalMinutes += stats.durations.reduce((a, b) => a + b, 0);
      }

      // Build distribution array
      const distributions: RegimeDistribution[] = [];
      for (const [regime, stats] of regimeStats.entries()) {
        const totalDuration = stats.durations.reduce((a, b) => a + b, 0);
        const avgDuration = totalDuration / stats.durations.length;

        distributions.push({
          regime,
          durationMinutes: totalDuration,
          percentageOfTime: (totalDuration / totalMinutes) * 100,
          transitionCount: stats.transitions,
          avgDurationMinutes: Math.round(avgDuration),
        });
      }

      return distributions.sort((a, b) => b.percentageOfTime - a.percentageOfTime);
    } catch (error) {
      console.error('❌ getRegimeDistribution exception:', error);
      return [];
    }
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Calculate slope of linear regression line
   * Used for trend analysis
   */
  private calculateLinearRegressionSlope(xValues: number[], yValues: number[]): number {
    const n = xValues.length;
    if (n === 0) return 0;

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}

// ===================== SINGLETON EXPORT =====================

export const regimeAnalyticsService = new RegimeAnalyticsService();
