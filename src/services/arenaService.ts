/**
 * ARENA SERVICE
 *
 * Service for managing AI trading agents in the QuantumX Arena.
 * Provides agent data, trade tracking, and real-time updates.
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface AgentTrade {
  id: string;
  direction: 'LONG' | 'SHORT';
  symbol: string;
  entry: number;
  current: number;
  target?: number;
  stopLoss?: number;
  pnlPercent: number;
  pnl: number;
  strategyUsed: string;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

export interface ArenaAgent {
  id: string;
  name: string;
  codename: string;
  avatar: string;
  description: string;
  strategy: string;
  totalPnLPercent: number;
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  balance: number;
  initialBalance: number;
  isActive: boolean;
  lastTrade?: AgentTrade;
  streak: number;
  maxDrawdown: number;
  avgTradeSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArenaStats {
  totalAgents: number;
  activeAgents: number;
  totalTrades: number;
  totalVolume: number;
  avgWinRate: number;
  topPerformer: ArenaAgent | null;
}

// =====================================================
// DEFAULT AGENTS
// =====================================================

const DEFAULT_AGENTS: ArenaAgent[] = [
  {
    id: 'alphax',
    name: 'AlphaX',
    codename: 'The Momentum Hunter',
    avatar: '🦁',
    description: 'Aggressive momentum trader that catches trends early',
    strategy: 'MOMENTUM',
    totalPnLPercent: 12.5,
    totalPnL: 1250,
    totalTrades: 47,
    winningTrades: 28,
    losingTrades: 19,
    winRate: 59.6,
    balance: 11250,
    initialBalance: 10000,
    isActive: true,
    streak: 3,
    maxDrawdown: -8.2,
    avgTradeSize: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'betax',
    name: 'BetaX',
    codename: 'The Mean Reverter',
    avatar: '🐺',
    description: 'Patient mean-reversion specialist for ranging markets',
    strategy: 'MEAN_REVERSION',
    totalPnLPercent: 8.3,
    totalPnL: 830,
    totalTrades: 62,
    winningTrades: 41,
    losingTrades: 21,
    winRate: 66.1,
    balance: 10830,
    initialBalance: 10000,
    isActive: true,
    streak: 5,
    maxDrawdown: -5.4,
    avgTradeSize: 350,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gammax',
    name: 'GammaX',
    codename: 'The Breakout Beast',
    avatar: '🦅',
    description: 'Volatility breakout trader for explosive moves',
    strategy: 'BREAKOUT',
    totalPnLPercent: 15.7,
    totalPnL: 1570,
    totalTrades: 31,
    winningTrades: 16,
    losingTrades: 15,
    winRate: 51.6,
    balance: 11570,
    initialBalance: 10000,
    isActive: true,
    streak: 1,
    maxDrawdown: -12.1,
    avgTradeSize: 750,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// =====================================================
// SERVICE CLASS
// =====================================================

class ArenaService {
  private agents: Map<string, ArenaAgent> = new Map();
  private listeners: Set<(agents: ArenaAgent[]) => void> = new Set();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor() {
    // Initialize with default agents
    DEFAULT_AGENTS.forEach(agent => {
      this.agents.set(agent.id, { ...agent });
    });
  }

  /**
   * Get all agents
   */
  getAgents(): ArenaAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents sorted by P&L (ranked)
   */
  getRankedAgents(): ArenaAgent[] {
    return this.getAgents().sort((a, b) => b.totalPnLPercent - a.totalPnLPercent);
  }

  /**
   * Get a specific agent
   */
  getAgent(id: string): ArenaAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get arena stats
   */
  getStats(): ArenaStats {
    const agents = this.getAgents();
    const activeAgents = agents.filter(a => a.isActive);
    const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
    const avgWinRate = agents.reduce((sum, a) => sum + a.winRate, 0) / agents.length;
    const topPerformer = this.getRankedAgents()[0] || null;

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalTrades,
      totalVolume: agents.reduce((sum, a) => sum + a.balance, 0),
      avgWinRate,
      topPerformer,
    };
  }

  /**
   * Subscribe to agent updates
   */
  subscribe(callback: (agents: ArenaAgent[]) => void): () => void {
    this.listeners.add(callback);
    // Immediately send current state
    callback(this.getAgents());

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    const agents = this.getAgents();
    this.listeners.forEach(callback => callback(agents));
  }

  /**
   * Update agent data (simulated real-time updates)
   */
  updateAgent(id: string, updates: Partial<ArenaAgent>): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.set(id, { ...agent, ...updates, updatedAt: new Date().toISOString() });
      this.notify();
    }
  }

  /**
   * Simulate a new trade for an agent
   */
  simulateTrade(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const symbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];
    const directions: ('LONG' | 'SHORT')[] = ['LONG', 'SHORT'];
    const strategies = ['Momentum Surge', 'Mean Reversion', 'Breakout Trade', 'Trend Following', 'Scalp Trade'];

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const direction = directions[Math.floor(Math.random() * 2)];
    const entry = 50000 + Math.random() * 10000;
    const pnlPercent = (Math.random() - 0.4) * 10; // Slightly bullish bias
    const current = entry * (1 + pnlPercent / 100);

    const trade: AgentTrade = {
      id: `trade-${Date.now()}`,
      direction,
      symbol: `${symbol}/USDT`,
      entry,
      current,
      pnlPercent,
      pnl: (current - entry) * (direction === 'LONG' ? 1 : -1) * 0.1,
      strategyUsed: strategies[Math.floor(Math.random() * strategies.length)],
      openedAt: new Date().toISOString(),
      status: 'OPEN',
    };

    this.updateAgent(agentId, {
      lastTrade: trade,
      totalTrades: agent.totalTrades + 1,
      totalPnLPercent: agent.totalPnLPercent + pnlPercent * 0.1,
    });
  }

  /**
   * Start simulated updates
   */
  startSimulation(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Update trades every 5 seconds
    this.updateInterval = setInterval(() => {
      const agents = this.getAgents();

      // Randomly update one agent's trade
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent.lastTrade && randomAgent.lastTrade.status === 'OPEN') {
        // Update existing trade P&L
        const pnlChange = (Math.random() - 0.5) * 2;
        const newPnl = randomAgent.lastTrade.pnlPercent + pnlChange;
        const newCurrent = randomAgent.lastTrade.entry * (1 + newPnl / 100);

        this.updateAgent(randomAgent.id, {
          lastTrade: {
            ...randomAgent.lastTrade,
            pnlPercent: newPnl,
            current: newCurrent,
            pnl: (newCurrent - randomAgent.lastTrade.entry) * 0.1,
          },
        });
      } else {
        // Maybe open a new trade
        if (Math.random() > 0.7) {
          this.simulateTrade(randomAgent.id);
        }
      }
    }, 5000);
  }

  /**
   * Stop simulation
   */
  stopSimulation(): void {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Fetch agents from database (if available)
   */
  async fetchFromDatabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('arena_agents')
        .select('*')
        .order('total_pnl_percent', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach(row => {
          this.agents.set(row.id, this.mapDbToAgent(row));
        });
        this.notify();
      }
    } catch (err) {
      console.log('[Arena] Using default agents (database not available)');
    }
  }

  private mapDbToAgent(row: any): ArenaAgent {
    return {
      id: row.id,
      name: row.name,
      codename: row.codename || '',
      avatar: row.avatar || '🤖',
      description: row.description || '',
      strategy: row.strategy || 'MIXED',
      totalPnLPercent: row.total_pnl_percent || 0,
      totalPnL: row.total_pnl || 0,
      totalTrades: row.total_trades || 0,
      winningTrades: row.winning_trades || 0,
      losingTrades: row.losing_trades || 0,
      winRate: row.win_rate || 50,
      balance: row.balance || 10000,
      initialBalance: row.initial_balance || 10000,
      isActive: row.is_active ?? true,
      streak: row.streak || 0,
      maxDrawdown: row.max_drawdown || 0,
      avgTradeSize: row.avg_trade_size || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const arenaService = new ArenaService();
export default arenaService;
