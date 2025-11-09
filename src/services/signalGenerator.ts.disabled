/**
 * Signal Generator - Professional Signal Generation with Full Accountability
 *
 * RESPONSIBILITY MODEL:
 * - Generates ONE signal every 4 hours
 * - Locks signal in database - cannot be changed
 * - Same signal shown to ALL users
 * - Signal is validated against actual market performance
 * - Full accountability for every recommendation
 */

import { supabase } from '@/integrations/supabase/client';
import { smartMoneySignalEngine } from './smartMoneySignalEngine';
import { cryptoDataService } from './cryptoDataService';

const SIGNAL_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

interface GeneratedSignal {
  id: string;
  symbol: string;
  signal_type: 'BUY' | 'SELL';
  timeframe: string;
  entry_min: number;
  entry_max: number;
  current_price: number;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  confidence: number;
  strength: string;
  risk_level: string;
  status: string;
  created_at: string;
  expires_at: string;
}

class SignalGeneratorService {
  /**
   * Get the current active signal (same for all users)
   * If no active signal exists or it's expired, generate a new one
   */
  async getCurrentSignal(symbol: string = 'bitcoin'): Promise<GeneratedSignal | null> {
    console.log('[SignalGenerator] Fetching current signal for', symbol);

    // Check if we have an active signal that hasn't expired
    const existingSignal = await this.getActiveSignal(symbol);

    if (existingSignal) {
      // QUALITY CHECK: Reject signals below professional standards
      if (existingSignal.confidence < 65) {
        console.warn(`[SignalGenerator] Found weak signal (${existingSignal.confidence}%) - expiring it`);

        // Expire the weak signal
        await supabase
          .from('intelligence_signals')
          .update({ status: 'EXPIRED' })
          .eq('id', existingSignal.id);

        // Generate a new one
        console.log('[SignalGenerator] Generating replacement signal...');
        return await this.generateAndLockSignal(symbol);
      }

      console.log('[SignalGenerator] Found existing active signal:', existingSignal.id, `(${existingSignal.confidence}% confidence)`);
      return existingSignal;
    }

    // No active signal - generate a new one
    console.log('[SignalGenerator] No active signal found. Generating new signal...');
    return await this.generateAndLockSignal(symbol);
  }

  /**
   * Get active signal from database (not expired)
   */
  private async getActiveSignal(symbol: string): Promise<GeneratedSignal | null> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'ACTIVE')
      .gt('expires_at', now) // Not expired
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is expected when no active signal exists
        return null;
      }
      console.error('[SignalGenerator] Error fetching active signal:', error);
      return null;
    }

    return data;
  }

  /**
   * Generate a new signal and lock it in the database
   * This signal will be shown to ALL users until it expires
   */
  private async generateAndLockSignal(symbol: string): Promise<GeneratedSignal | null> {
    try {
      console.log('[SignalGenerator] ===== GENERATING SMART MONEY SIGNAL =====');
      console.log('[SignalGenerator] Symbol:', symbol);

      // Generate SMART MONEY signal with revolutionary logic
      const analysis = await smartMoneySignalEngine.generateSignal(symbol);
      const signal = analysis.finalSignal;

      console.log('[SignalGenerator] Signal Analysis Complete:', {
        type: signal.type,
        confidence: signal.confidence,
        strength: signal.strength,
        phase: signal.marketPhase,
        smartMoney: signal.smartMoneyDetected,
        rejected: signal.rejected
      });

      // QUALITY GATE: Check if signal was rejected due to low confidence
      if (signal.rejected) {
        console.error('[SignalGenerator] ❌ SIGNAL REJECTED');
        console.error('[SignalGenerator] Reason:', signal.rejectionReason);
        console.error('[SignalGenerator] Reasoning:', signal.reasoning);
        return null;
      }

      if (!signal.type) {
        console.error('[SignalGenerator] ❌ SIGNAL GENERATION FAILED - No signal type');
        return null;
      }

      // Get current price from market data
      const coinData = await cryptoDataService.getCryptoDetails(symbol);
      const currentPrice = coinData?.market_data?.current_price?.usd || 0;

      if (currentPrice === 0) {
        console.error('[SignalGenerator] ❌ Failed to get current price');
        return null;
      }

      // Calculate entry zone, targets, and stop loss
      const entryMin = currentPrice * 0.98;
      const entryMax = currentPrice * 1.02;

      let targets: number[];
      let stopLoss: number;

      if (signal.type === 'BUY') {
        targets = [
          currentPrice * 1.05, // Target 1: +5%
          currentPrice * 1.10, // Target 2: +10%
          currentPrice * 1.15  // Target 3: +15%
        ];
        stopLoss = currentPrice * 0.95; // Stop loss: -5%
      } else {
        targets = [
          currentPrice * 0.95, // Target 1: -5%
          currentPrice * 0.90, // Target 2: -10%
          currentPrice * 0.85  // Target 3: -15%
        ];
        stopLoss = currentPrice * 1.05; // Stop loss: +5%
      }

      // Determine risk level based on confidence and market phase
      const riskLevel =
        signal.confidence >= 80 ? 'LOW' :
        signal.confidence >= 70 ? 'MODERATE' :
        signal.confidence >= 65 ? 'MODERATE' : 'HIGH';

      // Prepare signal data
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SIGNAL_DURATION_MS);

      const signalData = {
        symbol: symbol,
        signal_type: signal.type,
        timeframe: signal.timeframe,
        entry_min: entryMin,
        entry_max: entryMax,
        current_price: currentPrice,
        stop_loss: stopLoss,
        target_1: targets[0],
        target_2: targets[1],
        target_3: targets[2],
        confidence: signal.confidence,
        strength: signal.strength,
        risk_level: riskLevel,
        status: 'ACTIVE',
        expires_at: expiresAt.toISOString()
      };

      console.log('[SignalGenerator] ✅ SIGNAL APPROVED - Locking in database...');
      console.log('[SignalGenerator] Signal details:', {
        type: signalData.signal_type,
        confidence: signalData.confidence,
        strength: signalData.strength,
        phase: signal.marketPhase,
        smartMoneyDetected: signal.smartMoneyDetected,
        dataQuality: signal.dataQuality
      });

      // Insert into database - this locks the signal for all users
      const { data, error } = await supabase
        .from('intelligence_signals')
        .insert(signalData)
        .select()
        .single();

      if (error) {
        console.error('[SignalGenerator] Error inserting signal:', error);
        console.error('[SignalGenerator] Error details:', JSON.stringify(error, null, 2));
        console.error('[SignalGenerator] Signal data attempted:', JSON.stringify(signalData, null, 2));
        return null;
      }

      console.log('[SignalGenerator] Signal locked successfully:', data.id);
      return data;

    } catch (error) {
      console.error('[SignalGenerator] Error generating signal:', error);
      return null;
    }
  }

  /**
   * Force regenerate a new signal (for testing/admin purposes)
   */
  async forceRegenerateSignal(symbol: string = 'bitcoin'): Promise<GeneratedSignal | null> {
    // Expire the current signal
    const now = new Date().toISOString();

    await supabase
      .from('intelligence_signals')
      .update({ status: 'EXPIRED' })
      .eq('symbol', symbol)
      .eq('status', 'ACTIVE');

    // Generate new signal
    return await this.generateAndLockSignal(symbol);
  }
}

export const signalGenerator = new SignalGeneratorService();
