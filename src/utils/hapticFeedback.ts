/**
 * Haptic Feedback Utilities for Mobile Trading
 * Provides tactile feedback for trade execution and alerts
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

class HapticFeedbackManager {
  private enabled: boolean = true;
  private supportsHaptics: boolean = false;

  constructor() {
    this.checkHapticSupport();
    this.loadPreferences();
  }

  private checkHapticSupport() {
    // Check for Vibration API
    this.supportsHaptics = 'vibrate' in navigator;
    
    // Also check for iOS haptic engine (available on iOS 13+)
    // This is detected through the presence of specific webkit APIs
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && (window as any).webkit?.messageHandlers) {
      this.supportsHaptics = true;
    }
  }

  private loadPreferences() {
    const savedEnabled = localStorage.getItem('trading_haptics_enabled');
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
  }

  /**
   * Trigger haptic feedback
   */
  trigger(type: HapticType) {
    if (!this.enabled || !this.supportsHaptics) return;

    try {
      // Get vibration pattern based on haptic type
      const pattern = this.getVibrationPattern(type);
      
      // Use Vibration API
      if ('vibrate' in navigator && pattern) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('Failed to trigger haptic feedback:', error);
    }
  }

  /**
   * Get vibration pattern for haptic type
   * Pattern is [vibrate, pause, vibrate, pause, ...]
   */
  private getVibrationPattern(type: HapticType): number | number[] {
    switch (type) {
      case 'light':
        return 10; // Short light tap
      
      case 'medium':
        return 20; // Medium tap
      
      case 'heavy':
        return 40; // Strong tap
      
      case 'success':
        // Two quick taps - success pattern
        return [20, 50, 20];
      
      case 'warning':
        // Single longer vibration
        return 30;
      
      case 'error':
        // Three quick taps - error pattern
        return [20, 50, 20, 50, 20];
      
      case 'selection':
        // Very light tap for selections
        return 5;
      
      default:
        return 15;
    }
  }

  /**
   * Convenience methods for common trading actions
   */
  orderPlaced(side: 'BUY' | 'SELL') {
    this.trigger('medium');
  }

  orderFilled() {
    this.trigger('success');
  }

  orderFailed() {
    this.trigger('error');
  }

  priceAlert() {
    this.trigger('warning');
  }

  positionClosed(profit: number) {
    if (profit > 0) {
      this.trigger('success');
    } else if (profit < 0) {
      this.trigger('error');
    } else {
      this.trigger('medium');
    }
  }

  buttonPress() {
    this.trigger('light');
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('trading_haptics_enabled', enabled.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isSupported(): boolean {
    return this.supportsHaptics;
  }
}

// Singleton instance
export const hapticManager = new HapticFeedbackManager();
