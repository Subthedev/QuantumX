import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Target, Shield, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FundamentalAnalysisProps {
  data: any;
  coinData: any;
}

export const FundamentalAnalysisCard: React.FC<FundamentalAnalysisProps> = ({ data, coinData }) => {
  const getValuationColor = (valuation: string) => {
    if (valuation === 'Undervalued') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (valuation === 'Overvalued') return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Tokenomics */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Tokenomics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Supply Model</div>
              <Badge variant="outline">{data.tokenomics.supply_model}</Badge>
            </div>
            {data.tokenomics.inflation_rate && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Inflation Rate</div>
                <div className="font-medium">{data.tokenomics.inflation_rate}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Supply Health</div>
              <Badge className={
                data.tokenomics.supply_health === 'Excellent' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.tokenomics.supply_health === 'Good' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                data.tokenomics.supply_health === 'Fair' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                'bg-red-500/10 text-red-700 dark:text-red-400'
              }>
                {data.tokenomics.supply_health}
              </Badge>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Token Utility</div>
            <div className="flex flex-wrap gap-2">
              {data.tokenomics.token_utility.map((utility: string, idx: number) => (
                <Badge key={idx} variant="secondary">{utility}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Metrics */}
      <Card className={getValuationColor(data.valuation_metrics.relative_valuation)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Valuation Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">MCap/FDV Ratio</div>
              <div className="text-lg font-bold">{data.valuation_metrics.mcap_fdv_ratio}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Liquidity</div>
              <Badge variant="outline">{data.valuation_metrics.volume_liquidity_score}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Valuation</div>
              <Badge className={getValuationColor(data.valuation_metrics.relative_valuation)}>
                {data.valuation_metrics.relative_valuation}
              </Badge>
            </div>
            {data.valuation_metrics.price_to_sales && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">P/S Ratio</div>
                <div className="text-lg font-bold">{data.valuation_metrics.price_to_sales}</div>
              </div>
            )}
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
              <div className="text-sm text-muted-foreground mb-1">Category Rank</div>
              <div className="text-xl font-bold text-primary">{data.market_position.category_rank}</div>
            </div>
          )}
          {data.market_position.market_share && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Market Share</div>
              <div className="font-medium">{data.market_position.market_share}</div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Competitive Advantages</div>
            <div className="space-y-2">
              {data.market_position.competitive_advantages.map((advantage: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="text-primary mt-1">✓</div>
                  <span className="text-sm">{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ecosystem Health */}
      <Card>
        <CardHeader>
          <CardTitle>Ecosystem Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Developer Activity</div>
              <Badge className={
                data.ecosystem_health.developer_activity === 'High' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.ecosystem_health.developer_activity === 'Medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                'bg-red-500/10 text-red-700 dark:text-red-400'
              }>
                {data.ecosystem_health.developer_activity}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Adoption Status</div>
              <div className="text-sm font-medium">{data.ecosystem_health.adoption_metrics}</div>
            </div>
          </div>

          {data.ecosystem_health.partnerships && data.ecosystem_health.partnerships.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Key Partnerships</div>
              <div className="flex flex-wrap gap-2">
                {data.ecosystem_health.partnerships.map((partnership: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{partnership}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Thesis */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle>Investment Thesis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div className="text-sm font-medium">Bull Case</div>
            </div>
            <div className="space-y-2">
              {data.investment_thesis.bull_case.map((point: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="text-green-600 dark:text-green-400 mt-1">▲</div>
                  <span className="text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="text-sm font-medium">Bear Case</div>
            </div>
            <div className="space-y-2">
              {data.investment_thesis.bear_case.map((point: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-red-600 dark:text-red-400 mt-1">▼</div>
                  <span className="text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {data.investment_thesis.catalyst_events && data.investment_thesis.catalyst_events.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Upcoming Catalysts</div>
                <div className="flex flex-wrap gap-2">
                  {data.investment_thesis.catalyst_events.map((event: string, idx: number) => (
                    <Badge key={idx} className="bg-primary/10 text-primary">{event}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Price Targets */}
      <Card className="border-2 border-primary/30 shadow-glow">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Price Targets ({data.price_targets.timeframe})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Conservative</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {data.price_targets.conservative}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Base Case</div>
              <div className="text-2xl font-bold text-primary">
                {data.price_targets.base_case}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Optimistic</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {data.price_targets.optimistic}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Rating */}
      <Card className="border-l-4 border-l-primary shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Overall Rating
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Fundamental Score</div>
              <div className="text-4xl font-bold text-primary">{data.overall_rating.score}/100</div>
            </div>
            <Badge className="text-lg px-4 py-2" variant={
              data.overall_rating.recommendation.includes('Accumulate') ? 'default' : 
              data.overall_rating.recommendation === 'Hold' ? 'secondary' : 'destructive'
            }>
              {data.overall_rating.recommendation}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
