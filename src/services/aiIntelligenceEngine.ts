/**
 * AI Intelligence Engine - Transparent Prediction System
 * Comprehensive data injection with 100% transparent scoring
 */

import { intelligenceHub } from './intelligenceHub';
import type { UnifiedIntelligenceData } from './intelligenceHub';

export type SignalType = 'BUY' | 'SELL';

/**
 * Data Score - Individual metric with transparent calculation
 */
export interface DataScore {
  category: string;
  metric: string;
  rawValue: string;
  score: number; // 0-100 (50 = neutral, >50 = bullish, <50 = bearish)
  weight: number; // Importance multiplier (0-10)
  calculation: string; // How score was calculated
  impact: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Category Analysis - Grouped data scores
 */
export interface CategoryAnalysis {
  name: string;
  overallScore: number; // Weighted average of all metrics
  confidence: number; // 0-100
  signal: 'bullish' | 'bearish' | 'neutral';
  metrics: DataScore[];
}

/**
 * Intelligence Report with complete transparency
 */
export interface IntelligenceReport {
  symbol: string;
  timestamp: number;

  // FINAL SIGNAL
  signal: {
    type: SignalType;
    confidence: number; // 0-100
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    timeframe: 'Short-Term (1-7d)' | 'Medium-Term (1-4w)' | 'Long-Term (1-3m)';
  };

  // COMPLETE TRANSPARENCY - All data injected
  analysis: {
    marketData: CategoryAnalysis;
    orderBook: CategoryAnalysis;
    fundingRates: CategoryAnalysis;
    sentiment: CategoryAnalysis;
    onChain: CategoryAnalysis;
    technical: CategoryAnalysis;
  };

  // SIGNAL CALCULATION - Transparent scoring
  calculation: {
    totalBullishScore: number;
    totalBearishScore: number;
    netScore: number; // Difference between bullish and bearish
    confidenceScore: number;
    explanation: string;
  };

  // ACTIONABLE DATA
  action: {
    recommendation: string;
    entryZone: { min: number; max: number } | null;
    targets: number[];
    stopLoss: number | null;
    riskReward: number | null;
  };

  // RISK METRICS
  risk: {
    level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    volatility: number;
    liquidity: number;
    warnings: string[];
  };

  // CONTEXT
  marketContext: {
    currentPrice: number;
    priceChange24h: number;
    volume24h: string;
    marketCap: string;
    fearGreedIndex: number;
  };

  // METADATA
  metadata: {
    dataQuality: number;
    sourcesUsed: string[];
    processingTime: number;
  };
}

class AIIntelligenceEngine {
  /**
   * Generate comprehensive intelligence report with full data injection
   */
  async generateIntelligenceReport(symbol: string): Promise<IntelligenceReport> {
    const startTime = Date.now();

    // Fetch ALL available data
    const data = await intelligenceHub.fetchIntelligence({
      symbol,
      includeOHLC: true,
      ohlcTimeframe: '4h',
      includeOnChain: true,
      includeOrderBook: true,
      orderBookLimit: 20,
      includeFundingRate: true,
      includeMarketSentiment: true
    });

    // INJECT ALL DATA INTO ANALYSIS
    const marketData = this.analyzeMarketData(data);
    const orderBook = this.analyzeOrderBook(data);
    const fundingRates = this.analyzeFundingRates(data);
    const sentiment = this.analyzeSentiment(data);
    const onChain = this.analyzeOnChain(data);
    const technical = this.analyzeTechnical(data);

    // CALCULATE SIGNAL WITH FULL TRANSPARENCY
    const calculation = this.calculateSignal({
      marketData,
      orderBook,
      fundingRates,
      sentiment,
      onChain,
      technical
    });

    // GENERATE FINAL SIGNAL
    const signal = this.generateFinalSignal(calculation);

    // ACTIONABLE RECOMMENDATIONS
    const action = this.generateAction(signal, data);

    // RISK ASSESSMENT
    const risk = this.assessRisk(data, marketData, orderBook);

    // MARKET CONTEXT
    const marketContext = this.buildMarketContext(data);

    const processingTime = Date.now() - startTime;

    return {
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
      signal,
      analysis: {
        marketData,
        orderBook,
        fundingRates,
        sentiment,
        onChain,
        technical
      },
      calculation,
      action,
      risk,
      marketContext,
      metadata: {
        dataQuality: data.dataQuality.score,
        sourcesUsed: data.dataQuality.availableSources,
        processingTime
      }
    };
  }

  /**
   * MARKET DATA ANALYSIS - Inject all market metrics
   */
  private analyzeMarketData(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    if (!data.marketData) {
      return {
        name: 'Market Data',
        overallScore: 50,
        confidence: 0,
        signal: 'neutral',
        metrics: []
      };
    }

    const { price, priceChangePercentage24h, volume24h, marketCap, athChangePercentage } = data.marketData;

    // 1. Price Momentum Score
    const momentumScore = 50 + (priceChangePercentage24h * 5); // -20% → 0, +20% → 150, capped at 0-100
    metrics.push({
      category: 'Market Data',
      metric: 'Price Momentum (24h)',
      rawValue: `${priceChangePercentage24h > 0 ? '+' : ''}${priceChangePercentage24h.toFixed(2)}%`,
      score: Math.max(0, Math.min(100, momentumScore)),
      weight: 10, // Highest weight - most important
      calculation: `50 + (${priceChangePercentage24h.toFixed(2)}% × 5) = ${momentumScore.toFixed(0)}`,
      impact: momentumScore > 50 ? 'bullish' : momentumScore < 50 ? 'bearish' : 'neutral'
    });

    // 2. Volume/Market Cap Ratio
    const volMcapRatio = (volume24h / marketCap) * 100;
    const volumeScore = Math.min(100, volMcapRatio * 500); // 0.2% = 100 score
    metrics.push({
      category: 'Market Data',
      metric: 'Volume/Market Cap',
      rawValue: `${volMcapRatio.toFixed(2)}%`,
      score: volumeScore,
      weight: 7,
      calculation: `(${volMcapRatio.toFixed(2)}% × 500) = ${volumeScore.toFixed(0)}`,
      impact: volumeScore > 60 ? 'bullish' : volumeScore < 40 ? 'bearish' : 'neutral'
    });

    // 3. Distance from ATH (Recovery Potential)
    const athDistance = Math.abs(athChangePercentage);
    const athScore = athDistance > 70 ? 70 : athDistance > 50 ? 60 : athDistance > 30 ? 50 : 40;
    metrics.push({
      category: 'Market Data',
      metric: 'Distance from ATH',
      rawValue: `${athDistance.toFixed(0)}% below`,
      score: athScore,
      weight: 5,
      calculation: `Distance ${athDistance.toFixed(0)}% → Score ${athScore}`,
      impact: athScore > 55 ? 'bullish' : 'neutral'
    });

    // Calculate weighted average
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overallScore = metrics.reduce((sum, m) => sum + (m.score * m.weight), 0) / totalWeight;

    return {
      name: 'Market Data',
      overallScore: Math.round(overallScore),
      confidence: 95, // High confidence in market data
      signal: overallScore > 55 ? 'bullish' : overallScore < 45 ? 'bearish' : 'neutral',
      metrics
    };
  }

  /**
   * ORDER BOOK ANALYSIS - Inject all liquidity metrics
   */
  private analyzeOrderBook(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    if (!data.orderBook?.metrics) {
      return {
        name: 'Order Book',
        overallScore: 50,
        confidence: 0,
        signal: 'neutral',
        metrics: [{
          category: 'Order Book',
          metric: 'Data Availability',
          rawValue: 'Not Available',
          score: 50,
          weight: 0,
          calculation: 'No order book data',
          impact: 'neutral'
        }]
      };
    }

    const { bidAskRatio, buyPressure, sellPressure, spreadPercent } = data.orderBook.metrics;

    // 1. Bid/Ask Ratio
    const ratioScore = bidAskRatio > 1.5 ? 90 :
                       bidAskRatio > 1.2 ? 75 :
                       bidAskRatio > 1.0 ? 55 :
                       bidAskRatio > 0.8 ? 45 :
                       bidAskRatio > 0.5 ? 25 : 10;
    metrics.push({
      category: 'Order Book',
      metric: 'Bid/Ask Ratio',
      rawValue: bidAskRatio.toFixed(2),
      score: ratioScore,
      weight: 9,
      calculation: `Ratio ${bidAskRatio.toFixed(2)} → Score ${ratioScore}`,
      impact: ratioScore > 55 ? 'bullish' : ratioScore < 45 ? 'bearish' : 'neutral'
    });

    // 2. Buy Pressure
    const buyScore = buyPressure; // Already 0-100
    metrics.push({
      category: 'Order Book',
      metric: 'Buy Pressure',
      rawValue: `${buyPressure.toFixed(1)}%`,
      score: buyScore,
      weight: 8,
      calculation: `Direct mapping: ${buyPressure.toFixed(1)}%`,
      impact: buyScore > 55 ? 'bullish' : buyScore < 45 ? 'bearish' : 'neutral'
    });

    // 3. Spread Tightness
    const spreadScore = spreadPercent < 0.05 ? 95 :
                        spreadPercent < 0.1 ? 85 :
                        spreadPercent < 0.2 ? 70 :
                        spreadPercent < 0.5 ? 50 :
                        spreadPercent < 1.0 ? 30 : 10;
    metrics.push({
      category: 'Order Book',
      metric: 'Spread Tightness',
      rawValue: `${spreadPercent.toFixed(3)}%`,
      score: spreadScore,
      weight: 6,
      calculation: `Spread ${spreadPercent.toFixed(3)}% → Score ${spreadScore}`,
      impact: spreadScore > 70 ? 'bullish' : 'neutral'
    });

    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overallScore = metrics.reduce((sum, m) => sum + (m.score * m.weight), 0) / totalWeight;

    return {
      name: 'Order Book',
      overallScore: Math.round(overallScore),
      confidence: 85,
      signal: overallScore > 55 ? 'bullish' : overallScore < 45 ? 'bearish' : 'neutral',
      metrics
    };
  }

  /**
   * FUNDING RATES ANALYSIS - Inject leverage metrics
   */
  private analyzeFundingRates(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    if (!data.fundingRate) {
      return {
        name: 'Funding Rates',
        overallScore: 50,
        confidence: 0,
        signal: 'neutral',
        metrics: [{
          category: 'Funding Rates',
          metric: 'Data Availability',
          rawValue: 'Not Available',
          score: 50,
          weight: 0,
          calculation: 'No funding rate data',
          impact: 'neutral'
        }]
      };
    }

    const rate = data.fundingRate.rate * 100; // Convert to percentage

    // Funding Rate Score (negative = bullish, positive = bearish)
    const fundingScore = rate < -0.10 ? 85 : // Extreme shorts → bullish (squeeze potential)
                         rate < -0.05 ? 65 :
                         rate < 0 ? 55 :
                         rate < 0.05 ? 45 :
                         rate < 0.10 ? 35 : 15; // Extreme longs → bearish (liquidation risk)

    metrics.push({
      category: 'Funding Rates',
      metric: 'Funding Rate',
      rawValue: `${rate > 0 ? '+' : ''}${rate.toFixed(3)}%`,
      score: fundingScore,
      weight: 8,
      calculation: `Rate ${rate.toFixed(3)}% → Score ${fundingScore} (negative = bullish)`,
      impact: fundingScore > 55 ? 'bullish' : fundingScore < 45 ? 'bearish' : 'neutral'
    });

    // Leverage Risk
    const absRate = Math.abs(rate);
    const leverageRisk = absRate > 0.15 ? 20 : absRate > 0.10 ? 40 : absRate > 0.05 ? 60 : 80;
    metrics.push({
      category: 'Funding Rates',
      metric: 'Leverage Health',
      rawValue: `${absRate.toFixed(3)}% (${absRate > 0.10 ? 'High Risk' : 'Normal'})`,
      score: leverageRisk,
      weight: 6,
      calculation: `|${rate.toFixed(3)}|% → Health Score ${leverageRisk}`,
      impact: leverageRisk > 60 ? 'bullish' : leverageRisk < 40 ? 'bearish' : 'neutral'
    });

    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overallScore = metrics.reduce((sum, m) => sum + (m.score * m.weight), 0) / totalWeight;

    return {
      name: 'Funding Rates',
      overallScore: Math.round(overallScore),
      confidence: 75,
      signal: overallScore > 55 ? 'bullish' : overallScore < 45 ? 'bearish' : 'neutral',
      metrics
    };
  }

  /**
   * SENTIMENT ANALYSIS - Inject market psychology
   */
  private analyzeSentiment(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    if (!data.marketSentiment) {
      return {
        name: 'Market Sentiment',
        overallScore: 50,
        confidence: 0,
        signal: 'neutral',
        metrics: [{
          category: 'Sentiment',
          metric: 'Data Availability',
          rawValue: 'Not Available',
          score: 50,
          weight: 0,
          calculation: 'No sentiment data',
          impact: 'neutral'
        }]
      };
    }

    const { fearGreedIndex } = data.marketSentiment;

    // Contrarian scoring: extreme fear = buy, extreme greed = sell
    const sentimentScore = fearGreedIndex < 20 ? 90 : // Extreme fear → buy
                          fearGreedIndex < 35 ? 75 :
                          fearGreedIndex < 45 ? 55 :
                          fearGreedIndex < 55 ? 50 : // Neutral
                          fearGreedIndex < 65 ? 45 :
                          fearGreedIndex < 80 ? 25 : 10; // Extreme greed → sell

    metrics.push({
      category: 'Sentiment',
      metric: 'Fear & Greed Index',
      rawValue: `${fearGreedIndex} (${
        fearGreedIndex < 25 ? 'Extreme Fear' :
        fearGreedIndex < 45 ? 'Fear' :
        fearGreedIndex < 55 ? 'Neutral' :
        fearGreedIndex < 75 ? 'Greed' : 'Extreme Greed'
      })`,
      score: sentimentScore,
      weight: 7,
      calculation: `Index ${fearGreedIndex} → ${sentimentScore} (contrarian)`,
      impact: sentimentScore > 55 ? 'bullish' : sentimentScore < 45 ? 'bearish' : 'neutral'
    });

    return {
      name: 'Market Sentiment',
      overallScore: Math.round(sentimentScore),
      confidence: 80,
      signal: sentimentScore > 55 ? 'bullish' : sentimentScore < 45 ? 'bearish' : 'neutral',
      metrics
    };
  }

  /**
   * ON-CHAIN ANALYSIS - Inject blockchain metrics
   */
  private analyzeOnChain(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    if (!data.onChainData) {
      return {
        name: 'On-Chain',
        overallScore: 50,
        confidence: 0,
        signal: 'neutral',
        metrics: [{
          category: 'On-Chain',
          metric: 'Data Availability',
          rawValue: 'Limited (BTC/ETH only)',
          score: 50,
          weight: 0,
          calculation: 'No on-chain data for this asset',
          impact: 'neutral'
        }]
      };
    }

    if (data.onChainData.activeAddresses) {
      const addresses = data.onChainData.activeAddresses;
      const addressScore = Math.min(100, (addresses / 10000));
      metrics.push({
        category: 'On-Chain',
        metric: 'Active Addresses',
        rawValue: addresses.toLocaleString(),
        score: addressScore,
        weight: 6,
        calculation: `${addresses.toLocaleString()} / 10,000 = ${addressScore.toFixed(0)}`,
        impact: addressScore > 60 ? 'bullish' : 'neutral'
      });
    }

    if (data.onChainData.transactionCount) {
      const txCount = data.onChainData.transactionCount;
      const txScore = Math.min(100, (txCount / 100000));
      metrics.push({
        category: 'On-Chain',
        metric: 'Transaction Count',
        rawValue: txCount.toLocaleString(),
        score: txScore,
        weight: 5,
        calculation: `${txCount.toLocaleString()} / 100,000 = ${txScore.toFixed(0)}`,
        impact: txScore > 60 ? 'bullish' : 'neutral'
      });
    }

    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overallScore = totalWeight > 0
      ? metrics.reduce((sum, m) => sum + (m.score * m.weight), 0) / totalWeight
      : 50;

    return {
      name: 'On-Chain',
      overallScore: Math.round(overallScore),
      confidence: metrics.length > 0 ? 70 : 0,
      signal: overallScore > 55 ? 'bullish' : overallScore < 45 ? 'bearish' : 'neutral',
      metrics: metrics.length > 0 ? metrics : [{
        category: 'On-Chain',
        metric: 'Network Activity',
        rawValue: 'Limited Data',
        score: 50,
        weight: 0,
        calculation: 'Insufficient on-chain metrics',
        impact: 'neutral'
      }]
    };
  }

  /**
   * TECHNICAL ANALYSIS - Inject price patterns
   */
  private analyzeTechnical(data: UnifiedIntelligenceData): CategoryAnalysis {
    const metrics: DataScore[] = [];

    // Basic technical score based on available data
    if (data.ohlcData && data.ohlcData.candles.length > 0) {
      const candles = data.ohlcData.candles;
      const latest = candles[candles.length - 1];
      const previous = candles[candles.length - 2];

      if (latest && previous) {
        // Candle strength
        const candleScore = latest.close > latest.open ? 65 : 35;
        metrics.push({
          category: 'Technical',
          metric: 'Recent Candle',
          rawValue: latest.close > latest.open ? 'Bullish' : 'Bearish',
          score: candleScore,
          weight: 4,
          calculation: `Close ${latest.close > latest.open ? '>' : '<'} Open`,
          impact: candleScore > 50 ? 'bullish' : 'bearish'
        });
      }
    }

    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const overallScore = totalWeight > 0
      ? metrics.reduce((sum, m) => sum + (m.score * m.weight), 0) / totalWeight
      : 50;

    return {
      name: 'Technical',
      overallScore: Math.round(overallScore),
      confidence: metrics.length > 0 ? 60 : 0,
      signal: overallScore > 55 ? 'bullish' : overallScore < 45 ? 'bearish' : 'neutral',
      metrics: metrics.length > 0 ? metrics : [{
        category: 'Technical',
        metric: 'Pattern Analysis',
        rawValue: 'Basic',
        score: 50,
        weight: 4,
        calculation: 'Limited technical data',
        impact: 'neutral'
      }]
    };
  }

  /**
   * CALCULATE FINAL SIGNAL - Complete transparency
   */
  private calculateSignal(analysis: any) {
    // Weight each category based on confidence
    const categories = [
      { name: 'Market Data', score: analysis.marketData.overallScore, confidence: analysis.marketData.confidence, weight: 10 },
      { name: 'Order Book', score: analysis.orderBook.overallScore, confidence: analysis.orderBook.confidence, weight: 9 },
      { name: 'Funding', score: analysis.fundingRates.overallScore, confidence: analysis.fundingRates.confidence, weight: 8 },
      { name: 'Sentiment', score: analysis.sentiment.overallScore, confidence: analysis.sentiment.confidence, weight: 7 },
      { name: 'On-Chain', score: analysis.onChain.overallScore, confidence: analysis.onChain.confidence, weight: 6 },
      { name: 'Technical', score: analysis.technical.overallScore, confidence: analysis.technical.confidence, weight: 4 }
    ];

    // Calculate weighted scores
    let totalBullishScore = 0;
    let totalBearishScore = 0;
    let totalWeight = 0;

    categories.forEach(cat => {
      if (cat.confidence > 0) {
        const effectiveWeight = cat.weight * (cat.confidence / 100);
        totalWeight += effectiveWeight;

        if (cat.score > 50) {
          totalBullishScore += (cat.score - 50) * effectiveWeight;
        } else {
          totalBearishScore += (50 - cat.score) * effectiveWeight;
        }
      }
    });

    const netScore = totalBullishScore - totalBearishScore;
    const maxPossibleScore = 50 * totalWeight; // Maximum deviation from neutral
    const confidenceScore = Math.min(95, Math.abs(netScore) / maxPossibleScore * 100);

    const explanation = `Analyzed ${categories.filter(c => c.confidence > 0).length} data categories. ` +
      `Bullish Score: ${totalBullishScore.toFixed(0)}, Bearish Score: ${totalBearishScore.toFixed(0)}. ` +
      `Net Score: ${netScore.toFixed(0)} (${netScore > 0 ? 'Bullish' : 'Bearish'}). ` +
      `Confidence: ${confidenceScore.toFixed(0)}% based on signal strength.`;

    return {
      totalBullishScore: Math.round(totalBullishScore),
      totalBearishScore: Math.round(totalBearishScore),
      netScore: Math.round(netScore),
      confidenceScore: Math.round(confidenceScore),
      explanation
    };
  }

  /**
   * GENERATE FINAL SIGNAL
   */
  private generateFinalSignal(calculation: any) {
    const type: SignalType = calculation.netScore > 0 ? 'BUY' : 'SELL';
    const confidence = calculation.confidenceScore;

    const strength: 'STRONG' | 'MODERATE' | 'WEAK' =
      confidence > 70 ? 'STRONG' :
      confidence > 50 ? 'MODERATE' : 'WEAK';

    const timeframe: 'Short-Term (1-7d)' | 'Medium-Term (1-4w)' | 'Long-Term (1-3m)' =
      confidence > 70 ? 'Short-Term (1-7d)' :
      confidence > 50 ? 'Medium-Term (1-4w)' : 'Long-Term (1-3m)';

    return { type, confidence, strength, timeframe };
  }

  /**
   * GENERATE ACTIONABLE RECOMMENDATIONS
   */
  private generateAction(signal: any, data: UnifiedIntelligenceData) {
    const current = data.marketData?.price || 0;

    if (current === 0) {
      return {
        recommendation: 'Insufficient data for trading recommendation',
        entryZone: null,
        targets: [],
        stopLoss: null,
        riskReward: null
      };
    }

    const entryZone = {
      min: current * 0.98,
      max: current * 1.02
    };

    const targets = signal.type === 'BUY'
      ? [current * 1.05, current * 1.10, current * 1.15]
      : [current * 0.95, current * 0.90, current * 0.85];

    const stopLoss = signal.type === 'BUY'
      ? current * 0.95
      : current * 1.05;

    const riskReward = Math.abs((targets[0] - current) / (stopLoss - current));

    const recommendation = `${signal.strength} ${signal.type} signal with ${signal.confidence}% confidence. ` +
      `${signal.timeframe}. Risk:Reward = 1:${riskReward.toFixed(1)}`;

    return {
      recommendation,
      entryZone,
      targets,
      stopLoss,
      riskReward
    };
  }

  /**
   * ASSESS RISK
   */
  private assessRisk(data: UnifiedIntelligenceData, marketData: any, orderBook: any) {
    const warnings: string[] = [];
    let volatility = 50;
    let liquidity = 50;

    if (data.marketData) {
      volatility = Math.min(100, Math.abs(data.marketData.priceChangePercentage24h) * 5);
      if (volatility > 70) warnings.push('High volatility detected');
    }

    if (data.orderBook?.metrics) {
      const spread = data.orderBook.metrics.spreadPercent;
      liquidity = spread < 0.1 ? 20 : spread < 0.5 ? 50 : 80;
      if (liquidity > 60) warnings.push('Limited liquidity');
    }

    const avgRisk = (volatility + liquidity) / 2;
    const level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' =
      avgRisk < 30 ? 'LOW' :
      avgRisk < 50 ? 'MODERATE' :
      avgRisk < 70 ? 'HIGH' : 'EXTREME';

    return { level, volatility: Math.round(volatility), liquidity: Math.round(liquidity), warnings };
  }

  /**
   * BUILD MARKET CONTEXT
   */
  private buildMarketContext(data: UnifiedIntelligenceData) {
    return {
      currentPrice: data.marketData?.price || 0,
      priceChange24h: data.marketData?.priceChangePercentage24h || 0,
      volume24h: data.marketData ? `$${(data.marketData.volume24h / 1e9).toFixed(2)}B` : 'N/A',
      marketCap: data.marketData ? `$${(data.marketData.marketCap / 1e9).toFixed(2)}B` : 'N/A',
      fearGreedIndex: data.marketSentiment?.fearGreedIndex || 50
    };
  }
}

export const aiIntelligenceEngine = new AIIntelligenceEngine();
