/**
 * 5×17 Strategy Matrix
 *
 * Maps each of the 17 trading strategies to the 5 market states
 * with suitability scores (0-100).
 *
 * This enables intelligent strategy selection based on current market conditions.
 *
 * Strategies are organized into 3 agent specializations:
 * - Alpha Agent (Trend Engine): Strategies that thrive in trending markets
 * - Beta Agent (Reversion Engine): Strategies that profit from mean reversion
 * - Gamma Agent (Chaos Engine): Strategies designed for high volatility
 */

import { MarketState } from './marketStateDetectionEngine';

export enum AgentType {
  ALPHAX = 'alphaX', // Trend Engine
  BETAX = 'betaX', // Reversion Engine
  QUANTUMX = 'QuantumX', // Chaos Engine
}

export interface StrategyProfile {
  name: string;
  fileName: string;
  agent: AgentType;
  description: string;
  suitability: {
    [MarketState.BULLISH_HIGH_VOL]: number;
    [MarketState.BULLISH_LOW_VOL]: number;
    [MarketState.BEARISH_HIGH_VOL]: number;
    [MarketState.BEARISH_LOW_VOL]: number;
    [MarketState.RANGEBOUND]: number;
  };
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframes: string[];
}

export const STRATEGY_MATRIX: Record<string, StrategyProfile> = {
  // ============================================
  // alphaX AGENT - TREND ENGINE
  // ============================================

  momentumSurgeV2: {
    name: 'Momentum Surge V2',
    fileName: 'momentumSurgeV2Strategy',
    agent: AgentType.ALPHAX,
    description: 'Institutional momentum continuation with volume confirmation',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 95,
      [MarketState.BULLISH_LOW_VOL]: 80,
      [MarketState.BEARISH_HIGH_VOL]: 30,
      [MarketState.BEARISH_LOW_VOL]: 20,
      [MarketState.RANGEBOUND]: 25,
    },
    risk: 'MEDIUM',
    timeframes: ['15m', '1h', '4h'],
  },

  goldenCrossMomentum: {
    name: 'Golden Cross Momentum',
    fileName: 'goldenCrossMomentumStrategy',
    agent: AgentType.ALPHAX,
    description: 'EMA crossover with momentum confirmation',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 85,
      [MarketState.BULLISH_LOW_VOL]: 90,
      [MarketState.BEARISH_HIGH_VOL]: 35,
      [MarketState.BEARISH_LOW_VOL]: 40,
      [MarketState.RANGEBOUND]: 30,
    },
    risk: 'LOW',
    timeframes: ['1h', '4h', '1d'],
  },

  orderFlowTsunami: {
    name: 'Order Flow Tsunami',
    fileName: 'orderFlowTsunamiStrategy',
    agent: AgentType.ALPHAX,
    description: 'Order book imbalance detection for trend continuation',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 90,
      [MarketState.BULLISH_LOW_VOL]: 70,
      [MarketState.BEARISH_HIGH_VOL]: 90,
      [MarketState.BEARISH_LOW_VOL]: 65,
      [MarketState.RANGEBOUND]: 40,
    },
    risk: 'HIGH',
    timeframes: ['15m', '1h'],
  },

  whaleShadow: {
    name: 'Whale Shadow',
    fileName: 'whaleShadowStrategy',
    agent: AgentType.ALPHAX,
    description: 'Smart money divergence and whale accumulation detection',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 75,
      [MarketState.BULLISH_LOW_VOL]: 85,
      [MarketState.BEARISH_HIGH_VOL]: 70,
      [MarketState.BEARISH_LOW_VOL]: 80,
      [MarketState.RANGEBOUND]: 60,
    },
    risk: 'MEDIUM',
    timeframes: ['1h', '4h'],
  },

  liquidityHunter: {
    name: 'Liquidity Hunter',
    fileName: 'liquidityHunterStrategy',
    agent: AgentType.ALPHAX,
    description: 'Exchange flow analysis and volume spike detection',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 85,
      [MarketState.BULLISH_LOW_VOL]: 65,
      [MarketState.BEARISH_HIGH_VOL]: 80,
      [MarketState.BEARISH_LOW_VOL]: 60,
      [MarketState.RANGEBOUND]: 50,
    },
    risk: 'MEDIUM',
    timeframes: ['15m', '1h', '4h'],
  },

  marketPhasSniper: {
    name: 'Market Phase Sniper',
    fileName: 'marketPhaseSniperStrategy',
    agent: AgentType.ALPHAX,
    description: 'Adaptive strategy that adjusts to market phase',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 80,
      [MarketState.BULLISH_LOW_VOL]: 80,
      [MarketState.BEARISH_HIGH_VOL]: 75,
      [MarketState.BEARISH_LOW_VOL]: 75,
      [MarketState.RANGEBOUND]: 70,
    },
    risk: 'MEDIUM',
    timeframes: ['15m', '1h', '4h'],
  },

  // ============================================
  // betaX AGENT - REVERSION ENGINE
  // ============================================

  momentumRecovery: {
    name: 'Momentum Recovery',
    fileName: 'momentumRecoveryStrategy',
    agent: AgentType.BETAX,
    description: 'Mean reversion after oversold conditions',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 50,
      [MarketState.BULLISH_LOW_VOL]: 70,
      [MarketState.BEARISH_HIGH_VOL]: 60,
      [MarketState.BEARISH_LOW_VOL]: 75,
      [MarketState.RANGEBOUND]: 90,
    },
    risk: 'MEDIUM',
    timeframes: ['15m', '1h', '4h'],
  },

  bollingerMeanReversion: {
    name: 'Bollinger Mean Reversion',
    fileName: 'bollingerMeanReversionStrategy',
    agent: AgentType.BETAX,
    description: 'Band bounce mean reversion strategy',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 40,
      [MarketState.BULLISH_LOW_VOL]: 60,
      [MarketState.BEARISH_HIGH_VOL]: 45,
      [MarketState.BEARISH_LOW_VOL]: 65,
      [MarketState.RANGEBOUND]: 95,
    },
    risk: 'LOW',
    timeframes: ['15m', '1h', '4h'],
  },

  fearGreedContrarian: {
    name: 'Fear & Greed Contrarian',
    fileName: 'fearGreedContrarianStrategy',
    agent: AgentType.BETAX,
    description: 'Contrarian positions at sentiment extremes',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 55,
      [MarketState.BULLISH_LOW_VOL]: 40,
      [MarketState.BEARISH_HIGH_VOL]: 75,
      [MarketState.BEARISH_LOW_VOL]: 60,
      [MarketState.RANGEBOUND]: 70,
    },
    risk: 'HIGH',
    timeframes: ['1h', '4h', '1d'],
  },

  springTrap: {
    name: 'Spring Trap',
    fileName: 'springTrapStrategy',
    agent: AgentType.BETAX,
    description: 'Wyckoff accumulation and spring detection',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 60,
      [MarketState.BULLISH_LOW_VOL]: 75,
      [MarketState.BEARISH_HIGH_VOL]: 65,
      [MarketState.BEARISH_LOW_VOL]: 70,
      [MarketState.RANGEBOUND]: 85,
    },
    risk: 'MEDIUM',
    timeframes: ['1h', '4h'],
  },

  statisticalArbitrage: {
    name: 'Statistical Arbitrage',
    fileName: 'statisticalArbitrageStrategy',
    agent: AgentType.BETAX,
    description: 'Pairs trading and correlation-based mean reversion',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 50,
      [MarketState.BULLISH_LOW_VOL]: 70,
      [MarketState.BEARISH_HIGH_VOL]: 55,
      [MarketState.BEARISH_LOW_VOL]: 75,
      [MarketState.RANGEBOUND]: 90,
    },
    risk: 'MEDIUM',
    timeframes: ['15m', '1h', '4h'],
  },

  correlationBreakdown: {
    name: 'Correlation Breakdown',
    fileName: 'correlationBreakdownDetectorStrategy',
    agent: AgentType.BETAX,
    description: 'Detects when BTC correlation breaks down',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 65,
      [MarketState.BULLISH_LOW_VOL]: 70,
      [MarketState.BEARISH_HIGH_VOL]: 70,
      [MarketState.BEARISH_LOW_VOL]: 75,
      [MarketState.RANGEBOUND]: 80,
    },
    risk: 'MEDIUM',
    timeframes: ['1h', '4h'],
  },

  // ============================================
  // QuantumX AGENT - CHAOS ENGINE
  // ============================================

  volatilityBreakout: {
    name: 'Volatility Breakout',
    fileName: 'volatilityBreakoutStrategy',
    agent: AgentType.QUANTUMX,
    description: 'Bollinger squeeze and ATR expansion',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 95,
      [MarketState.BULLISH_LOW_VOL]: 50,
      [MarketState.BEARISH_HIGH_VOL]: 95,
      [MarketState.BEARISH_LOW_VOL]: 45,
      [MarketState.RANGEBOUND]: 40,
    },
    risk: 'HIGH',
    timeframes: ['15m', '1h', '4h'],
  },

  fundingSqueeze: {
    name: 'Funding Squeeze',
    fileName: 'fundingSqueezeStrategy',
    agent: AgentType.QUANTUMX,
    description: 'Exploits funding rate extremes in high volatility',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 90,
      [MarketState.BULLISH_LOW_VOL]: 40,
      [MarketState.BEARISH_HIGH_VOL]: 95,
      [MarketState.BEARISH_LOW_VOL]: 45,
      [MarketState.RANGEBOUND]: 35,
    },
    risk: 'HIGH',
    timeframes: ['15m', '1h'],
  },

  liquidationCascade: {
    name: 'Liquidation Cascade',
    fileName: 'liquidationCascadePredictionStrategy',
    agent: AgentType.QUANTUMX,
    description: 'Predicts cascading liquidations from OI clustering',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 90,
      [MarketState.BULLISH_LOW_VOL]: 35,
      [MarketState.BEARISH_HIGH_VOL]: 95,
      [MarketState.BEARISH_LOW_VOL]: 40,
      [MarketState.RANGEBOUND]: 30,
    },
    risk: 'HIGH',
    timeframes: ['15m', '1h'],
  },

  orderBookMicrostructure: {
    name: 'Order Book Microstructure',
    fileName: 'orderBookMicrostructureStrategy',
    agent: AgentType.QUANTUMX,
    description: 'Order Flow Imbalance (OFI) analysis for volatile markets',
    suitability: {
      [MarketState.BULLISH_HIGH_VOL]: 85,
      [MarketState.BULLISH_LOW_VOL]: 50,
      [MarketState.BEARISH_HIGH_VOL]: 90,
      [MarketState.BEARISH_LOW_VOL]: 55,
      [MarketState.RANGEBOUND]: 45,
    },
    risk: 'HIGH',
    timeframes: ['15m', '1h'],
  },
};

/**
 * Strategy Matrix Service
 */
class StrategyMatrixService {
  /**
   * Get strategies suitable for current market state
   * @param marketState - Current market state
   * @param minSuitability - Minimum suitability score (0-100)
   * @param agent - Optional: Filter by agent type
   * @returns Array of suitable strategies sorted by suitability
   */
  getSuitableStrategies(
    marketState: MarketState,
    minSuitability: number = 60,
    agent?: AgentType
  ): Array<{ strategy: StrategyProfile; suitability: number }> {
    const strategies = Object.values(STRATEGY_MATRIX)
      .filter(strategy => {
        // Filter by agent if specified
        if (agent && strategy.agent !== agent) {
          return false;
        }
        // Filter by minimum suitability
        return strategy.suitability[marketState] >= minSuitability;
      })
      .map(strategy => ({
        strategy,
        suitability: strategy.suitability[marketState],
      }))
      .sort((a, b) => b.suitability - a.suitability);

    return strategies;
  }

  /**
   * Get strategy by name
   */
  getStrategy(strategyName: string): StrategyProfile | undefined {
    return STRATEGY_MATRIX[strategyName];
  }

  /**
   * Get all strategies for a specific agent
   */
  getAgentStrategies(agent: AgentType): StrategyProfile[] {
    return Object.values(STRATEGY_MATRIX).filter(s => s.agent === agent);
  }

  /**
   * Get recommended agent for current market state
   */
  getRecommendedAgent(marketState: MarketState): AgentType {
    // Calculate average suitability for each agent
    const agentScores: Record<AgentType, number> = {
      [AgentType.ALPHAX]: 0,
      [AgentType.BETAX]: 0,
      [AgentType.QUANTUMX]: 0,
    };

    const agentCounts: Record<AgentType, number> = {
      [AgentType.ALPHAX]: 0,
      [AgentType.BETAX]: 0,
      [AgentType.QUANTUMX]: 0,
    };

    Object.values(STRATEGY_MATRIX).forEach(strategy => {
      agentScores[strategy.agent] += strategy.suitability[marketState];
      agentCounts[strategy.agent]++;
    });

    // Calculate average scores
    const avgScores = {
      [AgentType.ALPHAX]: agentScores[AgentType.ALPHAX] / agentCounts[AgentType.ALPHAX],
      [AgentType.BETAX]: agentScores[AgentType.BETAX] / agentCounts[AgentType.BETAX],
      [AgentType.QUANTUMX]: agentScores[AgentType.QUANTUMX] / agentCounts[AgentType.QUANTUMX],
    };

    // Find agent with highest average score
    return (Object.entries(avgScores).reduce((best, [agent, score]) =>
      score > best[1] ? [agent, score] : best
    )[0] as AgentType);
  }

  /**
   * Get strategy distribution across market states
   */
  getStrategyDistribution(): Record<AgentType, number> {
    const distribution: Record<AgentType, number> = {
      [AgentType.ALPHAX]: 0,
      [AgentType.BETAX]: 0,
      [AgentType.QUANTUMX]: 0,
    };

    Object.values(STRATEGY_MATRIX).forEach(strategy => {
      distribution[strategy.agent]++;
    });

    return distribution;
  }

  /**
   * Generate strategy matrix visualization (for debugging)
   */
  generateMatrixVisualization(): string {
    const states = [
      MarketState.BULLISH_HIGH_VOL,
      MarketState.BULLISH_LOW_VOL,
      MarketState.BEARISH_HIGH_VOL,
      MarketState.BEARISH_LOW_VOL,
      MarketState.RANGEBOUND,
    ];

    let output = '\n5×17 STRATEGY MATRIX\n';
    output += '='.repeat(80) + '\n\n';

    states.forEach(state => {
      output += `\n${state}\n`;
      output += '-'.repeat(80) + '\n';

      const strategies = this.getSuitableStrategies(state, 0);
      strategies.forEach(({ strategy, suitability }) => {
        const agent = `[${strategy.agent}]`.padEnd(8);
        const name = strategy.name.padEnd(35);
        const score = `${suitability}`.padStart(3);
        output += `${agent} ${name} ${score}%\n`;
      });
    });

    return output;
  }
}

export const strategyMatrix = new StrategyMatrixService();
export default strategyMatrix;
