/**
 * IGX MULTI-COIN SCANNER
 * Scans multiple cryptocurrencies simultaneously to find high-probability trading opportunities
 * Only signals with >= 65% confidence are generated
 *
 * SCANNING UNIVERSE: Top 50 cryptocurrencies by market cap (excluding stablecoins)
 * SCAN FREQUENCY: Every 15 minutes
 * QUALITY THRESHOLD: 65% minimum confidence
 */

import { smartMoneySignalEngine } from './smartMoneySignalEngine';
import { cryptoDataService } from './cryptoDataService';
import { supabase } from '@/integrations/supabase/client';

interface ScanResult {
  symbol: string;
  coinId: string;
  coinName: string;
  signal: {
    type: 'BUY' | 'SELL';
    confidence: number;
    strength: string;
    marketPhase: string;
    smartMoneyDetected: boolean;
    reasoning: string[];
  };
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  scannedAt: number;
}

class MultiCoinScanner {
  private isScanning: boolean = false;
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MIN_CONFIDENCE = 65;

  // Top cryptocurrencies to scan (excluding stablecoins)
  private readonly SCAN_UNIVERSE = [
    'bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
    'cardano', 'avalanche-2', 'polkadot', 'chainlink', 'polygon',
    'uniswap', 'litecoin', 'cosmos', 'ethereum-classic', 'stellar',
    'algorand', 'vechain', 'internet-computer', 'filecoin', 'hedera',
    'aptos', 'arbitrum', 'optimism', 'near', 'sui',
    'injective-protocol', 'render-token', 'sei-network', 'toncoin', 'starknet',
    'immutable-x', 'the-graph', 'theta-network', 'axie-infinity', 'flow',
    'elrond-erd-2', 'sandbox', 'decentraland', 'gala', 'enjincoin'
  ];

  /**
   * Start continuous scanning process
   */
  startContinuousScanning() {
    console.log('[MultiCoinScanner] Starting continuous scanning...');
    console.log(`[MultiCoinScanner] Scanning ${this.SCAN_UNIVERSE.length} coins every 15 minutes`);
    console.log(`[MultiCoinScanner] Minimum confidence threshold: ${this.MIN_CONFIDENCE}%`);

    // Initial scan
    this.performScan();

    // Schedule periodic scans
    setInterval(() => {
      this.performScan();
    }, this.SCAN_INTERVAL_MS);
  }

  /**
   * Perform single scan across all coins
   */
  async performScan(): Promise<ScanResult[]> {
    if (this.isScanning) {
      console.log('[MultiCoinScanner] Scan already in progress, skipping...');
      return [];
    }

    this.isScanning = true;
    this.lastScanTime = Date.now();

    console.log('\n[MultiCoinScanner] ========== STARTING MULTI-COIN SCAN ==========');
    console.log(`[MultiCoinScanner] Time: ${new Date().toLocaleTimeString()}`);
    console.log(`[MultiCoinScanner] Coins to scan: ${this.SCAN_UNIVERSE.length}`);

    const results: ScanResult[] = [];
    let scanned = 0;
    let signalsGenerated = 0;

    try {
      // Scan coins in batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < this.SCAN_UNIVERSE.length; i += batchSize) {
        const batch = this.SCAN_UNIVERSE.slice(i, i + batchSize);

        // Scan batch in parallel
        const batchResults = await Promise.all(
          batch.map(coinId => this.scanSingleCoin(coinId))
        );

        // Filter out null results and add to results
        batchResults.forEach(result => {
          scanned++;
          if (result) {
            results.push(result);
            signalsGenerated++;
            console.log(`[MultiCoinScanner] ✅ SIGNAL FOUND: ${result.coinName} (${result.symbol}) - ${result.signal.type} ${result.signal.confidence}%`);

            // Auto-generate signal in database
            this.autoGenerateSignal(result);
          }
        });

        // Progress update
        console.log(`[MultiCoinScanner] Progress: ${scanned}/${this.SCAN_UNIVERSE.length} coins scanned, ${signalsGenerated} signals found`);

        // Wait 2 seconds between batches to respect rate limits
        if (i + batchSize < this.SCAN_UNIVERSE.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('\n[MultiCoinScanner] ========== SCAN COMPLETE ==========');
      console.log(`[MultiCoinScanner] Total scanned: ${scanned}`);
      console.log(`[MultiCoinScanner] Signals generated: ${signalsGenerated}`);
      console.log(`[MultiCoinScanner] Success rate: ${((signalsGenerated / scanned) * 100).toFixed(1)}%`);
      console.log(`[MultiCoinScanner] Next scan in 15 minutes\n`);

      return results;
    } catch (error) {
      console.error('[MultiCoinScanner] Error during scan:', error);
      return results;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan a single coin and determine if it meets signal criteria
   */
  private async scanSingleCoin(coinId: string): Promise<ScanResult | null> {
    try {
      console.log(`[MultiCoinScanner] Scanning ${coinId}...`);

      // Generate signal analysis
      const analysis = await smartMoneySignalEngine.generateSignal(coinId);
      const signal = analysis.finalSignal;

      // Check if signal meets minimum confidence threshold
      if (signal.rejected || !signal.type || signal.confidence < this.MIN_CONFIDENCE) {
        console.log(`[MultiCoinScanner] ${coinId}: REJECTED (confidence: ${signal.confidence}%)`);
        return null;
      }

      // Get current market data
      const marketData = await cryptoDataService.getCryptoDetails(coinId);
      if (!marketData) {
        console.log(`[MultiCoinScanner] ${coinId}: Failed to fetch market data`);
        return null;
      }

      const result: ScanResult = {
        symbol: coinId.toUpperCase(),
        coinId,
        coinName: marketData.name || coinId,
        signal: {
          type: signal.type,
          confidence: signal.confidence,
          strength: signal.strength,
          marketPhase: signal.marketPhase,
          smartMoneyDetected: signal.smartMoneyDetected,
          reasoning: signal.reasoning
        },
        currentPrice: marketData.market_data?.current_price?.usd || 0,
        priceChange24h: marketData.market_data?.price_change_percentage_24h || 0,
        marketCap: marketData.market_data?.market_cap?.usd || 0,
        volume24h: marketData.market_data?.total_volume?.usd || 0,
        scannedAt: Date.now()
      };

      return result;
    } catch (error) {
      console.error(`[MultiCoinScanner] Error scanning ${coinId}:`, error);
      return null;
    }
  }

  /**
   * Auto-generate signal in database
   */
  private async autoGenerateSignal(result: ScanResult) {
    try {
      console.log(`[MultiCoinScanner] Auto-generating signal for ${result.coinName}...`);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // 4 hours

      // Calculate entry zone and targets
      const price = result.currentPrice;
      const entryMin = price * 0.98;
      const entryMax = price * 1.02;

      let targets: number[];
      let stopLoss: number;

      if (result.signal.type === 'BUY') {
        targets = [price * 1.05, price * 1.10, price * 1.15];
        stopLoss = price * 0.95;
      } else {
        targets = [price * 0.95, price * 0.90, price * 0.85];
        stopLoss = price * 1.05;
      }

      const riskLevel =
        result.signal.confidence >= 80 ? 'LOW' :
        result.signal.confidence >= 70 ? 'MODERATE' : 'HIGH';

      // Check if signal already exists for this coin
      const { data: existingSignal } = await supabase
        .from('intelligence_signals')
        .select('id')
        .eq('symbol', result.coinId)
        .eq('status', 'ACTIVE')
        .gt('expires_at', now.toISOString())
        .single();

      if (existingSignal) {
        console.log(`[MultiCoinScanner] Signal already exists for ${result.coinName}, skipping...`);
        return;
      }

      // Insert signal
      const { data, error } = await supabase
        .from('intelligence_signals')
        .insert({
          symbol: result.coinId,
          signal_type: result.signal.type,
          timeframe: '4H',
          entry_min: entryMin,
          entry_max: entryMax,
          current_price: price,
          stop_loss: stopLoss,
          target_1: targets[0],
          target_2: targets[1],
          target_3: targets[2],
          confidence: result.signal.confidence,
          strength: result.signal.strength,
          risk_level: riskLevel,
          status: 'ACTIVE',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`[MultiCoinScanner] Error inserting signal for ${result.coinName}:`, error);
        return;
      }

      console.log(`[MultiCoinScanner] ✅ Signal auto-generated for ${result.coinName} (ID: ${data.id})`);
    } catch (error) {
      console.error(`[MultiCoinScanner] Error in autoGenerateSignal:`, error);
    }
  }

  /**
   * Manual scan trigger (for testing or on-demand scanning)
   */
  async triggerManualScan(): Promise<ScanResult[]> {
    console.log('[MultiCoinScanner] Manual scan triggered');
    return await this.performScan();
  }

  /**
   * Get scan status
   */
  getScanStatus() {
    return {
      isScanning: this.isScanning,
      lastScanTime: this.lastScanTime,
      nextScanTime: this.lastScanTime + this.SCAN_INTERVAL_MS,
      scanInterval: this.SCAN_INTERVAL_MS,
      coinsToScan: this.SCAN_UNIVERSE.length,
      minConfidence: this.MIN_CONFIDENCE
    };
  }

  /**
   * Get all active signals from database
   */
  async getActiveSignals() {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('status', 'ACTIVE')
      .gt('expires_at', now)
      .order('confidence', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MultiCoinScanner] Error fetching active signals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signal history
   */
  async getSignalHistory(limit: number = 50) {
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .in('status', ['SUCCESS', 'FAILED', 'EXPIRED'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MultiCoinScanner] Error fetching signal history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate success metrics
   */
  async getSuccessMetrics() {
    const { data: allSignals, error } = await supabase
      .from('intelligence_signals')
      .select('status, signal_type, confidence, profit_loss_percent')
      .in('status', ['SUCCESS', 'FAILED']);

    if (error || !allSignals) {
      return {
        totalSignals: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        averageProfit: 0,
        averageLoss: 0
      };
    }

    const successSignals = allSignals.filter(s => s.status === 'SUCCESS');
    const failedSignals = allSignals.filter(s => s.status === 'FAILED');

    const successRate = allSignals.length > 0
      ? (successSignals.length / allSignals.length) * 100
      : 0;

    const profits = successSignals
      .map(s => s.profit_loss_percent || 0)
      .filter(p => p > 0);

    const losses = failedSignals
      .map(s => s.profit_loss_percent || 0)
      .filter(p => p < 0);

    const averageProfit = profits.length > 0
      ? profits.reduce((sum, p) => sum + p, 0) / profits.length
      : 0;

    const averageLoss = losses.length > 0
      ? losses.reduce((sum, l) => sum + l, 0) / losses.length
      : 0;

    return {
      totalSignals: allSignals.length,
      successCount: successSignals.length,
      failureCount: failedSignals.length,
      successRate: Math.round(successRate * 10) / 10,
      averageProfit: Math.round(averageProfit * 10) / 10,
      averageLoss: Math.round(averageLoss * 10) / 10
    };
  }
}

export const multiCoinScanner = new MultiCoinScanner();
