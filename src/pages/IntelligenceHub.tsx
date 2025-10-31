/**
 * Intelligence Hub - Transparent Prediction System
 * Clean, actionable UI with 100% data transparency
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Database, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppHeader } from '@/components/AppHeader';
import { aiIntelligenceEngine } from '@/services/aiIntelligenceEngine';
import type { IntelligenceReport, CategoryAnalysis, DataScore } from '@/services/aiIntelligenceEngine';
import { BtcLogo } from '@/components/ui/btc-logo';
import { EthLogo } from '@/components/ui/eth-logo';
import { BnbLogo } from '@/components/ui/bnb-logo';
import { SolLogo } from '@/components/ui/sol-logo';
import { XrpLogo } from '@/components/ui/xrp-logo';
import { AdaLogo } from '@/components/ui/ada-logo';

const CRYPTO_OPTIONS = {
  'Major Assets': [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' }
  ],
  'Altcoins': [
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOT', name: 'Polkadot' }
  ]
};

// Coin logo mapping
const getCoinLogo = (symbol: string) => {
  const logos: Record<string, any> = {
    BTC: BtcLogo,
    ETH: EthLogo,
    BNB: BnbLogo,
    SOL: SolLogo,
    XRP: XrpLogo,
    ADA: AdaLogo
  };
  return logos[symbol] || null;
};

export default function IntelligenceHub() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['marketData', 'orderBook']));

  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['intelligence', selectedSymbol],
    queryFn: () => aiIntelligenceEngine.generateIntelligenceReport(selectedSymbol),
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 max-w-[1400px]">

        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Intelligence Hub</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Data-driven predictions with 100% transparency
          </p>
        </div>

        {/* Legal Disclaimer */}
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs md:text-sm">
            <strong>Disclaimer:</strong> Not financial advice. Crypto trading is highly risky.
            Past performance doesn't guarantee future results. Always DYOR.
            IgniteX is not responsible for trading losses.
          </AlertDescription>
        </Alert>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-full md:w-[200px] bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              {Object.entries(CRYPTO_OPTIONS).map(([category, coins]) => (
                <SelectGroup key={category}>
                  <SelectLabel className="text-muted-foreground text-xs">{category}</SelectLabel>
                  {coins.map(coin => (
                    <SelectItem key={coin.symbol} value={coin.symbol}>
                      {coin.symbol} • {coin.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Brain className="w-8 h-8 animate-pulse text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Analyzing {selectedSymbol}...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription>Failed to generate report. Please try again.</AlertDescription>
          </Alert>
        )}

        {/* Report */}
        {report && !isLoading && (
          <div className="space-y-4">

            {/* === SIGNAL CARD === */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {/* Coin Logo */}
                    {(() => {
                      const Logo = getCoinLogo(report.symbol);
                      return Logo ? (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-background/50 border-2 border-border">
                          <Logo className="w-10 h-10" />
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          report.signal.type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {report.signal.type === 'BUY' ? (
                            <TrendingUp className="w-8 h-8 text-green-500" />
                          ) : (
                            <TrendingDown className="w-8 h-8 text-red-500" />
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <h2 className="text-3xl font-bold">
                        <span className={report.signal.type === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                          {report.signal.type}
                        </span>
                        <span className="text-muted-foreground ml-3">{report.symbol}</span>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.signal.strength} • {report.signal.timeframe}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className={`text-4xl font-bold ${
                      report.signal.confidence > 70 ? 'text-green-500' :
                      report.signal.confidence > 50 ? 'text-yellow-500' : 'text-orange-500'
                    }`}>
                      {report.signal.confidence}%
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatBox label="Price" value={`$${report.marketContext.currentPrice.toLocaleString()}`} />
                  <StatBox
                    label="24h Change"
                    value={`${report.marketContext.priceChange24h > 0 ? '+' : ''}${report.marketContext.priceChange24h.toFixed(2)}%`}
                    colored={report.marketContext.priceChange24h > 0 ? 'green' : 'red'}
                  />
                  <StatBox label="Volume" value={report.marketContext.volume24h} />
                  <StatBox label="Risk" value={report.risk.level} colored={report.risk.level === 'LOW' ? 'green' : report.risk.level === 'MODERATE' ? 'yellow' : 'red'} />
                </div>
              </CardContent>
            </Card>

            {/* === ACTION PLAN === */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Action Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{report.action.recommendation}</p>

                {report.action.entryZone && (
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Entry Zone</p>
                    <p className="font-semibold">
                      ${report.action.entryZone.min.toLocaleString()} - ${report.action.entryZone.max.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {report.action.targets.map((target, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-background/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Target {idx + 1}</p>
                      <p className="text-sm font-semibold">${target.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {report.action.stopLoss && (
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <p className="text-xs text-red-400 mb-1">Stop Loss</p>
                    <p className="font-semibold text-red-400">${report.action.stopLoss.toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* === WHY THIS SIGNAL - 100% TRANSPARENCY === */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Why {report.signal.type}? (100% Transparent)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allCategories = new Set(['marketData', 'orderBook', 'fundingRates', 'sentiment', 'onChain', 'technical']);
                      setExpandedCategories(
                        expandedCategories.size === allCategories.size ? new Set() : allCategories
                      );
                    }}
                  >
                    {expandedCategories.size === 6 ? 'Collapse All' : 'Expand All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Calculation Explanation */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Final Calculation
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {report.calculation.explanation}
                  </p>
                </div>

                {/* Score Summary - More Visual */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-green-400">Bullish Score</p>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-500">{report.calculation.totalBullishScore}</p>
                    <div className="mt-2 h-2 bg-green-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(report.calculation.totalBullishScore / (report.calculation.totalBullishScore + report.calculation.totalBearishScore)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-red-400">Bearish Score</p>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-3xl font-bold text-red-500">{report.calculation.totalBearishScore}</p>
                    <div className="mt-2 h-2 bg-red-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${(report.calculation.totalBearishScore / (report.calculation.totalBullishScore + report.calculation.totalBearishScore)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Categories - Organized */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Data Analysis Breakdown (Click to see calculations)
                  </p>
                  <CategoryCard
                    category={report.analysis.marketData}
                    categoryKey="marketData"
                    expanded={expandedCategories.has('marketData')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('marketData')) next.delete('marketData');
                      else next.add('marketData');
                      setExpandedCategories(next);
                    }}
                  />
                  <CategoryCard
                    category={report.analysis.orderBook}
                    categoryKey="orderBook"
                    expanded={expandedCategories.has('orderBook')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('orderBook')) next.delete('orderBook');
                      else next.add('orderBook');
                      setExpandedCategories(next);
                    }}
                  />
                  <CategoryCard
                    category={report.analysis.fundingRates}
                    categoryKey="fundingRates"
                    expanded={expandedCategories.has('fundingRates')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('fundingRates')) next.delete('fundingRates');
                      else next.add('fundingRates');
                      setExpandedCategories(next);
                    }}
                  />
                  <CategoryCard
                    category={report.analysis.sentiment}
                    categoryKey="sentiment"
                    expanded={expandedCategories.has('sentiment')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('sentiment')) next.delete('sentiment');
                      else next.add('sentiment');
                      setExpandedCategories(next);
                    }}
                  />
                  <CategoryCard
                    category={report.analysis.onChain}
                    categoryKey="onChain"
                    expanded={expandedCategories.has('onChain')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('onChain')) next.delete('onChain');
                      else next.add('onChain');
                      setExpandedCategories(next);
                    }}
                  />
                  <CategoryCard
                    category={report.analysis.technical}
                    categoryKey="technical"
                    expanded={expandedCategories.has('technical')}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has('technical')) next.delete('technical');
                      else next.add('technical');
                      setExpandedCategories(next);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risk Warnings */}
            {report.risk.warnings.length > 0 && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Risk Warnings:</p>
                  <ul className="space-y-1">
                    {report.risk.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm">• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Data Quality */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Data Quality: {report.metadata.dataQuality}%</span>
                  <span className="text-muted-foreground">Generated in {report.metadata.processingTime}ms</span>
                  <div className="flex gap-1">
                    {report.metadata.sourcesUsed.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// === COMPONENTS ===

function StatBox({ label, value, colored }: { label: string; value: string; colored?: 'green' | 'red' | 'yellow' }) {
  return (
    <div className="p-3 rounded-lg bg-background/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${
        colored === 'green' ? 'text-green-500' :
        colored === 'red' ? 'text-red-500' :
        colored === 'yellow' ? 'text-yellow-500' : ''
      }`}>
        {value}
      </p>
    </div>
  );
}

function CategoryCard({
  category,
  categoryKey,
  expanded,
  onToggle
}: {
  category: CategoryAnalysis;
  categoryKey: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-background/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Signal Indicator */}
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            category.signal === 'bullish' ? 'bg-green-500' :
            category.signal === 'bearish' ? 'bg-red-500' : 'bg-gray-500'
          }`} />

          {/* Category Name */}
          <span className="font-medium">{category.name}</span>

          {/* Score Badge */}
          <Badge
            variant="outline"
            className={`text-xs ${
              category.overallScore > 60 ? 'border-green-500/50 text-green-500' :
              category.overallScore < 40 ? 'border-red-500/50 text-red-500' :
              'border-yellow-500/50 text-yellow-500'
            }`}
          >
            {category.overallScore}/100
          </Badge>

          {/* Confidence */}
          {category.confidence > 0 && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              {category.confidence}% conf.
            </span>
          )}

          {/* Metrics Count */}
          <span className="text-xs text-muted-foreground hidden md:inline">
            {category.metrics.length} metrics
          </span>
        </div>

        {/* Signal Label */}
        <div className="flex items-center gap-2">
          <Badge variant={category.signal === 'bullish' ? 'default' : category.signal === 'bearish' ? 'destructive' : 'secondary'} className="text-xs">
            {category.signal}
          </Badge>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 bg-background/30">
          {/* Category Summary */}
          <div className="p-3 rounded-lg bg-background/50 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Score</span>
              <span className={`text-lg font-bold ${
                category.overallScore > 60 ? 'text-green-500' :
                category.overallScore < 40 ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {category.overallScore}
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  category.overallScore > 60 ? 'bg-green-500' :
                  category.overallScore < 40 ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${category.overallScore}%` }}
              />
            </div>
          </div>

          {/* Individual Metrics */}
          {category.metrics.map((metric, idx) => (
            <MetricRow key={idx} metric={metric} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricRow({ metric }: { metric: DataScore }) {
  return (
    <div className="p-3 rounded bg-background/50 border border-border/20">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {metric.impact === 'bullish' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
            {metric.impact === 'bearish' && <XCircle className="w-3 h-3 text-red-500" />}
            <span className="text-sm font-medium">{metric.metric}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Value: <span className="font-mono">{metric.rawValue}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Calculation: <span className="font-mono text-[10px]">{metric.calculation}</span>
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-xs text-muted-foreground">Score</p>
          <p className={`text-lg font-bold ${
            metric.score > 60 ? 'text-green-500' :
            metric.score < 40 ? 'text-red-500' : 'text-yellow-500'
          }`}>
            {metric.score}
          </p>
          <p className="text-xs text-muted-foreground">wt: {metric.weight}</p>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${
            metric.score > 60 ? 'bg-green-500' :
            metric.score < 40 ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${metric.score}%` }}
        />
      </div>
    </div>
  );
}
