/**
 * ARENA QUANT ENGINE
 *
 * Engine for managing quantitative trading agents and market state
 * in the QuantumX Oracle prediction system.
 */

// =====================================================
// TYPES
// =====================================================

export interface QuantAgent {
  id: string;
  name: string;
  totalPnLPercent: number;
  totalTrades: number;
  winRate: number;
  streak: number;
  lastTradeResult: 'WIN' | 'LOSS' | 'PENDING' | null;
  isActive: boolean;
}

export type MarketState = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE' | 'ACCUMULATION';

// =====================================================
// DEFAULT AGENTS
// =====================================================

const DEFAULT_AGENTS: QuantAgent[] = [
  {
    id: 'alphax',
    name: 'AlphaX',
    totalPnLPercent: 0,
    totalTrades: 0,
    winRate: 50,
    streak: 0,
    lastTradeResult: null,
    isActive: true,
  },
  {
    id: 'betax',
    name: 'BetaX',
    totalPnLPercent: 0,
    totalTrades: 0,
    winRate: 50,
    streak: 0,
    lastTradeResult: null,
    isActive: true,
  },
  {
    id: 'gammax',
    name: 'GammaX',
    totalPnLPercent: 0,
    totalTrades: 0,
    winRate: 50,
    streak: 0,
    lastTradeResult: null,
    isActive: true,
  },
  {
    id: 'deltax',
    name: 'DeltaX',
    totalPnLPercent: 0,
    totalTrades: 0,
    winRate: 50,
    streak: 0,
    lastTradeResult: null,
    isActive: true,
  },
];

// =====================================================
// ENGINE CLASS
// =====================================================

class ArenaQuantEngine {
  private agents: QuantAgent[] = [...DEFAULT_AGENTS];
  private marketState: MarketState = 'NEUTRAL';
  private lastUpdate: number = Date.now();

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
    return this.agents.find(agent => agent.id === id);
  }

  /**
   * Get current market state
   */
  getCurrentMarketState(): MarketState {
    return this.marketState;
  }

  /**
   * Update agent stats (called by external data source)
   */
  updateAgent(id: string, updates: Partial<QuantAgent>): void {
    const index = this.agents.findIndex(agent => agent.id === id);
    if (index !== -1) {
      this.agents[index] = { ...this.agents[index], ...updates };
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Update market state (called by external data source)
   */
  updateMarketState(state: MarketState): void {
    this.marketState = state;
    this.lastUpdate = Date.now();
  }

  /**
   * Get timestamp of last update
   */
  getLastUpdate(): number {
    return this.lastUpdate;
  }

  /**
   * Get leading agent by P&L
   */
  getLeader(): QuantAgent | undefined {
    return [...this.agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)[0];
  }

  /**
   * Get agent rankings by P&L
   */
  getRankings(): QuantAgent[] {
    return [...this.agents].sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const arenaQuantEngine = new ArenaQuantEngine();
export default arenaQuantEngine;
