/**
 * CONFIDENCE CALIBRATOR
 * Ensures confidence scores are honest and accurate based on historical performance
 *
 * PROBLEM: ML models often produce overconfident or underconfident predictions
 * SOLUTION: Calibrate confidence scores using actual outcomes
 *
 * TECHNIQUES:
 * - Platt Scaling (logistic regression on confidence scores)
 * - Isotonic Regression (non-parametric calibration)
 * - Confidence Buckets (track actual win rate per confidence range)
 *
 * METRICS:
 * - Expected Calibration Error (ECE) - measures calibration quality
 * - Reliability Diagram - visualizes predicted vs actual
 * - Brier Score - measures accuracy of probabilistic predictions
 *
 * This is CRITICAL for user trust - if we say 70% confidence, it should win 70% of the time
 */

import type { SignalOutcome } from './SignalLifecycleManager';

/**
 * Confidence bucket for tracking predicted vs actual
 */
interface ConfidenceBucket {
  range: string; // e.g., "60-70%"
  minConfidence: number;
  maxConfidence: number;
  totalPredictions: number;
  totalWins: number;
  actualWinRate: number; // Actual win rate for this bucket
  avgPredictedConfidence: number; // Average predicted confidence
  calibrationError: number; // |predicted - actual|
}

/**
 * Calibration curve point (for visualization)
 */
interface CalibrationPoint {
  predictedConfidence: number;
  actualWinRate: number;
  sampleSize: number;
}

/**
 * Calibration metrics
 */
export interface CalibrationMetrics {
  // Overall metrics
  expectedCalibrationError: number; // ECE (0-1, lower is better)
  brierScore: number; // BS (0-1, lower is better)
  totalSamples: number;

  // Per-bucket breakdown
  buckets: ConfidenceBucket[];

  // Calibration curve (for reliability diagram)
  calibrationCurve: CalibrationPoint[];

  // Calibration quality
  calibrationQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

  // Recommendations
  needsRecalibration: boolean;
  minSamplesForCalibration: number;

  timestamp: number;
}

/**
 * Outcome record for calibration
 */
interface CalibrationRecord {
  predictedConfidence: number; // 0-100
  actualSuccess: boolean;
  timestamp: number;
}

export class ConfidenceCalibrator {
  // Store all outcomes for calibration
  private records: CalibrationRecord[] = [];
  private readonly MAX_RECORDS = 5000; // Keep last 5000 outcomes

  // Confidence buckets (10% increments)
  private readonly BUCKET_SIZE = 10;
  private readonly NUM_BUCKETS = 10; // 0-10, 10-20, ..., 90-100

  // Calibration parameters
  private readonly MIN_SAMPLES_PER_BUCKET = 20; // Need 20 samples to trust a bucket
  private readonly MIN_TOTAL_SAMPLES = 100; // Need 100 total samples for calibration

  // Calibration adjustments (learned from data)
  private calibrationMap = new Map<number, number>(); // confidence bucket → adjustment

  // Statistics
  private stats = {
    totalRecordsProcessed: 0,
    lastCalibrationUpdate: 0,
    calibrationUpdates: 0
  };

  // Running state
  private isRunning = false;

  constructor() {
    console.log('[Confidence Calibrator] Initialized - Ready to calibrate confidence scores');
  }

  /**
   * Start the calibrator (listen for outcome events)
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[Confidence Calibrator] Already running');
      return;
    }

    this.isRunning = true;

    // Listen for signal outcome events
    window.addEventListener('igx-signal-outcome', this.handleOutcomeEvent.bind(this));

    console.log('[Confidence Calibrator] ✅ Started - Listening for signal outcomes');
  }

  /**
   * Stop the calibrator
   */
  stop(): void {
    this.isRunning = false;
    window.removeEventListener('igx-signal-outcome', this.handleOutcomeEvent.bind(this));
    console.log('[Confidence Calibrator] ⏹️ Stopped');
  }

  /**
   * Handle signal outcome event
   */
  private handleOutcomeEvent(event: CustomEvent): void {
    const outcome: SignalOutcome = event.detail;
    this.recordOutcome(outcome.originalConfidence, outcome.success);
  }

  /**
   * Record outcome for calibration
   */
  recordOutcome(predictedConfidence: number, actualSuccess: boolean): void {
    // Store record
    const record: CalibrationRecord = {
      predictedConfidence,
      actualSuccess,
      timestamp: Date.now()
    };

    this.records.push(record);

    // Limit size
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }

    this.stats.totalRecordsProcessed++;

    // Update calibration if we have enough samples
    if (this.records.length >= this.MIN_TOTAL_SAMPLES) {
      if (this.records.length % 50 === 0) { // Update every 50 new outcomes
        this.updateCalibration();
        this.stats.calibrationUpdates++;
        this.stats.lastCalibrationUpdate = Date.now();
      }
    }

    console.log(
      `[Confidence Calibrator] 📊 Recorded: confidence=${predictedConfidence}%, ` +
      `success=${actualSuccess} (total: ${this.records.length})`
    );
  }

  /**
   * Update calibration based on historical data
   */
  private updateCalibration(): void {
    console.log('[Confidence Calibrator] 🔄 Updating calibration model...');

    // Calculate actual win rate for each confidence bucket
    for (let bucket = 0; bucket < this.NUM_BUCKETS; bucket++) {
      const minConf = bucket * this.BUCKET_SIZE;
      const maxConf = (bucket + 1) * this.BUCKET_SIZE;

      // Get records in this bucket
      const bucketRecords = this.records.filter(
        r => r.predictedConfidence >= minConf && r.predictedConfidence < maxConf
      );

      if (bucketRecords.length >= this.MIN_SAMPLES_PER_BUCKET) {
        const actualWinRate = bucketRecords.filter(r => r.actualSuccess).length / bucketRecords.length;
        const avgPredictedConfidence = bucketRecords.reduce((sum, r) => sum + r.predictedConfidence, 0) / bucketRecords.length;

        // Calculate calibration adjustment
        // If predicted 70% but actual is 60%, adjustment = -10
        const adjustment = actualWinRate * 100 - avgPredictedConfidence;

        this.calibrationMap.set(bucket, adjustment);

        console.log(
          `  Bucket ${minConf}-${maxConf}%: ` +
          `Predicted=${avgPredictedConfidence.toFixed(1)}%, ` +
          `Actual=${(actualWinRate * 100).toFixed(1)}%, ` +
          `Adjustment=${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)}%`
        );
      }
    }

    console.log('[Confidence Calibrator] ✅ Calibration model updated');
  }

  /**
   * Calibrate a confidence score (main method used by other components)
   */
  calibrateConfidence(rawConfidence: number): number {
    // If we don't have enough data yet, return raw confidence
    if (this.records.length < this.MIN_TOTAL_SAMPLES) {
      return rawConfidence;
    }

    // Find the bucket
    const bucket = Math.floor(rawConfidence / this.BUCKET_SIZE);
    const clampedBucket = Math.max(0, Math.min(this.NUM_BUCKETS - 1, bucket));

    // Get adjustment for this bucket
    const adjustment = this.calibrationMap.get(clampedBucket) || 0;

    // Apply adjustment
    let calibrated = rawConfidence + adjustment;

    // Clamp to [0, 100]
    calibrated = Math.max(0, Math.min(100, calibrated));

    return Math.round(calibrated);
  }

  /**
   * Get calibration metrics (for monitoring and UI)
   */
  getCalibrationMetrics(): CalibrationMetrics {
    // Calculate per-bucket metrics
    const buckets: ConfidenceBucket[] = [];

    for (let i = 0; i < this.NUM_BUCKETS; i++) {
      const minConf = i * this.BUCKET_SIZE;
      const maxConf = (i + 1) * this.BUCKET_SIZE;

      const bucketRecords = this.records.filter(
        r => r.predictedConfidence >= minConf && r.predictedConfidence < maxConf
      );

      const totalPredictions = bucketRecords.length;
      const totalWins = bucketRecords.filter(r => r.actualSuccess).length;
      const actualWinRate = totalPredictions > 0 ? totalWins / totalPredictions : 0;
      const avgPredictedConfidence = totalPredictions > 0
        ? bucketRecords.reduce((sum, r) => sum + r.predictedConfidence, 0) / totalPredictions
        : minConf + this.BUCKET_SIZE / 2;
      const calibrationError = Math.abs(avgPredictedConfidence / 100 - actualWinRate);

      buckets.push({
        range: `${minConf}-${maxConf}%`,
        minConfidence: minConf,
        maxConfidence: maxConf,
        totalPredictions,
        totalWins,
        actualWinRate,
        avgPredictedConfidence,
        calibrationError
      });
    }

    // Calculate Expected Calibration Error (ECE)
    // ECE = sum of (|predicted - actual| × weight) across buckets
    let ece = 0;
    const totalSamples = this.records.length;

    for (const bucket of buckets) {
      if (bucket.totalPredictions > 0) {
        const weight = bucket.totalPredictions / totalSamples;
        ece += weight * bucket.calibrationError;
      }
    }

    // Calculate Brier Score
    // BS = average of (predicted - actual)^2
    let brierScore = 0;
    if (this.records.length > 0) {
      brierScore = this.records.reduce((sum, record) => {
        const predicted = record.predictedConfidence / 100;
        const actual = record.actualSuccess ? 1 : 0;
        return sum + Math.pow(predicted - actual, 2);
      }, 0) / this.records.length;
    }

    // Build calibration curve (for reliability diagram)
    const calibrationCurve: CalibrationPoint[] = buckets
      .filter(b => b.totalPredictions >= this.MIN_SAMPLES_PER_BUCKET)
      .map(b => ({
        predictedConfidence: b.avgPredictedConfidence,
        actualWinRate: b.actualWinRate * 100,
        sampleSize: b.totalPredictions
      }));

    // Determine calibration quality
    let calibrationQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (ece < 0.05) {
      calibrationQuality = 'EXCELLENT';
    } else if (ece < 0.10) {
      calibrationQuality = 'GOOD';
    } else if (ece < 0.15) {
      calibrationQuality = 'FAIR';
    } else {
      calibrationQuality = 'POOR';
    }

    // Check if we need recalibration
    const needsRecalibration = ece > 0.15 && totalSamples >= this.MIN_TOTAL_SAMPLES;

    return {
      expectedCalibrationError: ece,
      brierScore,
      totalSamples,
      buckets,
      calibrationCurve,
      calibrationQuality,
      needsRecalibration,
      minSamplesForCalibration: this.MIN_TOTAL_SAMPLES,
      timestamp: Date.now()
    };
  }

  /**
   * Get statistics for monitoring
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      totalRecordsProcessed: this.stats.totalRecordsProcessed,
      currentRecords: this.records.length,
      calibrationUpdates: this.stats.calibrationUpdates,
      lastCalibrationUpdate: this.stats.lastCalibrationUpdate,
      isCalibrated: this.records.length >= this.MIN_TOTAL_SAMPLES,
      bucketsCalibrated: this.calibrationMap.size
    };
  }

  /**
   * Get human-readable calibration status
   */
  getCalibrationStatus(): {
    status: 'NOT_READY' | 'LEARNING' | 'CALIBRATED' | 'NEEDS_IMPROVEMENT';
    message: string;
    progress: number; // 0-100
  } {
    const totalRecords = this.records.length;
    const metrics = this.getCalibrationMetrics();

    if (totalRecords < this.MIN_TOTAL_SAMPLES) {
      return {
        status: 'NOT_READY',
        message: `Collecting data: ${totalRecords}/${this.MIN_TOTAL_SAMPLES} samples`,
        progress: (totalRecords / this.MIN_TOTAL_SAMPLES) * 100
      };
    }

    if (metrics.needsRecalibration) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: `Calibration needs improvement (ECE: ${(metrics.expectedCalibrationError * 100).toFixed(1)}%)`,
        progress: 100
      };
    }

    if (totalRecords < 500) {
      return {
        status: 'LEARNING',
        message: `Learning (${totalRecords} samples, ECE: ${(metrics.expectedCalibrationError * 100).toFixed(1)}%)`,
        progress: 100
      };
    }

    return {
      status: 'CALIBRATED',
      message: `Calibration quality: ${metrics.calibrationQuality} (ECE: ${(metrics.expectedCalibrationError * 100).toFixed(1)}%)`,
      progress: 100
    };
  }

  /**
   * Manually feed outcome (for testing)
   */
  manualFeedOutcome(predictedConfidence: number, actualSuccess: boolean): void {
    this.recordOutcome(predictedConfidence, actualSuccess);
  }

  /**
   * Reset (for testing)
   */
  reset(): void {
    this.records = [];
    this.calibrationMap.clear();
    this.stats = {
      totalRecordsProcessed: 0,
      lastCalibrationUpdate: 0,
      calibrationUpdates: 0
    };
    console.log('[Confidence Calibrator] Reset complete');
  }

  /**
   * Export calibration data (for analysis/backup)
   */
  exportCalibrationData() {
    return {
      records: this.records,
      calibrationMap: Object.fromEntries(this.calibrationMap),
      stats: this.stats,
      metrics: this.getCalibrationMetrics()
    };
  }

  /**
   * Import calibration data (for restore/warm start)
   */
  importCalibrationData(data: any): void {
    if (data.records) {
      this.records = data.records;
    }
    if (data.calibrationMap) {
      this.calibrationMap = new Map(Object.entries(data.calibrationMap).map(([k, v]) => [parseInt(k), v as number]));
    }
    if (data.stats) {
      this.stats = data.stats;
    }
    console.log(`[Confidence Calibrator] Imported ${this.records.length} calibration records`);
  }
}

// Singleton instance
export const confidenceCalibrator = new ConfidenceCalibrator();
