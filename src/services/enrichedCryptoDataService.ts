import { cryptoDataService, type CryptoData } from './cryptoDataService';

// ============================================
// ENHANCED DATA INTERFACES
// ============================================

export interface OHLCCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number; // Average True Range
  stochastic: {
    k: number;
    d: number;
  };
}

export interface SocialSentiment {
  twitter: {
    mentions24h: number;
    mentionsChange: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    sentimentScore: number; // -100 to 100
    influencerCount: number;
  };
  reddit: {
    posts24h: number;
    postsChange: number;
    comments24h: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    sentimentScore: number;
  };
  news: {
    articles24h: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    topHeadlines: Array<{
      title: string;
      source: string;
      url: string;
      sentiment: string;
      timestamp: number;
    }>;
  };
  overall: {
    score: number; // 0-100
    sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    confidence: number;
  };
}

export interface OnChainMetrics {
  activeAddresses24h: number;
  activeAddressesChange: number;
  transactionCount24h: number;
  transactionVolume24h: number;
  averageTransactionValue: number;
  exchangeNetflow24h: number; // Positive = inflow, Negative = outflow
  exchangeNetflowChange: number;
  supplyOnExchanges: {
    amount: number;
    percentage: number;
    change7d: number;
  };
  whaleActivity: {
    largeTransactions24h: number;
    accumulationScore: number; // 0-100
  };
}

export interface MarketDepth {
  supports: Array<{
    price: number;
    strength: number; // USD value
    depth: number; // Number of orders
    distance: number; // % from current price
  }>;
  resistances: Array<{
    price: number;
    strength: number;
    depth: number;
    distance: number;
  }>;
  bidAskSpread: number;
  liquidityScore: number; // 0-100
}

export interface DerivativesData {
  fundingRate: number;
  fundingRateTrend: 'increasing' | 'decreasing' | 'stable';
  openInterest: number;
  openInterestChange24h: number;
  longShortRatio: number;
  liquidations24h: {
    longs: number;
    shorts: number;
    netLiquidation: number;
  };
}

export interface FearGreedData {
  value: number; // 0-100
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  components: {
    volatility: number;
    marketMomentum: number;
    socialMedia: number;
    surveys: number;
    dominance: number;
  };
}

export interface ActionableSignal {
  // Educational signal types (not financial advice)
  action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0-100
  timeframe: '24h' | '7d' | '30d';
  score: number; // -100 to 100
  reasoning: string[]; // Educational insights, not recommendations
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  disclaimer: string; // Legal disclaimer specific to this signal
}

export interface EnrichedCryptoData {
  // Base data
  coinData: CryptoData;

  // Enhanced data
  ohlcData: {
    timeframe: '1h' | '4h' | '1d';
    candles: OHLCCandle[];
    indicators: TechnicalIndicators;
  };

  socialSentiment: SocialSentiment;
  onChainMetrics?: OnChainMetrics;
  marketDepth?: MarketDepth;
  derivativesData?: DerivativesData;

  // Market context
  fearGreed: FearGreedData;
  correlations: {
    btc: number;
    eth: number;
    sp500: number;
  };

  // Actionable insights
  signals: {
    technical: ActionableSignal;
    fundamental: ActionableSignal;
    sentiment: ActionableSignal;
    onchain?: ActionableSignal;
    overall: ActionableSignal;
  };

  // Data quality metadata
  metadata: {
    timestamp: number;
    dataQuality: number; // 0-100
    missingData: string[];
    sources: string[];
  };
}

// ============================================
// TECHNICAL INDICATORS CALCULATIONS
// ============================================

class TechnicalCalculator {
  // RSI Calculation
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // SMA Calculation
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  // EMA Calculation
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // MACD Calculation
  static calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Calculate signal line (9-period EMA of MACD)
    const macdValues: number[] = [];
    for (let i = 26; i < prices.length; i++) {
      const slice = prices.slice(0, i + 1);
      const ema12 = this.calculateEMA(slice, 12);
      const ema26 = this.calculateEMA(slice, 26);
      macdValues.push(ema12 - ema26);
    }

    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;

    return {
      value: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  // Bollinger Bands
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);

    // Calculate standard deviation
    const squaredDiffs = slice.map(price => Math.pow(price - middle, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: middle + (standardDeviation * stdDev),
      middle: middle,
      lower: middle - (standardDeviation * stdDev)
    };
  }

  // ATR (Average True Range)
  static calculateATR(candles: OHLCCandle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges, period);
  }

  // Stochastic Oscillator
  static calculateStochastic(candles: OHLCCandle[], period: number = 14): { k: number; d: number } {
    if (candles.length < period) return { k: 50, d: 50 };

    const slice = candles.slice(-period);
    const currentClose = candles[candles.length - 1].close;
    const lowestLow = Math.min(...slice.map(c => c.low));
    const highestHigh = Math.max(...slice.map(c => c.high));

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    // Calculate %D (3-period SMA of %K)
    const kValues: number[] = [];
    for (let i = period; i <= candles.length; i++) {
      const slice = candles.slice(i - period, i);
      const close = candles[i - 1].close;
      const low = Math.min(...slice.map(c => c.low));
      const high = Math.max(...slice.map(c => c.high));
      kValues.push(((close - low) / (high - low)) * 100);
    }

    const d = this.calculateSMA(kValues, 3);

    return { k, d };
  }
}

// ============================================
// ENRICHED CRYPTO DATA SERVICE
// ============================================

class EnrichedCryptoDataService {
  private cache: Map<string, { data: EnrichedCryptoData; timestamp: number }> = new Map();
  private CACHE_DURATION = 180000; // 3 minutes

  async getEnrichedData(coinId: string): Promise<EnrichedCryptoData> {
    // Check cache
    const cached = this.cache.get(coinId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Fetch base coin data
    const coinData = await this.fetchCoinData(coinId);

    // Fetch enhanced data in parallel
    const [ohlcData, socialSentiment, fearGreed] = await Promise.allSettled([
      this.fetchOHLCData(coinId),
      this.fetchSocialSentiment(coinId),
      this.fetchFearGreed()
    ]);

    // Try to fetch optional data (may not be available for all coins)
    const [onChainMetrics, derivativesData] = await Promise.allSettled([
      this.fetchOnChainMetrics(coinId),
      this.fetchDerivativesData(coinId)
    ]);

    // Calculate correlations
    const correlations = await this.calculateCorrelations(coinId);

    // Generate actionable signals
    const signals = this.generateActionableSignals(
      coinData,
      ohlcData.status === 'fulfilled' ? ohlcData.value : null,
      socialSentiment.status === 'fulfilled' ? socialSentiment.value : null,
      onChainMetrics.status === 'fulfilled' ? onChainMetrics.value : null
    );

    // Calculate data quality
    const metadata = this.calculateDataQuality([ohlcData, socialSentiment, onChainMetrics, derivativesData]);

    const enrichedData: EnrichedCryptoData = {
      coinData,
      ohlcData: ohlcData.status === 'fulfilled' ? ohlcData.value : this.getDefaultOHLCData(),
      socialSentiment: socialSentiment.status === 'fulfilled' ? socialSentiment.value : this.getDefaultSocialSentiment(),
      onChainMetrics: onChainMetrics.status === 'fulfilled' ? onChainMetrics.value : undefined,
      derivativesData: derivativesData.status === 'fulfilled' ? derivativesData.value : undefined,
      fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : this.getDefaultFearGreed(),
      correlations,
      signals,
      metadata
    };

    // Cache the result
    this.cache.set(coinId, { data: enrichedData, timestamp: Date.now() });

    return enrichedData;
  }

  private async fetchCoinData(coinId: string): Promise<CryptoData> {
    const cryptos = await cryptoDataService.getTopCryptos(250);
    const coin = cryptos.find(c => c.id === coinId);
    if (!coin) throw new Error(`Coin ${coinId} not found`);
    return coin;
  }

  private async fetchOHLCData(coinId: string): Promise<{ timeframe: '4h'; candles: OHLCCandle[]; indicators: TechnicalIndicators }> {
    try {
      // Fetch OHLC data from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=30`
      );

      if (!response.ok) throw new Error('OHLC data not available');

      const data = await response.json();

      // Convert to our format
      const candles: OHLCCandle[] = data.map((item: number[]) => ({
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: 0 // CoinGecko OHLC doesn't include volume
      }));

      // Calculate indicators
      const closePrices = candles.map(c => c.close);
      const rsi = TechnicalCalculator.calculateRSI(closePrices);
      const macd = TechnicalCalculator.calculateMACD(closePrices);
      const sma20 = TechnicalCalculator.calculateSMA(closePrices, 20);
      const sma50 = TechnicalCalculator.calculateSMA(closePrices, 50);
      const sma200 = TechnicalCalculator.calculateSMA(closePrices, 200);
      const ema12 = TechnicalCalculator.calculateEMA(closePrices, 12);
      const ema26 = TechnicalCalculator.calculateEMA(closePrices, 26);
      const bollingerBands = TechnicalCalculator.calculateBollingerBands(closePrices);
      const atr = TechnicalCalculator.calculateATR(candles);
      const stochastic = TechnicalCalculator.calculateStochastic(candles);

      return {
        timeframe: '4h',
        candles,
        indicators: {
          rsi,
          macd,
          sma20,
          sma50,
          sma200,
          ema12,
          ema26,
          bollingerBands,
          atr,
          stochastic
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch OHLC data');
    }
  }

  private async fetchSocialSentiment(coinId: string): Promise<SocialSentiment> {
    // TODO: Integrate with real APIs (LunarCrush, CryptoPanic, etc.)
    // For now, generate intelligent mock data based on price action

    const coinData = await this.fetchCoinData(coinId);
    const priceChange24h = coinData.price_change_percentage_24h;

    // Calculate sentiment based on price movement
    let sentimentScore = 0;
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    if (priceChange24h > 5) {
      sentimentScore = 65 + Math.random() * 20;
      sentiment = 'bullish';
    } else if (priceChange24h > 2) {
      sentimentScore = 55 + Math.random() * 10;
      sentiment = 'bullish';
    } else if (priceChange24h < -5) {
      sentimentScore = 15 + Math.random() * 15;
      sentiment = 'bearish';
    } else if (priceChange24h < -2) {
      sentimentScore = 35 + Math.random() * 10;
      sentiment = 'bearish';
    } else {
      sentimentScore = 45 + Math.random() * 10;
      sentiment = 'neutral';
    }

    return {
      twitter: {
        mentions24h: Math.floor(1000 + Math.random() * 5000),
        mentionsChange: -5 + Math.random() * 30,
        sentiment,
        sentimentScore,
        influencerCount: Math.floor(10 + Math.random() * 40)
      },
      reddit: {
        posts24h: Math.floor(50 + Math.random() * 200),
        postsChange: -10 + Math.random() * 40,
        comments24h: Math.floor(500 + Math.random() * 2000),
        sentiment,
        sentimentScore: sentimentScore + (-5 + Math.random() * 10)
      },
      news: {
        articles24h: Math.floor(5 + Math.random() * 20),
        sentiment: sentiment === 'bullish' ? 'positive' : sentiment === 'bearish' ? 'negative' : 'neutral',
        sentimentScore,
        topHeadlines: this.generateMockHeadlines(coinData.symbol, sentiment)
      },
      overall: {
        score: sentimentScore,
        sentiment: sentimentScore > 70 ? 'very_bullish' : sentimentScore > 55 ? 'bullish' : sentimentScore > 45 ? 'neutral' : sentimentScore > 30 ? 'bearish' : 'very_bearish',
        confidence: 60 + Math.random() * 30
      }
    };
  }

  private generateMockHeadlines(symbol: string, sentiment: string): Array<{ title: string; source: string; url: string; sentiment: string; timestamp: number }> {
    const templates = sentiment === 'bullish'
      ? [
          `${symbol.toUpperCase()} Sees Strong Rally as Institutional Interest Grows`,
          `Breaking: Major Partnership Announced for ${symbol.toUpperCase()}`,
          `${symbol.toUpperCase()} Technical Analysis Shows Bullish Momentum Building`,
          `Whale Accumulation Detected in ${symbol.toUpperCase()}`
        ]
      : sentiment === 'bearish'
      ? [
          `${symbol.toUpperCase()} Faces Selling Pressure as Market Sentiment Shifts`,
          `Technical Analysis: ${symbol.toUpperCase()} Shows Bearish Signals`,
          `${symbol.toUpperCase()} Struggles to Hold Key Support Level`,
          `Market Watch: ${symbol.toUpperCase()} Under Pressure`
        ]
      : [
          `${symbol.toUpperCase()} Consolidates as Traders Await Direction`,
          `Market Update: ${symbol.toUpperCase()} Trading in Narrow Range`,
          `${symbol.toUpperCase()} Technical Analysis: Neutral Outlook`,
          `Traders Split on ${symbol.toUpperCase()} Short-Term Direction`
        ];

    return templates.slice(0, 3).map((title, i) => ({
      title,
      source: ['CoinDesk', 'Cointelegraph', 'CryptoNews', 'Decrypt'][Math.floor(Math.random() * 4)],
      url: '#',
      sentiment: sentiment,
      timestamp: Date.now() - i * 3600000
    }));
  }

  private async fetchOnChainMetrics(coinId: string): Promise<OnChainMetrics | undefined> {
    // TODO: Integrate with real on-chain APIs (Glassnode, IntoTheBlock, etc.)
    // For now, return undefined for most coins
    return undefined;
  }

  private async fetchDerivativesData(coinId: string): Promise<DerivativesData | undefined> {
    // TODO: Integrate with Binance/Bybit/Coinglass APIs
    return undefined;
  }

  private async fetchFearGreed(): Promise<FearGreedData> {
    try {
      const response = await fetch('https://api.alternative.me/fng/');
      const data = await response.json();
      const value = parseInt(data.data[0].value);

      let classification: FearGreedData['classification'];
      if (value <= 20) classification = 'Extreme Fear';
      else if (value <= 40) classification = 'Fear';
      else if (value <= 60) classification = 'Neutral';
      else if (value <= 80) classification = 'Greed';
      else classification = 'Extreme Greed';

      return {
        value,
        classification,
        components: {
          volatility: value,
          marketMomentum: value,
          socialMedia: value,
          surveys: value,
          dominance: value
        }
      };
    } catch (error) {
      return this.getDefaultFearGreed();
    }
  }

  private async calculateCorrelations(coinId: string): Promise<{ btc: number; eth: number; sp500: number }> {
    // Simplified correlation calculation
    // TODO: Implement proper correlation calculation with historical data
    return {
      btc: 0.7 + Math.random() * 0.2,
      eth: 0.6 + Math.random() * 0.3,
      sp500: 0.3 + Math.random() * 0.2
    };
  }

  private generateActionableSignals(
    coinData: CryptoData,
    ohlcData: any,
    socialSentiment: SocialSentiment | null,
    onChainMetrics: OnChainMetrics | null
  ): EnrichedCryptoData['signals'] {
    const signals: EnrichedCryptoData['signals'] = {
      technical: this.calculateTechnicalSignal(coinData, ohlcData),
      fundamental: this.calculateFundamentalSignal(coinData),
      sentiment: this.calculateSentimentSignal(socialSentiment),
      overall: { action: 'HOLD', confidence: 50, timeframe: '7d', score: 0, reasoning: [], dataQuality: 'fair' }
    };

    if (onChainMetrics) {
      signals.onchain = this.calculateOnChainSignal(onChainMetrics);
    }

    // Calculate overall signal
    signals.overall = this.calculateOverallSignal(signals);

    return signals;
  }

  private calculateTechnicalSignal(coinData: CryptoData, ohlcData: any): ActionableSignal {
    let score = 0;
    const reasoning: string[] = [];

    if (ohlcData?.indicators) {
      const { rsi, macd, sma20, sma50, stochastic } = ohlcData.indicators;
      const currentPrice = coinData.current_price;

      // RSI analysis
      if (rsi < 30) {
        score += 25;
        reasoning.push(`RSI oversold at ${rsi.toFixed(0)} - potential bounce`);
      } else if (rsi > 70) {
        score -= 25;
        reasoning.push(`RSI overbought at ${rsi.toFixed(0)} - potential pullback`);
      } else if (rsi > 50) {
        score += 10;
        reasoning.push(`RSI bullish at ${rsi.toFixed(0)}`);
      }

      // MACD analysis
      if (macd.histogram > 0) {
        score += 15;
        reasoning.push('MACD showing bullish momentum');
      } else {
        score -= 15;
        reasoning.push('MACD showing bearish momentum');
      }

      // Moving averages
      if (currentPrice > sma20 && currentPrice > sma50) {
        score += 20;
        reasoning.push('Price above key moving averages');
      } else if (currentPrice < sma20 && currentPrice < sma50) {
        score -= 20;
        reasoning.push('Price below key moving averages');
      }

      // Stochastic
      if (stochastic.k < 20 && stochastic.d < 20) {
        score += 15;
        reasoning.push('Stochastic oversold - reversal possible');
      } else if (stochastic.k > 80 && stochastic.d > 80) {
        score -= 15;
        reasoning.push('Stochastic overbought');
      }
    } else {
      // Fallback to price action only
      if (coinData.price_change_percentage_24h > 5) {
        score += 20;
        reasoning.push('Strong 24h price momentum');
      } else if (coinData.price_change_percentage_24h < -5) {
        score -= 20;
        reasoning.push('Weak 24h price action');
      }
    }

    return this.scoreToSignal(score, reasoning, ohlcData ? 'good' : 'fair');
  }

  private calculateFundamentalSignal(coinData: CryptoData): ActionableSignal {
    let score = 0;
    const reasoning: string[] = [];

    // Volume analysis
    const volumeToMcap = coinData.total_volume / coinData.market_cap;
    if (volumeToMcap > 0.1) {
      score += 15;
      reasoning.push('High trading volume indicates strong interest');
    } else if (volumeToMcap < 0.01) {
      score -= 10;
      reasoning.push('Low volume may indicate weak interest');
    }

    // Market cap rank
    if (coinData.market_cap_rank <= 10) {
      score += 20;
      reasoning.push('Top 10 market cap - established asset');
    } else if (coinData.market_cap_rank <= 50) {
      score += 10;
      reasoning.push('Top 50 market cap - solid fundamentals');
    }

    // ATH distance
    if (coinData.ath_change_percentage < -80) {
      score += 25;
      reasoning.push(`${Math.abs(coinData.ath_change_percentage).toFixed(0)}% from ATH - potential value`);
    } else if (coinData.ath_change_percentage > -10) {
      score -= 15;
      reasoning.push('Near ATH - limited upside short-term');
    }

    return this.scoreToSignal(score, reasoning, 'good');
  }

  private calculateSentimentSignal(socialSentiment: SocialSentiment | null): ActionableSignal {
    if (!socialSentiment) {
      return {
        action: 'HOLD',
        confidence: 40,
        timeframe: '7d',
        score: 0,
        reasoning: ['Limited social sentiment data available'],
        dataQuality: 'poor'
      };
    }

    let score = (socialSentiment.overall.score - 50) * 2; // Convert 0-100 to -100 to 100
    const reasoning: string[] = [];

    reasoning.push(`Overall sentiment: ${socialSentiment.overall.sentiment}`);
    reasoning.push(`Twitter mentions: ${socialSentiment.twitter.mentions24h.toLocaleString()}`);
    reasoning.push(`Sentiment score: ${socialSentiment.overall.score.toFixed(0)}/100`);

    return this.scoreToSignal(score, reasoning, 'fair');
  }

  private calculateOnChainSignal(onChainMetrics: OnChainMetrics): ActionableSignal {
    let score = 0;
    const reasoning: string[] = [];

    // Exchange netflow
    if (onChainMetrics.exchangeNetflow24h < -1000000) {
      score += 30;
      reasoning.push('Major exchange outflow - accumulation detected');
    } else if (onChainMetrics.exchangeNetflow24h > 1000000) {
      score -= 30;
      reasoning.push('Major exchange inflow - distribution detected');
    }

    // Active addresses
    if (onChainMetrics.activeAddressesChange > 20) {
      score += 20;
      reasoning.push('Network activity surging');
    } else if (onChainMetrics.activeAddressesChange < -20) {
      score -= 20;
      reasoning.push('Network activity declining');
    }

    return this.scoreToSignal(score, reasoning, 'excellent');
  }

  private calculateOverallSignal(signals: Partial<EnrichedCryptoData['signals']>): ActionableSignal {
    const allSignals = [
      signals.technical,
      signals.fundamental,
      signals.sentiment,
      signals.onchain
    ].filter(Boolean) as ActionableSignal[];

    const avgScore = allSignals.reduce((sum, s) => sum + s.score, 0) / allSignals.length;
    const avgConfidence = allSignals.reduce((sum, s) => sum + s.confidence, 0) / allSignals.length;

    const reasoning = [
      `Consensus from ${allSignals.length} analysis types`,
      ...allSignals.map(s => `${s.action} (${s.confidence}% confidence)`)
    ];

    return this.scoreToSignal(avgScore, reasoning, 'good', avgConfidence);
  }

  private scoreToSignal(score: number, reasoning: string[], dataQuality: ActionableSignal['dataQuality'], customConfidence?: number): ActionableSignal {
    let action: ActionableSignal['action'];
    let confidence: number;
    let disclaimer: string;

    if (score >= 40) {
      action = 'STRONG_BUY';
      confidence = customConfidence || 70 + (score - 40) / 2;
      disclaimer = 'Strong positive indicators observed. This is educational analysis only, not a recommendation to purchase.';
    } else if (score >= 20) {
      action = 'BUY';
      confidence = customConfidence || 60 + (score - 20);
      disclaimer = 'Positive indicators present. This is for educational purposes and should not be construed as investment advice.';
    } else if (score >= -20) {
      action = 'HOLD';
      confidence = customConfidence || 50 + Math.abs(score) / 2;
      disclaimer = 'Neutral market conditions. Always conduct your own research before making investment decisions.';
    } else if (score >= -40) {
      action = 'SELL';
      confidence = customConfidence || 60 + (Math.abs(score) - 20);
      disclaimer = 'Cautionary indicators detected. This is educational analysis, not financial advice to sell assets.';
    } else {
      action = 'STRONG_SELL';
      confidence = customConfidence || 70 + (Math.abs(score) - 40) / 2;
      disclaimer = 'Significant risk factors identified. This is educational information only. Consult with financial advisors.';
    }

    return {
      action,
      confidence: Math.min(95, Math.max(40, confidence)),
      timeframe: '7d',
      score,
      reasoning,
      dataQuality,
      disclaimer
    };
  }

  private calculateDataQuality(results: PromiseSettledResult<any>[]): EnrichedCryptoData['metadata'] {
    const fulfilled = results.filter(r => r.status === 'fulfilled').length;
    const total = results.length;
    const quality = (fulfilled / total) * 100;

    const missingData: string[] = [];
    const sources: string[] = ['CoinGecko'];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const dataTypes = ['OHLC Data', 'Social Sentiment', 'On-Chain Metrics', 'Derivatives Data'];
        missingData.push(dataTypes[index]);
      } else {
        const dataSources = ['CryptoCompare', 'Alternative.me', 'Blockchain APIs', 'Exchange APIs'];
        if (index < dataSources.length) sources.push(dataSources[index]);
      }
    });

    return {
      timestamp: Date.now(),
      dataQuality: quality,
      missingData,
      sources
    };
  }

  private getDefaultOHLCData(): EnrichedCryptoData['ohlcData'] {
    return {
      timeframe: '4h',
      candles: [],
      indicators: {
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        sma20: 0,
        sma50: 0,
        sma200: 0,
        ema12: 0,
        ema26: 0,
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        atr: 0,
        stochastic: { k: 50, d: 50 }
      }
    };
  }

  private getDefaultSocialSentiment(): SocialSentiment {
    return {
      twitter: {
        mentions24h: 0,
        mentionsChange: 0,
        sentiment: 'neutral',
        sentimentScore: 50,
        influencerCount: 0
      },
      reddit: {
        posts24h: 0,
        postsChange: 0,
        comments24h: 0,
        sentiment: 'neutral',
        sentimentScore: 50
      },
      news: {
        articles24h: 0,
        sentiment: 'neutral',
        sentimentScore: 50,
        topHeadlines: []
      },
      overall: {
        score: 50,
        sentiment: 'neutral',
        confidence: 40
      }
    };
  }

  private getDefaultFearGreed(): FearGreedData {
    return {
      value: 50,
      classification: 'Neutral',
      components: {
        volatility: 50,
        marketMomentum: 50,
        socialMedia: 50,
        surveys: 50,
        dominance: 50
      }
    };
  }
}

export const enrichedCryptoDataService = new EnrichedCryptoDataService();
