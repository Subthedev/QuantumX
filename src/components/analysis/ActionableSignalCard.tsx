import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ActionableSignal } from '@/services/enrichedCryptoDataService';

interface ActionableSignalCardProps {
  signal: ActionableSignal;
  title: string;
  icon?: React.ReactNode;
}

export function ActionableSignalCard({ signal, title, icon }: ActionableSignalCardProps) {
  // Determine colors and styles based on action
  const getSignalConfig = (action: ActionableSignal['action']) => {
    switch (action) {
      case 'STRONG_BUY':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          icon: <TrendingUp className="h-6 w-6" />,
          label: 'STRONG BUY',
          emoji: '🚀',
          gradient: 'from-green-500 to-emerald-500'
        };
      case 'BUY':
        return {
          color: 'bg-green-400',
          textColor: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/30',
          icon: <TrendingUp className="h-5 w-5" />,
          label: 'BUY',
          emoji: '📈',
          gradient: 'from-green-400 to-green-500'
        };
      case 'HOLD':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          icon: <Minus className="h-5 w-5" />,
          label: 'HOLD',
          emoji: '⏸️',
          gradient: 'from-yellow-500 to-amber-500'
        };
      case 'SELL':
        return {
          color: 'bg-red-400',
          textColor: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30',
          icon: <TrendingDown className="h-5 w-5" />,
          label: 'SELL',
          emoji: '📉',
          gradient: 'from-red-400 to-red-500'
        };
      case 'STRONG_SELL':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: <TrendingDown className="h-6 w-6" />,
          label: 'STRONG SELL',
          emoji: '⚠️',
          gradient: 'from-red-500 to-red-600'
        };
    }
  };

  const config = getSignalConfig(signal.action);

  // Data quality indicator
  const getDataQualityConfig = (quality: ActionableSignal['dataQuality']) => {
    switch (quality) {
      case 'excellent':
        return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, label: 'Excellent Data', color: 'text-green-500' };
      case 'good':
        return { icon: <CheckCircle2 className="h-4 w-4 text-blue-500" />, label: 'Good Data', color: 'text-blue-500' };
      case 'fair':
        return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, label: 'Fair Data', color: 'text-yellow-500' };
      case 'poor':
        return { icon: <XCircle className="h-4 w-4 text-red-500" />, label: 'Limited Data', color: 'text-red-500' };
    }
  };

  const dataQualityConfig = getDataQualityConfig(signal.dataQuality);

  return (
    <Card className={`border-2 ${config.borderColor} ${config.bgColor} transition-all hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className={config.textColor}>{icon}</div>}
            <div>
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">
                {title}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {signal.timeframe}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Signal */}
        <div className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <div className={`text-2xl md:text-3xl font-bold ${config.textColor}`}>
                  {config.label}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {signal.confidence.toFixed(0)}% Confidence
                </div>
              </div>
            </div>
            <div className="text-4xl">{config.emoji}</div>
          </div>

          {/* Confidence Bar */}
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${config.color} transition-all duration-500`}
                style={{ width: `${signal.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-2">
          <div className="text-xs md:text-sm font-medium flex items-center justify-between">
            <span>Key Factors</span>
            <div className="flex items-center gap-1 text-xs">
              {dataQualityConfig.icon}
              <span className={dataQualityConfig.color}>{dataQualityConfig.label}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {signal.reasoning.map((reason, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground p-2 rounded-lg bg-muted/50"
              >
                <span className={config.textColor}>•</span>
                <span className="flex-1">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score Indicator (Hidden on mobile for space) */}
        <div className="hidden md:block pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Signal Strength</span>
            <span className="font-medium">{signal.score > 0 ? '+' : ''}{signal.score.toFixed(0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function CompactSignalCard({ signal, title }: { signal: ActionableSignal; title: string }) {
  const getSignalConfig = (action: ActionableSignal['action']) => {
    switch (action) {
      case 'STRONG_BUY':
        return { color: 'bg-green-500', label: 'STRONG BUY', emoji: '🚀' };
      case 'BUY':
        return { color: 'bg-green-400', label: 'BUY', emoji: '📈' };
      case 'HOLD':
        return { color: 'bg-yellow-500', label: 'HOLD', emoji: '⏸️' };
      case 'SELL':
        return { color: 'bg-red-400', label: 'SELL', emoji: '📉' };
      case 'STRONG_SELL':
        return { color: 'bg-red-500', label: 'STRONG SELL', emoji: '⚠️' };
    }
  };

  const config = getSignalConfig(signal.action);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="text-xl">{config.emoji}</span>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-sm font-bold">{config.label}</div>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs">
        {signal.confidence.toFixed(0)}%
      </Badge>
    </div>
  );
}
