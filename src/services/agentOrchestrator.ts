/**
 * 3-Agent Specialization System (Orchestrator)
 *
 * Manages three specialized trading agents:
 * - ALPHA Agent (Trend Engine): Dominates in trending markets
 * - BETA Agent (Reversion Engine): Excels in rangebound markets
 * - GAMMA Agent (Chaos Engine): Thrives in high-volatility conditions
 *
 * Each agent has its own strategy portfolio selected from the 5×17 matrix
 * based on current market conditions.
 */

import marketStateDetectionEngine, {
  MarketState,
  type MarketStateAnalysis,
  type SymbolMarketState,
} from './marketStateDetectionEngine';
import strategyMatrix, { AgentType, type StrategyProfile } from './strategyMatrix';
import { supabase } from '@/integrations/supabase/client';

export interface AgentPerformance {
  agent: AgentType;
  totalSignals: number;
  successfulSignals: number;
  winRate: number;
  avgConfidence: number;
  avgQualityScore: number;
  lastActiveTimestamp: number;
  marketStatesActive: MarketState[];
}

export interface AgentDecision {
  agent: AgentType;
  confidence: number;
  selectedStrategies: StrategyProfile[];
  marketState: MarketState;
  reasoning: string;
}

export interface SignalGenerationRequest {
  symbol: string;
  tier: 'FREE' | 'PRO' | 'MAX';
  marketState?: MarketState; // Optional: pre-detected market state
  forceAgent?: AgentType; // Optional: force specific agent
}

export interface GeneratedSignal {
  agent: AgentType;
  strategy: string;
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  confidence: number;
  qualityScore: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number[];
  timeframe: string;
  marketState: MarketState;
  reasoning: string;
  metadata: Record<string, any>;
}

class AgentOrchestrator {
  private performanceCache: Map<AgentType, AgentPerformance> = new Map();
  private CACHE_DURATION = 300000; // 5 minutes

  /**
   * Main entry point: Generates signals using intelligent agent selection
   */
  async generateSignals(
    request: SignalGenerationRequest,
    count: number = 1
  ): Promise<GeneratedSignal[]> {
    console.log(`\n🤖 Agent Orchestrator: Generating ${count} signal(s) for ${request.symbol}`);

    try {
      // Step 1: Detect market state (or use provided state)
      const marketState = request.marketState
        ? request.marketState
        : await this.detectMarketState(request.symbol);

      console.log(`📊 Market State: ${marketState.state || marketState}`);

      // Step 2: Select optimal agent
      const agent = request.forceAgent
        ? request.forceAgent
        : await this.selectOptimalAgent(marketState);

      console.log(`🎯 Selected Agent: ${agent}`);

      // Step 3: Get suitable strategies for this agent + market state
      const strategies = strategyMatrix.getSuitableStrategies(
        typeof marketState === 'string' ? marketState : marketState.state,
        60, // Minimum 60% suitability
        agent
      );

      if (strategies.length === 0) {
        console.warn(`⚠️ No suitable strategies found for ${agent} in ${marketState}`);
        // Fallback: Use any available strategy
        const fallbackStrategies = strategyMatrix.getSuitableStrategies(
          typeof marketState === 'string' ? marketState : marketState.state,
          40 // Lower threshold
        );
        if (fallbackStrategies.length > 0) {
          strategies.push(...fallbackStrategies);
        }
      }

      console.log(`📋 Found ${strategies.length} suitable strategies`);

      // Step 4: Generate signals using selected strategies
      const signals = await this.executeStrategies(
        strategies.slice(0, count * 2), // Get extra strategies as candidates
        request,
        agent,
        typeof marketState === 'string' ? marketState : marketState.state,
        count
      );

      // Step 5: Track agent activity
      await this.trackAgentActivity(agent, signals);

      console.log(`✅ Generated ${signals.length} signal(s) via ${agent} agent\n`);

      return signals;
    } catch (error) {
      console.error('❌ Agent orchestration failed:', error);
      throw error;
    }
  }

  /**
   * Detects market state for a symbol
   */
  private async detectMarketState(symbol: string): Promise<MarketState | SymbolMarketState> {
    try {
      // Try symbol-specific detection first
      const symbolState = await marketStateDetectionEngine.detectSymbolMarketState(symbol);
      return symbolState;
    } catch (error) {
      console.warn(`⚠️ Symbol-specific detection failed, using market-wide detection`);
      // Fallback to market-wide detection
      const marketAnalysis = await marketStateDetectionEngine.detectMarketState();
      return marketAnalysis.state;
    }
  }

  /**
   * Selects the optimal agent based on market conditions
   */
  private async selectOptimalAgent(
    marketState: MarketState | SymbolMarketState
  ): Promise<AgentType> {
    const state = typeof marketState === 'string' ? marketState : marketState.state;

    // Get recommended agent from strategy matrix
    const recommendedAgent = strategyMatrix.getRecommendedAgent(state);

    // Load agent performance history
    const performance = await this.getAgentPerformance();

    // Decision logic:
    // 1. If one agent is significantly outperforming, favor it
    // 2. Otherwise, use the recommended agent based on market state
    // 3. Consider agent's historical performance in this market state

    const alphaPerfScore = this.calculateAgentScore(AgentType.ALPHAX, performance, state);
    const betaPerfScore = this.calculateAgentScore(AgentType.BETAX, performance, state);
    const gammaPerfScore = this.calculateAgentScore(AgentType.QUANTUMX, performance, state);

    console.log(`   ALPHA score: ${alphaPerfScore.toFixed(1)}`);
    console.log(`   BETA score: ${betaPerfScore.toFixed(1)}`);
    console.log(`   GAMMA score: ${gammaPerfScore.toFixed(1)}`);

    // Return agent with highest score
    if (alphaPerfScore >= betaPerfScore && alphaPerfScore >= gammaPerfScore) {
      return AgentType.ALPHAX;
    } else if (betaPerfScore >= alphaPerfScore && betaPerfScore >= gammaPerfScore) {
      return AgentType.BETAX;
    } else {
      return AgentType.QUANTUMX;
    }
  }

  /**
   * Calculates agent suitability score based on matrix + performance
   */
  private calculateAgentScore(
    agent: AgentType,
    performance: Map<AgentType, AgentPerformance>,
    marketState: MarketState
  ): number {
    // Get average strategy suitability for this agent in current market state
    const strategies = strategyMatrix.getAgentStrategies(agent);
    const avgSuitability =
      strategies.reduce((sum, s) => sum + s.suitability[marketState], 0) / strategies.length;

    // Get historical performance
    const perf = performance.get(agent);
    const perfMultiplier = perf ? 1 + (perf.winRate - 50) / 100 : 1; // Boost based on win rate

    // Final score = matrix suitability × performance multiplier
    return avgSuitability * perfMultiplier;
  }

  /**
   * Executes strategies and generates signals
   */
  private async executeStrategies(
    strategyCandidates: Array<{ strategy: StrategyProfile; suitability: number }>,
    request: SignalGenerationRequest,
    agent: AgentType,
    marketState: MarketState,
    count: number
  ): Promise<GeneratedSignal[]> {
    const signals: GeneratedSignal[] = [];

    // Import all strategy functions
    const strategyModules = await this.loadStrategyModules();

    for (const { strategy, suitability } of strategyCandidates) {
      if (signals.length >= count) break;

      try {
        // Load strategy module
        const strategyFn = strategyModules[strategy.fileName];

        if (!strategyFn) {
          console.warn(`⚠️ Strategy module not found: ${strategy.fileName}`);
          continue;
        }

        // Execute strategy
        const result = await strategyFn.analyzeSignal({
          symbol: request.symbol,
          marketState,
          tier: request.tier,
        });

        if (result && result.confidence >= 70) {
          // Generate signal
          const signal: GeneratedSignal = {
            agent,
            strategy: strategy.name,
            symbol: request.symbol,
            signalType: result.signalType || 'LONG',
            confidence: result.confidence,
            qualityScore: result.qualityScore || result.confidence * 0.9,
            entryPrice: result.entryPrice || 0,
            stopLoss: result.stopLoss || 0,
            takeProfit: result.takeProfit || [],
            timeframe: result.timeframe || strategy.timeframes[0],
            marketState,
            reasoning: `${agent} agent selected ${strategy.name} (suitability: ${suitability}%) in ${marketState} conditions`,
            metadata: {
              ...result.metadata,
              agent,
              suitability,
              strategyRisk: strategy.risk,
            },
          };

          signals.push(signal);
          console.log(`   ✓ Signal generated via ${strategy.name}`);
        }
      } catch (error) {
        console.error(`   ✗ Strategy ${strategy.name} failed:`, error);
      }
    }

    return signals;
  }

  /**
   * Dynamically loads strategy modules
   */
  private async loadStrategyModules(): Promise<Record<string, any>> {
    // This is a placeholder - in production, you'd dynamically import these
    // For now, return empty object (strategies would need to be imported individually)
    return {};
  }

  /**
   * Tracks agent activity for performance monitoring
   */
  private async trackAgentActivity(agent: AgentType, signals: GeneratedSignal[]): Promise<void> {
    try {
      // Log agent activity to database
      const { error } = await supabase.from('agent_activity_log').insert(
        signals.map(signal => ({
          agent,
          strategy: signal.strategy,
          symbol: signal.symbol,
          signal_type: signal.signalType,
          confidence: signal.confidence,
          quality_score: signal.qualityScore,
          market_state: signal.marketState,
          metadata: signal.metadata,
          created_at: new Date().toISOString(),
        }))
      );

      if (error) {
        console.warn('⚠️ Failed to log agent activity:', error.message);
      }
    } catch (error) {
      console.warn('⚠️ Agent activity tracking failed:', error);
    }
  }

  /**
   * Gets agent performance history
   */
  private async getAgentPerformance(): Promise<Map<AgentType, AgentPerformance>> {
    // Check cache
    const cached = Array.from(this.performanceCache.values());
    if (cached.length > 0 && Date.now() - cached[0].lastActiveTimestamp < this.CACHE_DURATION) {
      return this.performanceCache;
    }

    // Initialize default performance
    const performance = new Map<AgentType, AgentPerformance>([
      [
        AgentType.ALPHAX,
        {
          agent: AgentType.ALPHAX,
          totalSignals: 0,
          successfulSignals: 0,
          winRate: 50,
          avgConfidence: 80,
          avgQualityScore: 75,
          lastActiveTimestamp: Date.now(),
          marketStatesActive: [],
        },
      ],
      [
        AgentType.BETAX,
        {
          agent: AgentType.BETAX,
          totalSignals: 0,
          successfulSignals: 0,
          winRate: 50,
          avgConfidence: 78,
          avgQualityScore: 73,
          lastActiveTimestamp: Date.now(),
          marketStatesActive: [],
        },
      ],
      [
        AgentType.QUANTUMX,
        {
          agent: AgentType.QUANTUMX,
          totalSignals: 0,
          successfulSignals: 0,
          winRate: 50,
          avgConfidence: 82,
          avgQualityScore: 77,
          lastActiveTimestamp: Date.now(),
          marketStatesActive: [],
        },
      ],
    ]);

    // Try to load from database
    try {
      const { data, error } = await supabase
        .from('agent_performance')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (!error && data && data.length > 0) {
        data.forEach(record => {
          const agent = record.agent as AgentType;
          performance.set(agent, {
            agent,
            totalSignals: record.total_signals || 0,
            successfulSignals: record.successful_signals || 0,
            winRate: record.win_rate || 50,
            avgConfidence: record.avg_confidence || 80,
            avgQualityScore: record.avg_quality_score || 75,
            lastActiveTimestamp: new Date(record.updated_at).getTime(),
            marketStatesActive: record.market_states_active || [],
          });
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to load agent performance:', error);
    }

    this.performanceCache = performance;
    return performance;
  }

  /**
   * Gets agent statistics for UI display
   */
  async getAgentStats(): Promise<{
    currentMarketState: MarketStateAnalysis;
    recommendedAgent: AgentType;
    agentPerformance: Map<AgentType, AgentPerformance>;
  }> {
    const marketState = await marketStateDetectionEngine.detectMarketState();
    const recommendedAgent = strategyMatrix.getRecommendedAgent(marketState.state);
    const performance = await this.getAgentPerformance();

    return {
      currentMarketState: marketState,
      recommendedAgent,
      agentPerformance: performance,
    };
  }

  /**
   * Forces a specific agent to generate signals (for testing)
   */
  async testAgent(agent: AgentType, symbol: string = 'BTC'): Promise<GeneratedSignal[]> {
    return this.generateSignals(
      {
        symbol,
        tier: 'MAX',
        forceAgent: agent,
      },
      3
    );
  }

  /**
   * Clears caches (useful for testing)
   */
  clearCache(): void {
    this.performanceCache.clear();
    marketStateDetectionEngine.clearCache();
  }
}

export const agentOrchestrator = new AgentOrchestrator();
export default agentOrchestrator;
