/**
 * Order Flow Imbalance Hook
 * Real-time order flow imbalance analysis with React integration
 */

import { useMemo } from 'react';
import { orderFlowAnalysisService, type OrderFlowImbalance } from '@/services/orderFlowAnalysis';
import type { OrderBookLevel } from '@/services/orderBookService';

interface UseOrderFlowImbalanceProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number;
  symbol: string;
  enabled?: boolean;
}

export function useOrderFlowImbalance({
  bids,
  asks,
  midPrice,
  symbol,
  enabled = true
}: UseOrderFlowImbalanceProps) {
  const imbalance = useMemo<OrderFlowImbalance | null>(() => {
    if (!enabled || !bids.length || !asks.length || !midPrice) {
      return null;
    }

    try {
      return orderFlowAnalysisService.calculateOrderFlowImbalance(
        bids,
        asks,
        midPrice,
        symbol
      );
    } catch (error) {
      console.error('Failed to calculate order flow imbalance:', error);
      return null;
    }
  }, [bids, asks, midPrice, symbol, enabled]);

  // Extract key metrics for easy access
  const metrics = useMemo(() => {
    if (!imbalance) {
      return {
        isLoading: !enabled,
        hasData: false,
        overallImbalance: 0,
        strength: 'neutral' as const,
        topOfBookImbalance: 0,
        midBookImbalance: 0,
        deepBookImbalance: 0,
        volumeWeightedImbalance: 0,
        largeOrderImbalance: 0,
        trend: 'stable' as const,
        velocity: 0,
        signalCount: 0,
        criticalSignals: 0,
        confidence: 0,
        recommendation: null
      };
    }

    return {
      isLoading: false,
      hasData: true,
      overallImbalance: imbalance.overallImbalance,
      strength: imbalance.imbalanceStrength,
      topOfBookImbalance: imbalance.topOfBookImbalance,
      midBookImbalance: imbalance.midBookImbalance,
      deepBookImbalance: imbalance.deepBookImbalance,
      volumeWeightedImbalance: imbalance.volumeWeightedImbalance,
      largeOrderImbalance: imbalance.largeOrderImbalance,
      trend: imbalance.imbalanceTrend,
      velocity: imbalance.imbalanceVelocity,
      signalCount: imbalance.signals.length,
      criticalSignals: imbalance.signals.filter(s => s.severity === 'critical').length,
      confidence: imbalance.confidence,
      recommendation: imbalance.recommendation
    };
  }, [imbalance, enabled]);

  // Get actionable signals
  const signals = useMemo(() => {
    return imbalance?.signals || [];
  }, [imbalance]);

  // Get critical signals only
  const criticalSignals = useMemo(() => {
    return signals.filter(s => s.severity === 'critical' || s.severity === 'high');
  }, [signals]);

  // Get support and resistance levels
  const levels = useMemo(() => {
    if (!imbalance) {
      return {
        support: null,
        resistance: null,
        strongestBuy: null,
        strongestSell: null
      };
    }

    return {
      support: imbalance.supportLevel,
      resistance: imbalance.resistanceLevel,
      strongestBuy: imbalance.strongestBuyLevel,
      strongestSell: imbalance.strongestSellLevel
    };
  }, [imbalance]);

  // Determine if there's a strong directional bias
  const hasBias = useMemo(() => {
    if (!imbalance) return { bullish: false, bearish: false };

    return {
      bullish: imbalance.overallImbalance > 30 && imbalance.imbalanceTrend === 'increasing',
      bearish: imbalance.overallImbalance < -30 && imbalance.imbalanceTrend === 'decreasing'
    };
  }, [imbalance]);

  // Get trading action suggestion
  const tradingAction = useMemo(() => {
    if (!imbalance?.recommendation) return null;

    const rec = imbalance.recommendation;
    return {
      action: rec.action,
      reasoning: rec.reasoning,
      entry: rec.entryPrice,
      target: rec.targetPrice,
      stopLoss: rec.stopLoss,
      risk: rec.riskLevel,
      timeframe: rec.timeHorizon
    };
  }, [imbalance]);

  return {
    imbalance,
    metrics,
    signals,
    criticalSignals,
    levels,
    hasBias,
    tradingAction,
    isLoading: metrics.isLoading,
    hasData: metrics.hasData
  };
}
