/**
 * IGX MULTI-STRATEGY ENGINE
 * Runs 10 specialized strategies in parallel
 * Tracks performance of each strategy independently
 */

import { StrategySignal, StrategyName, STRATEGY_METADATA } from './strategyTypes';
import { MarketDataInput } from '../smartMoneySignalEngine';
import { whaleShadowStrategy } from './whaleShadowStrategy';

// Import all strategies (we'll create these next)
import { springTrapStrategy } from './springTrapStrategy';
import { momentumSurgeStrategy } from './momentumSurgeStrategy';
import { fundingSqueezeStrategy } from './fundingSqueezeStrategy';
import { orderFlowTsunamiStrategy } from './orderFlowTsunamiStrategy';
import { fearGreedContrarianStrategy } from './fearGreedContrarianStrategy';
import { goldenCrossMomentumStrategy } from './goldenCrossMomentumStrategy';
import { marketPhaseSniperStrategy } from './marketPhaseSniperStrategy';
import { liquidityHunterStrategy } from './liquidityHunterStrategy';
import { volatilityBreakoutStrategy } from './volatilityBreakoutStrategy';

export interface MultiStrategyResult {
  symbol: string;
  timestamp: Date;
  totalStrategiesRun: number;
  successfulStrategies: number;
  signals: StrategySignal[];
  bestSignal: StrategySignal | null;
  averageConfidence: number;
}

class MultiStrategyEngine {
  private strategies = {
    WHALE_SHADOW: whaleShadowStrategy,
    SPRING_TRAP: springTrapStrategy,
    MOMENTUM_SURGE: momentumSurgeStrategy,
    FUNDING_SQUEEZE: fundingSqueezeStrategy,
    ORDER_FLOW_TSUNAMI: orderFlowTsunamiStrategy,
    FEAR_GREED_CONTRARIAN: fearGreedContrarianStrategy,
    GOLDEN_CROSS_MOMENTUM: goldenCrossMomentumStrategy,
    MARKET_PHASE_SNIPER: marketPhaseSniperStrategy,
    LIQUIDITY_HUNTER: liquidityHunterStrategy,
    VOLATILITY_BREAKOUT: volatilityBreakoutStrategy
  };

  /**
   * Analyze a coin using all 10 strategies in parallel
   */
  async analyzeWithAllStrategies(data: MarketDataInput): Promise<MultiStrategyResult> {
    console.log(`\n[MultiStrategy] Running all 10 strategies for ${data.symbol.toUpperCase()}...`);

    // Run all strategies in parallel
    const strategyPromises = Object.entries(this.strategies).map(async ([name, strategy]) => {
      try {
        const result = await strategy.analyze(data);
        console.log(`[${name}] ${result.rejected ? '❌' : '✅'} ${result.type || 'REJECTED'} | Confidence: ${result.confidence}%`);
        return result;
      } catch (error) {
        console.error(`[${name}] Error:`, error);
        return {
          strategyName: name as StrategyName,
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK' as const,
          reasoning: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          entryMin: 0,
          entryMax: 0,
          targets: { target1: 0, target2: 0, target3: 0 },
          stopLoss: 0,
          riskRewardRatio: 0,
          timeframe: '0',
          indicators: {},
          rejected: true,
          rejectionReason: `Strategy execution error`
        };
      }
    });

    const allSignals = await Promise.all(strategyPromises);

    // Filter successful signals (not rejected, confidence above threshold)
    const successfulSignals = allSignals.filter(
      s => !s.rejected && s.type !== null && s.confidence >= STRATEGY_METADATA[s.strategyName].minConfidenceThreshold
    );

    // Find best signal (highest confidence)
    const bestSignal = successfulSignals.length > 0
      ? successfulSignals.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
      : null;

    // Calculate average confidence of successful signals
    const averageConfidence = successfulSignals.length > 0
      ? successfulSignals.reduce((sum, s) => sum + s.confidence, 0) / successfulSignals.length
      : 0;

    console.log(`[MultiStrategy] ${data.symbol.toUpperCase()} Results:`);
    console.log(`  - Total Strategies Run: 10`);
    console.log(`  - Successful Signals: ${successfulSignals.length}`);
    console.log(`  - Best Signal: ${bestSignal ? `${bestSignal.strategyName} (${bestSignal.confidence}%)` : 'None'}`);
    console.log(`  - Average Confidence: ${averageConfidence.toFixed(1)}%`);

    return {
      symbol: data.symbol,
      timestamp: new Date(),
      totalStrategiesRun: 10,
      successfulStrategies: successfulSignals.length,
      signals: allSignals,
      bestSignal,
      averageConfidence: Math.round(averageConfidence * 10) / 10
    };
  }

  /**
   * Analyze with specific strategies only
   */
  async analyzeWithStrategies(
    data: MarketDataInput,
    strategyNames: StrategyName[]
  ): Promise<MultiStrategyResult> {
    console.log(`\n[MultiStrategy] Running ${strategyNames.length} strategies for ${data.symbol.toUpperCase()}...`);

    const selectedStrategies = strategyNames.map(name => ({
      name,
      strategy: this.strategies[name]
    }));

    const strategyPromises = selectedStrategies.map(async ({ name, strategy }) => {
      try {
        const result = await strategy.analyze(data);
        console.log(`[${name}] ${result.rejected ? '❌' : '✅'} ${result.type || 'REJECTED'} | Confidence: ${result.confidence}%`);
        return result;
      } catch (error) {
        console.error(`[${name}] Error:`, error);
        return {
          strategyName: name,
          symbol: data.symbol,
          type: null,
          confidence: 0,
          strength: 'WEAK' as const,
          reasoning: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          entryMin: 0,
          entryMax: 0,
          targets: { target1: 0, target2: 0, target3: 0 },
          stopLoss: 0,
          riskRewardRatio: 0,
          timeframe: '0',
          indicators: {},
          rejected: true,
          rejectionReason: `Strategy execution error`
        };
      }
    });

    const allSignals = await Promise.all(strategyPromises);

    const successfulSignals = allSignals.filter(
      s => !s.rejected && s.type !== null && s.confidence >= STRATEGY_METADATA[s.strategyName].minConfidenceThreshold
    );

    const bestSignal = successfulSignals.length > 0
      ? successfulSignals.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
      : null;

    const averageConfidence = successfulSignals.length > 0
      ? successfulSignals.reduce((sum, s) => sum + s.confidence, 0) / successfulSignals.length
      : 0;

    return {
      symbol: data.symbol,
      timestamp: new Date(),
      totalStrategiesRun: strategyNames.length,
      successfulStrategies: successfulSignals.length,
      signals: allSignals,
      bestSignal,
      averageConfidence: Math.round(averageConfidence * 10) / 10
    };
  }

  /**
   * Get metadata for all strategies
   */
  getAllStrategyMetadata() {
    return STRATEGY_METADATA;
  }

  /**
   * Get metadata for specific strategy
   */
  getStrategyMetadata(strategyName: StrategyName) {
    return STRATEGY_METADATA[strategyName];
  }
}

export const multiStrategyEngine = new MultiStrategyEngine();
