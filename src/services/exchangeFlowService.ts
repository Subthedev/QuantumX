// ===============================================
// EXCHANGE FLOW TRACKING SERVICE
// Monitors crypto movement in/out of exchanges
// ===============================================

import { whaleAlertService, type WhaleTransaction } from './whaleAlertService';
import { blockchainScannerService } from './blockchainScannerService';

export interface ExchangeFlowData {
  coinSymbol: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  inflow: number; // Total deposits to exchanges
  outflow: number; // Total withdrawals from exchanges
  netFlow: number; // Inflow - Outflow (positive = bearish, negative = bullish)
  inflowChange: number; // % change vs previous period
  outflowChange: number;
  netFlowChange: number;
  largestDeposit: WhaleTransaction | null;
  largestWithdrawal: WhaleTransaction | null;
  exchangeBalance: number; // Total on all exchanges
  exchangeBalanceChange: number; // % change
  flowInterpretation: 'strong_accumulation' | 'accumulation' | 'neutral' | 'distribution' | 'strong_distribution';
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
}

export interface ExchangeBalance {
  exchangeName: string;
  balance: number;
  balanceUsd: number;
  change24h: number;
  change7d: number;
  percentage: number; // % of total circulating supply
}

class ExchangeFlowService {
  private flowCache: Map<string, { data: ExchangeFlowData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 120000; // 2 minutes

  /**
   * Get exchange flow data for a coin
   */
  async getExchangeFlows(coinSymbol: string, timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ExchangeFlowData> {
    const cacheKey = `${coinSymbol}-${timeframe}`;
    const cached = this.flowCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get whale transactions - fetch more for better accuracy
      const whaleStats = await whaleAlertService.getWhaleStats(coinSymbol);
      const whaleTransactions = await whaleAlertService.getRecentWhaleTransactions(coinSymbol, 200);

      // Filter by timeframe
      const cutoffTime = this.getTimeframeCutoff(timeframe);
      const filteredTransactions = whaleTransactions.filter(tx => tx.timestamp >= cutoffTime);

      // Calculate flows
      const deposits = filteredTransactions.filter(tx => tx.transactionType === 'exchange_deposit');
      const withdrawals = filteredTransactions.filter(tx => tx.transactionType === 'exchange_withdrawal');

      const inflowUsd = deposits.reduce((sum, tx) => sum + tx.amountUSD, 0);
      const outflowUsd = withdrawals.reduce((sum, tx) => sum + tx.amountUSD, 0);
      const netFlowUsd = inflowUsd - outflowUsd;

      // Find largest transactions
      const largestDeposit = deposits.length > 0 ?
        deposits.reduce((max, tx) => tx.amountUSD > max.amountUSD ? tx : max) : null;
      const largestWithdrawal = withdrawals.length > 0 ?
        withdrawals.reduce((max, tx) => tx.amountUSD > max.amountUSD ? tx : max) : null;

      // Calculate interpretation
      const flowInterpretation = this.interpretFlow(netFlowUsd, inflowUsd, outflowUsd);
      const sentiment = this.calculateSentiment(netFlowUsd, inflowUsd, outflowUsd);

      // Estimate exchange balance (this would be more accurate with real exchange API data)
      const estimatedExchangeBalance = this.estimateExchangeBalance(coinSymbol, whaleStats);

      const flowData: ExchangeFlowData = {
        coinSymbol,
        timeframe,
        inflow: inflowUsd,
        outflow: outflowUsd,
        netFlow: netFlowUsd,
        inflowChange: 0, // Would need historical data
        outflowChange: 0,
        netFlowChange: 0,
        largestDeposit,
        largestWithdrawal,
        exchangeBalance: estimatedExchangeBalance,
        exchangeBalanceChange: this.calculateBalanceChange(netFlowUsd, estimatedExchangeBalance),
        flowInterpretation,
        sentiment
      };

      this.flowCache.set(cacheKey, { data: flowData, timestamp: Date.now() });
      return flowData;
    } catch (error) {
      console.error(`Error calculating exchange flows for ${coinSymbol}:`, error);
      return this.getDefaultFlowData(coinSymbol, timeframe);
    }
  }

  /**
   * Get exchange balances breakdown
   */
  async getExchangeBalances(coinSymbol: string, chainId: string = 'ethereum'): Promise<ExchangeBalance[]> {
    // This would integrate with exchange APIs or use known exchange addresses
    // For now, returning mock data structure
    const mockExchanges: ExchangeBalance[] = [
      {
        exchangeName: 'Binance',
        balance: 0,
        balanceUsd: 0,
        change24h: 0,
        change7d: 0,
        percentage: 0
      },
      {
        exchangeName: 'Coinbase',
        balance: 0,
        balanceUsd: 0,
        change24h: 0,
        change7d: 0,
        percentage: 0
      },
      {
        exchangeName: 'Kraken',
        balance: 0,
        balanceUsd: 0,
        change24h: 0,
        change7d: 0,
        percentage: 0
      }
    ];

    return mockExchanges;
  }

  /**
   * Get flow trend (increasing/decreasing)
   */
  async getFlowTrend(coinSymbol: string): Promise<{
    direction: 'increasing_inflow' | 'decreasing_inflow' | 'increasing_outflow' | 'decreasing_outflow' | 'stable';
    strength: number; // 0-100
  }> {
    const flow24h = await this.getExchangeFlows(coinSymbol, '24h');
    const flow7d = await this.getExchangeFlows(coinSymbol, '7d');

    const netFlow24hPerDay = flow24h.netFlow;
    const netFlow7dPerDay = flow7d.netFlow / 7;

    const change = ((netFlow24hPerDay - netFlow7dPerDay) / Math.abs(netFlow7dPerDay)) * 100;

    let direction: 'increasing_inflow' | 'decreasing_inflow' | 'increasing_outflow' | 'decreasing_outflow' | 'stable';

    if (Math.abs(change) < 10) {
      direction = 'stable';
    } else if (change > 0 && netFlow24hPerDay > 0) {
      direction = 'increasing_inflow';
    } else if (change < 0 && netFlow24hPerDay > 0) {
      direction = 'decreasing_inflow';
    } else if (change > 0 && netFlow24hPerDay < 0) {
      direction = 'decreasing_outflow';
    } else {
      direction = 'increasing_outflow';
    }

    return {
      direction,
      strength: Math.min(100, Math.abs(change))
    };
  }

  /**
   * Helper: Get timeframe cutoff timestamp
   */
  private getTimeframeCutoff(timeframe: '1h' | '24h' | '7d' | '30d'): number {
    const now = Date.now();
    switch (timeframe) {
      case '1h': return now - 3600000;
      case '24h': return now - 86400000;
      case '7d': return now - 604800000;
      case '30d': return now - 2592000000;
    }
  }

  /**
   * Helper: Interpret flow pattern
   */
  private interpretFlow(
    netFlow: number,
    inflow: number,
    outflow: number
  ): ExchangeFlowData['flowInterpretation'] {
    const ratio = netFlow / (inflow + outflow || 1);

    if (ratio < -0.3) return 'strong_accumulation'; // Heavy outflows (very bullish)
    if (ratio < -0.1) return 'accumulation'; // Moderate outflows (bullish)
    if (ratio > 0.3) return 'strong_distribution'; // Heavy inflows (very bearish)
    if (ratio > 0.1) return 'distribution'; // Moderate inflows (bearish)
    return 'neutral';
  }

  /**
   * Helper: Calculate sentiment from flows
   */
  private calculateSentiment(
    netFlow: number,
    inflow: number,
    outflow: number
  ): ExchangeFlowData['sentiment'] {
    // Negative netFlow = outflows > inflows = bullish (users accumulating off exchanges)
    // Positive netFlow = inflows > outflows = bearish (users sending to exchanges to sell)

    const flowRatio = netFlow / (inflow + outflow || 1);

    if (flowRatio < -0.4) return 'very_bullish';
    if (flowRatio < -0.15) return 'bullish';
    if (flowRatio > 0.4) return 'very_bearish';
    if (flowRatio > 0.15) return 'bearish';
    return 'neutral';
  }

  /**
   * Helper: Estimate exchange balance
   */
  private estimateExchangeBalance(coinSymbol: string, whaleStats: any): number {
    // This is a rough estimate - would be more accurate with real exchange API data
    // Typically, 10-15% of circulating supply is on exchanges
    return whaleStats.totalVolume24h * 10; // Very rough estimate
  }

  /**
   * Helper: Calculate balance change percentage
   */
  private calculateBalanceChange(netFlow: number, currentBalance: number): number {
    if (currentBalance === 0) return 0;
    return (netFlow / currentBalance) * 100;
  }

  /**
   * Helper: Get default flow data
   */
  private getDefaultFlowData(coinSymbol: string, timeframe: '1h' | '24h' | '7d' | '30d'): ExchangeFlowData {
    return {
      coinSymbol,
      timeframe,
      inflow: 0,
      outflow: 0,
      netFlow: 0,
      inflowChange: 0,
      outflowChange: 0,
      netFlowChange: 0,
      largestDeposit: null,
      largestWithdrawal: null,
      exchangeBalance: 0,
      exchangeBalanceChange: 0,
      flowInterpretation: 'neutral',
      sentiment: 'neutral'
    };
  }

  /**
   * Format currency with proper handling of negative values
   */
  formatUsd(amount: number): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';

    if (absAmount >= 1000000000) return `${sign}$${(absAmount / 1000000000).toFixed(2)}B`;
    if (absAmount >= 1000000) return `${sign}$${(absAmount / 1000000).toFixed(2)}M`;
    if (absAmount >= 1000) return `${sign}$${(absAmount / 1000).toFixed(2)}K`;
    return `${sign}$${absAmount.toFixed(2)}`;
  }

  /**
   * Get sentiment color
   */
  getSentimentColor(sentiment: ExchangeFlowData['sentiment']): string {
    switch (sentiment) {
      case 'very_bullish': return 'text-green-600 dark:text-green-400';
      case 'bullish': return 'text-green-500 dark:text-green-500';
      case 'neutral': return 'text-gray-600 dark:text-gray-400';
      case 'bearish': return 'text-orange-500 dark:text-orange-500';
      case 'very_bearish': return 'text-red-600 dark:text-red-400';
    }
  }

  /**
   * Get flow interpretation badge color
   */
  getFlowColor(interpretation: ExchangeFlowData['flowInterpretation']): string {
    switch (interpretation) {
      case 'strong_accumulation': return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'accumulation': return 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20';
      case 'neutral': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
      case 'distribution': return 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20';
      case 'strong_distribution': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.flowCache.clear();
  }
}

export const exchangeFlowService = new ExchangeFlowService();
