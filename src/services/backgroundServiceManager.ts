/**
 * BACKGROUND SERVICE MANAGER
 * Ensures robust initialization and recovery of the background signal service
 *
 * FEATURES:
 * - Delayed initialization to ensure all dependencies are ready
 * - Auto-recovery from failures
 * - Health monitoring
 * - Browser environment detection
 * - Singleton pattern
 */

import { backgroundSignalService } from './backgroundSignalService';

class BackgroundServiceManager {
  private static instance: BackgroundServiceManager;
  private initialized = false;
  private initializationAttempts = 0;
  private readonly MAX_INIT_ATTEMPTS = 5;
  private readonly INIT_DELAY = 3000; // 3 seconds delay for dependencies
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): BackgroundServiceManager {
    if (!BackgroundServiceManager.instance) {
      BackgroundServiceManager.instance = new BackgroundServiceManager();
    }
    return BackgroundServiceManager.instance;
  }

  /**
   * Initialize the background service with proper checks
   */
  async initialize(): Promise<void> {
    // Check if already initialized
    if (this.initialized) {
      console.log('[ServiceManager] Already initialized');
      return;
    }

    // Check if running in browser
    if (typeof window === 'undefined') {
      console.log('[ServiceManager] Not in browser environment, skipping');
      return;
    }

    // Check if on the Intelligence Hub page
    const isIntelligenceHub = window.location.pathname.includes('intelligence-hub');
    if (!isIntelligenceHub) {
      console.log('[ServiceManager] Not on Intelligence Hub page, deferring initialization');
      return;
    }

    console.log('[ServiceManager] 🚀 Initializing background service...');

    // Wait for dependencies to be ready
    await this.waitForDependencies();

    // Attempt to start the service
    await this.startServiceWithRetry();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Wait for critical dependencies to be ready
   */
  private async waitForDependencies(): Promise<void> {
    console.log('[ServiceManager] Waiting for dependencies...');

    // Wait for DOM to be ready
    if (document.readyState !== 'complete') {
      await new Promise<void>(resolve => {
        window.addEventListener('load', () => resolve());
      });
    }

    // Wait for Supabase to be ready
    await this.waitForSupabase();

    // Additional delay to ensure all services are loaded
    await new Promise(resolve => setTimeout(resolve, this.INIT_DELAY));

    console.log('[ServiceManager] Dependencies ready');
  }

  /**
   * Wait for Supabase client to be ready
   */
  private async waitForSupabase(): Promise<void> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Try to get session to verify Supabase is ready
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.auth.getSession();
        console.log('[ServiceManager] Supabase client ready');
        return;
      } catch (error) {
        attempts++;
        console.log(`[ServiceManager] Waiting for Supabase... (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Supabase client not ready after maximum attempts');
  }

  /**
   * Start the service with retry logic
   */
  private async startServiceWithRetry(): Promise<void> {
    while (this.initializationAttempts < this.MAX_INIT_ATTEMPTS) {
      try {
        this.initializationAttempts++;
        console.log(`[ServiceManager] Starting service (attempt ${this.initializationAttempts}/${this.MAX_INIT_ATTEMPTS})`);

        // Check if service is already running
        const status = backgroundSignalService.getStatus();
        if (status.isRunning) {
          console.log('[ServiceManager] Service already running');
          this.initialized = true;
          return;
        }

        // Start the service
        await backgroundSignalService.start();
        this.initialized = true;
        console.log('[ServiceManager] ✅ Service started successfully');
        return;

      } catch (error) {
        console.error('[ServiceManager] Failed to start service:', error);

        if (this.initializationAttempts >= this.MAX_INIT_ATTEMPTS) {
          console.error('[ServiceManager] Max initialization attempts reached');
          throw error;
        }

        // Wait before retry
        const retryDelay = this.initializationAttempts * 5000; // Increasing delay
        console.log(`[ServiceManager] Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkServiceHealth();
    }, 30000);

    console.log('[ServiceManager] Health monitoring started');
  }

  /**
   * Check service health and restart if needed
   */
  private async checkServiceHealth(): Promise<void> {
    try {
      const status = backgroundSignalService.getStatus();

      if (!status.isRunning) {
        console.warn('[ServiceManager] ⚠️ Service not running, attempting restart...');
        await this.restartService();
        return;
      }

      // Check if service is stale (no activity for 5 minutes)
      if (status.lastHealthCheck) {
        const timeSinceLastCheck = Date.now() - status.lastHealthCheck;
        if (timeSinceLastCheck > 300000) { // 5 minutes
          console.warn('[ServiceManager] ⚠️ Service appears stale, attempting restart...');
          await this.restartService();
          return;
        }
      }

      // Check for errors
      if (status.errors && status.errors.length > 10) {
        console.warn('[ServiceManager] ⚠️ Too many errors detected, attempting restart...');
        await this.restartService();
        return;
      }

      console.log('[ServiceManager] ✅ Health check passed');

    } catch (error) {
      console.error('[ServiceManager] Health check error:', error);
      await this.restartService();
    }
  }

  /**
   * Restart the service
   */
  private async restartService(): Promise<void> {
    try {
      console.log('[ServiceManager] 🔄 Restarting service...');
      backgroundSignalService.stop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await backgroundSignalService.start();
      console.log('[ServiceManager] ✅ Service restarted');
    } catch (error) {
      console.error('[ServiceManager] Failed to restart service:', error);
    }
  }

  /**
   * Stop the service and cleanup
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    backgroundSignalService.stop();
    this.initialized = false;
    this.initializationAttempts = 0;

    console.log('[ServiceManager] Service stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      initializationAttempts: this.initializationAttempts,
      serviceStatus: backgroundSignalService.getStatus()
    };
  }
}

// Export singleton instance
export const backgroundServiceManager = BackgroundServiceManager.getInstance();