/**
 * CRYPTO SENTIMENT SERVICE - Real-Time Multi-Source Aggregation
 *
 * Aggregates sentiment from FREE sources to produce a noise-filtered composite score.
 *
 * Sources (all free, no API key required):
 * 1. Fear & Greed Index (alternative.me) - Market-wide fear/greed (daily)
 * 2. Binance Futures Long/Short Ratio - Professional trader positioning (5min)
 * 3. Bitfinex Long/Short Positions - Whale positioning (15min)
 * 4. CoinGecko Community Data - Social metrics (hourly)
 * 5. Funding Rate Sentiment - From multiExchangeFundingService (real-time)
 * 6. Liquidation Flow Sentiment - From liquidationCascadeService (real-time)
 *
 * Noise Reduction Strategy:
 * - EMA smoothing (alpha=0.15) to filter spikes
 * - Source agreement weighting (divergent sources = lower confidence)
 * - Extreme value dampening (>90 or <10 capped to prevent overreaction)
 * - Rolling window averaging (last 6 readings)
 */

import { multiExchangeFundingService } from './multiExchangeFundingService';
import { liquidationCascadeService } from './liquidationCascadeService';

// ===== TYPES =====
interface SentimentSource {
  name: string;
  score: number;        // 0-100 (0=extreme fear, 100=extreme greed)
  weight: number;       // Importance weight
  freshness: number;    // 0-1 (1=fresh, decays with age)
  lastUpdate: number;   // timestamp
  status: 'ACTIVE' | 'STALE' | 'ERROR';
}

interface CompositeSentiment {
  score: number;             // 0-100 composite
  label: string;             // EXTREME_FEAR | FEAR | NEUTRAL | GREED | EXTREME_GREED
  confidence: number;        // 0-100 (how many sources agree)
  direction: number;         // -1 to +1 (for ML feature)
  sourceCount: number;       // Active sources
  sources: SentimentSource[];
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  timestamp: number;
}

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

interface BinanceLSRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

// ===== CORS PROXY HELPER =====
// Binance Futures and CoinGecko block browser CORS. Route through /api/proxy on Vercel.
function proxyUrl(url: string): string {
  // In production (Vercel), use the serverless proxy
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  // In dev, try direct (may fail with CORS - that's fine, fallback handles it)
  return url;
}

// ===== SERVICE =====
class CryptoSentimentService {
  private sources: Map<string, SentimentSource> = new Map();
  private history: number[] = []; // Rolling composite scores
  private readonly HISTORY_SIZE = 24; // Keep 24 readings (6 hours at 15min intervals)
  private readonly EMA_ALPHA = 0.15; // Smoothing factor
  private emaValue = 50; // Start neutral
  private fetchInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastComposite: CompositeSentiment | null = null;

  // Cache
  private readonly STORAGE_KEY = 'crypto-sentiment-v1';

  constructor() {
    this.loadState();
  }

  // ===== PUBLIC API =====

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Sentiment] Starting crypto sentiment service...');

    // Initial fetch
    this.fetchAllSources();

    // Fetch every 15 minutes (respects rate limits on free APIs)
    this.fetchInterval = setInterval(() => this.fetchAllSources(), 15 * 60 * 1000);

    // Fast internal sources every 2 minutes (funding + liquidation)
    setInterval(() => this.updateInternalSources(), 2 * 60 * 1000);
  }

  stop(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Get composite sentiment for ML feature input
   * Returns -1 (extreme fear) to +1 (extreme greed)
   */
  getMLFeature(): number {
    const composite = this.getComposite();
    return composite.direction;
  }

  /**
   * Get full composite sentiment analysis
   */
  getComposite(): CompositeSentiment {
    if (this.lastComposite && Date.now() - this.lastComposite.timestamp < 60000) {
      return this.lastComposite;
    }
    return this.calculateComposite();
  }

  /**
   * Get raw sentiment data for UI display
   */
  getSentimentData(): {
    fearGreedIndex: number;
    socialVolume: number;
    longShortRatio: number;
    composite: number;
    label: string;
    confidence: number;
    sources: SentimentSource[];
  } {
    const composite = this.getComposite();
    const fgSource = this.sources.get('fearGreed');
    const lsSource = this.sources.get('binanceLSR');

    return {
      fearGreedIndex: fgSource?.score ?? 50,
      socialVolume: this.sources.get('coingecko')?.score ?? 50,
      longShortRatio: lsSource?.score ?? 50,
      composite: composite.score,
      label: composite.label,
      confidence: composite.confidence,
      sources: composite.sources
    };
  }

  // ===== DATA FETCHING =====

  private async fetchAllSources(): Promise<void> {
    console.log('[Sentiment] Fetching all sentiment sources...');

    // Fetch external sources in parallel
    await Promise.allSettled([
      this.fetchFearGreedIndex(),
      this.fetchBinanceLongShort(),
      this.fetchBitfinexPositions(),
      this.fetchCoinGeckoSentiment(),
    ]);

    // Always update internal sources
    this.updateInternalSources();

    // Calculate composite
    const composite = this.calculateComposite();
    this.lastComposite = composite;

    // Save state
    this.saveState();

    const activeCount = Array.from(this.sources.values()).filter(s => s.status === 'ACTIVE').length;
    console.log(`[Sentiment] Updated: ${composite.label} (${composite.score.toFixed(0)}) | ${activeCount}/${this.sources.size} sources active | confidence: ${composite.confidence.toFixed(0)}%`);
  }

  /**
   * Source 1: Fear & Greed Index (alternative.me)
   * Updates daily, free, no key needed
   */
  private async fetchFearGreedIndex(): Promise<void> {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1&format=json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: FearGreedResponse = await response.json();
      if (data.data && data.data.length > 0) {
        const value = parseInt(data.data[0].value);
        this.updateSource('fearGreed', {
          name: 'Fear & Greed Index',
          score: value,
          weight: 0.25, // High weight - well-established indicator
          freshness: 1,
          lastUpdate: Date.now(),
          status: 'ACTIVE'
        });
      }
    } catch (error) {
      this.markSourceError('fearGreed', 'Fear & Greed Index', 0.25);
      console.warn('[Sentiment] Fear & Greed fetch failed:', (error as Error).message);
    }
  }

  /**
   * Source 2: Binance Futures Long/Short Ratio
   * Top trader positioning - strong signal
   */
  private async fetchBinanceLongShort(): Promise<void> {
    try {
      const response = await fetch(
        proxyUrl('https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1')
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: BinanceLSRatio[] = await response.json();
      if (data && data.length > 0) {
        const ratio = parseFloat(data[0].longShortRatio);
        // Convert ratio to 0-100 score
        // ratio > 1 = more longs (bullish) → higher score
        // ratio < 1 = more shorts (bearish) → lower score
        // Typical range: 0.5-3.0, center at 1.0
        const score = Math.min(100, Math.max(0, ((ratio - 0.5) / 2.5) * 100));

        this.updateSource('binanceLSR', {
          name: 'Binance Top Trader L/S',
          score,
          weight: 0.20, // High weight - institutional positioning
          freshness: 1,
          lastUpdate: Date.now(),
          status: 'ACTIVE'
        });
      }
    } catch (error) {
      this.markSourceError('binanceLSR', 'Binance Top Trader L/S', 0.20);
      console.warn('[Sentiment] Binance L/S ratio fetch failed:', (error as Error).message);
    }
  }

  /**
   * Source 3: Bitfinex Long/Short Positions
   * Whale positioning on Bitfinex margin
   */
  private async fetchBitfinexPositions(): Promise<void> {
    try {
      const [longRes, shortRes] = await Promise.all([
        fetch('https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:long/hist?limit=1'),
        fetch('https://api-pub.bitfinex.com/v2/stats1/pos.size:1m:tBTCUSD:short/hist?limit=1')
      ]);

      if (!longRes.ok || !shortRes.ok) throw new Error('Bitfinex API error');

      const longData = await longRes.json();
      const shortData = await shortRes.json();

      if (longData?.[0] && shortData?.[0]) {
        const longVol = Math.abs(longData[0][1]);
        const shortVol = Math.abs(shortData[0][1]);
        const total = longVol + shortVol;

        if (total > 0) {
          // Long dominance as sentiment: more longs = higher score
          const score = (longVol / total) * 100;

          this.updateSource('bitfinexPos', {
            name: 'Bitfinex Whale Positions',
            score,
            weight: 0.15, // Medium weight - whale indicator
            freshness: 1,
            lastUpdate: Date.now(),
            status: 'ACTIVE'
          });
        }
      }
    } catch (error) {
      this.markSourceError('bitfinexPos', 'Bitfinex Whale Positions', 0.15);
      console.warn('[Sentiment] Bitfinex positions fetch failed:', (error as Error).message);
    }
  }

  /**
   * Source 4: CoinGecko Community/Market Data
   * Social metrics, market cap dominance shifts
   */
  private async fetchCoinGeckoSentiment(): Promise<void> {
    try {
      const response = await fetch(proxyUrl('https://api.coingecko.com/api/v3/global'));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const globalData = data.data;

      if (globalData) {
        // Derive sentiment from market metrics:
        // - Market cap change 24h (positive = bullish)
        // - BTC dominance (rising = risk-off/fear, falling = risk-on/greed)
        // - Active cryptocurrencies trend
        const mcapChange = globalData.market_cap_change_percentage_24h_usd || 0;

        // Market cap change: -10% → 0, 0% → 50, +10% → 100
        const mcapScore = Math.min(100, Math.max(0, (mcapChange + 10) * 5));

        this.updateSource('coingecko', {
          name: 'CoinGecko Market',
          score: mcapScore,
          weight: 0.10, // Lower weight - derived metric
          freshness: 1,
          lastUpdate: Date.now(),
          status: 'ACTIVE'
        });
      }
    } catch (error) {
      this.markSourceError('coingecko', 'CoinGecko Market', 0.10);
      console.warn('[Sentiment] CoinGecko fetch failed:', (error as Error).message);
    }
  }

  /**
   * Internal Sources: Funding + Liquidation (already running)
   */
  private updateInternalSources(): void {
    // Source 5: Funding Rate Sentiment (from multiExchangeFundingService)
    try {
      const fundingFeature = multiExchangeFundingService.getMLFeature('BTCUSDT');
      // fundingFeature is -1 to +1, convert to 0-100
      const fundingScore = (fundingFeature + 1) * 50;

      this.updateSource('funding', {
        name: 'Multi-Exchange Funding',
        score: fundingScore,
        weight: 0.15, // Medium-high weight - direct market signal
        freshness: 1,
        lastUpdate: Date.now(),
        status: 'ACTIVE'
      });
    } catch {
      this.markSourceError('funding', 'Multi-Exchange Funding', 0.15);
    }

    // Source 6: Liquidation Flow (from liquidationCascadeService)
    try {
      const liqFeature = liquidationCascadeService.getMLFeature();
      // direction: -1 (more long liquidations/bearish) to +1 (more short liquidations/bullish)
      // intensity: 0-1 (cascade intensity)
      // High intensity with directional bias = strong signal
      const baseScore = (liqFeature.direction + 1) * 50; // 0-100
      // Intensity amplifies deviation from neutral
      const amplifiedScore = 50 + (baseScore - 50) * (1 + liqFeature.intensity);
      const clampedScore = Math.min(100, Math.max(0, amplifiedScore));

      this.updateSource('liquidation', {
        name: 'Liquidation Flow',
        score: clampedScore,
        weight: 0.15, // Medium weight - real-time on-chain signal
        freshness: 1,
        lastUpdate: Date.now(),
        status: 'ACTIVE'
      });
    } catch {
      this.markSourceError('liquidation', 'Liquidation Flow', 0.15);
    }
  }

  // ===== COMPOSITE CALCULATION =====

  private calculateComposite(): CompositeSentiment {
    const sources = Array.from(this.sources.values());
    const activeSources = sources.filter(s => s.status === 'ACTIVE');

    if (activeSources.length === 0) {
      return {
        score: 50,
        label: 'NEUTRAL',
        confidence: 0,
        direction: 0,
        sourceCount: 0,
        sources,
        trend: 'STABLE',
        timestamp: Date.now()
      };
    }

    // Weighted average with freshness decay
    let totalWeight = 0;
    let weightedSum = 0;

    for (const source of activeSources) {
      const age = (Date.now() - source.lastUpdate) / (60 * 60 * 1000); // hours
      const decay = Math.max(0.3, 1 - (age * 0.05)); // Decay 5% per hour, min 30%
      const effectiveWeight = source.weight * decay;

      weightedSum += source.score * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    let rawScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // Extreme value dampening: prevent overreaction
    if (rawScore > 85) rawScore = 85 + (rawScore - 85) * 0.3;
    if (rawScore < 15) rawScore = 15 - (15 - rawScore) * 0.3;

    // EMA smoothing
    this.emaValue = this.EMA_ALPHA * rawScore + (1 - this.EMA_ALPHA) * this.emaValue;
    const smoothedScore = this.emaValue;

    // Store in history
    this.history.push(smoothedScore);
    if (this.history.length > this.HISTORY_SIZE) {
      this.history = this.history.slice(-this.HISTORY_SIZE);
    }

    // Source agreement (confidence)
    const scores = activeSources.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Low std dev = high agreement = high confidence
    const confidence = Math.max(20, Math.min(95, 100 - stdDev * 2));

    // Trend from history
    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' = 'STABLE';
    if (this.history.length >= 4) {
      const recent = this.history.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const older = this.history.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.min(3, this.history.slice(-6, -3).length || 1);
      if (recent - older > 5) trend = 'IMPROVING';
      else if (older - recent > 5) trend = 'DETERIORATING';
    }

    // Direction for ML (-1 to +1)
    const direction = (smoothedScore - 50) / 50;

    const composite: CompositeSentiment = {
      score: smoothedScore,
      label: this.scoreToLabel(smoothedScore),
      confidence,
      direction: Math.max(-1, Math.min(1, direction)),
      sourceCount: activeSources.length,
      sources,
      trend,
      timestamp: Date.now()
    };

    this.lastComposite = composite;
    return composite;
  }

  // ===== HELPERS =====

  private updateSource(key: string, source: SentimentSource): void {
    this.sources.set(key, source);
  }

  private markSourceError(key: string, name: string, weight: number): void {
    const existing = this.sources.get(key);
    if (existing) {
      existing.status = 'STALE';
      existing.freshness = Math.max(0, existing.freshness - 0.2);
    } else {
      this.sources.set(key, {
        name,
        score: 50,
        weight,
        freshness: 0,
        lastUpdate: 0,
        status: 'ERROR'
      });
    }
  }

  private scoreToLabel(score: number): string {
    if (score <= 20) return 'EXTREME_FEAR';
    if (score <= 40) return 'FEAR';
    if (score <= 60) return 'NEUTRAL';
    if (score <= 80) return 'GREED';
    return 'EXTREME_GREED';
  }

  private saveState(): void {
    try {
      const state = {
        emaValue: this.emaValue,
        history: this.history,
        sources: Object.fromEntries(this.sources),
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  private loadState(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const state = JSON.parse(raw);
      const age = Date.now() - (state.timestamp || 0);

      // Only restore if less than 2 hours old
      if (age < 2 * 60 * 60 * 1000) {
        this.emaValue = state.emaValue || 50;
        this.history = state.history || [];

        if (state.sources) {
          for (const [key, source] of Object.entries(state.sources)) {
            const s = source as SentimentSource;
            s.status = 'STALE'; // Mark as stale until refreshed
            this.sources.set(key, s);
          }
        }

        console.log('[Sentiment] Restored state - EMA:', this.emaValue.toFixed(1), 'History:', this.history.length);
      }
    } catch {}
  }
}

export const cryptoSentimentService = new CryptoSentimentService();
