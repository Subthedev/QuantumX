// Service for fetching market sentiment indices with historical data

export interface HistoricalPoint {
  timestamp: number;
  value: number;
  classification?: string;
}

export interface FearGreedData {
  value: string;
  value_classification: string;
  timestamp: string;
}

export interface AltcoinSeasonData {
  value: number;
  classification: string;
}

export interface BitcoinDominanceData {
  value: number;
}

export interface EnhancedIndexData<T> {
  current: T;
  history: HistoricalPoint[];
  trend24h: number | null;
  trend7d: number | null;
  trend30d: number | null;
  percentile: number | null;
  lastUpdated: number;
}

class MarketIndicesService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - production-optimized
  private MAX_RETRIES = 2; // Reduced retries for faster failure
  private RETRY_DELAY = 500; // Faster retry delay
  private TIMEOUT = 5000; // 5 second timeout per request

  private async fetchWithTimeout(url: string, timeout = this.TIMEOUT): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async retryFetch(
    url: string,
    options?: RequestInit,
    retries = this.MAX_RETRIES
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.fetchWithTimeout(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Fear & Greed Index with historical data
  async getFearGreedIndex(): Promise<FearGreedData> {
    const cacheKey = 'fear-greed';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await this.retryFetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();
      const result = data.data[0];

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      // Return cached data if available, even if stale
      if (cached) {
        console.warn('Using stale cached data for Fear & Greed');
        return cached.data;
      }
      throw new Error('Failed to fetch Fear & Greed Index. Please try again later.');
    }
  }

  async getFearGreedHistory(days: 7 | 30 | 90 | 365 = 30): Promise<HistoricalPoint[]> {
    const cacheKey = `fear-greed-history-${days}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await this.retryFetch(`https://api.alternative.me/fng/?limit=${days}`);
      const data = await response.json();

      const history: HistoricalPoint[] = data.data.map((item: any) => ({
        timestamp: parseInt(item.timestamp) * 1000,
        value: parseInt(item.value),
        classification: item.value_classification,
      })).reverse(); // Oldest first

      this.cache.set(cacheKey, { data: history, timestamp: Date.now() });
      return history;
    } catch (error) {
      console.error('Error fetching Fear & Greed history:', error);
      if (cached) return cached.data;
      return []; // Return empty array instead of throwing
    }
  }

  // Altcoin Season Index with fallback
  async getAltcoinSeasonIndex(): Promise<AltcoinSeasonData> {
    const cacheKey = 'altcoin-season';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Try direct CoinGecko API approach (calculate from market caps)
      const response = await this.retryFetch('https://api.coingecko.com/api/v3/global');
      const data = await response.json();

      // Calculate altcoin season based on BTC dominance
      // Lower BTC dominance = Higher altcoin season score
      const btcDom = data.data.market_cap_percentage.btc;
      const ethDom = data.data.market_cap_percentage.eth || 0;

      // Simple altcoin season calculation:
      // If BTC dom < 40%: Strong altcoin season
      // If BTC dom 40-60%: Neutral/transitioning
      // If BTC dom > 60%: Bitcoin season
      const altcoinStrength = Math.max(0, Math.min(100, 100 - btcDom + ethDom/2));
      const value = Math.round(altcoinStrength);

      let classification = 'Neutral';
      if (value >= 75) {
        classification = 'Altcoin Season';
      } else if (value >= 50) {
        classification = 'Neutral';
      } else {
        classification = 'Bitcoin Season';
      }

      const result = { value, classification };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching Altcoin Season Index:', error);
      if (cached) {
        console.warn('Using stale cached data for Altcoin Season');
        return cached.data;
      }
      // Fallback to neutral if all else fails
      return { value: 50, classification: 'Neutral (Unavailable)' };
    }
  }

  async getAltcoinSeasonHistory(days: 30 | 90 | 365 = 90): Promise<HistoricalPoint[]> {
    // Since we don't have a direct API, we'll return empty for now
    // In production, you'd want to store this data or use a paid API
    const cacheKey = `altcoin-season-history-${days}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached.data;

    // Return empty array - this feature requires data storage
    return [];
  }

  // Bitcoin Dominance with historical data
  async getBitcoinDominance(): Promise<BitcoinDominanceData> {
    const cacheKey = 'btc-dominance';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await this.retryFetch('https://api.coingecko.com/api/v3/global');
      const data = await response.json();
      const value = data.data.market_cap_percentage.btc;

      const result = { value };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching Bitcoin Dominance:', error);
      if (cached) {
        console.warn('Using stale cached data for Bitcoin Dominance');
        return cached.data;
      }
      throw new Error('Failed to fetch Bitcoin Dominance. Please try again later.');
    }
  }

  async getBitcoinDominanceHistory(days: 7 | 30 | 90 = 30): Promise<HistoricalPoint[]> {
    // CoinGecko free API doesn't provide historical dominance
    // Would need CoinGecko Pro API or alternative source
    // For now, return empty array
    return [];
  }

  // Calculate trend from historical data
  calculateTrend(history: HistoricalPoint[], hours: number): number | null {
    if (history.length === 0) return null;

    const now = Date.now();
    const cutoff = now - (hours * 60 * 60 * 1000);
    const recent = history.filter(p => p.timestamp >= cutoff);

    if (recent.length < 2) return null;

    const oldest = recent[0].value;
    const newest = recent[recent.length - 1].value;

    return ((newest - oldest) / oldest) * 100;
  }

  // Calculate percentile (what % of historical values are below current)
  calculatePercentile(currentValue: number, history: HistoricalPoint[]): number | null {
    if (history.length === 0) return null;

    const values = history.map(p => p.value);
    const belowCurrent = values.filter(v => v < currentValue).length;

    return (belowCurrent / values.length) * 100;
  }

  // Get enhanced data with trends and context - OPTIMIZED
  async getEnhancedFearGreed(): Promise<EnhancedIndexData<FearGreedData>> {
    const current = await this.getFearGreedIndex();
    const history = await this.getFearGreedHistory(30); // Reduced from 90 to 30 days for faster loading

    const currentValue = parseInt(current.value);

    return {
      current,
      history,
      trend24h: this.calculateTrend(history, 24),
      trend7d: this.calculateTrend(history, 24 * 7),
      trend30d: this.calculateTrend(history, 24 * 30),
      percentile: this.calculatePercentile(currentValue, history),
      lastUpdated: Date.now(),
    };
  }

  async getEnhancedAltcoinSeason(): Promise<EnhancedIndexData<AltcoinSeasonData>> {
    try {
      const current = await this.getAltcoinSeasonIndex();
      const history = await this.getAltcoinSeasonHistory(90);

      return {
        current,
        history,
        trend24h: null,
        trend7d: null,
        trend30d: null,
        percentile: null,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      // Provide fallback data if API fails
      console.error('Altcoin Season fallback activated:', error);
      return {
        current: { value: 50, classification: 'Neutral (Unavailable)' },
        history: [],
        trend24h: null,
        trend7d: null,
        trend30d: null,
        percentile: null,
        lastUpdated: Date.now(),
      };
    }
  }

  async getEnhancedBitcoinDominance(): Promise<EnhancedIndexData<BitcoinDominanceData>> {
    try {
      const current = await this.getBitcoinDominance();
      const history = await this.getBitcoinDominanceHistory(90);

      return {
        current,
        history,
        trend24h: null,
        trend7d: null,
        trend30d: null,
        percentile: null,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      // Provide fallback with reasonable BTC dominance estimate
      console.error('Bitcoin Dominance fallback activated:', error);
      return {
        current: { value: 54.2 }, // Reasonable fallback value
        history: [],
        trend24h: null,
        trend7d: null,
        trend30d: null,
        percentile: null,
        lastUpdated: Date.now(),
      };
    }
  }

  // Clear cache manually
  clearCache() {
    this.cache.clear();
  }

  // Get cache status for debugging
  getCacheStatus() {
    const status: Record<string, any> = {};
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      status[key] = {
        age: `${Math.round(age / 1000)}s`,
        stale: age > this.CACHE_DURATION,
      };
    });
    return status;
  }
}

export const marketIndicesService = new MarketIndicesService();
