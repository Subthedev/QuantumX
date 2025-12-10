/**
 * V4 INTELLIGENT PATTERN RECOGNITION ENGINE
 * Detects COMBINATIONS of signals for high-conviction triggers
 *
 * PHILOSOPHY:
 * - Single signals can be noise (volume surge alone = maybe nothing)
 * - COMBINATIONS = high conviction (volume + price + flow = real move)
 * - Quality > quantity: Only fire when multiple factors align
 *
 * PATTERN TYPES:
 * 1. CONFLUENCE: Multiple signals pointing same direction
 * 2. DIVERGENCE: Price vs volume/funding mismatches
 * 3. INSTITUTIONAL: Smart money flow indicators
 * 4. MOMENTUM: Trend-following patterns
 */

import type { EnrichedCanonicalTicker } from '../dataStreams/multiExchangeAggregatorV4';

export type PatternType =
  | 'CONFLUENCE'      // Multiple signals align
  | 'DIVERGENCE'      // Price vs other metrics mismatch
  | 'INSTITUTIONAL'   // Smart money detected
  | 'MOMENTUM';       // Trend acceleration

export type PatternSignal =
  | 'BULLISH'
  | 'BEARISH'
  | 'NEUTRAL';

export interface Pattern {
  type: PatternType;
  signal: PatternSignal;
  strength: number;        // 0-100
  confidence: number;      // 0-100
  components: string[];    // What signals detected
  reasoning: string;       // Human-readable explanation
  timestamp: number;
}

export interface PatternDetectionResult {
  patterns: Pattern[];
  strongestPattern: Pattern | null;
  overallSignal: PatternSignal;
  overallStrength: number;  // 0-100, combined strength
  shouldTrigger: boolean;   // True if patterns strong enough
}

export class IntelligentPatternDetector {
  private previousTickers: Map<string, EnrichedCanonicalTicker> = new Map();
  private patternHistory: Map<string, Pattern[]> = new Map(); // Last 10 patterns per coin

  private readonly PATTERN_THRESHOLD = 70;  // Minimum strength to trigger
  private readonly HISTORY_SIZE = 10;       // Keep last N patterns per coin

  /**
   * Detect patterns in current vs previous ticker
   */
  detectPatterns(
    current: EnrichedCanonicalTicker,
    previous?: EnrichedCanonicalTicker
  ): PatternDetectionResult {
    const symbol = current.symbol;

    // Use stored previous if not provided
    if (!previous) {
      previous = this.previousTickers.get(symbol);
    }

    // Store current for next comparison
    this.previousTickers.set(symbol, current);

    // Can't detect patterns without previous data
    if (!previous) {
      return {
        patterns: [],
        strongestPattern: null,
        overallSignal: 'NEUTRAL',
        overallStrength: 0,
        shouldTrigger: false
      };
    }

    // Detect all pattern types
    const patterns: Pattern[] = [
      ...this.detectConfluencePatterns(current, previous),
      ...this.detectDivergencePatterns(current, previous),
      ...this.detectInstitutionalPatterns(current, previous),
      ...this.detectMomentumPatterns(current, previous)
    ];

    // Filter strong patterns only
    const strongPatterns = patterns.filter(p => p.strength >= this.PATTERN_THRESHOLD);

    // Store in history
    this.updatePatternHistory(symbol, strongPatterns);

    // Find strongest pattern
    const strongestPattern = strongPatterns.length > 0
      ? strongPatterns.reduce((max, p) => p.strength > max.strength ? p : max)
      : null;

    // Determine overall signal (majority vote + strength weighting)
    const overallSignal = this.calculateOverallSignal(strongPatterns);
    const overallStrength = this.calculateOverallStrength(strongPatterns);

    return {
      patterns: strongPatterns,
      strongestPattern,
      overallSignal,
      overallStrength,
      shouldTrigger: overallStrength >= this.PATTERN_THRESHOLD
    };
  }

  /**
   * CONFLUENCE PATTERNS: Multiple signals align
   */
  private detectConfluencePatterns(
    current: EnrichedCanonicalTicker,
    previous: EnrichedCanonicalTicker
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Calculate metrics
    const priceChange = ((current.price - previous.price) / previous.price) * 100;
    const volumeChange = current.volume24h && previous.volume24h
      ? ((current.volume24h - previous.volume24h) / previous.volume24h) * 100
      : 0;
    const timeDelta = (current.timestamp - previous.timestamp) / 1000;
    const priceVelocity = timeDelta > 0 ? Math.abs(priceChange) / timeDelta : 0;

    // PATTERN 1: Bullish Confluence (Price↑ + Volume↑ + Velocity↑)
    if (priceChange > 0.1 && volumeChange > 20 && priceVelocity > 0.3) {
      const components = [];
      let strength = 50; // Base strength

      if (priceChange > 0.2) {
        components.push(`Strong price surge: +${priceChange.toFixed(2)}%`);
        strength += 15;
      } else {
        components.push(`Price rise: +${priceChange.toFixed(2)}%`);
      }

      if (volumeChange > 50) {
        components.push(`Large volume surge: +${volumeChange.toFixed(0)}%`);
        strength += 15;
      } else {
        components.push(`Volume increase: +${volumeChange.toFixed(0)}%`);
      }

      if (priceVelocity > 0.5) {
        components.push(`High velocity: ${priceVelocity.toFixed(2)}%/s`);
        strength += 10;
      }

      // Bonus for order book support (if available)
      if (current.orderBookDepth && current.orderBookDepth.imbalance > 0.2) {
        components.push(`Strong bid support: ${(current.orderBookDepth.imbalance * 100).toFixed(0)}%`);
        strength += 10;
      }

      patterns.push({
        type: 'CONFLUENCE',
        signal: 'BULLISH',
        strength: Math.min(strength, 100),
        confidence: 75,
        components,
        reasoning: `Multiple bullish signals align: ${components.join(', ')}`,
        timestamp: current.timestamp
      });
    }

    // PATTERN 2: Bearish Confluence (Price↓ + Volume↑ + Velocity↑)
    if (priceChange < -0.1 && volumeChange > 20 && priceVelocity > 0.3) {
      const components = [];
      let strength = 50;

      if (priceChange < -0.2) {
        components.push(`Strong price drop: ${priceChange.toFixed(2)}%`);
        strength += 15;
      } else {
        components.push(`Price decline: ${priceChange.toFixed(2)}%`);
      }

      if (volumeChange > 50) {
        components.push(`Large selling volume: +${volumeChange.toFixed(0)}%`);
        strength += 15;
      } else {
        components.push(`Volume increase: +${volumeChange.toFixed(0)}%`);
      }

      if (priceVelocity > 0.5) {
        components.push(`Rapid decline: ${priceVelocity.toFixed(2)}%/s`);
        strength += 10;
      }

      // Bonus for order book weakness (if available)
      if (current.orderBookDepth && current.orderBookDepth.imbalance < -0.2) {
        components.push(`Weak bid support: ${(current.orderBookDepth.imbalance * 100).toFixed(0)}%`);
        strength += 10;
      }

      patterns.push({
        type: 'CONFLUENCE',
        signal: 'BEARISH',
        strength: Math.min(strength, 100),
        confidence: 75,
        components,
        reasoning: `Multiple bearish signals align: ${components.join(', ')}`,
        timestamp: current.timestamp
      });
    }

    return patterns;
  }

  /**
   * DIVERGENCE PATTERNS: Price vs other metrics mismatch
   */
  private detectDivergencePatterns(
    current: EnrichedCanonicalTicker,
    previous: EnrichedCanonicalTicker
  ): Pattern[] {
    const patterns: Pattern[] = [];

    const priceChange = ((current.price - previous.price) / previous.price) * 100;
    const volumeChange = current.volume24h && previous.volume24h
      ? ((current.volume24h - previous.volume24h) / previous.volume24h) * 100
      : 0;

    // PATTERN 1: Accumulation (Price flat/down + Volume up)
    // Smart money loading while retail sleeps
    if (Math.abs(priceChange) < 0.1 && volumeChange > 30) {
      patterns.push({
        type: 'DIVERGENCE',
        signal: 'BULLISH',
        strength: 70 + Math.min(volumeChange / 2, 30),
        confidence: 65,
        components: [
          `Price stable: ${priceChange.toFixed(2)}%`,
          `Volume surge: +${volumeChange.toFixed(0)}%`,
          'Potential accumulation'
        ],
        reasoning: 'Price holding steady while volume increases - possible smart money accumulation',
        timestamp: current.timestamp
      });
    }

    // PATTERN 2: Distribution (Price up + Volume down)
    // Weak rally, retail buying top
    if (priceChange > 0.15 && volumeChange < -10) {
      patterns.push({
        type: 'DIVERGENCE',
        signal: 'BEARISH',
        strength: 70,
        confidence: 60,
        components: [
          `Price rise: +${priceChange.toFixed(2)}%`,
          `Volume declining: ${volumeChange.toFixed(0)}%`,
          'Potential distribution'
        ],
        reasoning: 'Price rising on declining volume - weak rally, possible distribution',
        timestamp: current.timestamp
      });
    }

    // PATTERN 3: Funding rate divergence (if available)
    if (current.fundingRate !== undefined && previous.fundingRate !== undefined) {
      const fundingChange = current.fundingRate - previous.fundingRate;

      // Price up but funding down = shorts trapped
      if (priceChange > 0.2 && fundingChange < -0.0001) {
        patterns.push({
          type: 'DIVERGENCE',
          signal: 'BULLISH',
          strength: 80,
          confidence: 70,
          components: [
            `Price surge: +${priceChange.toFixed(2)}%`,
            `Funding rate falling: ${(fundingChange * 100).toFixed(4)}%`,
            'Shorts trapped'
          ],
          reasoning: 'Price rising while funding rate falls - short squeeze potential',
          timestamp: current.timestamp
        });
      }
    }

    return patterns;
  }

  /**
   * INSTITUTIONAL PATTERNS: Smart money flow
   */
  private detectInstitutionalPatterns(
    current: EnrichedCanonicalTicker,
    previous: EnrichedCanonicalTicker
  ): Pattern[] {
    const patterns: Pattern[] = [];

    // Check institutional flow (if available)
    if (current.institutionalFlow && previous.institutionalFlow) {
      const currentRatio = current.institutionalFlow.ratio;
      const previousRatio = previous.institutionalFlow.ratio;

      // Institutions buying (Coinbase volume > Binance volume)
      if (currentRatio > 1.3 && currentRatio > previousRatio * 1.2) {
        patterns.push({
          type: 'INSTITUTIONAL',
          signal: 'BULLISH',
          strength: 75 + Math.min((currentRatio - 1) * 25, 25),
          confidence: 80,
          components: [
            `Institutional ratio: ${currentRatio.toFixed(2)}x`,
            `Coinbase volume: $${(current.institutionalFlow.coinbaseVolume / 1e6).toFixed(1)}M`,
            'Institutions accumulating'
          ],
          reasoning: 'Institutional volume (Coinbase) significantly higher than retail (Binance) - smart money buying',
          timestamp: current.timestamp
        });
      }

      // Institutions selling
      if (currentRatio < 0.7 && currentRatio < previousRatio * 0.8) {
        patterns.push({
          type: 'INSTITUTIONAL',
          signal: 'BEARISH',
          strength: 75,
          confidence: 75,
          components: [
            `Institutional ratio: ${currentRatio.toFixed(2)}x`,
            `Retail dominance detected`,
            'Institutions distributing'
          ],
          reasoning: 'Retail volume (Binance) higher than institutional (Coinbase) - institutions may be distributing',
          timestamp: current.timestamp
        });
      }
    }

    // Check order book depth imbalance (if available)
    if (current.orderBookDepth) {
      const imbalance = current.orderBookDepth.imbalance;

      if (imbalance > 0.4) {
        patterns.push({
          type: 'INSTITUTIONAL',
          signal: 'BULLISH',
          strength: 70 + (imbalance * 30),
          confidence: 70,
          components: [
            `Bid depth: $${(current.orderBookDepth.bidDepth / 1e6).toFixed(1)}M`,
            `Ask depth: $${(current.orderBookDepth.askDepth / 1e6).toFixed(1)}M`,
            `Imbalance: ${(imbalance * 100).toFixed(0)}% bid-heavy`
          ],
          reasoning: 'Strong bid wall support - institutions providing liquidity for upside',
          timestamp: current.timestamp
        });
      }

      if (imbalance < -0.4) {
        patterns.push({
          type: 'INSTITUTIONAL',
          signal: 'BEARISH',
          strength: 70 + (Math.abs(imbalance) * 30),
          confidence: 70,
          components: [
            `Bid depth: $${(current.orderBookDepth.bidDepth / 1e6).toFixed(1)}M`,
            `Ask depth: $${(current.orderBookDepth.askDepth / 1e6).toFixed(1)}M`,
            `Imbalance: ${(Math.abs(imbalance) * 100).toFixed(0)}% ask-heavy`
          ],
          reasoning: 'Heavy ask wall resistance - institutions providing sell liquidity',
          timestamp: current.timestamp
        });
      }
    }

    return patterns;
  }

  /**
   * MOMENTUM PATTERNS: Trend acceleration
   */
  private detectMomentumPatterns(
    current: EnrichedCanonicalTicker,
    previous: EnrichedCanonicalTicker
  ): Pattern[] {
    const patterns: Pattern[] = [];

    const priceChange = ((current.price - previous.price) / previous.price) * 100;
    const timeDelta = (current.timestamp - previous.timestamp) / 1000;
    const priceVelocity = timeDelta > 0 ? priceChange / timeDelta : 0;

    // Get recent pattern history to detect acceleration
    const symbol = current.symbol;
    const history = this.patternHistory.get(symbol) || [];

    // PATTERN 1: Acceleration (velocity increasing)
    if (history.length >= 3) {
      const recentPatterns = history.slice(-3);
      const allBullish = recentPatterns.every(p => p.signal === 'BULLISH');
      const allBearish = recentPatterns.every(p => p.signal === 'BEARISH');

      if (allBullish && priceVelocity > 0.3) {
        patterns.push({
          type: 'MOMENTUM',
          signal: 'BULLISH',
          strength: 75 + Math.min(priceVelocity * 25, 25),
          confidence: 70,
          components: [
            `Consistent bullish patterns: ${recentPatterns.length}`,
            `Current velocity: ${priceVelocity.toFixed(2)}%/s`,
            'Momentum accelerating'
          ],
          reasoning: 'Multiple consecutive bullish patterns with accelerating velocity - strong uptrend',
          timestamp: current.timestamp
        });
      }

      if (allBearish && priceVelocity < -0.3) {
        patterns.push({
          type: 'MOMENTUM',
          signal: 'BEARISH',
          strength: 75 + Math.min(Math.abs(priceVelocity) * 25, 25),
          confidence: 70,
          components: [
            `Consistent bearish patterns: ${recentPatterns.length}`,
            `Current velocity: ${priceVelocity.toFixed(2)}%/s`,
            'Downward momentum accelerating'
          ],
          reasoning: 'Multiple consecutive bearish patterns with accelerating decline - strong downtrend',
          timestamp: current.timestamp
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate overall signal from multiple patterns
   */
  private calculateOverallSignal(patterns: Pattern[]): PatternSignal {
    if (patterns.length === 0) return 'NEUTRAL';

    const bullishScore = patterns
      .filter(p => p.signal === 'BULLISH')
      .reduce((sum, p) => sum + p.strength, 0);

    const bearishScore = patterns
      .filter(p => p.signal === 'BEARISH')
      .reduce((sum, p) => sum + p.strength, 0);

    if (bullishScore > bearishScore * 1.5) return 'BULLISH';
    if (bearishScore > bullishScore * 1.5) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Calculate overall strength (average of pattern strengths)
   */
  private calculateOverallStrength(patterns: Pattern[]): number {
    if (patterns.length === 0) return 0;

    const totalStrength = patterns.reduce((sum, p) => sum + p.strength, 0);
    return Math.round(totalStrength / patterns.length);
  }

  /**
   * Update pattern history for coin
   */
  private updatePatternHistory(symbol: string, patterns: Pattern[]) {
    if (patterns.length === 0) return;

    const history = this.patternHistory.get(symbol) || [];
    history.push(...patterns);

    // Keep only last N patterns
    if (history.length > this.HISTORY_SIZE) {
      history.splice(0, history.length - this.HISTORY_SIZE);
    }

    this.patternHistory.set(symbol, history);
  }

  /**
   * Get pattern history for coin
   */
  getPatternHistory(symbol: string): Pattern[] {
    return this.patternHistory.get(symbol) || [];
  }

  /**
   * Reset all state
   */
  reset() {
    this.previousTickers.clear();
    this.patternHistory.clear();
  }
}

// Singleton instance
export const intelligentPatternDetector = new IntelligentPatternDetector();
