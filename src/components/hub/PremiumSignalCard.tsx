/**
 * PREMIUM SIGNAL CARD - Professional Design
 *
 * Clean, institutional-grade signal card optimized for PRO & MAX traders
 * Minimal animations, professional typography, clear data hierarchy
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CryptoLogo } from '@/utils/cryptoLogos';
import { logoService } from '@/services/logoService';
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Clock,
  Target,
  Shield,
  Zap,
  Sparkles,
  Crown,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

interface SignalCardProps {
  // Core data
  symbol: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;

  // Tier info
  tier?: 'FREE' | 'PRO' | 'MAX';
  rank?: number;
  isLocked?: boolean;

  // Trading levels
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];

  // Meta
  strategyName?: string;
  timestamp?: number;
  expiresAt?: string;
  image?: string; // CoinGecko image URL from globalHubService

  // Status tracking
  status?: 'ACTIVE' | 'COMPLETED' | 'TIMEOUT' | 'STOPPED';
  currentPrice?: number;
  profitLoss?: number; // Percentage

  // Actions
  onUpgrade?: () => void;
}

export function PremiumSignalCard({
  symbol,
  direction,
  confidence,
  tier,
  rank,
  isLocked = false,
  entryPrice,
  stopLoss,
  takeProfit,
  strategyName,
  timestamp,
  expiresAt,
  image, // CoinGecko image URL
  status,
  currentPrice,
  profitLoss,
  onUpgrade
}: SignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dynamicImageUrl, setDynamicImageUrl] = useState(image || '');

  // Fetch missing logos dynamically using logoService
  useEffect(() => {
    if (!image) {
      logoService.getLogoUrl(symbol).then(fetchedUrl => {
        if (fetchedUrl) {
          setDynamicImageUrl(fetchedUrl);
        }
      });
    }
  }, [symbol, image]);

  // Use provided image or dynamically fetched one
  const finalImageUrl = image || dynamicImageUrl;

  // Determine signal strength based on confidence
  const isHighConfidence = confidence >= 80;
  const isMediumConfidence = confidence >= 70;

  // Direction colors - Clean, professional palette
  const directionStyles = direction === 'LONG' ? {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-600',
    indicator: 'bg-emerald-500'
  } : {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-600',
    indicator: 'bg-rose-500'
  };

  // Tier styling - Subtle, professional
  const tierStyles = {
    MAX: {
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      badge: 'bg-purple-600',
      icon: Crown
    },
    PRO: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      badge: 'bg-blue-600',
      icon: Sparkles
    },
    FREE: {
      border: 'border-slate-200',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      badge: 'bg-slate-600',
      icon: Zap
    }
  };

  const tierStyle = tier ? tierStyles[tier] : null;
  const TierIcon = tierStyle?.icon;

  // Status styling - Professional, clean
  const statusStyles = {
    ACTIVE: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      label: 'ACTIVE'
    },
    COMPLETED: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      label: 'COMPLETED'
    },
    TIMEOUT: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      label: 'TIMEOUT'
    },
    STOPPED: {
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      text: 'text-slate-800',
      label: 'STOPPED'
    }
  };

  const statusStyle = status ? statusStyles[status] : null;

  // Time ago
  const getTimeAgo = (time: number) => {
    const seconds = Math.floor((Date.now() - time) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-200
      hover:shadow-lg border-2
      ${tierStyle ? tierStyle.border : 'border-slate-200'}
      ${isLocked ? 'opacity-80' : ''}
    `}>
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Crypto Logo - 100% COVERAGE: Dynamic fetching + Dashboard method */}
            <div className="relative flex-shrink-0">
              {finalImageUrl ? (
                // ✅ PRODUCTION-GRADE: Direct img tag with CoinGecko URL (provided or fetched)
                <img
                  src={finalImageUrl}
                  alt={symbol}
                  className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Graceful fallback if image fails to load
                    console.warn(`[PremiumSignalCard] Image failed to load for ${symbol}: ${finalImageUrl}`);
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    // Show fallback CryptoLogo
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.crypto-logo-fallback')) {
                      const fallbackDiv = document.createElement('div');
                      fallbackDiv.className = 'crypto-logo-fallback';
                      parent.appendChild(fallbackDiv);
                    }
                  }}
                />
              ) : (
                // Fallback: Use CryptoLogo component if no image URL available
                <CryptoLogo symbol={symbol} className="w-12 h-12" />
              )}
              {isLocked && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Lock className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Symbol & Direction */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900">{symbol}</h3>

                {/* Direction Badge - Clean, professional */}
                <Badge className={`${directionStyles.badge} text-white px-2 py-0.5 text-xs font-semibold`}>
                  {direction === 'LONG' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {direction}
                </Badge>

                {/* Tier Badge */}
                {tier && TierIcon && (
                  <Badge className={`${tierStyle?.badge} text-white px-2 py-0.5 text-xs font-semibold`}>
                    <TierIcon className="w-3 h-3 mr-1" />
                    {tier}
                  </Badge>
                )}

                {/* Rank */}
                {rank && (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                    #{rank}
                  </Badge>
                )}
              </div>

              {/* Status & Strategy */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status - Clean indicator */}
                {status && statusStyle && (
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${statusStyle.border} ${statusStyle.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className={`text-xs font-semibold ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                )}

                {/* Strategy */}
                {strategyName && !isLocked && (
                  <span className="text-xs text-slate-600 font-medium">
                    {strategyName}
                  </span>
                )}

                {/* Timestamp */}
                {timestamp && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(timestamp)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confidence Score - Professional display */}
          <div className="text-right flex-shrink-0 ml-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`text-3xl font-bold ${
                isHighConfidence ? 'text-emerald-600' :
                isMediumConfidence ? 'text-blue-600' :
                'text-slate-700'
              }`}>
                {confidence.toFixed(0)}%
              </div>
              {isHighConfidence && (
                <Shield className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
              Confidence
            </div>
          </div>
        </div>

        {/* Trading Levels - Professional Layout */}
        {!isLocked && entryPrice ? (
          <div className="space-y-3">
            {/* Current Price & P&L (Active Signals Only) */}
            {status === 'ACTIVE' && currentPrice && (
              <div className={`p-3 rounded-lg border-2 ${
                profitLoss && profitLoss >= 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Current Price</div>
                    <div className="text-xl font-bold text-slate-900">
                      ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {profitLoss !== undefined && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Unrealized P&L</div>
                      <div className={`text-xl font-bold ${
                        profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Entry, Stop Loss, Target - Clean grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Entry */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold uppercase mb-1">
                  <Target className="w-3 h-3" />
                  Entry
                </div>
                <div className="text-base font-bold text-slate-900">
                  ${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </div>
              </div>

              {/* Stop Loss */}
              {stopLoss && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase mb-1">
                    Stop Loss
                  </div>
                  <div className="text-base font-bold text-rose-700">
                    ${stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </div>
                  <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                    {(((Math.abs(entryPrice - stopLoss)) / entryPrice) * 100).toFixed(1)}% risk
                  </div>
                </div>
              )}

              {/* Take Profit */}
              {takeProfit && takeProfit[0] && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase mb-1">
                    Target 1
                  </div>
                  <div className="text-base font-bold text-emerald-700">
                    ${takeProfit[0].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    +{(((Math.abs(takeProfit[0] - entryPrice)) / entryPrice) * 100).toFixed(1)}% profit
                  </div>
                </div>
              )}
            </div>

            {/* Additional Targets - Expandable */}
            {takeProfit && takeProfit.length > 1 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide Additional Targets
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show All {takeProfit.length} Targets
                    </>
                  )}
                </Button>

                {expanded && (
                  <div className="mt-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top duration-200">
                    {takeProfit.slice(1).map((tp, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-[9px] text-emerald-700 font-semibold uppercase mb-0.5">
                          Target {idx + 2}
                        </div>
                        <div className="text-sm font-bold text-emerald-900">
                          ${tp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </div>
                        <div className="text-[9px] text-emerald-600 font-medium">
                          +{entryPrice ? (((Math.abs(tp - entryPrice)) / entryPrice) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isLocked ? (
          <div className="p-6 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="text-center">
              <Lock className="w-10 h-10 mx-auto mb-3 text-purple-600" />
              <div className="font-bold text-purple-900 mb-1 text-lg">
                Premium Signal Details Locked
              </div>
              <div className="text-sm text-purple-700 mb-4">
                Upgrade to access entry price, stop loss, and target levels
              </div>
              {onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-md"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to {tier === 'FREE' ? 'PRO' : 'MAX'}
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer Stats - Clean, minimal */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200">
          <div className="flex items-center gap-3">
            {/* Confidence Indicator */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                confidence >= 80 ? 'bg-emerald-500' :
                confidence >= 60 ? 'bg-blue-500' :
                'bg-amber-500'
              }`} />
              <span className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{confidence.toFixed(0)}%</span> confidence
              </span>
            </div>

            {/* High Confidence Badge */}
            {confidence >= 70 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                  High Confidence
                </span>
              </div>
            )}
          </div>

          {/* Tier Premium Indicator */}
          {tier === 'MAX' && (
            <div className="flex items-center gap-1 text-purple-700">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Premium Signal</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle Premium Border Glow for MAX tier */}
      {tier === 'MAX' && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 pointer-events-none rounded-lg" />
      )}
    </Card>
  );
}
