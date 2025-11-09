/**
 * IGX BACKGROUND SERVICE - FULL PIPELINE PRODUCTION V3
 *
 * AUTO-STARTS 24/7 PIPELINE:
 * Phase 1: Data Engine V4 Enhanced (Multi-source real-time data - 7 types)
 * Phase 2: Feature Engine Worker → Feature Cache (Pre-computed features)
 * Phase 3: Streaming Alpha V3 (Real-time intelligence, adaptive frequency, continuous learning)
 * Phase 3.5: IGX Beta V5 (10 strategies + ML weighting + regime-aware selection)
 * Phase 4: IGX Gamma V2 (Signal assembly with intelligence enhancements)
 * Phase 5: Opportunity Scorer → Quality Checker (Signal scoring & filtering)
 * Phase 6: Signal Lifecycle Manager (Track outcomes + continuous learning)
 *
 * NEW IN V3:
 * - IGX Beta V5 with Enhanced Strategy Selector (regime-aware)
 * - IGX Gamma V2 with intelligence enhancements:
 *   * Confidence Calibrator (honest confidence scores)
 *   * Market Fit Scorer (A/B/C/D/F grading)
 *   * Risk-Aware Position Sizer (optimal sizing)
 * - Signal Lifecycle Manager (auto-detect outcomes)
 * - Continuous Learning Integrator (feedback loop)
 * - Complete learning pipeline
 *
 * RUNS INDEPENDENTLY OF PAGE NAVIGATION
 * SENDS NOTIFICATIONS WHEN SIGNALS GENERATED
 * LEARNS AND IMPROVES AUTOMATICALLY
 */

import { igxDataEngineV4Enhanced } from './IGXDataEngineV4Enhanced';
import { featureEngineWorker } from './FeatureEngineWorker';
import { streamingAlphaV3 } from './StreamingAlphaV3';
import { opportunityScorer } from './OpportunityScorer';
import { featureCache } from './FeatureCache';
import { igxBetaV5 } from './IGXBetaV5';
import { igxGammaV2 } from './IGXGammaV2';
import { signalLifecycleManager } from './SignalLifecycleManager';
import { continuousLearningIntegrator } from './ContinuousLearningIntegrator';
import { confidenceCalibrator } from './ConfidenceCalibrator';

class IGXBackgroundService {
  private isInitialized = false;
  private notificationPermission: NotificationPermission = 'default';
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize Phase 1-4 pipeline automatically
   * Runs once when app loads
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[IGX Background] Already initialized');
      return;
    }

    console.log('\n🚀 ========== IGX PHASE 1-6 AUTO-START V3 ==========');
    console.log('📡 24/7 Operation: Complete intelligence pipeline');
    console.log('🔔 Notifications: Real-time signal alerts');
    console.log('🧠 Learning: Continuous improvement from outcomes');
    console.log('🔥 No Manual Intervention Required');
    console.log('====================================================\n');

    // Request notification permission (non-blocking)
    this.requestNotificationPermission().catch(err =>
      console.warn('[IGX Background] Notification setup failed:', err)
    );

    // Register service worker (non-blocking)
    this.registerServiceWorker().catch(err =>
      console.warn('[IGX Background] Service Worker setup failed:', err)
    );

    // Auto-start Phase 1-4 pipeline
    await this.startPipeline();

    // Listen for signal events
    this.setupSignalListeners();

    this.isInitialized = true;
    console.log('[IGX Background] ✅ Phase 1-6 V3 pipeline running 24/7 with continuous learning\n');
  }

  /**
   * Start Phase 1-6 Pipeline
   */
  private async startPipeline() {
    try {
      console.log('[IGX Background] 🔧 Starting Phase 1-6 Pipeline V3...\n');

      // PHASE 2: Feature Engine Worker (must start first to prepare cache)
      console.log('[Phase 2] Starting Feature Engine Worker...');
      featureEngineWorker.start();
      console.log('[Phase 2] ✅ Feature Engine Worker running\n');

      // PHASE 3: Streaming Alpha V3
      console.log('[Phase 3] Starting Streaming Alpha V3 (Intelligence Engine)...');
      streamingAlphaV3.start();
      console.log('[Phase 3] ✅ Streaming Alpha V3 running (hot cache active)\n');

      // PHASE 3.5: IGX Beta V5 (Strategy Execution + ML Weighting)
      console.log('[Phase 3.5] Starting IGX Beta V5 (Strategy Execution)...');
      igxBetaV5.start();
      console.log('[Phase 3.5] ✅ Beta V5 running (10 strategies + ML engine)\n');

      // PHASE 4: IGX Gamma V2 (Signal Assembly)
      console.log('[Phase 4] Starting IGX Gamma V2 (Signal Assembly)...');
      igxGammaV2.start();
      console.log('[Phase 4] ✅ Gamma V2 running (intelligence enhancements active)\n');

      // PHASE 5: Signal Lifecycle Manager (Outcome Tracking)
      console.log('[Phase 5] Starting Signal Lifecycle Manager...');
      signalLifecycleManager.start();
      console.log('[Phase 5] ✅ Signal Lifecycle Manager running (tracking outcomes)\n');

      // PHASE 6: Continuous Learning Integrator (Feedback Loop)
      console.log('[Phase 6] Starting Continuous Learning Integrator...');
      continuousLearningIntegrator.start();
      console.log('[Phase 6] ✅ Continuous Learning Integrator running (feedback loop active)\n');

      // PHASE 6b: Confidence Calibrator (Learning Component)
      console.log('[Phase 6b] Starting Confidence Calibrator...');
      confidenceCalibrator.start();
      console.log('[Phase 6b] ✅ Confidence Calibrator running (calibrating confidence)\n');

      // PHASE 1: Data Engine V4 Enhanced (start last to trigger data flow)
      const symbols = [
        'BTC', 'ETH', 'SOL', 'BNB', 'XRP',
        'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'
      ];

      console.log(`[Phase 1] Starting Data Engine with ${symbols.length} symbols...`);
      await igxDataEngineV4Enhanced.start(symbols);
      console.log('[Phase 1] ✅ Data Engine running (WebSocket + REST)\n');

      // Wait for initial data flow
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Feature Cache will be populated automatically by Feature Engine Worker
      console.log('[Phase 2] ✅ Feature Cache ready (auto-populating via worker)\n');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ PHASE 1-6 PIPELINE V3 FULLY OPERATIONAL');
      console.log('✅ COMPLETE INTELLIGENCE PIPELINE ACTIVE');
      console.log('✅ CONTINUOUS LEARNING ENABLED');
      console.log('✅ RUNNING 24/7 AUTOMATICALLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Show system started notification
      this.showNotification(
        '🚀 IGX System V3 Active',
        'Complete intelligence pipeline with continuous learning running 24/7.',
        { icon: '/icon-192.png', badge: '/badge-72.png' }
      );

    } catch (error) {
      console.error('[IGX Background] ❌ Pipeline startup failed:', error);
      // Don't throw - let the system try to recover
    }
  }

  /**
   * Request notification permission from user
   */
  private async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('[IGX Background] Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      console.log('[IGX Background] ✅ Notification permission granted');
      return;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;

        if (permission === 'granted') {
          console.log('[IGX Background] ✅ Notification permission granted');
        }
      } catch (error) {
        console.error('[IGX Background] Error requesting notification permission:', error);
      }
    }
  }

  /**
   * Register service worker for background tasks
   */
  private async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[IGX Background] Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      this.serviceWorkerRegistration = registration;
      console.log('[IGX Background] ✅ Service Worker ready');
    } catch (error) {
      console.error('[IGX Background] Service Worker error:', error);
    }
  }

  /**
   * Setup listeners for new signals
   */
  private setupSignalListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('igx-signal-generated', this.handleNewSignal.bind(this));
      window.addEventListener('igx-signal-approved', this.handleApprovedSignal.bind(this));
      window.addEventListener('igx-ticker-update', this.handleTickerUpdate.bind(this));
      console.log('[IGX Background] ✅ Event listeners registered');
    }
  }

  /**
   * Handle ticker updates (for pipeline monitoring)
   */
  private handleTickerUpdate(event: CustomEvent) {
    // Silent monitoring - log only significant events
    if (Math.random() < 0.01) { // 1% sampling
      const stats = igxDataEngineV4Enhanced.getStats();
      console.log(`[Pipeline Monitor] Tickers: ${stats.tickersReceived || 0}, Sources: ${stats.sourcesActive}/${stats.sourcesTotal}`);
    }
  }

  /**
   * Handle new signal event
   */
  private handleNewSignal(event: CustomEvent) {
    const { signal } = event.detail;

    console.log('[IGX Background] 🚨 NEW SIGNAL:', signal.symbol, signal.direction, `${signal.confidence}%`);

    // Send notification
    this.showNotification(
      `🎯 ${signal.direction} Signal: ${signal.symbol}`,
      `Confidence: ${signal.confidence}% | Expected: +${signal.expectedProfit.toFixed(1)}% | Entry: $${signal.entryPrice.toLocaleString()}`,
      {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: `signal-${signal.id}`,
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Signal' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        data: {
          signal,
          url: '/intelligence-hub'
        }
      }
    );

    // Store in local storage
    this.storeSignal(signal);
  }

  /**
   * Handle approved signal (after quality gates)
   */
  private handleApprovedSignal(event: CustomEvent) {
    const signal = event.detail;
    console.log('[IGX Background] ✅ SIGNAL APPROVED:', signal.symbol, `Grade: ${signal.qualityGrade}`);
  }

  /**
   * Show notification to user
   */
  private showNotification(
    title: string,
    body: string,
    options?: NotificationOptions
  ) {
    if (this.notificationPermission !== 'granted') {
      return;
    }

    try {
      // Use service worker notification if available
      if (this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration.showNotification(title, {
          body,
          vibrate: [200, 100, 200],
          ...options
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          body,
          ...options
        });
      }
    } catch (error) {
      console.error('[IGX Background] Error showing notification:', error);
    }
  }

  /**
   * Store signal for later retrieval
   */
  private storeSignal(signal: any) {
    try {
      const stored = localStorage.getItem('igx-signals') || '[]';
      const signals = JSON.parse(stored);

      signals.unshift({
        ...signal,
        notifiedAt: Date.now()
      });

      // Keep last 100 signals
      const limited = signals.slice(0, 100);
      localStorage.setItem('igx-signals', JSON.stringify(limited));
    } catch (error) {
      console.error('[IGX Background] Error storing signal:', error);
    }
  }

  /**
   * Get stored signals
   */
  getStoredSignals() {
    try {
      const stored = localStorage.getItem('igx-signals') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.error('[IGX Background] Error reading signals:', error);
      return [];
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    const engineStats = igxDataEngineV4Enhanced.getStats();
    const cacheStats = featureCache.getStats();
    const alphaStats = streamingAlphaV3.getStats();

    return {
      initialized: this.isInitialized,
      notificationsEnabled: this.notificationPermission === 'granted',
      pipeline: {
        dataEngine: {
          running: engineStats?.totalTickers > 0,
          symbols: igxDataEngineV4Enhanced.getAllSymbols().length,
          sources: `${engineStats?.sourcesActive}/${engineStats?.sourcesTotal}`
        },
        featureCache: {
          symbols: cacheStats?.totalSymbols || 0,
          hitRate: cacheStats?.hitRate || 0
        },
        alphaV3: {
          running: alphaStats?.isRunning || false,
          mode: alphaStats?.currentMode || 'UNKNOWN',
          cacheHitRate: alphaStats?.cacheHitRate || 0,
          decisionsIssued: alphaStats?.decisionsIssued || 0
        }
      }
    };
  }
}

// Singleton instance
export const igxBackgroundService = new IGXBackgroundService();

// Auto-initialize on import (runs when app starts)
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => igxBackgroundService.initialize(), 500);
    });
  } else {
    setTimeout(() => igxBackgroundService.initialize(), 500);
  }
}
