/**
 * FLUX CONTROLLER - Simplified PUSH/PULL Signal Control
 *
 * PUSH MODE (Range-Bound Markets):
 * - High frequency signals (every 15-30 mins)
 * - Mixed quality threshold (45%+ confidence)
 * - Accept HIGH, MEDIUM, and LOW tier signals
 * - Goal: More signals = more trades = more profit opportunities in stable market
 *
 * PULL MODE (Volatile Markets):
 * - Low frequency signals (every 1-2 hours)
 * - High quality threshold (70%+ confidence)
 * - Accept only HIGH tier signals
 * - Goal: Fewer signals = only best opportunities = preserve capital in volatile conditions
 *
 * AUTO MODE (Default):
 * - Automatically detects market regime
 * - Switches between PUSH and PULL based on real-time volatility
 */

import { globalHubService } from './globalHubService';
import { deltaV2QualityEngine } from './deltaV2QualityEngine';
import { igxGammaV2 } from './igx/IGXGammaV2';

// ===== TYPES =====

export type FluxMode = 'PUSH' | 'PULL' | 'AUTO';

export interface FluxState {
  mode: FluxMode;
  isActive: boolean;
  lastModeChange: number;
  autoDetectedMode: 'PUSH' | 'PULL';
  marketVolatility: number; // 0-100
  signalsToday: number;
  signalsTarget: number;
  profitabilityScore: number; // -100 to 100
}

export interface FluxConfig {
  // PUSH mode settings
  push: {
    signalIntervalMinutes: number;
    qualityThreshold: number;
    mlThreshold: number;
    strategyWinRateThreshold: number;
    acceptHigh: boolean;
    acceptMedium: boolean;
    acceptLow: boolean;
  };
  // PULL mode settings
  pull: {
    signalIntervalMinutes: number;
    qualityThreshold: number;
    mlThreshold: number;
    strategyWinRateThreshold: number;
    acceptHigh: boolean;
    acceptMedium: boolean;
    acceptLow: boolean;
  };
}

// ===== DEFAULT CONFIGURATIONS =====

const DEFAULT_CONFIG: FluxConfig = {
  push: {
    signalIntervalMinutes: 20,      // Signal every 20 mins in PUSH
    qualityThreshold: 45,           // Accept 45%+ quality
    mlThreshold: 40,                // Accept 40%+ ML confidence
    strategyWinRateThreshold: 30,   // Accept 30%+ win rate strategies
    acceptHigh: true,
    acceptMedium: true,
    acceptLow: true                 // Accept all tiers in PUSH
  },
  pull: {
    signalIntervalMinutes: 90,      // Signal every 90 mins in PULL
    qualityThreshold: 70,           // Only 70%+ quality
    mlThreshold: 65,                // Only 65%+ ML confidence
    strategyWinRateThreshold: 50,   // Only 50%+ win rate strategies
    acceptHigh: true,
    acceptMedium: false,
    acceptLow: false                // Only HIGH tier in PULL
  }
};

// ===== FLUX CONTROLLER CLASS =====

class FluxController {
  private state: FluxState = {
    mode: 'AUTO',
    isActive: true,
    lastModeChange: Date.now(),
    autoDetectedMode: 'PUSH',
    marketVolatility: 30,
    signalsToday: 0,
    signalsTarget: 24,
    profitabilityScore: 0
  };

  private config: FluxConfig = DEFAULT_CONFIG;
  private volatilityHistory: number[] = [];
  private priceHistory: Map<string, number[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private listeners: ((state: FluxState) => void)[] = [];

  /**
   * Initialize FLUX Controller
   */
  async initialize(): Promise<void> {
    console.log('[FLUX] 🎮 Initializing FLUX Controller...');

    // Load saved state from localStorage
    this.loadState();

    // Start market volatility monitoring
    this.startVolatilityMonitoring();

    // Apply current mode settings
    this.applyModeSettings();

    console.log(`[FLUX] ✅ Initialized in ${this.state.mode} mode`);
    console.log(`[FLUX] 📊 Auto-detected mode: ${this.state.autoDetectedMode}`);
  }

  /**
   * Set FLUX mode (PUSH, PULL, or AUTO)
   */
  setMode(mode: FluxMode): void {
    const previousMode = this.state.mode;
    this.state.mode = mode;
    this.state.lastModeChange = Date.now();

    console.log(`[FLUX] 🎮 Mode changed: ${previousMode} → ${mode}`);

    // Apply settings for new mode
    this.applyModeSettings();

    // Save state
    this.saveState();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Apply settings based on current mode
   */
  private applyModeSettings(): void {
    const activeMode = this.state.mode === 'AUTO'
      ? this.state.autoDetectedMode
      : this.state.mode;

    const settings = activeMode === 'PUSH' ? this.config.push : this.config.pull;

    console.log(`[FLUX] 🔧 Applying ${activeMode} mode settings...`);
    console.log(`[FLUX]   - Signal interval: ${settings.signalIntervalMinutes} minutes`);
    console.log(`[FLUX]   - Quality threshold: ${settings.qualityThreshold}%`);
    console.log(`[FLUX]   - ML threshold: ${settings.mlThreshold}%`);
    console.log(`[FLUX]   - Tier gates: HIGH=${settings.acceptHigh}, MEDIUM=${settings.acceptMedium}, LOW=${settings.acceptLow}`);

    // Update signal frequency (convert to milliseconds)
    // For PRO tier (most signals)
    globalHubService.updateDropInterval('PRO', settings.signalIntervalMinutes * 60 * 1000);
    // MAX tier gets signals faster
    globalHubService.updateDropInterval('MAX', Math.floor(settings.signalIntervalMinutes * 0.6) * 60 * 1000);
    // FREE tier gets signals slower
    globalHubService.updateDropInterval('FREE', settings.signalIntervalMinutes * 3 * 60 * 1000);

    // Update quality thresholds
    deltaV2QualityEngine.setThresholds(
      settings.qualityThreshold,
      settings.mlThreshold / 100,
      settings.strategyWinRateThreshold
    );

    // Update tier gates
    igxGammaV2.setTierConfig({
      acceptHigh: settings.acceptHigh,
      acceptMedium: settings.acceptMedium,
      acceptLow: settings.acceptLow
    });

    // Update target signals based on mode
    this.state.signalsTarget = activeMode === 'PUSH' ? 48 : 16; // 48/day PUSH, 16/day PULL
  }

  /**
   * Toggle PUSH mode
   */
  push(): void {
    console.log('[FLUX] 🚀 PUSH activated - High frequency mode');
    this.setMode('PUSH');
  }

  /**
   * Toggle PULL mode
   */
  pull(): void {
    console.log('[FLUX] 🎯 PULL activated - High quality mode');
    this.setMode('PULL');
  }

  /**
   * Enable AUTO mode
   */
  auto(): void {
    console.log('[FLUX] 🤖 AUTO mode enabled - Adaptive market detection');
    this.setMode('AUTO');
  }

  /**
   * Start volatility monitoring for AUTO mode
   */
  private startVolatilityMonitoring(): void {
    // Monitor volatility every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateVolatility();

      // If in AUTO mode, check if we should switch
      if (this.state.mode === 'AUTO') {
        this.autoDetectMode();
      }

      // Update signal count for today
      this.updateSignalCount();

      // Notify listeners
      this.notifyListeners();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Also do initial volatility check
    this.updateVolatility();
  }

  /**
   * Update market volatility estimate
   */
  private async updateVolatility(): Promise<void> {
    try {
      // Get BTC price changes as proxy for market volatility
      const currentPrice = await this.getBTCPrice();

      if (currentPrice) {
        const btcHistory = this.priceHistory.get('BTC') || [];
        btcHistory.push(currentPrice);

        // Keep last 24 data points (2 hours worth at 5-min intervals)
        if (btcHistory.length > 24) {
          btcHistory.shift();
        }

        this.priceHistory.set('BTC', btcHistory);

        // Calculate volatility as % change over the period
        if (btcHistory.length >= 2) {
          const priceChanges = [];
          for (let i = 1; i < btcHistory.length; i++) {
            const change = Math.abs((btcHistory[i] - btcHistory[i-1]) / btcHistory[i-1]) * 100;
            priceChanges.push(change);
          }

          // Average absolute change
          const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;

          // Convert to 0-100 scale (0.1% = low vol, 2% = high vol)
          const volatility = Math.min(100, (avgChange / 0.02) * 100);

          this.state.marketVolatility = volatility;
          this.volatilityHistory.push(volatility);

          // Keep last 12 volatility readings
          if (this.volatilityHistory.length > 12) {
            this.volatilityHistory.shift();
          }
        }
      }
    } catch (error) {
      console.warn('[FLUX] Could not update volatility:', error);
    }
  }

  /**
   * Get current BTC price
   */
  private async getBTCPrice(): Promise<number | null> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await response.json();
      return data.bitcoin?.usd || null;
    } catch {
      return null;
    }
  }

  /**
   * Auto-detect optimal mode based on market conditions
   */
  private autoDetectMode(): void {
    const avgVolatility = this.volatilityHistory.length > 0
      ? this.volatilityHistory.reduce((a, b) => a + b, 0) / this.volatilityHistory.length
      : 30;

    // Volatility threshold: 50 = boundary between PUSH and PULL
    // Low volatility (<50) = range-bound = PUSH (more signals)
    // High volatility (>50) = trending/volatile = PULL (fewer, better signals)
    const newMode = avgVolatility < 50 ? 'PUSH' : 'PULL';

    if (newMode !== this.state.autoDetectedMode) {
      console.log(`[FLUX] 🔄 AUTO: Switching from ${this.state.autoDetectedMode} to ${newMode}`);
      console.log(`[FLUX]   - Avg volatility: ${avgVolatility.toFixed(1)}%`);
      console.log(`[FLUX]   - Threshold: 50%`);

      this.state.autoDetectedMode = newMode;

      // Apply new settings if in AUTO mode
      if (this.state.mode === 'AUTO') {
        this.applyModeSettings();
      }
    }
  }

  /**
   * Update signal count for today
   */
  private updateSignalCount(): void {
    try {
      const metrics = globalHubService.getMetrics();
      this.state.signalsToday = metrics.totalSignals || 0;
    } catch {
      // Ignore errors
    }
  }

  /**
   * Update profitability score based on Arena performance
   */
  updateProfitability(score: number): void {
    this.state.profitabilityScore = Math.max(-100, Math.min(100, score));

    // If profitability drops below -20, consider switching to PULL
    if (this.state.profitabilityScore < -20 && this.state.mode === 'AUTO') {
      console.log('[FLUX] ⚠️ Profitability declining - switching to PULL for quality');
      this.state.autoDetectedMode = 'PULL';
      this.applyModeSettings();
    }

    // If profitability is high and we're in PULL, consider switching to PUSH
    if (this.state.profitabilityScore > 30 && this.state.autoDetectedMode === 'PULL' && this.state.mode === 'AUTO') {
      console.log('[FLUX] 🚀 High profitability - switching to PUSH for more signals');
      this.state.autoDetectedMode = 'PUSH';
      this.applyModeSettings();
    }
  }

  /**
   * Get current state
   */
  getState(): FluxState {
    return { ...this.state };
  }

  /**
   * Get current config
   */
  getConfig(): FluxConfig {
    return { ...this.config };
  }

  /**
   * Update PUSH config
   */
  updatePushConfig(config: Partial<FluxConfig['push']>): void {
    this.config.push = { ...this.config.push, ...config };
    if (this.state.mode === 'PUSH' || (this.state.mode === 'AUTO' && this.state.autoDetectedMode === 'PUSH')) {
      this.applyModeSettings();
    }
    this.saveState();
  }

  /**
   * Update PULL config
   */
  updatePullConfig(config: Partial<FluxConfig['pull']>): void {
    this.config.pull = { ...this.config.pull, ...config };
    if (this.state.mode === 'PULL' || (this.state.mode === 'AUTO' && this.state.autoDetectedMode === 'PULL')) {
      this.applyModeSettings();
    }
    this.saveState();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: FluxState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem('flux_state', JSON.stringify({
        mode: this.state.mode,
        config: this.config
      }));
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem('flux_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) this.state.mode = parsed.mode;
        if (parsed.config) this.config = { ...this.config, ...parsed.config };
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.listeners = [];
  }
}

// ===== EXPORT SINGLETON =====

export const fluxController = new FluxController();
export default fluxController;
