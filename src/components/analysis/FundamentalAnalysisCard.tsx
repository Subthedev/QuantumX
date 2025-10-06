import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FundamentalAnalysisProps {
  data: any;
  coinData: any;
}

export const FundamentalAnalysisCard: React.FC<FundamentalAnalysisProps> = ({ data, coinData }) => {
  return (
    <div className="space-y-6">
      {/* Tokenomics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tokenomics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Supply Model</div>
              <Badge variant="outline">{data.tokenomics.supply_model}</Badge>
            </div>
            {data.tokenomics.inflation_rate && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Inflation Rate</div>
                <div className="text-sm font-medium">{data.tokenomics.inflation_rate}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Supply Health</div>
              <Badge variant={
                data.tokenomics.supply_health === 'Excellent' ? 'default' : 
                data.tokenomics.supply_health === 'Good' ? 'secondary' : 'destructive'
              }>
                {data.tokenomics.supply_health}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">MCap/FDV</div>
              <div className="text-lg font-bold">{data.valuation_metrics.mcap_fdv_ratio}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Liquidity</div>
              <Badge variant="outline">{data.valuation_metrics.volume_liquidity_score}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Valuation</div>
              <Badge variant={
                data.valuation_metrics.relative_valuation === 'Undervalued' ? 'default' :
                data.valuation_metrics.relative_valuation === 'Overvalued' ? 'destructive' : 'secondary'
              }>
                {data.valuation_metrics.relative_valuation}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Position */}
      <Card>
        <CardHeader>
          <CardTitle>Market Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.market_position.category_rank && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Rank</div>
              <div className="text-xl font-bold text-primary">{data.market_position.category_rank}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Key Advantages</div>
            <div className="space-y-2">
              {data.market_position.competitive_advantages.slice(0, 3).map((advantage: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <div className="text-primary mt-0.5">✓</div>
                  <span>{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Thesis */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle>Investment Thesis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-success dark:text-success" />
              <div className="text-sm font-medium">Bull Case</div>
            </div>
            <div className="space-y-2">
              {data.investment_thesis.bull_case.slice(0, 3).map((point: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-success/5 border border-success/10 text-sm">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div className="text-sm font-medium">Bear Case</div>
            </div>
            <div className="space-y-2">
              {data.investment_thesis.bear_case.slice(0, 3).map((point: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Price Targets ({data.price_targets.timeframe})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground mb-2">Conservative</div>
              <div className="text-lg font-bold">{data.price_targets.conservative}</div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30 text-center">
              <div className="text-xs text-muted-foreground mb-2">Base Case</div>
              <div className="text-xl font-bold text-primary">{data.price_targets.base_case}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground mb-2">Optimistic</div>
              <div className="text-lg font-bold">{data.price_targets.optimistic}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Rating */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Score</div>
              <div className="text-4xl font-bold text-primary">{data.overall_rating.score}/100</div>
            </div>
            <Badge className="text-lg px-4 py-2" variant={
              data.overall_rating.recommendation.includes('Accumulate') ? 'default' : 'secondary'
            }>
              {data.overall_rating.recommendation}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
