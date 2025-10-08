// Service for fetching market sentiment indices

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

class MarketIndicesService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getFearGreedIndex(): Promise<FearGreedData> {
    const cacheKey = 'fear-greed';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();
      const result = data.data[0];
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      throw error;
    }
  }

  async getAltcoinSeasonIndex(): Promise<AltcoinSeasonData> {
    const cacheKey = 'altcoin-season';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Blockchaincenter.net altcoin season index
      const response = await fetch('https://api.blockchaincenter.net/v1/altcoin-season-index');
      const data = await response.json();
      
      const value = parseInt(data.data.value);
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
      throw error;
    }
  }

  async getBitcoinDominance(): Promise<BitcoinDominanceData> {
    const cacheKey = 'btc-dominance';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/global');
      const data = await response.json();
      const value = data.data.market_cap_percentage.btc;
      
      const result = { value };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error fetching Bitcoin Dominance:', error);
      throw error;
    }
  }
}

export const marketIndicesService = new MarketIndicesService();
