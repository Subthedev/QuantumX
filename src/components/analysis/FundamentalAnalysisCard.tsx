import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { FundamentalAnalysis } from '@/schemas/analysis-schemas';

interface FundamentalAnalysisProps {
  data: FundamentalAnalysis;
  coinData: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume: number;
  };
}

export const FundamentalAnalysisCard: React.FC<FundamentalAnalysisProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tokenomics', 'thesis']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tokenomics - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('tokenomics')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
              <span>Tokenomics</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('tokenomics') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('tokenomics') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Supply Model</div>
                <Badge variant="outline" className="text-xs md:text-sm">{data.tokenomics.supply_model}</Badge>
              </div>
              {data.tokenomics.inflation_rate && (
                <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1">Inflation Rate</div>
                  <div className="text-sm md:text-base font-medium">{data.tokenomics.inflation_rate}</div>
                </div>
              )}
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Supply Health</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.tokenomics.supply_health === 'Excellent' ? 'default' :
                    data.tokenomics.supply_health === 'Good' ? 'secondary' : 'destructive'
                  }
                >
                  {data.tokenomics.supply_health}
                </Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Valuation - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('valuation')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Valuation Metrics</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('valuation') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('valuation') && (
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">MCap/FDV</div>
                <div className="text-base md:text-lg font-bold">{data.valuation_metrics.mcap_fdv_ratio}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Liquidity</div>
                <Badge variant="outline" className="text-xs md:text-sm">{data.valuation_metrics.volume_liquidity_score}</Badge>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Valuation</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.valuation_metrics.relative_valuation === 'Undervalued' ? 'default' :
                    data.valuation_metrics.relative_valuation === 'Overvalued' ? 'destructive' : 'secondary'
                  }
                >
                  {data.valuation_metrics.relative_valuation}
                </Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Market Position - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('position')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Market Position</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('position') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('position') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            {data.market_position.category_rank && (
              <div className="p-3 md:p-4 rounded-lg bg-primary/10">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Rank</div>
                <div className="text-xl md:text-2xl font-bold text-primary">{data.market_position.category_rank}</div>
              </div>
            )}
            <div>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Key Advantages</div>
              <div className="space-y-2">
                {data.market_position.competitive_advantages.slice(0, 3).map((advantage: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 md:p-3 rounded-lg bg-muted/50 text-xs md:text-sm">
                    <div className="text-primary mt-0.5">✓</div>
                    <span>{advantage}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Investment Thesis - Mobile Optimized */}
      <Card className="border-primary/20">
        <CardHeader
          className="bg-primary/5 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('thesis')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Investment Thesis</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('thesis') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('thesis') && (
          <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
            <div>
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success dark:text-success" />
                <div className="text-xs md:text-sm font-medium">Bull Case</div>
              </div>
              <div className="space-y-2">
                {data.investment_thesis.bull_case.slice(0, 3).map((point: string, idx: number) => (
                  <div key={idx} className="p-2 md:p-3 rounded-lg bg-success/5 border border-success/10 text-xs md:text-sm">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                <div className="text-xs md:text-sm font-medium">Bear Case</div>
              </div>
              <div className="space-y-2">
                {data.investment_thesis.bear_case.slice(0, 3).map((point: string, idx: number) => (
                  <div key={idx} className="p-2 md:p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs md:text-sm">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Price Targets - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('targets')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Target className="h-4 w-4 md:h-5 md:w-5" />
              <span>Price Targets ({data.price_targets.timeframe})</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('targets') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('targets') && (
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground mb-1 md:mb-2">Conservative</div>
                <div className="text-sm md:text-base lg:text-lg font-bold">{data.price_targets.conservative}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-primary/10 border-2 border-primary/30 text-center">
                <div className="text-xs text-muted-foreground mb-1 md:mb-2">Base Case</div>
                <div className="text-base md:text-lg lg:text-xl font-bold text-primary">{data.price_targets.base_case}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-xs text-muted-foreground mb-1 md:mb-2">Optimistic</div>
                <div className="text-sm md:text-base lg:text-lg font-bold">{data.price_targets.optimistic}</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Overall Rating - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('rating')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Overall Rating</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('rating') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('rating') && (
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Score</div>
                <div className="text-3xl md:text-4xl font-bold text-primary">{data.overall_rating.score}/100</div>
              </div>
              <Badge
                className="text-sm md:text-base lg:text-lg px-3 md:px-4 py-1.5 md:py-2"
                variant={
                  data.overall_rating.recommendation.includes('Accumulate') ? 'default' : 'secondary'
                }
              >
                {data.overall_rating.recommendation}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
