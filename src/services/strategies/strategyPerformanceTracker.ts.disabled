/**
 * STRATEGY PERFORMANCE TRACKER
 * Tracks profitability and performance metrics for each of the 10 strategies
 */

import { supabase } from '@/integrations/supabase/client';
import { StrategyName, StrategyPerformance, STRATEGY_METADATA } from './strategyTypes';

class StrategyPerformanceTracker {
  /**
   * Get performance metrics for a specific strategy
   */
  async getStrategyPerformance(strategyName: StrategyName): Promise<StrategyPerformance> {
    try {
      // Fetch all completed signals for this strategy
      const { data: signals, error } = await supabase
        .from('intelligence_signals')
        .select('status, profit_loss_percent, signal_type, confidence')
        .eq('strategy_name', strategyName)
        .in('status', ['SUCCESS', 'FAILED']);

      if (error) {
        console.error(`[PerformanceTracker] Error fetching ${strategyName} signals:`, error);
        throw error;
      }

      if (!signals || signals.length === 0) {
        // No data yet - return zeros
        return {
          strategyName,
          totalSignals: 0,
          successfulSignals: 0,
          failedSignals: 0,
          successRate: 0,
          averageProfit: 0,
          averageLoss: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winStreak: 0,
          lossStreak: 0,
          lastUpdated: new Date()
        };
      }

      // Calculate metrics
      const successfulSignals = signals.filter(s => s.status === 'SUCCESS');
      const failedSignals = signals.filter(s => s.status === 'FAILED');

      const successRate = (successfulSignals.length / signals.length) * 100;

      // Calculate average profit (from successful trades)
      const profits = successfulSignals
        .map(s => s.profit_loss_percent || 0)
        .filter(p => p > 0);
      const averageProfit = profits.length > 0
        ? profits.reduce((sum, p) => sum + p, 0) / profits.length
        : 0;

      // Calculate average loss (from failed trades)
      const losses = failedSignals
        .map(s => Math.abs(s.profit_loss_percent || 0))
        .filter(l => l > 0);
      const averageLoss = losses.length > 0
        ? losses.reduce((sum, l) => sum + l, 0) / losses.length
        : 0;

      // Calculate profit factor (total profit / total loss)
      const totalProfit = profits.reduce((sum, p) => sum + p, 0);
      const totalLoss = losses.reduce((sum, l) => sum + l, 0);
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

      // Calculate Sharpe Ratio (simplified - risk-adjusted returns)
      const returns = signals.map(s => s.profit_loss_percent || 0);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

      // Calculate max drawdown
      let runningTotal = 0;
      let peak = 0;
      let maxDrawdown = 0;
      for (const signal of signals) {
        runningTotal += signal.profit_loss_percent || 0;
        if (runningTotal > peak) peak = runningTotal;
        const drawdown = peak - runningTotal;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      // Calculate win/loss streaks
      let currentStreak = 0;
      let maxWinStreak = 0;
      let maxLossStreak = 0;
      let isWinStreak = false;

      for (const signal of signals) {
        if (signal.status === 'SUCCESS') {
          if (isWinStreak || currentStreak === 0) {
            currentStreak++;
            isWinStreak = true;
          } else {
            if (currentStreak > maxLossStreak) maxLossStreak = currentStreak;
            currentStreak = 1;
            isWinStreak = true;
          }
        } else {
          if (!isWinStreak || currentStreak === 0) {
            currentStreak++;
            isWinStreak = false;
          } else {
            if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
            currentStreak = 1;
            isWinStreak = false;
          }
        }
      }

      // Update final streaks
      if (isWinStreak && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      if (!isWinStreak && currentStreak > maxLossStreak) maxLossStreak = currentStreak;

      return {
        strategyName,
        totalSignals: signals.length,
        successfulSignals: successfulSignals.length,
        failedSignals: failedSignals.length,
        successRate: Math.round(successRate * 10) / 10,
        averageProfit: Math.round(averageProfit * 10) / 10,
        averageLoss: Math.round(averageLoss * 10) / 10,
        profitFactor: Math.round(profitFactor * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 10) / 10,
        winStreak: maxWinStreak,
        lossStreak: maxLossStreak,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`[PerformanceTracker] Error calculating performance for ${strategyName}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics for all strategies
   */
  async getAllStrategyPerformances(): Promise<StrategyPerformance[]> {
    const strategyNames: StrategyName[] = [
      'WHALE_SHADOW',
      'SPRING_TRAP',
      'MOMENTUM_SURGE',
      'FUNDING_SQUEEZE',
      'ORDER_FLOW_TSUNAMI',
      'FEAR_GREED_CONTRARIAN',
      'GOLDEN_CROSS_MOMENTUM',
      'MARKET_PHASE_SNIPER',
      'LIQUIDITY_HUNTER',
      'VOLATILITY_BREAKOUT'
    ];

    const performances = await Promise.all(
      strategyNames.map(name => this.getStrategyPerformance(name))
    );

    return performances;
  }

  /**
   * Get top performing strategies (sorted by success rate)
   */
  async getTopStrategies(limit: number = 5): Promise<StrategyPerformance[]> {
    const allPerformances = await this.getAllStrategyPerformances();

    // Filter out strategies with less than 5 signals (not enough data)
    const validStrategies = allPerformances.filter(p => p.totalSignals >= 5);

    // Sort by success rate descending
    return validStrategies
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get strategy comparison data
   */
  async getStrategyComparison(): Promise<{
    strategies: StrategyPerformance[];
    bestBySuccessRate: StrategyName | null;
    bestByProfitFactor: StrategyName | null;
    bestBySharpeRatio: StrategyName | null;
    overall: {
      totalSignals: number;
      averageSuccessRate: number;
      totalProfit: number;
    };
  }> {
    const strategies = await this.getAllStrategyPerformances();

    // Find best strategies
    const validStrategies = strategies.filter(s => s.totalSignals >= 5);

    const bestBySuccessRate = validStrategies.length > 0
      ? validStrategies.reduce((best, current) =>
          current.successRate > best.successRate ? current : best
        ).strategyName
      : null;

    const bestByProfitFactor = validStrategies.length > 0
      ? validStrategies.reduce((best, current) =>
          current.profitFactor > best.profitFactor ? current : best
        ).strategyName
      : null;

    const bestBySharpeRatio = validStrategies.length > 0
      ? validStrategies.reduce((best, current) =>
          current.sharpeRatio > best.sharpeRatio ? current : best
        ).strategyName
      : null;

    // Calculate overall metrics
    const totalSignals = strategies.reduce((sum, s) => sum + s.totalSignals, 0);
    const averageSuccessRate = totalSignals > 0
      ? strategies.reduce((sum, s) => sum + (s.successRate * s.totalSignals), 0) / totalSignals
      : 0;
    const totalProfit = strategies.reduce(
      (sum, s) => sum + (s.averageProfit * s.successfulSignals),
      0
    );

    return {
      strategies,
      bestBySuccessRate,
      bestByProfitFactor,
      bestBySharpeRatio,
      overall: {
        totalSignals,
        averageSuccessRate: Math.round(averageSuccessRate * 10) / 10,
        totalProfit: Math.round(totalProfit * 10) / 10
      }
    };
  }

  /**
   * Get recent signals for a strategy
   */
  async getRecentSignalsForStrategy(
    strategyName: StrategyName,
    limit: number = 10
  ) {
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('strategy_name', strategyName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`[PerformanceTracker] Error fetching recent signals:`, error);
      throw error;
    }

    return data || [];
  }
}

export const strategyPerformanceTracker = new StrategyPerformanceTracker();
