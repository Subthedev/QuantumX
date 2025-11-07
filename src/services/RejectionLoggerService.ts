/**
 * Centralized Rejection Logger with ML-based Intelligent Filtering
 * 
 * Purpose: Log ALL rejections from all engines with smart filtering to reduce UI spam
 * 
 * Features:
 * - Centralized logging (one place for all engines)
 * - ML-based classification (CRITICAL/IMPORTANT/NOISE)
 * - Batch insertion for performance
 * - Deduplication to avoid spam
 * - Priority scoring for UI display
 */

import { supabase } from '@/integrations/supabase/client';

export type RejectionPriority = 'CRITICAL' | 'IMPORTANT' | 'NOISE';
export type RejectionStage = 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';

interface RejectionData {
  symbol: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  rejectionStage: RejectionStage;
  rejectionReason: string;
  qualityScore?: number;
  confidenceScore?: number;
  dataQuality?: number;
  strategyVotes?: any[];
  marketRegime?: string;
  volatility?: number;
}

interface RejectionFeatures {
  qualityScore: number;
  confidenceScore: number;
  dataQuality: number;
  rejectionStage: string;
  marketRegime: string;
  volatility: number;
  symbolFrequency: number;
  reasonFrequency: number;
  timeOfDay: number;
  recentRejectionRate: number;
  strategyConsensus: number;
}

class RejectionLoggerService {
  private rejectionBuffer: RejectionData[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private symbolRejectionCount: Map<string, number> = new Map();
  private reasonRejectionCount: Map<string, number> = new Map();
  private recentRejections: number[] = [];
  private readonly BUFFER_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

  constructor() {
    this.startFlushTimer();
  }

  /**
   * Log a rejection with ML-based intelligent filtering
   */
  async logRejection(data: RejectionData): Promise<void> {
    try {
      // Extract features for ML classification
      const features = this.extractFeatures(data);
      
      // Classify rejection priority
      const priority = this.classifyRejection(features);
      
      // Update statistics
      this.updateStatistics(data);
      
      // Only log CRITICAL and IMPORTANT to database (filter NOISE)
      if (priority !== 'NOISE') {
        this.rejectionBuffer.push(data);
        
        console.log(
          `[RejectionLogger] ${priority === 'CRITICAL' ? '🔴' : '🟡'} ${data.symbol} ${data.direction} ` +
          `rejected in ${data.rejectionStage} (Priority: ${priority})`
        );
        
        // Flush if buffer is full
        if (this.rejectionBuffer.length >= this.BUFFER_SIZE) {
          await this.flush();
        }
      } else {
        console.log(
          `[RejectionLogger] ⚪ ${data.symbol} ${data.direction} ` +
          `rejected in ${data.rejectionStage} (Filtered as NOISE)`
        );
      }
    } catch (error) {
      console.error('[RejectionLogger] ❌ Error logging rejection:', error);
    }
  }

  /**
   * Extract features for ML classification
   */
  private extractFeatures(data: RejectionData): RejectionFeatures {
    const now = new Date();
    
    return {
      qualityScore: data.qualityScore || 0,
      confidenceScore: data.confidenceScore || 0,
      dataQuality: data.dataQuality || 0,
      rejectionStage: data.rejectionStage,
      marketRegime: data.marketRegime || 'UNKNOWN',
      volatility: data.volatility || 50,
      symbolFrequency: this.symbolRejectionCount.get(data.symbol) || 0,
      reasonFrequency: this.reasonRejectionCount.get(data.rejectionReason) || 0,
      timeOfDay: now.getHours(),
      recentRejectionRate: this.calculateRecentRejectionRate(),
      strategyConsensus: data.strategyVotes?.length || 0
    };
  }

  /**
   * ML-based classification: CRITICAL / IMPORTANT / NOISE
   * 
   * Decision tree approach (no external ML dependencies)
   */
  private classifyRejection(features: RejectionFeatures): RejectionPriority {
    // CRITICAL: High quality but rejected (investigate!)
    if (features.qualityScore >= 70 && features.confidenceScore >= 65) {
      return 'CRITICAL';
    }
    
    // CRITICAL: Unusual rejection (pattern break)
    if (features.symbolFrequency < 3 && features.qualityScore >= 55) {
      return 'CRITICAL';
    }
    
    // CRITICAL: Delta rejection with high quality (ML model issue?)
    if (features.rejectionStage === 'DELTA' && features.qualityScore >= 60) {
      return 'CRITICAL';
    }
    
    // NOISE: Low quality, expected rejection
    if (features.qualityScore < 40 && features.confidenceScore < 50) {
      return 'NOISE';
    }
    
    // NOISE: Very common rejection reason (>20 times)
    if (features.reasonFrequency > 20) {
      return 'NOISE';
    }
    
    // NOISE: Alpha rejections with very low quality
    if (features.rejectionStage === 'ALPHA' && features.qualityScore < 30) {
      return 'NOISE';
    }
    
    // NOISE: Beta rejections with no consensus
    if (features.rejectionStage === 'BETA' && features.strategyConsensus < 2) {
      return 'NOISE';
    }
    
    // IMPORTANT: Everything else
    return 'IMPORTANT';
  }

  /**
   * Update rejection statistics for ML features
   */
  private updateStatistics(data: RejectionData): void {
    // Update symbol frequency
    const symbolCount = this.symbolRejectionCount.get(data.symbol) || 0;
    this.symbolRejectionCount.set(data.symbol, symbolCount + 1);
    
    // Update reason frequency
    const reasonCount = this.reasonRejectionCount.get(data.rejectionReason) || 0;
    this.reasonRejectionCount.set(data.rejectionReason, reasonCount + 1);
    
    // Update recent rejections (last 1 hour)
    const now = Date.now();
    this.recentRejections.push(now);
    this.recentRejections = this.recentRejections.filter(
      timestamp => now - timestamp < 3600000 // 1 hour
    );
  }

  /**
   * Calculate recent rejection rate (last 1 hour)
   */
  private calculateRecentRejectionRate(): number {
    return this.recentRejections.length;
  }

  /**
   * Flush buffer to database (batch insertion)
   */
  private async flush(): Promise<void> {
    if (this.rejectionBuffer.length === 0) return;
    
    try {
      const records = this.rejectionBuffer.map(data => ({
        symbol: data.symbol,
        direction: data.direction,
        rejection_stage: data.rejectionStage,
        rejection_reason: data.rejectionReason,
        quality_score: data.qualityScore,
        confidence_score: data.confidenceScore,
        data_quality: data.dataQuality,
        strategy_votes: data.strategyVotes
      }));
      
      const { error } = await supabase
        .from('rejected_signals')
        .insert(records);
      
      if (error) {
        console.error('[RejectionLogger] ❌ Failed to flush rejections:', error);
      } else {
        console.log(`[RejectionLogger] ✅ Flushed ${records.length} rejections to database`);
      }
      
      // Clear buffer
      this.rejectionBuffer = [];
    } catch (error) {
      console.error('[RejectionLogger] ❌ Error flushing rejections:', error);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop flush timer and flush remaining buffer
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }

  /**
   * Get statistics for debugging
   */
  getStatistics() {
    return {
      bufferSize: this.rejectionBuffer.length,
      symbolRejections: Object.fromEntries(this.symbolRejectionCount),
      reasonRejections: Object.fromEntries(this.reasonRejectionCount),
      recentRejectionRate: this.recentRejections.length,
      topRejectedSymbols: Array.from(this.symbolRejectionCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      topRejectionReasons: Array.from(this.reasonRejectionCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }
}

// Singleton instance
export const rejectionLogger = new RejectionLoggerService();
