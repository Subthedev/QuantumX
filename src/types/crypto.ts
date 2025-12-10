// TypeScript interfaces for cryptocurrency data
export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number | null;
  max_supply?: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated?: string;
  sparkline_in_7d?: {
    price: number[];
  };
  price_change_percentage_7d_in_currency?: number;
}

export interface DetailedCoinData {
  id: string;
  symbol: string;
  name: string;
  description?: {
    en: string;
  };
  links?: {
    homepage?: string[];
    blockchain_site?: string[];
    official_forum_url?: string[];
    chat_url?: string[];
    twitter_screen_name?: string;
    repos_url?: {
      github?: string[];
    };
  };
  market_data?: {
    price_change_percentage_1h_in_currency?: {
      usd?: number;
    };
    price_change_percentage_30d?: number;
    price_change_percentage_1y?: number;
    market_cap_dominance?: number;
  };
  genesis_date?: string;
  hashing_algorithm?: string;
  asset_platform_id?: string;
  categories?: string[];
}

export interface EnhancedMarketData {
  socialMetrics?: {
    twitterFollowers: number;
    sentimentScore: number;
    communityScore: number;
  };
  developerMetrics?: {
    githubStars: number;
    githubForks: number;
    commits4Weeks: number;
    developerScore: number;
  };
}

export interface PriceChange {
  period: string;
  value: number | undefined;
}
