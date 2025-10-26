interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  indexPrice?: number;
  nextFundingTime: number;
  interestRate?: number;
}

interface FundingRateHistory {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
}

class FundingRateService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache for real-time feel
  private BINANCE_FUTURES_API = 'https://fapi.binance.com';

  // Top perpetual futures by volume (similar to Coinglass)
  private TOP_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'TRXUSDT', 'LINKUSDT', 'AVAXUSDT',
    'MATICUSDT', 'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT',
    'ETCUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
    'SUIUSDT', 'INJUSDT', 'FILUSDT', 'ICPUSDT', 'HBARUSDT',
    'TAOUSDT', 'RENDERUSDT', 'WLDUSDT', 'MKRUSDT', 'AAVEUSDT'
  ];

  /**
   * Get current funding rates for all major perpetual futures
   */
  async getCurrentFundingRates(): Promise<FundingRateData[]> {
    const cacheKey = 'all-funding-rates';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get premium index which includes current funding rate
      const response = await fetch(`${this.BINANCE_FUTURES_API}/fapi/v1/premiumIndex`);
      
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const allData = await response.json();

      // Filter for our top symbols and format data
      const fundingRates: FundingRateData[] = allData
        .filter((item: any) => this.TOP_SYMBOLS.includes(item.symbol))
        .map((item: any) => ({
          symbol: item.symbol,
          fundingRate: parseFloat(item.lastFundingRate) * 100, // Convert to percentage
          fundingTime: item.time,
          markPrice: parseFloat(item.markPrice),
          indexPrice: parseFloat(item.indexPrice),
          nextFundingTime: item.nextFundingTime,
          interestRate: parseFloat(item.interestRate)
        }))
        .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate)); // Sort by absolute funding rate

      this.cache.set(cacheKey, { data: fundingRates, timestamp: Date.now() });
      return fundingRates;
    } catch (error) {
      console.error('Error fetching funding rates:', error);
      
      // Return cached data if available, even if stale
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get funding rate history for a specific symbol
   */
  async getFundingRateHistory(
    symbol: string,
    limit: number = 100
  ): Promise<FundingRateHistory[]> {
    const cacheKey = `history-${symbol}-${limit}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION * 5) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.BINANCE_FUTURES_API}/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();
      
      const history: FundingRateHistory[] = data.map((item: any) => ({
        symbol: item.symbol,
        fundingRate: parseFloat(item.fundingRate) * 100, // Convert to percentage
        fundingTime: item.fundingTime
      }));

      this.cache.set(cacheKey, { data: history, timestamp: Date.now() });
      return history;
    } catch (error) {
      console.error(`Error fetching funding rate history for ${symbol}:`, error);
      
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Calculate average funding rate over period
   */
  calculateAverageFundingRate(history: FundingRateHistory[]): number {
    if (history.length === 0) return 0;
    
    const sum = history.reduce((acc, item) => acc + item.fundingRate, 0);
    return sum / history.length;
  }

  /**
   * Calculate 24h and 7d funding rate stats
   */
  calculateFundingStats(history: FundingRateHistory[]) {
    if (history.length === 0) {
      return {
        avg24h: 0,
        avg7d: 0,
        min24h: 0,
        max24h: 0,
        trend: 'neutral' as const
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const last24h = history.filter(item => item.fundingTime >= oneDayAgo);
    const last7d = history.filter(item => item.fundingTime >= sevenDaysAgo);

    const avg24h = this.calculateAverageFundingRate(last24h);
    const avg7d = this.calculateAverageFundingRate(last7d);

    const rates24h = last24h.map(item => item.fundingRate);
    const min24h = rates24h.length > 0 ? Math.min(...rates24h) : 0;
    const max24h = rates24h.length > 0 ? Math.max(...rates24h) : 0;

    // Determine trend based on recent rates
    const recentRates = history.slice(0, 3).map(item => item.fundingRate);
    const olderRates = history.slice(3, 6).map(item => item.fundingRate);
    
    const recentAvg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const olderAvg = olderRates.length > 0 
      ? olderRates.reduce((a, b) => a + b, 0) / olderRates.length 
      : recentAvg;

    let trend: 'increasing' | 'decreasing' | 'neutral' = 'neutral';
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

    return { avg24h, avg7d, min24h, max24h, trend };
  }

  /**
   * Format funding rate for display
   */
  formatFundingRate(rate: number): string {
    const formatted = rate.toFixed(4);
    return rate >= 0 ? `+${formatted}%` : `${formatted}%`;
  }

  /**
   * Get color class based on funding rate
   */
  getFundingRateColor(rate: number): string {
    if (rate > 0.05) return 'text-green-500';
    if (rate > 0.01) return 'text-green-400';
    if (rate > 0) return 'text-green-300';
    if (rate > -0.01) return 'text-red-300';
    if (rate > -0.05) return 'text-red-400';
    return 'text-red-500';
  }

  /**
   * Get background color class based on funding rate
   */
  getFundingRateBgColor(rate: number): string {
    if (rate > 0.05) return 'bg-green-500/10';
    if (rate > 0.01) return 'bg-green-400/10';
    if (rate > 0) return 'bg-green-300/10';
    if (rate > -0.01) return 'bg-red-300/10';
    if (rate > -0.05) return 'bg-red-400/10';
    return 'bg-red-500/10';
  }

  /**
   * Calculate annualized funding rate (365 days * 3 times per day)
   */
  calculateAnnualizedRate(dailyRate: number): number {
    return dailyRate * 365 * 3; // 3 funding periods per day (8 hours each)
  }
}

export const fundingRateService = new FundingRateService();
