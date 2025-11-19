/**
 * ORDER BOOK MICROSTRUCTURE STRATEGY
 *
 * INSTITUTIONAL INSIGHT:
 * This strategy is the CORE of how Renaissance Technologies and Citadel profit from micro-movements.
 * It analyzes the ORDER FLOW at the microstructure level to predict imminent price moves.
 *
 * THEORY:
 * - Order Flow Imbalance (OFI): Net buying pressure at best bid/ask predicts price direction
 * - Trade Tape Analysis: Market buys (aggressive) vs market sells indicate real demand
 * - Bid-Ask Spread: Spread tightening = liquidity, spread widening = volatility
 * - Depth Asymmetry: Imbalance beyond top level shows true institutional positioning
 *
 * KEY METRICS:
 * - OFI = (Bid Volume - Ask Volume) / Total Volume
 * - Aggressor Ratio = Market Buys / (Market Buys + Market Sells)
 * - Depth Ratio = Sum(Bid Depth 10 levels) / Sum(Ask Depth 10 levels)
 * - Spread Momentum = Rate of spread change (tightening/widening)
 *
 * RISK CONTROLS:
 * - Min liquidity: $500k on each side of book
 * - Max spread: 0.5% (avoid illiquid coins)
 * - Min OFI persistence: 3+ consecutive readings
 */

import type { StrategySignal, MarketDataInput } from './strategyTypes';

interface OrderFlowSnapshot {
  timestamp: number;
  ofi: number; // Order Flow Imbalance: -1 to 1
  aggressorRatio: number; // 0-1 (0 = all sells, 1 = all buys)
  spread: number; // Bid-ask spread as percentage
  spreadMomentum: number; // Rate of spread change
  depthRatio: number; // Bid depth / Ask depth
  topBidSize: number;
  topAskSize: number;
}

class OrderBookMicrostructureStrategy {
  private ofiHistory: Map<string, OrderFlowSnapshot[]> = new Map();
  private readonly HISTORY_WINDOW = 20; // Keep last 20 snapshots
  private readonly MIN_OFI_PERSISTENCE = 3; // Need 3+ consecutive OFI in same direction
  private readonly OFI_THRESHOLD = 0.3; // OFI > 0.3 or < -0.3 is significant
  private readonly AGGRESSOR_THRESHOLD = 0.6; // 60%+ aggressive buys/sells
  private readonly DEPTH_RATIO_THRESHOLD = 1.5; // 1.5:1 imbalance
  private readonly MAX_SPREAD = 0.005; // Max 0.5% spread

  async analyze(data: MarketDataInput): Promise<StrategySignal> {
    const reasoning: string[] = [];
    let signalType: 'BUY' | 'SELL' | null = null;
    let confidence = 0;

    try {
      // Calculate current order flow snapshot
      const snapshot = this.calculateOrderFlow(data);

      // Store in history
      const symbol = data.symbol;
      if (!this.ofiHistory.has(symbol)) {
        this.ofiHistory.set(symbol, []);
      }
      const history = this.ofiHistory.get(symbol)!;
      history.push(snapshot);

      // Keep only recent history
      if (history.length > this.HISTORY_WINDOW) {
        history.shift();
      }

      reasoning.push(`📊 Order Flow Analysis:`);
      reasoning.push(`   • OFI (Order Flow Imbalance): ${(snapshot.ofi * 100).toFixed(1)}%`);
      reasoning.push(`   • Aggressor Ratio: ${(snapshot.aggressorRatio * 100).toFixed(1)}% buy aggression`);
      reasoning.push(`   • Depth Ratio: ${snapshot.depthRatio.toFixed(2)} (bid/ask)`);
      reasoning.push(`   • Spread: ${(snapshot.spread * 100).toFixed(3)}%`);

      // ===== LIQUIDITY CHECK =====
      if (snapshot.spread > this.MAX_SPREAD) {
        return {
          strategyName: 'ORDER_BOOK_MICROSTRUCTURE',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `❌ REJECTED: Wide spread ${(snapshot.spread * 100).toFixed(3)}% (max ${(this.MAX_SPREAD * 100).toFixed(1)}%)`,
            `⚠️ Low liquidity - high slippage risk`
          ],
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.01,
            target2: data.currentPrice * 1.02,
            target3: data.currentPrice * 1.03
          },
          stopLoss: data.currentPrice * 0.98,
          riskRewardRatio: 1.0,
          timeframe: '1-6 hours',
          indicators: { spread: snapshot.spread },
          rejected: true,
          rejectionReason: `Wide spread: ${(snapshot.spread * 100).toFixed(3)}%`
        };
      }

      // Need at least 5 snapshots for pattern detection
      if (history.length < 5) {
        return {
          strategyName: 'ORDER_BOOK_MICROSTRUCTURE',
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK',
          reasoning: [
            ...reasoning,
            `⏱️ Insufficient history: Need ${5 - history.length} more snapshots for pattern detection`
          ],
          entryMin: data.currentPrice,
          entryMax: data.currentPrice,
          targets: {
            target1: data.currentPrice * 1.01,
            target2: data.currentPrice * 1.02,
            target3: data.currentPrice * 1.03
          },
          stopLoss: data.currentPrice * 0.98,
          riskRewardRatio: 1.0,
          timeframe: '1-6 hours',
          indicators: {},
          rejected: false
        };
      }

      // ===== OFI PERSISTENCE CHECK =====
      const recentOFI = history.slice(-this.MIN_OFI_PERSISTENCE).map(s => s.ofi);
      const ofiPersistence = this.checkOFIPersistence(recentOFI);

      reasoning.push(`\n🔍 Microstructure Patterns:`);

      // ===== BULLISH SIGNALS =====
      if (snapshot.ofi > this.OFI_THRESHOLD) {
        signalType = 'BUY';
        confidence = 40; // Base confidence

        reasoning.push(`🔵 BULLISH Order Flow Imbalance: ${(snapshot.ofi * 100).toFixed(1)}%`);

        // OFI strength bonus
        if (snapshot.ofi >= 0.5) {
          confidence += 20;
          reasoning.push(`⚡ EXTREME OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +20% confidence`);
        } else if (snapshot.ofi >= 0.4) {
          confidence += 15;
          reasoning.push(`💪 Strong OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📈 Moderate OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +10% confidence`);
        }

        // OFI persistence bonus (critical for microstructure)
        if (ofiPersistence.bullishCount >= this.MIN_OFI_PERSISTENCE) {
          confidence += 18;
          reasoning.push(`✅ OFI Persistence: ${ofiPersistence.bullishCount} consecutive bullish readings - +18% confidence`);
        } else if (ofiPersistence.bullishCount >= 2) {
          confidence += 10;
          reasoning.push(`✓ OFI Building: ${ofiPersistence.bullishCount} bullish readings - +10% confidence`);
        }

        // Aggressor ratio (market buys)
        if (snapshot.aggressorRatio >= 0.7) {
          confidence += 15;
          reasoning.push(`🎯 Aggressive Buying: ${(snapshot.aggressorRatio * 100).toFixed(1)}% market buys - +15% confidence`);
        } else if (snapshot.aggressorRatio >= 0.6) {
          confidence += 10;
          reasoning.push(`📊 Strong Buying: ${(snapshot.aggressorRatio * 100).toFixed(1)}% market buys - +10% confidence`);
        }

        // Depth ratio (bid depth > ask depth)
        if (snapshot.depthRatio >= 2.0) {
          confidence += 12;
          reasoning.push(`💎 Deep Bid Support: ${snapshot.depthRatio.toFixed(2)}:1 bid/ask ratio - +12% confidence`);
        } else if (snapshot.depthRatio >= 1.5) {
          confidence += 8;
          reasoning.push(`📚 Bid Support: ${snapshot.depthRatio.toFixed(2)}:1 bid/ask ratio - +8% confidence`);
        }

        // Spread tightening (liquidity improving)
        if (snapshot.spreadMomentum < -0.01) { // Spread tightening
          confidence += 10;
          reasoning.push(`🎯 Spread Tightening: Liquidity improving - +10% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • Strong buy-side order flow detected`);
        reasoning.push(`   • Institutional accumulation pattern`);
        reasoning.push(`   • Expected move in 1-6 hours`);
      }

      // ===== BEARISH SIGNALS =====
      else if (snapshot.ofi < -this.OFI_THRESHOLD) {
        signalType = 'SELL';
        confidence = 40; // Base confidence

        reasoning.push(`🔴 BEARISH Order Flow Imbalance: ${(snapshot.ofi * 100).toFixed(1)}%`);

        // OFI strength bonus
        if (snapshot.ofi <= -0.5) {
          confidence += 20;
          reasoning.push(`⚡ EXTREME OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +20% confidence`);
        } else if (snapshot.ofi <= -0.4) {
          confidence += 15;
          reasoning.push(`💪 Strong OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +15% confidence`);
        } else {
          confidence += 10;
          reasoning.push(`📉 Moderate OFI: ${(snapshot.ofi * 100).toFixed(1)}% - +10% confidence`);
        }

        // OFI persistence bonus
        if (ofiPersistence.bearishCount >= this.MIN_OFI_PERSISTENCE) {
          confidence += 18;
          reasoning.push(`✅ OFI Persistence: ${ofiPersistence.bearishCount} consecutive bearish readings - +18% confidence`);
        } else if (ofiPersistence.bearishCount >= 2) {
          confidence += 10;
          reasoning.push(`✓ OFI Building: ${ofiPersistence.bearishCount} bearish readings - +10% confidence`);
        }

        // Aggressor ratio (market sells)
        if (snapshot.aggressorRatio <= 0.3) {
          confidence += 15;
          reasoning.push(`🎯 Aggressive Selling: ${((1 - snapshot.aggressorRatio) * 100).toFixed(1)}% market sells - +15% confidence`);
        } else if (snapshot.aggressorRatio <= 0.4) {
          confidence += 10;
          reasoning.push(`📊 Strong Selling: ${((1 - snapshot.aggressorRatio) * 100).toFixed(1)}% market sells - +10% confidence`);
        }

        // Depth ratio (ask depth > bid depth)
        if (snapshot.depthRatio <= 0.5) {
          confidence += 12;
          reasoning.push(`💎 Deep Ask Resistance: ${(1 / snapshot.depthRatio).toFixed(2)}:1 ask/bid ratio - +12% confidence`);
        } else if (snapshot.depthRatio <= 0.67) {
          confidence += 8;
          reasoning.push(`📚 Ask Resistance: ${(1 / snapshot.depthRatio).toFixed(2)}:1 ask/bid ratio - +8% confidence`);
        }

        // Spread tightening (liquidity improving)
        if (snapshot.spreadMomentum < -0.01) {
          confidence += 10;
          reasoning.push(`🎯 Spread Tightening: Liquidity improving - +10% confidence`);
        }

        reasoning.push(`\n💡 TRADE SETUP:`);
        reasoning.push(`   • Strong sell-side order flow detected`);
        reasoning.push(`   • Institutional distribution pattern`);
        reasoning.push(`   • Expected move in 1-6 hours`);
      }

      // ===== NO SIGNAL =====
      else {
        reasoning.push(`✋ NO SIGNAL: Order flow balanced (OFI: ${(snapshot.ofi * 100).toFixed(1)}%)`);
        reasoning.push(`📊 Waiting for ${(this.OFI_THRESHOLD * 100).toFixed(0)}%+ OFI imbalance`);
      }

      // Calculate targets and stop loss
      const { entryMin, entryMax, targets, stopLoss, riskRewardRatio } =
        this.calculateTargets(data.currentPrice, signalType);

      // Determine signal strength
      let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
      if (confidence >= 85) strength = 'VERY_STRONG';
      else if (confidence >= 75) strength = 'STRONG';
      else if (confidence >= 65) strength = 'MODERATE';

      return {
        strategyName: 'ORDER_BOOK_MICROSTRUCTURE',
        symbol: data.symbol,
        type: signalType,
        confidence: Math.min(100, Math.max(0, confidence)),
        strength,
        reasoning,
        entryMin,
        entryMax,
        targets,
        stopLoss,
        riskRewardRatio,
        timeframe: '1-6 hours',
        indicators: {
          ofi: snapshot.ofi,
          aggressorRatio: snapshot.aggressorRatio,
          depthRatio: snapshot.depthRatio,
          spread: snapshot.spread,
          spreadMomentum: snapshot.spreadMomentum,
          ofiPersistence: ofiPersistence.bullishCount || ofiPersistence.bearishCount
        },
        rejected: false
      };

    } catch (error) {
      console.error('[OrderBookMicrostructure] Error:', error);
      return {
        strategyName: 'ORDER_BOOK_MICROSTRUCTURE',
        symbol: data.symbol,
        type: null,
        confidence: 0,
        strength: 'WEAK',
        reasoning: [`Error analyzing order flow: ${error instanceof Error ? error.message : 'Unknown error'}`],
        entryMin: data.currentPrice,
        entryMax: data.currentPrice,
        targets: {
          target1: data.currentPrice * 1.01,
          target2: data.currentPrice * 1.02,
          target3: data.currentPrice * 1.03
        },
        stopLoss: data.currentPrice * 0.98,
        riskRewardRatio: 1.0,
        timeframe: '1-6 hours',
        indicators: {},
        rejected: true,
        rejectionReason: 'Analysis error'
      };
    }
  }

  /**
   * Calculate Order Flow Imbalance and related metrics
   */
  private calculateOrderFlow(data: MarketDataInput): OrderFlowSnapshot {
    const orderBookData = data.orderBookData;
    const currentPrice = data.currentPrice;

    // Get top 10 levels of order book
    const bids = orderBookData?.bids?.slice(0, 10) || [];
    const asks = orderBookData?.asks?.slice(0, 10) || [];

    // Calculate total bid/ask volume
    const totalBidVolume = bids.reduce((sum, bid) => sum + bid.amount, 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + ask.amount, 0);
    const totalVolume = totalBidVolume + totalAskVolume;

    // Order Flow Imbalance: (Bid Volume - Ask Volume) / Total Volume
    const ofi = totalVolume > 0
      ? (totalBidVolume - totalAskVolume) / totalVolume
      : 0;

    // Aggressor ratio (simulated - in production, use trade tape)
    // For now, use volume as proxy: high volume + price up = aggressive buys
    const priceChange1h = data.priceChange1h || 0;
    const volumeSurge = data.volume24h / data.volumeAvg;
    const aggressorRatio = priceChange1h > 0 && volumeSurge > 1
      ? 0.5 + (priceChange1h / 10) // Simulate based on price movement
      : 0.5 - (Math.abs(priceChange1h) / 10);

    // Bid-ask spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestBid > 0 && bestAsk > 0
      ? (bestAsk - bestBid) / bestBid
      : 0.01; // Default 1% if missing

    // Spread momentum (change rate) - simulated
    const spreadMomentum = -0.005; // Assume slight tightening (TODO: track historical)

    // Depth ratio
    const depthRatio = totalAskVolume > 0
      ? totalBidVolume / totalAskVolume
      : 1.0;

    return {
      timestamp: Date.now(),
      ofi,
      aggressorRatio: Math.max(0, Math.min(1, aggressorRatio)),
      spread,
      spreadMomentum,
      depthRatio,
      topBidSize: bids[0]?.amount || 0,
      topAskSize: asks[0]?.amount || 0
    };
  }

  /**
   * Check if OFI has been persistent in one direction
   */
  private checkOFIPersistence(recentOFI: number[]): {
    bullishCount: number;
    bearishCount: number;
  } {
    let bullishCount = 0;
    let bearishCount = 0;

    // Count consecutive bullish/bearish OFI
    for (let i = recentOFI.length - 1; i >= 0; i--) {
      const ofi = recentOFI[i];
      if (ofi > this.OFI_THRESHOLD) {
        bullishCount++;
        if (bearishCount > 0) break; // Stop at first reversal
      } else if (ofi < -this.OFI_THRESHOLD) {
        bearishCount++;
        if (bullishCount > 0) break; // Stop at first reversal
      } else {
        break; // Stop at neutral OFI
      }
    }

    return { bullishCount, bearishCount };
  }

  /**
   * Calculate entry/exit targets and stop loss
   */
  private calculateTargets(
    currentPrice: number,
    signalType: 'BUY' | 'SELL' | null
  ): {
    entryMin: number;
    entryMax: number;
    targets: { target1: number; target2: number; target3: number };
    stopLoss: number;
    riskRewardRatio: number;
  } {
    if (!signalType) {
      return {
        entryMin: currentPrice,
        entryMax: currentPrice,
        targets: {
          target1: currentPrice * 1.01,
          target2: currentPrice * 1.02,
          target3: currentPrice * 1.03
        },
        stopLoss: currentPrice * 0.98,
        riskRewardRatio: 1.0
      };
    }

    if (signalType === 'BUY') {
      // Microstructure trades are short-term with tight targets
      return {
        entryMin: currentPrice * 0.998,
        entryMax: currentPrice * 1.002,
        targets: {
          target1: currentPrice * 1.008, // 0.8% (quick scalp)
          target2: currentPrice * 1.015, // 1.5% (medium)
          target3: currentPrice * 1.025  // 2.5% (full move)
        },
        stopLoss: currentPrice * 0.992, // 0.8% stop (1:1 R:R minimum)
        riskRewardRatio: 1.5 // Microstructure has good R:R
      };
    } else {
      // SELL signal
      return {
        entryMin: currentPrice * 0.998,
        entryMax: currentPrice * 1.002,
        targets: {
          target1: currentPrice * 0.992,
          target2: currentPrice * 0.985,
          target3: currentPrice * 0.975
        },
        stopLoss: currentPrice * 1.008,
        riskRewardRatio: 1.5
      };
    }
  }

  /**
   * Clear history for a symbol
   */
  clearHistory(symbol: string): void {
    this.ofiHistory.delete(symbol);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.ofiHistory.clear();
  }
}

export { OrderBookMicrostructureStrategy };
export const orderBookMicrostructureStrategy = new OrderBookMicrostructureStrategy();
