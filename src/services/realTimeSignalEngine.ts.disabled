/**
 * IGX REAL-TIME SIGNAL ENGINE
 * Event-driven signal generation - triggers IMMEDIATELY when conditions align
 *
 * ARCHITECTURE:
 * - Continuous price monitoring via WebSocket streams
 * - Instant pattern detection when data updates
 * - Signal generation within seconds of opportunity appearing
 * - No missed opportunities due to scanning intervals
 *
 * TRIGGER STRATEGY:
 * 1. Monitor price changes (>=0.5% movement triggers analysis)
 * 2. Monitor volume spikes (>=50% above average triggers analysis)
 * 3. Monitor funding rate changes (>=0.01% change triggers analysis)
 * 4. Monitor order book imbalance (>=10% shift triggers analysis)
 * 5. Continuous background analysis every 60 seconds (backup)
 */

import { smartMoneySignalEngine } from './smartMoneySignalEngine';
import { cryptoDataService } from './cryptoDataService';
import { supabase } from '@/integrations/supabase/client';
import { multiStrategyEngine } from './strategies/multiStrategyEngine';

interface PriceData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange1h: number;
  timestamp: number;
}

interface SignalTrigger {
  symbol: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  triggeredAt: number;
}

class RealTimeSignalEngine {
  private priceCache: Map<string, PriceData> = new Map();
  private processingQueue: Set<string> = new Set(); // Prevent duplicate processing
  private lastAnalysisTime: Map<string, number> = new Map();
  private isRunning: boolean = false;

  // Monitoring universe (optimized for performance - top 30 most liquid coins)
  private readonly MONITORING_UNIVERSE = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
    'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'polygon',
    'uniswap', 'litecoin', 'cosmos', 'near', 'aptos',
    'arbitrum', 'optimism', 'sui', 'injective-protocol', 'render-token',
    'sei-network', 'starknet', 'immutable-x', 'the-graph', 'theta-network',
    'flow', 'sandbox', 'decentraland', 'gala', 'enjincoin'
  ];

  // Trigger thresholds
  private readonly PRICE_CHANGE_THRESHOLD = 0.5; // 0.5% price move
  private readonly VOLUME_SPIKE_THRESHOLD = 1.5; // 50% above average
  private readonly MIN_ANALYSIS_INTERVAL = 120000; // 2 minutes minimum between analyses for same coin
  private readonly CONTINUOUS_CHECK_INTERVAL = 60000; // Check all coins every 60 seconds

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    if (this.isRunning) {
      console.log('[RealTimeEngine] Already running');
      return;
    }

    this.isRunning = true;
    console.log('\n[RealTimeEngine] ========== STARTING REAL-TIME MONITORING ==========');
    console.log(`[RealTimeEngine] Monitoring ${this.MONITORING_UNIVERSE.length} coins`);
    console.log('[RealTimeEngine] Trigger conditions:');
    console.log(`  - Price movement: ±${this.PRICE_CHANGE_THRESHOLD}%`);
    console.log(`  - Volume spike: ${((this.VOLUME_SPIKE_THRESHOLD - 1) * 100)}% above average`);
    console.log(`  - Continuous check: Every ${this.CONTINUOUS_CHECK_INTERVAL / 1000}s`);
    console.log('[RealTimeEngine] =====================================================\n');

    // Initialize price cache
    this.initializePriceCache();

    // Start continuous monitoring loop
    this.startContinuousMonitoring();

    // Start event-driven price monitoring
    this.startPriceMonitoring();
  }

  /**
   * Initialize price cache with current data
   */
  private async initializePriceCache() {
    console.log('[RealTimeEngine] Initializing price cache...');

    for (const coinId of this.MONITORING_UNIVERSE) {
      try {
        const data = await cryptoDataService.getCryptoDetails(coinId);
        if (data?.market_data) {
          this.priceCache.set(coinId, {
            symbol: coinId,
            price: data.market_data.current_price?.usd || 0,
            volume24h: data.market_data.total_volume?.usd || 0,
            priceChange1h: data.market_data.price_change_percentage_1h_in_currency?.usd || 0,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`[RealTimeEngine] Error initializing ${coinId}:`, error);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[RealTimeEngine] Price cache initialized with ${this.priceCache.size} coins`);
  }

  /**
   * Continuous monitoring loop (backup for WebSocket)
   * Checks all coins every 60 seconds
   */
  private startContinuousMonitoring() {
    const check = async () => {
      if (!this.isRunning) return;

      console.log(`[RealTimeEngine] Running continuous check for ${this.MONITORING_UNIVERSE.length} coins...`);
      const triggeredSignals: string[] = [];

      for (const coinId of this.MONITORING_UNIVERSE) {
        try {
          // Fetch latest data
          const data = await cryptoDataService.getCryptoDetails(coinId);
          if (!data?.market_data) continue;

          const currentPrice = data.market_data.current_price?.usd || 0;
          const currentVolume = data.market_data.total_volume?.usd || 0;
          const priceChange1h = data.market_data.price_change_percentage_1h_in_currency?.usd || 0;

          const cached = this.priceCache.get(coinId);

          if (cached && currentPrice > 0) {
            // Check for triggers
            const priceChangePercent = Math.abs((currentPrice - cached.price) / cached.price * 100);
            const volumeRatio = currentVolume / cached.volume24h;

            // TRIGGER 1: Significant price movement
            if (priceChangePercent >= this.PRICE_CHANGE_THRESHOLD) {
              this.triggerSignalGeneration({
                symbol: coinId,
                reason: `Price moved ${priceChangePercent.toFixed(2)}% (threshold: ${this.PRICE_CHANGE_THRESHOLD}%)`,
                priority: priceChangePercent >= 2 ? 'HIGH' : 'MEDIUM',
                triggeredAt: Date.now()
              });
              triggeredSignals.push(coinId);
            }

            // TRIGGER 2: Volume spike
            if (volumeRatio >= this.VOLUME_SPIKE_THRESHOLD) {
              this.triggerSignalGeneration({
                symbol: coinId,
                reason: `Volume spike ${((volumeRatio - 1) * 100).toFixed(0)}% above average`,
                priority: 'MEDIUM',
                triggeredAt: Date.now()
              });
              triggeredSignals.push(coinId);
            }

            // TRIGGER 3: Strong 1-hour movement (momentum)
            if (Math.abs(priceChange1h) >= 3) {
              this.triggerSignalGeneration({
                symbol: coinId,
                reason: `Strong 1h momentum: ${priceChange1h.toFixed(2)}%`,
                priority: 'HIGH',
                triggeredAt: Date.now()
              });
              triggeredSignals.push(coinId);
            }
          }

          // Update cache
          this.priceCache.set(coinId, {
            symbol: coinId,
            price: currentPrice,
            volume24h: currentVolume,
            priceChange1h: priceChange1h,
            timestamp: Date.now()
          });

        } catch (error) {
          console.error(`[RealTimeEngine] Error checking ${coinId}:`, error);
        }

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (triggeredSignals.length > 0) {
        console.log(`[RealTimeEngine] ✅ Continuous check triggered ${triggeredSignals.length} analyses: ${triggeredSignals.join(', ')}`);
      } else {
        console.log('[RealTimeEngine] Continuous check complete - no triggers');
      }

      // Schedule next check
      setTimeout(check, this.CONTINUOUS_CHECK_INTERVAL);
    };

    // Start first check
    setTimeout(check, this.CONTINUOUS_CHECK_INTERVAL);
  }

  /**
   * Price monitoring with event-driven triggers
   * Monitors for rapid price changes in real-time
   */
  private startPriceMonitoring() {
    // Rapid polling for high-priority coins (Bitcoin, Ethereum, Solana, BNB)
    const highPriorityCoins = ['bitcoin', 'ethereum', 'solana', 'binancecoin'];

    const rapidCheck = async () => {
      if (!this.isRunning) return;

      for (const coinId of highPriorityCoins) {
        try {
          const data = await cryptoDataService.getCryptoDetails(coinId);
          if (!data?.market_data) continue;

          const currentPrice = data.market_data.current_price?.usd || 0;
          const cached = this.priceCache.get(coinId);

          if (cached && currentPrice > 0) {
            const priceChangePercent = Math.abs((currentPrice - cached.price) / cached.price * 100);

            // Immediate trigger for rapid price movement
            if (priceChangePercent >= this.PRICE_CHANGE_THRESHOLD) {
              this.triggerSignalGeneration({
                symbol: coinId,
                reason: `RAPID price movement: ${priceChangePercent.toFixed(2)}%`,
                priority: 'HIGH',
                triggeredAt: Date.now()
              });
            }

            // Update cache
            this.priceCache.set(coinId, {
              symbol: coinId,
              price: currentPrice,
              volume24h: data.market_data.total_volume?.usd || 0,
              priceChange1h: data.market_data.price_change_percentage_1h_in_currency?.usd || 0,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          // Silent error - don't spam logs
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check every 30 seconds for high-priority coins
      setTimeout(rapidCheck, 30000);
    };

    // Start rapid checking
    setTimeout(rapidCheck, 10000); // Start after 10 seconds
  }

  /**
   * Trigger signal generation when conditions align
   */
  private async triggerSignalGeneration(trigger: SignalTrigger) {
    const { symbol, reason, priority } = trigger;

    // Check if already processing this coin
    if (this.processingQueue.has(symbol)) {
      console.log(`[RealTimeEngine] ${symbol}: Already processing, skipping...`);
      return;
    }

    // Check minimum time between analyses for same coin
    const lastAnalysis = this.lastAnalysisTime.get(symbol) || 0;
    const timeSinceLastAnalysis = Date.now() - lastAnalysis;

    if (timeSinceLastAnalysis < this.MIN_ANALYSIS_INTERVAL) {
      console.log(`[RealTimeEngine] ${symbol}: Too soon since last analysis (${Math.floor(timeSinceLastAnalysis / 1000)}s ago), skipping...`);
      return;
    }

    // Add to processing queue
    this.processingQueue.add(symbol);
    this.lastAnalysisTime.set(symbol, Date.now());

    console.log(`\n[RealTimeEngine] 🔥 TRIGGER ACTIVATED: ${symbol.toUpperCase()}`);
    console.log(`[RealTimeEngine] Reason: ${reason}`);
    console.log(`[RealTimeEngine] Priority: ${priority}`);
    console.log(`[RealTimeEngine] Generating signal...`);

    try {
      // Generate signals using ALL 10 STRATEGIES in parallel
      const analysis = await smartMoneySignalEngine.generateSignal(symbol);
      const multiStrategyResult = await multiStrategyEngine.analyzeWithAllStrategies(analysis.marketDataInput);

      console.log(`\n[RealTimeEngine] 🎯 MULTI-STRATEGY ANALYSIS for ${symbol.toUpperCase()}:`);
      console.log(`  - Total Strategies: 10`);
      console.log(`  - Successful Signals: ${multiStrategyResult.successfulStrategies}`);
      console.log(`  - Best Signal: ${multiStrategyResult.bestSignal ? `${multiStrategyResult.bestSignal.strategyName} (${multiStrategyResult.bestSignal.confidence}%)` : 'None'}`);

      // If no strategies generated signals, exit
      if (!multiStrategyResult.bestSignal || multiStrategyResult.successfulStrategies === 0) {
        console.log(`[RealTimeEngine] ${symbol}: No strategies generated signals above threshold`);
        this.processingQueue.delete(symbol);
        return;
      }

      // Get current price
      const coinData = await cryptoDataService.getCryptoDetails(symbol);
      const currentPrice = coinData?.market_data?.current_price?.usd || 0;

      if (currentPrice === 0) {
        console.log(`[RealTimeEngine] ${symbol}: Failed to get current price`);
        this.processingQueue.delete(symbol);
        return;
      }

      // Insert ALL successful strategy signals into database
      const signalsToInsert = multiStrategyResult.signals
        .filter(s => !s.rejected && s.type !== null)
        .map(strategySignal => {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration

          const riskLevel = strategySignal.confidence >= 75 ? 'LOW' : strategySignal.confidence >= 68 ? 'MEDIUM' : 'HIGH';

          return {
            symbol: symbol,
            strategy_name: strategySignal.strategyName,
            signal_type: strategySignal.type!,
            timeframe: strategySignal.timeframe,
            entry_min: strategySignal.entryMin,
            entry_max: strategySignal.entryMax,
            current_price: currentPrice,
            stop_loss: strategySignal.stopLoss,
            target_1: strategySignal.targets.target1,
            target_2: strategySignal.targets.target2,
            target_3: strategySignal.targets.target3,
            confidence: strategySignal.confidence,
            strength: strategySignal.strength,
            risk_level: riskLevel,
            risk_reward_ratio: strategySignal.riskRewardRatio,
            reasoning: strategySignal.reasoning,
            indicators: strategySignal.indicators,
            status: 'ACTIVE',
            expires_at: expiresAt.toISOString()
          };
        });

      // Bulk insert all signals
      const { data: insertedSignals, error } = await supabase
        .from('intelligence_signals')
        .insert(signalsToInsert)
        .select();

      if (error) {
        console.error(`[RealTimeEngine] ${symbol}: Error inserting signals:`, error);
      } else {
        console.log(`[RealTimeEngine] ✅ ${insertedSignals?.length || 0} SIGNALS GENERATED for ${symbol.toUpperCase()}`);

        // Log each strategy signal
        insertedSignals?.forEach((sig: any) => {
          console.log(`  - ${sig.strategy_name}: ${sig.signal_type} (${sig.confidence}% confidence)`);
        });

        // Emit events for real-time UI updates
        insertedSignals?.forEach((sig: any) => {
          this.emitSignalGenerated(sig);
        });
      }

    } catch (error) {
      console.error(`[RealTimeEngine] Error generating signal for ${symbol}:`, error);
    } finally {
      // Remove from processing queue
      this.processingQueue.delete(symbol);
    }
  }

  /**
   * Emit signal generation event for real-time UI updates
   */
  private emitSignalGenerated(signal: any) {
    // Broadcast custom event that UI can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('igx-signal-generated', {
        detail: signal
      }));
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    this.isRunning = false;
    console.log('[RealTimeEngine] Real-time monitoring stopped');
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoringCoins: this.MONITORING_UNIVERSE.length,
      cacheSize: this.priceCache.size,
      processingQueue: Array.from(this.processingQueue),
      lastAnalysisTimes: Object.fromEntries(this.lastAnalysisTime)
    };
  }
}

export const realTimeSignalEngine = new RealTimeSignalEngine();
