/**
 * ARENA QUANT ENGINE
 *
 * Manages AI trading agents and their performance metrics
 */

export interface QuantAgent {
  id: string;
  name: string;
  totalPnL: number;
  totalPnLPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  streakCount: number;
  streakType: 'WIN' | 'LOSS' | null;
  currentPnL: number;
  currentPnLPercent: number;
  description?: string;
  strategy?: string;
}

export interface MarketState {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  marketSentiment: number;
  volatilityIndex: number;
  dominanceBTC: number;
  totalMarketCap: number;
}

class ArenaQuantEngine {
  private agents: QuantAgent[] = [];
  private marketState: MarketState | null = null;

  constructor() {
    this.initializeAgents();
    this.initializeMarketState();
  }

  /**
   * Initialize mock agents with realistic data
   */
  private initializeAgents() {
    this.agents = [
      {
        id: 'agent-momentum',
        name: 'Momentum Trader',
        totalPnL: 12500,
        totalPnLPercent: 8.5,
        totalTrades: 45,
        wins: 32,
        losses: 13,
        winRate: 71.1,
        streakCount: 5,
        streakType: 'WIN',
        currentPnL: 850,
        currentPnLPercent: 2.3,
        description: 'Follows strong price trends',
        strategy: 'MOMENTUM'
      },
      {
        id: 'agent-reversal',
        name: 'Mean Reversion',
        totalPnL: 8300,
        totalPnLPercent: 5.6,
        totalTrades: 52,
        wins: 34,
        losses: 18,
        winRate: 65.4,
        streakCount: 2,
        streakType: 'LOSS',
        currentPnL: -320,
        currentPnLPercent: -0.8,
        description: 'Trades oversold/overbought conditions',
        strategy: 'REVERSAL'
      },
      {
        id: 'agent-scalper',
        name: 'Scalper Pro',
        totalPnL: 15200,
        totalPnLPercent: 10.2,
        totalTrades: 127,
        wins: 89,
        losses: 38,
        winRate: 70.1,
        streakCount: 3,
        streakType: 'WIN',
        currentPnL: 420,
        currentPnLPercent: 1.1,
        description: 'High-frequency small gains',
        strategy: 'SCALPING'
      },
      {
        id: 'agent-swing',
        name: 'Swing Master',
        totalPnL: 9800,
        totalPnLPercent: 6.5,
        totalTrades: 28,
        wins: 19,
        losses: 9,
        winRate: 67.9,
        streakCount: 1,
        streakType: 'WIN',
        currentPnL: 1200,
        currentPnLPercent: 3.2,
        description: 'Multi-day position trader',
        strategy: 'SWING'
      }
    ];
  }

  /**
   * Initialize market state with realistic data
   */
  private initializeMarketState() {
    this.marketState = {
      btcPrice: 42500,
      btcChange24h: 2.3,
      ethPrice: 2250,
      ethChange24h: 1.8,
      marketSentiment: 65, // 0-100 fear/greed index
      volatilityIndex: 42,
      dominanceBTC: 52.5,
      totalMarketCap: 1.65e12 // $1.65T
    };
  }

  /**
   * Get all agents
   */
  getAgents(): QuantAgent[] {
    return [...this.agents];
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(id: string): QuantAgent | undefined {
    return this.agents.find(a => a.id === id);
  }

  /**
   * Get current market state
   */
  getCurrentMarketState(): MarketState {
    if (!this.marketState) {
      this.initializeMarketState();
    }
    return { ...this.marketState! };
  }

  /**
   * Update agent performance (called by trading engine)
   */
  updateAgent(id: string, updates: Partial<QuantAgent>) {
    const index = this.agents.findIndex(a => a.id === id);
    if (index !== -1) {
      this.agents[index] = { ...this.agents[index], ...updates };
    }
  }

  /**
   * Update market state (called by market data feed)
   */
  updateMarketState(updates: Partial<MarketState>) {
    if (!this.marketState) {
      this.initializeMarketState();
    }
    this.marketState = { ...this.marketState!, ...updates };
  }

  /**
   * Get top performing agent
   */
  getTopAgent(): QuantAgent | null {
    if (this.agents.length === 0) return null;
    return [...this.agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)[0];
  }

  /**
   * Get agent leaderboard
   */
  getLeaderboard(): QuantAgent[] {
    return [...this.agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  }

  /**
   * Calculate combined agent performance
   */
  getCombinedStats() {
    const totalPnL = this.agents.reduce((sum, a) => sum + a.totalPnL, 0);
    const totalTrades = this.agents.reduce((sum, a) => sum + a.totalTrades, 0);
    const totalWins = this.agents.reduce((sum, a) => sum + a.wins, 0);
    const avgWinRate = this.agents.reduce((sum, a) => sum + a.winRate, 0) / this.agents.length;

    return {
      totalPnL,
      totalTrades,
      totalWins,
      avgWinRate,
      agentCount: this.agents.length
    };
  }
}

// Export singleton instance
export const arenaQuantEngine = new ArenaQuantEngine();
