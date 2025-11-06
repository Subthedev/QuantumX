/**
 * Alpha-Gamma Communicator
 * Event-driven messaging system for Alpha → Gamma communication
 */

import type {
  GammaCommand,
  GammaStats,
  AlphaDecision,
  AlphaEvent,
  GammaEvent,
  MarketEvent,
  MarketMetrics,
  RegimeCharacteristics
} from '@/types/igx-enhanced';

// Browser-compatible EventEmitter implementation
class BrowserEventEmitter {
  private events: Map<string, Function[]> = new Map();
  private maxListeners = 10;

  setMaxListeners(n: number) {
    this.maxListeners = n;
  }

  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Event type definitions
export type AlphaGammaEventType =
  // Alpha → Gamma
  | 'alpha:command'              // Alpha issues command to Gamma
  | 'alpha:decision'             // Alpha makes a decision
  | 'alpha:mode_change'          // Alpha changes operating mode
  | 'alpha:threshold_update'     // Alpha updates thresholds

  // Gamma → Alpha
  | 'gamma:stats'                // Gamma reports statistics
  | 'gamma:mode_change'          // Gamma changes mode
  | 'gamma:command_received'     // Gamma acknowledges command
  | 'gamma:pass_rate'            // Gamma reports pass rate

  // Market updates
  | 'market:update'              // Market conditions updated
  | 'market:regime_change'       // Market regime changed

  // System events
  | 'system:initialized'         // System fully initialized
  | 'system:error'               // System error occurred
  | 'system:shutdown';           // System shutting down

class AlphaGammaCommunicator extends BrowserEventEmitter {
  private activeCommand: GammaCommand | null = null;
  private commandHistory: GammaCommand[] = [];
  private latestGammaStats: GammaStats | null = null;
  private latestAlphaDecision: AlphaDecision | null = null;
  private latestMarketMetrics: MarketMetrics | null = null;
  private latestRegime: RegimeCharacteristics | null = null;

  private readonly MAX_HISTORY = 100;
  private isInitialized = false;

  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners
  }

  // ============================================================================
  // ALPHA → GAMMA COMMANDS
  // ============================================================================

  /**
   * Alpha issues a command to Gamma
   */
  issueGammaCommand(command: GammaCommand) {
    console.log(`\n[Alpha→Gamma] Issuing command: ${command.mode}`);
    console.log(`[Alpha→Gamma] Reason: ${command.reason}`);
    console.log(`[Alpha→Gamma] Duration: ${(command.duration / 60000).toFixed(0)} minutes`);
    console.log(`[Alpha→Gamma] Adjustments:`, command.adjustments);

    // Store as active command
    this.activeCommand = command;

    // Add to history
    this.commandHistory.push(command);
    if (this.commandHistory.length > this.MAX_HISTORY) {
      this.commandHistory.shift();
    }

    // Emit event
    this.emit('alpha:command', command);

    // Set timeout to expire command
    setTimeout(() => {
      if (this.activeCommand === command) {
        this.expireCommand(command);
      }
    }, command.duration);
  }

  /**
   * Expire a command and revert to normal
   */
  private expireCommand(command: GammaCommand) {
    console.log(`\n[Alpha→Gamma] Command expired: ${command.mode}`);

    // Create revert command
    const revertCommand: GammaCommand = {
      mode: 'SELECTIVE',
      adjustments: {
        patternStrengthMultiplier: 1.0,
        consensusThresholdAdjust: 0,
        riskRewardMultiplier: 1.0,
        maxSignalsPerSector: 3,
        dedupWindowMinutes: 120
      },
      reason: 'Command duration expired, reverting to normal',
      duration: 3600000, // 1 hour default
      expiresAt: Date.now() + 3600000,
      priority: 'LOW',
      issuedBy: 'ALPHA_MODEL',
      timestamp: Date.now()
    };

    this.activeCommand = revertCommand;
    this.emit('alpha:command', revertCommand);
  }

  /**
   * Alpha publishes a decision
   */
  publishAlphaDecision(decision: AlphaDecision) {
    console.log(`\n[Alpha] New decision: ${decision.mode}`);
    console.log(`[Alpha] Confidence: ${decision.confidence}%`);
    console.log(`[Alpha] Valid until: ${new Date(decision.validUntil).toLocaleTimeString()}`);

    this.latestAlphaDecision = decision;
    this.emit('alpha:decision', decision);

    // Also issue gamma command if included
    if (decision.gammaCommand) {
      this.issueGammaCommand(decision.gammaCommand);
    }
  }

  /**
   * Alpha notifies of mode change
   */
  notifyAlphaModeChange(oldMode: string, newMode: string, reason: string) {
    console.log(`\n[Alpha] Mode changed: ${oldMode} → ${newMode}`);
    console.log(`[Alpha] Reason: ${reason}`);

    this.emit('alpha:mode_change', { oldMode, newMode, reason, timestamp: Date.now() });
  }

  // ============================================================================
  // GAMMA → ALPHA FEEDBACK
  // ============================================================================

  /**
   * Gamma reports statistics
   */
  reportGammaStats(stats: GammaStats) {
    this.latestGammaStats = stats;
    this.emit('gamma:stats', stats);

    // Log summary periodically (every 10th call)
    if (Math.random() < 0.1) {
      console.log(`\n[Gamma] Stats update:`);
      console.log(`  Mode: ${stats.currentMode}`);
      console.log(`  Pass Rate: ${stats.passRate.toFixed(1)}%`);
      console.log(`  Approved: ${stats.approvedToday} | Rejected: ${stats.rejectedToday}`);
      console.log(`  Avg Quality: ${stats.averageQualityScore.toFixed(1)}/100`);
    }
  }

  /**
   * Gamma acknowledges command
   */
  acknowledgeCommand(command: GammaCommand, success: boolean, message?: string) {
    console.log(`\n[Gamma] Command acknowledged: ${success ? '✅' : '❌'}`);
    if (message) {
      console.log(`[Gamma] ${message}`);
    }

    this.emit('gamma:command_received', {
      command,
      success,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Gamma notifies of mode change
   */
  notifyGammaModeChange(oldMode: string, newMode: string) {
    console.log(`\n[Gamma] Mode changed: ${oldMode} → ${newMode}`);
    this.emit('gamma:mode_change', { oldMode, newMode, timestamp: Date.now() });
  }

  // ============================================================================
  // MARKET UPDATES
  // ============================================================================

  /**
   * Publish market metrics update
   */
  publishMarketUpdate(metrics: MarketMetrics) {
    this.latestMarketMetrics = metrics;
    this.emit('market:update', metrics);
  }

  /**
   * Publish market regime change
   */
  publishRegimeChange(regime: RegimeCharacteristics) {
    console.log(`\n[Market] Regime change detected: ${regime.regime}`);
    console.log(`[Market] Confidence: ${regime.confidence.toFixed(0)}%`);
    console.log(`[Market] ${regime.description}`);

    this.latestRegime = regime;
    this.emit('market:regime_change', regime);
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Get active Gamma command
   */
  getActiveCommand(): GammaCommand | null {
    return this.activeCommand;
  }

  /**
   * Get command history
   */
  getCommandHistory(): GammaCommand[] {
    return [...this.commandHistory];
  }

  /**
   * Get latest Gamma stats
   */
  getLatestGammaStats(): GammaStats | null {
    return this.latestGammaStats;
  }

  /**
   * Get latest Alpha decision
   */
  getLatestAlphaDecision(): AlphaDecision | null {
    return this.latestAlphaDecision;
  }

  /**
   * Get latest market metrics
   */
  getLatestMarketMetrics(): MarketMetrics | null {
    return this.latestMarketMetrics;
  }

  /**
   * Get latest market regime
   */
  getLatestRegime(): RegimeCharacteristics | null {
    return this.latestRegime;
  }

  // ============================================================================
  // LISTENER MANAGEMENT
  // ============================================================================

  /**
   * Subscribe to Alpha commands
   */
  onAlphaCommand(callback: (command: GammaCommand) => void): () => void {
    this.on('alpha:command', callback);
    return () => this.off('alpha:command', callback);
  }

  /**
   * Subscribe to Alpha decisions
   */
  onAlphaDecision(callback: (decision: AlphaDecision) => void): () => void {
    this.on('alpha:decision', callback);
    return () => this.off('alpha:decision', callback);
  }

  /**
   * Subscribe to Gamma stats
   */
  onGammaStats(callback: (stats: GammaStats) => void): () => void {
    this.on('gamma:stats', callback);
    return () => this.off('gamma:stats', callback);
  }

  /**
   * Subscribe to market updates
   */
  onMarketUpdate(callback: (metrics: MarketMetrics) => void): () => void {
    this.on('market:update', callback);
    return () => this.off('market:update', callback);
  }

  /**
   * Subscribe to regime changes
   */
  onRegimeChange(callback: (regime: RegimeCharacteristics) => void): () => void {
    this.on('market:regime_change', callback);
    return () => this.off('market:regime_change', callback);
  }

  // ============================================================================
  // SYSTEM MANAGEMENT
  // ============================================================================

  /**
   * Initialize the communication system
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('[Communicator] Already initialized');
      return;
    }

    console.log('\n[Communicator] Initializing Alpha-Gamma communication system...');
    this.isInitialized = true;
    this.emit('system:initialized', { timestamp: Date.now() });
    console.log('[Communicator] ✅ Initialized successfully\n');
  }

  /**
   * Shutdown the communication system
   */
  shutdown() {
    console.log('\n[Communicator] Shutting down...');
    this.emit('system:shutdown', { timestamp: Date.now() });
    this.removeAllListeners();
    this.isInitialized = false;
    console.log('[Communicator] ✅ Shutdown complete\n');
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeCommand: this.activeCommand !== null,
      commandHistorySize: this.commandHistory.length,
      listeners: this.eventNames().map(event => ({
        event: event.toString(),
        count: this.listenerCount(event)
      })),
      latestData: {
        hasAlphaDecision: this.latestAlphaDecision !== null,
        hasGammaStats: this.latestGammaStats !== null,
        hasMarketMetrics: this.latestMarketMetrics !== null,
        hasRegime: this.latestRegime !== null
      }
    };
  }

  /**
   * Get detailed status string for logging
   */
  getDetailedStatus(): string {
    const status = this.getStatus();
    return `
Alpha-Gamma Communicator Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Initialized:       ${status.initialized ? '✅' : '❌'}
Active Command:    ${status.activeCommand ? '✅' : '❌'}
Command History:   ${status.commandHistorySize} entries

Latest Data:
  Alpha Decision:  ${status.latestData.hasAlphaDecision ? '✅' : '❌'}
  Gamma Stats:     ${status.latestData.hasGammaStats ? '✅' : '❌'}
  Market Metrics:  ${status.latestData.hasMarketMetrics ? '✅' : '❌'}
  Market Regime:   ${status.latestData.hasRegime ? '✅' : '❌'}

Event Listeners:
${status.listeners.map(l => `  ${l.event}: ${l.count} listener(s)`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const alphaGammaCommunicator = new AlphaGammaCommunicator();

// Auto-initialize
alphaGammaCommunicator.initialize();
