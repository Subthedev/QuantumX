import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import type { ActionableSignal } from '@/services/enrichedCryptoDataService';

interface EducationalSignalCardProps {
  signal: ActionableSignal;
  title: string;
  icon?: React.ReactNode;
}

/**
 * Educational Signal Card - Displays market analysis insights
 * Uses educational language to avoid being construed as financial advice
 */
export function EducationalSignalCard({ signal, title, icon }: EducationalSignalCardProps) {
  // Convert trading signals to educational insights
  const getEducationalConfig = (action: ActionableSignal['action']) => {
    switch (action) {
      case 'STRONG_BUY':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          icon: <TrendingUp className="h-6 w-6" />,
          label: 'STRONG BULLISH',
          sublabel: 'Very Positive Indicators',
          emoji: '🌟',
          gradient: 'from-green-500 to-emerald-500',
          description: 'Technical indicators suggest strong upward momentum'
        };
      case 'BUY':
        return {
          color: 'bg-green-400',
          textColor: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/30',
          icon: <TrendingUp className="h-5 w-5" />,
          label: 'BULLISH',
          sublabel: 'Positive Indicators',
          emoji: '📊',
          gradient: 'from-green-400 to-green-500',
          description: 'Data suggests favorable conditions'
        };
      case 'HOLD':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          icon: <Minus className="h-5 w-5" />,
          label: 'NEUTRAL',
          sublabel: 'Mixed Indicators',
          emoji: '⚖️',
          gradient: 'from-yellow-500 to-amber-500',
          description: 'Market shows no clear directional bias'
        };
      case 'SELL':
        return {
          color: 'bg-red-400',
          textColor: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30',
          icon: <TrendingDown className="h-5 w-5" />,
          label: 'BEARISH',
          sublabel: 'Cautionary Indicators',
          emoji: '📉',
          gradient: 'from-red-400 to-red-500',
          description: 'Technical indicators show weakness'
        };
      case 'STRONG_SELL':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: <TrendingDown className="h-6 w-6" />,
          label: 'STRONG BEARISH',
          sublabel: 'Significant Risk Factors',
          emoji: '⚠️',
          gradient: 'from-red-500 to-red-600',
          description: 'Multiple indicators suggest downward pressure'
        };
    }
  };

  const config = getEducationalConfig(signal.action);

  // Data quality indicator
  const getDataQualityConfig = (quality: ActionableSignal['dataQuality']) => {
    switch (quality) {
      case 'excellent':
        return { icon: <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />, label: 'Comprehensive Data', color: 'text-green-500' };
      case 'good':
        return { icon: <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />, label: 'Strong Data Coverage', color: 'text-blue-500' };
      case 'fair':
        return { icon: <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />, label: 'Moderate Data', color: 'text-yellow-500' };
      case 'poor':
        return { icon: <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />, label: 'Limited Data', color: 'text-red-500' };
    }
  };

  const dataQualityConfig = getDataQualityConfig(signal.dataQuality);

  return (
    <Card className={`border-2 ${config.borderColor} ${config.bgColor} transition-all hover:shadow-lg`}>
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            {icon && <div className={`${config.textColor} flex-shrink-0`}>{icon}</div>}
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

      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
        {/* Main Signal */}
        <div className={`p-3 md:p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`p-1.5 md:p-2 rounded-lg ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${config.textColor}`}>
                  {config.label}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {config.sublabel}
                </div>
              </div>
            </div>
            <div className="text-2xl md:text-4xl flex-shrink-0">{config.emoji}</div>
          </div>

          {/* Description */}
          <div className="text-xs md:text-sm text-muted-foreground mt-2 px-1">
            {config.description}
          </div>

          {/* Confidence Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1 px-1">
              <span className="text-muted-foreground">Analysis Confidence</span>
              <span className={`font-medium ${config.textColor}`}>{signal.confidence.toFixed(0)}%</span>
            </div>
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
          <div className="text-xs md:text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span>Educational Insights</span>
            <div className="flex items-center gap-1 text-xs">
              {dataQualityConfig.icon}
              <span className={dataQualityConfig.color}>{dataQualityConfig.label}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {signal.reasoning.map((reason, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground p-2 md:p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className={`${config.textColor} flex-shrink-0 mt-0.5`}>•</span>
                <span className="flex-1 leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Educational Disclaimer */}
        <Alert className="bg-blue-500/5 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs text-muted-foreground">
            This is educational analysis only, not financial advice. Always do your own research and consult with financial advisors.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard (mobile-optimized)
export function CompactEducationalSignal({ signal, title }: { signal: ActionableSignal; title: string }) {
  const getEducationalConfig = (action: ActionableSignal['action']) => {
    switch (action) {
      case 'STRONG_BUY':
        return { color: 'bg-green-500', textColor: 'text-green-500', label: 'Strong Bullish', emoji: '🌟' };
      case 'BUY':
        return { color: 'bg-green-400', textColor: 'text-green-400', label: 'Bullish', emoji: '📊' };
      case 'HOLD':
        return { color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Neutral', emoji: '⚖️' };
      case 'SELL':
        return { color: 'bg-red-400', textColor: 'text-red-400', label: 'Bearish', emoji: '📉' };
      case 'STRONG_SELL':
        return { color: 'bg-red-500', textColor: 'text-red-500', label: 'Strong Bearish', emoji: '⚠️' };
    }
  };

  const config = getEducationalConfig(signal.action);

  return (
    <div className="flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-lg md:text-xl">{config.emoji}</span>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className={`text-xs md:text-sm font-bold ${config.textColor}`}>{config.label}</div>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs">
        {signal.confidence.toFixed(0)}%
      </Badge>
    </div>
  );
}

// Overall Analysis Summary Card (Legal-compliant)
export function AnalysisSummaryCard({
  signals,
  coinName,
  coinSymbol
}: {
  signals: { technical: ActionableSignal; fundamental: ActionableSignal; sentiment: ActionableSignal; overall: ActionableSignal };
  coinName: string;
  coinSymbol: string;
}) {
  const overall = signals.overall;

  const getOverallConfig = (action: ActionableSignal['action']) => {
    switch (action) {
      case 'STRONG_BUY':
        return {
          bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
          border: 'border-green-500/30',
          title: 'Strong Bullish Outlook',
          description: 'Multiple indicators suggest favorable conditions',
          icon: '🌟'
        };
      case 'BUY':
        return {
          bg: 'bg-gradient-to-br from-green-400/20 to-green-500/20',
          border: 'border-green-400/30',
          title: 'Bullish Outlook',
          description: 'Positive indicators outweigh negative factors',
          icon: '📈'
        };
      case 'HOLD':
        return {
          bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
          border: 'border-yellow-500/30',
          title: 'Neutral Outlook',
          description: 'Market conditions remain uncertain',
          icon: '⚖️'
        };
      case 'SELL':
        return {
          bg: 'bg-gradient-to-br from-red-400/20 to-red-500/20',
          border: 'border-red-400/30',
          title: 'Bearish Outlook',
          description: 'Cautionary signals detected',
          icon: '📉'
        };
      case 'STRONG_SELL':
        return {
          bg: 'bg-gradient-to-br from-red-500/20 to-red-600/20',
          border: 'border-red-500/30',
          title: 'Strong Bearish Outlook',
          description: 'Significant risk factors identified',
          icon: '⚠️'
        };
    }
  };

  const config = getOverallConfig(overall.action);

  return (
    <Card className={`${config.bg} border-2 ${config.border}`}>
      <CardHeader className="px-4 md:px-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg md:text-xl lg:text-2xl mb-1">
              {coinName} ({coinSymbol.toUpperCase()}) - Educational Analysis
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">
              Multi-dimensional market analysis for educational purposes
            </p>
          </div>
          <span className="text-3xl md:text-4xl">{config.icon}</span>
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6 space-y-4">
        {/* Overall Assessment */}
        <div className="p-3 md:p-4 rounded-xl bg-background/50 backdrop-blur-sm border">
          <div className="text-sm md:text-base font-medium mb-1">{config.title}</div>
          <div className="text-xs md:text-sm text-muted-foreground mb-3">{config.description}</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Confidence Level:</div>
            <Badge variant="secondary" className="text-xs">{overall.confidence.toFixed(0)}%</Badge>
          </div>
        </div>

        {/* Individual Signals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          <CompactEducationalSignal signal={signals.technical} title="Technical" />
          <CompactEducationalSignal signal={signals.fundamental} title="Fundamental" />
          <CompactEducationalSignal signal={signals.sentiment} title="Sentiment" />
        </div>

        {/* Legal Disclaimer */}
        <Alert className="bg-amber-500/5 border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs leading-relaxed">
            <strong className="font-semibold">Important Disclaimer:</strong> This analysis is provided for educational and informational purposes only.
            It does not constitute financial advice, investment recommendation, or a solicitation to buy or sell securities.
            Cryptocurrency investments carry significant risk. Always conduct your own research and consult with qualified financial advisors before making investment decisions.
          </AlertDescription>
        </Alert>

        {/* IgniteX Branding */}
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">IgniteX</span> AI Analysis Engine
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
