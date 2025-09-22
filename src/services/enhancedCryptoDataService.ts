class EnhancedCryptoDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute
  private COINGECKO_API = 'https://api.coingecko.com/api/v3';

  async getDetailedMarketData(coinId: string) {
    const cacheKey = `detailed-${coinId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Fetch comprehensive data
      const [coinDetails, tickers, globalData] = await Promise.all([
        this.fetchCoinDetails(coinId),
        this.fetchTickers(coinId),
        this.fetchGlobalData()
      ]);

      const enrichedData = {
        ...coinDetails,
        tickers,
        globalStats: globalData,
        technicalIndicators: this.calculateTechnicalIndicators(coinDetails),
        onChainMetrics: this.extractOnChainMetrics(coinDetails),
        socialMetrics: this.extractSocialMetrics(coinDetails),
        developerMetrics: this.extractDeveloperMetrics(coinDetails)
      };

      this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
      return enrichedData;
    } catch (error) {
      console.error('Error fetching detailed market data:', error);
      throw error;
    }
  }

  private async fetchCoinDetails(coinId: string) {
    const response = await fetch(
      `${this.COINGECKO_API}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`
    );
    return response.json();
  }

  private async fetchTickers(coinId: string) {
    const response = await fetch(
      `${this.COINGECKO_API}/coins/${coinId}/tickers?include_exchange_logo=true`
    );
    const data = await response.json();
    return data.tickers?.slice(0, 10) || []; // Top 10 exchanges
  }

  private async fetchGlobalData() {
    const response = await fetch(`${this.COINGECKO_API}/global`);
    const data = await response.json();
    return data.data;
  }

  private calculateTechnicalIndicators(coinData: any) {
    const marketData = coinData.market_data;
    if (!marketData) return null;

    const current = marketData.current_price?.usd || 0;
    const ath = marketData.ath?.usd || 0;
    const atl = marketData.atl?.usd || 0;
    
    return {
      priceScore: this.calculatePriceScore(current, ath, atl),
      volatility: this.calculateVolatility(marketData),
      momentum: this.calculateMomentum(marketData),
      volumeProfile: this.analyzeVolumeProfile(marketData),
      supportResistance: {
        strongSupport: atl * 1.2,
        support: marketData.low_24h?.usd || 0,
        resistance: marketData.high_24h?.usd || 0,
        strongResistance: ath * 0.8
      }
    };
  }

  private calculatePriceScore(current: number, ath: number, atl: number): number {
    if (!ath || !atl || ath === atl) return 50;
    return ((current - atl) / (ath - atl)) * 100;
  }

  private calculateVolatility(marketData: any): string {
    const high24h = marketData.high_24h?.usd || 0;
    const low24h = marketData.low_24h?.usd || 0;
    const current = marketData.current_price?.usd || 1;
    
    const range = ((high24h - low24h) / current) * 100;
    
    if (range < 5) return 'Low';
    if (range < 10) return 'Medium';
    if (range < 20) return 'High';
    return 'Extreme';
  }

  private calculateMomentum(marketData: any): string {
    const change24h = marketData.price_change_percentage_24h || 0;
    const change7d = marketData.price_change_percentage_7d || 0;
    const change30d = marketData.price_change_percentage_30d || 0;
    
    const avgChange = (change24h + change7d + change30d) / 3;
    
    if (avgChange > 10) return 'Strong Bullish';
    if (avgChange > 0) return 'Bullish';
    if (avgChange > -10) return 'Bearish';
    return 'Strong Bearish';
  }

  private analyzeVolumeProfile(marketData: any): string {
    const volume = marketData.total_volume?.usd || 0;
    const marketCap = marketData.market_cap?.usd || 1;
    const ratio = (volume / marketCap) * 100;
    
    if (ratio < 5) return 'Very Low';
    if (ratio < 10) return 'Low';
    if (ratio < 25) return 'Normal';
    if (ratio < 50) return 'High';
    return 'Very High';
  }

  private extractOnChainMetrics(coinData: any) {
    const marketData = coinData.market_data;
    if (!marketData) return null;

    return {
      circulatingSupplyRatio: marketData.circulating_supply && marketData.max_supply
        ? (marketData.circulating_supply / marketData.max_supply) * 100
        : null,
      marketCapDominance: marketData.market_cap_dominance || 0,
      fullyDilutedValuation: marketData.fully_diluted_valuation?.usd || 0,
      totalValueLocked: marketData.total_value_locked?.usd || null
    };
  }

  private extractSocialMetrics(coinData: any) {
    const communityData = coinData.community_data;
    const sentimentVotes = coinData.sentiment_votes_up_percentage || 50;
    
    return {
      twitterFollowers: communityData?.twitter_followers || 0,
      redditSubscribers: communityData?.reddit_subscribers || 0,
      telegramUsers: communityData?.telegram_channel_user_count || 0,
      sentimentScore: sentimentVotes,
      publicInterestScore: coinData.public_interest_score || 0,
      communityScore: coinData.community_score || 0
    };
  }

  private extractDeveloperMetrics(coinData: any) {
    const devData = coinData.developer_data;
    if (!devData) return null;

    return {
      githubStars: devData.stars || 0,
      githubForks: devData.forks || 0,
      commits4Weeks: devData.commit_count_4_weeks || 0,
      codeAdditions4Weeks: devData.code_additions_deletions_4_weeks?.additions || 0,
      codeDeletions4Weeks: devData.code_additions_deletions_4_weeks?.deletions || 0,
      developerScore: coinData.developer_score || 0
    };
  }

  formatLargeNumber(num: number): string {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  }
}

export const enhancedCryptoDataService = new EnhancedCryptoDataService();