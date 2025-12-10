/**
 * Signal Validation Service
 * Validates trading signals against current market prices
 * Determines if signals hit targets or stop loss
 */

import { supabase } from '@/integrations/supabase/client';
import { cryptoDataService } from './cryptoDataService';

export interface SignalValidationResult {
  signalId: string;
  status: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'ACTIVE';
  hitTarget?: number; // Which target was hit (1, 2, or 3)
  hitStopLoss?: boolean;
  profitLossPercent?: number;
  currentPrice: number;
}

class SignalValidationService {
  /**
   * Check if a signal hit its targets or stop loss
   */
  async validateSignal(signal: any, currentPrice: number): Promise<SignalValidationResult> {
    const result: SignalValidationResult = {
      signalId: signal.id,
      status: signal.status,
      currentPrice
    };

    // Check if already completed
    if (signal.status === 'SUCCESS' || signal.status === 'FAILED' || signal.status === 'EXPIRED') {
      return result;
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(signal.expires_at);
    if (now > expiresAt) {
      result.status = 'EXPIRED';
      return result;
    }

    // For BUY signals
    if (signal.signal_type === 'BUY') {
      // Check if hit stop loss (price went below stop loss)
      if (signal.stop_loss && currentPrice <= signal.stop_loss) {
        result.status = 'FAILED';
        result.hitStopLoss = true;
        result.profitLossPercent = ((currentPrice - signal.entry_max) / signal.entry_max) * 100;
        return result;
      }

      // Check if hit any targets (price went above targets)
      if (signal.target_3 && currentPrice >= signal.target_3) {
        result.status = 'SUCCESS';
        result.hitTarget = 3;
        result.profitLossPercent = ((currentPrice - signal.entry_max) / signal.entry_max) * 100;
        return result;
      }

      if (signal.target_2 && currentPrice >= signal.target_2) {
        result.status = 'SUCCESS';
        result.hitTarget = 2;
        result.profitLossPercent = ((currentPrice - signal.entry_max) / signal.entry_max) * 100;
        return result;
      }

      if (signal.target_1 && currentPrice >= signal.target_1) {
        result.status = 'SUCCESS';
        result.hitTarget = 1;
        result.profitLossPercent = ((currentPrice - signal.entry_max) / signal.entry_max) * 100;
        return result;
      }
    }

    // For SELL signals
    if (signal.signal_type === 'SELL') {
      // Check if hit stop loss (price went above stop loss)
      if (signal.stop_loss && currentPrice >= signal.stop_loss) {
        result.status = 'FAILED';
        result.hitStopLoss = true;
        result.profitLossPercent = ((signal.entry_min - currentPrice) / signal.entry_min) * 100;
        return result;
      }

      // Check if hit any targets (price went below targets)
      if (signal.target_3 && currentPrice <= signal.target_3) {
        result.status = 'SUCCESS';
        result.hitTarget = 3;
        result.profitLossPercent = ((signal.entry_min - currentPrice) / signal.entry_min) * 100;
        return result;
      }

      if (signal.target_2 && currentPrice <= signal.target_2) {
        result.status = 'SUCCESS';
        result.hitTarget = 2;
        result.profitLossPercent = ((signal.entry_min - currentPrice) / signal.entry_min) * 100;
        return result;
      }

      if (signal.target_1 && currentPrice <= signal.target_1) {
        result.status = 'SUCCESS';
        result.hitTarget = 1;
        result.profitLossPercent = ((signal.entry_min - currentPrice) / signal.entry_min) * 100;
        return result;
      }
    }

    // Still active
    result.status = 'ACTIVE';
    return result;
  }

  /**
   * Update signal in database
   */
  async updateSignalStatus(
    signalId: string,
    status: string,
    hitTarget?: number,
    hitStopLoss?: boolean,
    profitLossPercent?: number
  ) {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'SUCCESS' || status === 'FAILED' || status === 'EXPIRED') {
      updates.completed_at = new Date().toISOString();
    }

    if (hitTarget !== undefined) {
      updates.hit_target = hitTarget;
    }

    if (hitStopLoss !== undefined) {
      updates.hit_stop_loss = hitStopLoss;
    }

    if (profitLossPercent !== undefined) {
      updates.profit_loss_percent = profitLossPercent;
    }

    const { error } = await supabase
      .from('intelligence_signals')
      .update(updates)
      .eq('id', signalId);

    if (error) {
      console.error('Error updating signal:', error);
      throw error;
    }
  }

  /**
   * Validate all active signals (system-wide)
   */
  async validateAllSignals(): Promise<SignalValidationResult[]> {
    console.log('[SignalValidation] Validating all active signals...');

    // Get all active signals
    const { data: signals, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('status', 'ACTIVE');

    if (error) {
      console.error('[SignalValidation] Error fetching signals:', error);
      return [];
    }

    if (!signals || signals.length === 0) {
      console.log('[SignalValidation] No active signals to validate');
      return [];
    }

    console.log(`[SignalValidation] Found ${signals.length} active signal(s)`);
    const results: SignalValidationResult[] = [];

    // Validate each signal
    for (const signal of signals) {
      try {
        // Get current price from CoinGecko
        const coinData = await cryptoDataService.getCryptoDetails(signal.symbol.toLowerCase());
        const currentPrice = coinData?.market_data?.current_price?.usd || 0;

        if (currentPrice === 0) {
          console.warn(`[SignalValidation] Could not fetch price for ${signal.symbol}`);
          continue;
        }

        console.log(`[SignalValidation] Validating ${signal.symbol} signal at price $${currentPrice}`);

        // Validate signal
        const result = await this.validateSignal(signal, currentPrice);
        results.push(result);

        // Update if status changed
        if (result.status !== signal.status) {
          console.log(`[SignalValidation] Status changed: ${signal.status} -> ${result.status}`);
          await this.updateSignalStatus(
            result.signalId,
            result.status,
            result.hitTarget,
            result.hitStopLoss,
            result.profitLossPercent
          );
        }
      } catch (error) {
        console.error(`[SignalValidation] Error validating signal ${signal.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Manually close a signal (user action)
   */
  async manuallyCloseSignal(
    signalId: string,
    exitPrice: number,
    status: 'SUCCESS' | 'FAILED'
  ) {
    // Fetch signal data
    const { data: signal, error: fetchError } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (fetchError || !signal) {
      throw new Error('Signal not found');
    }

    // Calculate P/L
    let profitLossPercent = 0;
    if (signal.signal_type === 'BUY') {
      profitLossPercent = ((exitPrice - signal.entry_max) / signal.entry_max) * 100;
    } else {
      profitLossPercent = ((signal.entry_min - exitPrice) / signal.entry_min) * 100;
    }

    // Determine which target was hit (if success)
    let hitTarget = undefined;
    if (status === 'SUCCESS') {
      if (signal.signal_type === 'BUY') {
        if (exitPrice >= signal.target_3) hitTarget = 3;
        else if (exitPrice >= signal.target_2) hitTarget = 2;
        else if (exitPrice >= signal.target_1) hitTarget = 1;
      } else {
        if (exitPrice <= signal.target_3) hitTarget = 3;
        else if (exitPrice <= signal.target_2) hitTarget = 2;
        else if (exitPrice <= signal.target_1) hitTarget = 1;
      }
    }

    await this.updateSignalStatus(
      signalId,
      status,
      hitTarget,
      status === 'FAILED',
      profitLossPercent
    );

    // Also update exit price
    await supabase
      .from('intelligence_signals')
      .update({ exit_price: exitPrice })
      .eq('id', signalId);
  }
}

export const signalValidationService = new SignalValidationService();
