/**
 * Enhanced Funding Rate Service - IgniteX Platform
 * Provides comprehensive funding rate data for 100+ cryptocurrencies
 * Real-time updates, predictions, and analytics
 */

interface FundingRateData {
  symbol: string;
  coinName: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  nextFundingTime: number;
  predictedFundingRate: number;
  avg24h: number;
  avg7d: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  marketCap?: number;
  marketCapRank?: number;
  openInterest?: number;
  longShortRatio?: number;
}

interface FundingRateHistory {
  timestamp: number;
  rate: number;
}

class EnhancedFundingRateService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute for real-time feel
  private BINANCE_FUTURES_API = 'https://fapi.binance.com';
  
  // Comprehensive list of all supported perpetual futures
  private PERPETUAL_SYMBOLS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'TRXUSDT',
    'TONUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT', 'DOTUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT',
    'ETCUSDT', 'XLMUSDT', 'FILUSDT', 'HBARUSDT', 'VETUSDT', 'ICPUSDT', 'APTUSDT', 'NEARUSDT',
    'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT', 'PEPEUSDT', 'RENDERUSDT', 'WLDUSDT', 'MKRUSDT',
    'LDOUSDT', 'STXUSDT', 'IMXUSDT', 'SEIUSDT', 'ALGOUSDT', 'QNTUSDT', 'FTMUSDT', 'AAVEUSDT',
    'GRTUSDT', 'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'THETAUSDT', 'FLOWUSDT', 'CHZUSDT', 'ENJUSDT',
    'SHIBUSDT', 'BCHUSDT', 'OKBUSDT', 'CAKEUSDT', '1INCHUSDT', 'COMPUSDT', 'SNXUSDT', 'CROUSDT',
    'RUNEUSDT', 'ZILUSDT', 'FXSUSDT', 'PENDLEUSDT', 'ARUSDT', 'RPLUSDT', 'BEAMUSDT', 'TIAUSDT',
    'WUSDT', 'JUPUSDT', 'ONDOUSDT', 'PYTHUSDT', 'STRKUSDT', 'DYMUSDT', 'WIFUSDT', 'MANTAUSDT',
    'ALTUSDT', 'JTOUSDT', 'METISUSDT', 'ACEUSDT', 'XAIUSDT', 'PORTALUSDT', 'PIXELUSDT', 'MAVUSDT',
    'ORDIUSDT', '1000BONKUSDT', '1000RATSUSDT', 'SAGAUSDT', 'TAOUSDT', 'OMNIUSDT', 'NOTUSDT',
    'TURBOUSDT', 'IOUSDT', 'ZKUSDT', 'ZROUSDT', 'LISTAUSDT', 'ZETAUSDT', '1000SATSUSDT', 'UXLINKUSDT',
    'UMAUSDT', 'NFPUSDT', 'POLYXUSDT', 'BOMEUSDT', 'RIFUSDT', 'ETHFIUSDT', 'REZUSDT', 'BBUSDT',
    'MEWUSDT', 'AIUSDT', 'GUSDT', 'SAGAUSDT', 'ENAUSDT', 'W', 'ENSUSDT', 'BLURUSDT', 'IDUSDT'
  ];

  private symbolToNameMap: Map<string, string> = new Map([
    ['BTCUSDT', 'Bitcoin'], ['ETHUSDT', 'Ethereum'], ['BNBUSDT', 'BNB'], ['SOLUSDT', 'Solana'],
    ['XRPUSDT', 'Ripple'], ['ADAUSDT', 'Cardano'], ['DOGEUSDT', 'Dogecoin'], ['TRXUSDT', 'Tron'],
    ['TONUSDT', 'Toncoin'], ['LINKUSDT', 'Chainlink'], ['MATICUSDT', 'Polygon'], ['AVAXUSDT', 'Avalanche'],
    ['DOTUSDT', 'Polkadot'], ['LTCUSDT', 'Litecoin'], ['UNIUSDT', 'Uniswap'], ['ATOMUSDT', 'Cosmos'],
    ['ETCUSDT', 'Ethereum Classic'], ['XLMUSDT', 'Stellar'], ['FILUSDT', 'Filecoin'], ['HBARUSDT', 'Hedera'],
    // Add more as needed
  ]);

  /**
   * Get all funding rates with real-time updates - sorted by market cap
   */
  async getAllFundingRates(): Promise<FundingRateData[]> {
    const cacheKey = 'all-funding-rates';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Fetch premium index (includes current funding rate) and market data
      const [premiumResponse, marketResponse] = await Promise.all([
        fetch(`${this.BINANCE_FUTURES_API}/fapi/v1/premiumIndex`),
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false')
      ]);
      
      if (!premiumResponse.ok) {
        throw new Error(`API error: ${premiumResponse.status}`);
      }

      const allData = await premiumResponse.json();
      let marketData: any[] = [];
      
      // Try to get market cap data, but continue if it fails
      try {
        if (marketResponse.ok) {
          marketData = await marketResponse.json();
        }
      } catch (e) {
        console.warn('Failed to fetch market cap data:', e);
      }

      // Create market cap map for fast lookup
      const marketCapMap = new Map(
        marketData.map(coin => [
          coin.symbol.toUpperCase() + 'USDT',
          { marketCap: coin.market_cap, marketCapRank: coin.market_cap_rank }
        ])
      );

      // Filter and enrich data
      const fundingRates: FundingRateData[] = await Promise.all(
        allData
          .filter((item: any) => this.PERPETUAL_SYMBOLS.includes(item.symbol))
          .map(async (item: any) => {
            const history = await this.getFundingRateHistory(item.symbol, 30);
            const stats = this.calculateStats(history);
            const predicted = this.predictNextFundingRate(history, parseFloat(item.lastFundingRate) * 100);
            const marketInfo = marketCapMap.get(item.symbol) || { marketCap: 0, marketCapRank: 9999 };

            return {
              symbol: item.symbol,
              coinName: this.getCoinName(item.symbol),
              fundingRate: parseFloat(item.lastFundingRate) * 100,
              fundingTime: item.time,
              markPrice: parseFloat(item.markPrice),
              nextFundingTime: item.nextFundingTime,
              predictedFundingRate: predicted,
              avg24h: stats.avg24h,
              avg7d: stats.avg7d,
              trend: stats.trend,
              marketCap: marketInfo.marketCap,
              marketCapRank: marketInfo.marketCapRank
            };
          })
      );

      // Sort by market cap rank (ascending = largest first)
      fundingRates.sort((a, b) => (a.marketCapRank || 9999) - (b.marketCapRank || 9999));

      this.cache.set(cacheKey, { data: fundingRates, timestamp: Date.now() });
      return fundingRates;
    } catch (error) {
      console.error('Error fetching funding rates:', error);
      
      if (cached) {
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get funding rate history for a symbol
   */
  async getFundingRateHistory(symbol: string, limit: number = 100): Promise<FundingRateHistory[]> {
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
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      const history: FundingRateHistory[] = data.map((item: any) => ({
        timestamp: item.fundingTime,
        rate: parseFloat(item.fundingRate) * 100
      }));

      this.cache.set(cacheKey, { data: history, timestamp: Date.now() });
      return history;
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      
      if (cached) {
        return cached.data;
      }
      
      return [];
    }
  }

  /**
   * Predict next funding rate using weighted moving average and trend analysis
   */
  private predictNextFundingRate(history: FundingRateHistory[], currentRate: number): number {
    if (history.length < 3) return currentRate;

    // Use last 10 funding periods for prediction
    const recentRates = history.slice(0, 10).map(h => h.rate);
    
    // Weighted moving average (more weight to recent rates)
    let weightedSum = 0;
    let weightTotal = 0;
    
    recentRates.forEach((rate, index) => {
      const weight = recentRates.length - index; // More recent = higher weight
      weightedSum += rate * weight;
      weightTotal += weight;
    });
    
    const wma = weightedSum / weightTotal;
    
    // Calculate trend
    const oldAvg = recentRates.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
    const newAvg = recentRates.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const trendFactor = (newAvg - oldAvg) / 2;
    
    // Prediction: 70% weighted average, 30% trend continuation
    const predicted = (wma * 0.7) + ((currentRate + trendFactor) * 0.3);
    
    return parseFloat(predicted.toFixed(4));
  }

  /**
   * Calculate statistics from history
   */
  private calculateStats(history: FundingRateHistory[]) {
    if (history.length === 0) {
      return { avg24h: 0, avg7d: 0, trend: 'stable' as const };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const last24h = history.filter(h => h.timestamp >= oneDayAgo);
    const last7d = history.filter(h => h.timestamp >= sevenDaysAgo);

    const avg24h = last24h.length > 0
      ? last24h.reduce((sum, h) => sum + h.rate, 0) / last24h.length
      : 0;

    const avg7d = last7d.length > 0
      ? last7d.reduce((sum, h) => sum + h.rate, 0) / last7d.length
      : 0;

    // Determine trend
    const recentAvg = history.slice(0, 3).reduce((sum, h) => sum + h.rate, 0) / 3;
    const olderAvg = history.slice(3, 6).reduce((sum, h) => sum + h.rate, 0) / 3;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

    return { avg24h, avg7d, trend };
  }

  /**
   * Get coin name from symbol
   */
  private getCoinName(symbol: string): string {
    const baseName = this.symbolToNameMap.get(symbol);
    if (baseName) return baseName;
    
    // Fallback: extract from symbol (BTCUSDT -> BTC)
    return symbol.replace('USDT', '').replace('1000', '');
  }

  /**
   * Format funding rate with color
   */
  formatFundingRate(rate: number, includeSign = true): string {
    const formatted = Math.abs(rate).toFixed(4);
    if (!includeSign) return `${formatted}%`;
    return rate >= 0 ? `+${formatted}%` : `-${formatted}%`;
  }

  /**
   * Get color based on funding rate
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
   * Get background color based on funding rate
   */
  getFundingRateBg(rate: number): string {
    if (rate > 0.05) return 'bg-green-500/10';
    if (rate > 0.01) return 'bg-green-400/10';
    if (rate > 0) return 'bg-green-300/10';
    if (rate > -0.01) return 'bg-red-300/10';
    if (rate > -0.05) return 'bg-red-400/10';
    return 'bg-red-500/10';
  }

  /**
   * Calculate annualized rate (APR)
   */
  calculateAPR(rate: number): number {
    return rate * 3 * 365; // 3 funding periods per day, 365 days
  }

  /**
   * Calculate daily rate
   */
  calculateDailyRate(rate: number): number {
    return rate * 3; // 3 funding periods per day
  }

  /**
   * Get time until next funding in a human-readable format
   */
  getTimeUntilFunding(nextFundingTime: number): { hours: number; minutes: number; seconds: number; total: number } {
    const now = Date.now();
    const diff = Math.max(0, nextFundingTime - now);
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: diff };
  }
}

export const enhancedFundingRateService = new EnhancedFundingRateService();
