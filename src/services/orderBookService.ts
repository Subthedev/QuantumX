/**
 * Order Book Data Service
 * Fetches real-time order book depth data from Binance WebSocket edge function
 */

import { supabase } from '@/integrations/supabase/client';

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookMetrics {
  totalBidVolume: number;
  totalAskVolume: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
  buyPressure: number;
  sellPressure: number;
  bidAskRatio: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
  timestamp: number;
  metrics: OrderBookMetrics;
  status: 'connected' | 'connecting' | 'initializing' | 'error';
  latency_ms?: string;
  message?: string;
}

/**
 * Fetch real-time order book data for a trading pair
 */
export async function getOrderBook(symbol: string): Promise<OrderBookData> {
  try {
    console.log(`📊 Fetching order book for ${symbol}...`);

    const { data, error } = await supabase.functions.invoke<OrderBookData>(
      `binance-orderbook?symbol=${symbol.toLowerCase()}`
    );

    if (error) {
      console.error('Order book fetch error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No order book data received');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch order book:', error);
    throw error;
  }
}

/**
 * Calculate aggregated order book levels (for depth chart visualization)
 */
export function aggregateOrderBook(
  levels: OrderBookLevel[],
  aggregationSize: number = 0.01
): OrderBookLevel[] {
  if (levels.length === 0) return [];

  const aggregated: OrderBookLevel[] = [];
  let currentBucket = Math.floor(levels[0].price / aggregationSize) * aggregationSize;
  let bucketQuantity = 0;
  let runningTotal = 0;

  for (const level of levels) {
    const levelBucket = Math.floor(level.price / aggregationSize) * aggregationSize;

    if (levelBucket !== currentBucket) {
      if (bucketQuantity > 0) {
        runningTotal += bucketQuantity;
        aggregated.push({
          price: currentBucket,
          quantity: bucketQuantity,
          total: runningTotal
        });
      }
      currentBucket = levelBucket;
      bucketQuantity = 0;
    }

    bucketQuantity += level.quantity;
  }

  // Push final bucket
  if (bucketQuantity > 0) {
    runningTotal += bucketQuantity;
    aggregated.push({
      price: currentBucket,
      quantity: bucketQuantity,
      total: runningTotal
    });
  }

  return aggregated;
}

/**
 * Get market sentiment from order book imbalance
 */
export function getOrderBookSentiment(metrics: OrderBookMetrics): {
  sentiment: 'bullish' | 'neutral' | 'bearish';
  strength: number;
} {
  const { buyPressure, sellPressure } = metrics;
  
  if (buyPressure > 60) {
    return { sentiment: 'bullish', strength: buyPressure };
  } else if (sellPressure > 60) {
    return { sentiment: 'bearish', strength: sellPressure };
  } else {
    return { sentiment: 'neutral', strength: 50 };
  }
}
