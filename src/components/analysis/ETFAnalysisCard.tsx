import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, Building2, Scale, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { ETFAnalysis } from '@/schemas/analysis-schemas';

interface ETFAnalysisProps {
  data: ETFAnalysis;
  coinData?: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume: number;
  };
}

export const ETFAnalysisCard: React.FC<ETFAnalysisProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['landscape', 'flows']));

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

  const getFlowColor = (flow: string) => {
    if (flow.includes('Inflows')) return 'default';
    if (flow.includes('Outflows')) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ETF Landscape - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('landscape')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Wallet className="h-4 w-4 md:h-5 md:w-5" />
              <span>ETF Landscape</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('landscape') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('landscape') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Status</div>
                <div className="text-xs md:text-sm font-medium">{data.etf_landscape.spot_etf_status}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Approval</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.etf_landscape.approval_probability === 'High' ? 'default' :
                    data.etf_landscape.approval_probability === 'Medium' ? 'secondary' : 'destructive'
                  }
                >
                  {data.etf_landscape.approval_probability}
                </Badge>
              </div>
            </div>
            {data.etf_landscape.total_aum_estimate && (
              <div className="p-3 md:p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Total AUM</div>
                <div className="text-xl md:text-2xl font-bold text-primary">{data.etf_landscape.total_aum_estimate}</div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Institutional Flows - Mobile Optimized */}
      <Card className="border-primary/20">
        <CardHeader
          className="bg-primary/5 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('flows')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              <span>Institutional Flows</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('flows') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('flows') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-0">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Direction</div>
                <Badge className="text-base md:text-lg" variant={getFlowColor(data.institutional_flows.flow_direction)}>
                  {data.institutional_flows.flow_direction}
                </Badge>
              </div>
              {data.institutional_flows.flow_direction.includes('Inflows') && (
                <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-success dark:text-success" />
              )}
              {data.institutional_flows.flow_direction.includes('Outflows') && (
                <TrendingDown className="h-8 w-8 md:h-10 md:w-10 text-destructive" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {data.institutional_flows.weekly_flow_estimate && (
                <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1">Weekly</div>
                  <div className="text-base md:text-lg font-bold">{data.institutional_flows.weekly_flow_estimate}</div>
                </div>
              )}
              {data.institutional_flows.cumulative_flows && (
                <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1">Cumulative</div>
                  <div className="text-base md:text-lg font-bold">{data.institutional_flows.cumulative_flows}</div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Spot vs Derivatives - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('market')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Market Analysis</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('market') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('market') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Futures OI</div>
                <div className="text-base md:text-lg font-bold">{data.spot_vs_derivatives.futures_oi}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Spot Volume</div>
                <div className="text-base md:text-lg font-bold">{data.spot_vs_derivatives.spot_volume}</div>
              </div>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-xs md:text-sm leading-relaxed">
              {data.spot_vs_derivatives.basis_analysis}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Institutional Sentiment - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('sentiment')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Building2 className="h-4 w-4 md:h-5 md:w-5" />
              <span>Institutional Sentiment</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('sentiment') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('sentiment') && (
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Sentiment</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.institutional_sentiment.sentiment.includes('Bullish') ? 'default' :
                    data.institutional_sentiment.sentiment.includes('Bearish') ? 'destructive' : 'secondary'
                  }
                >
                  {data.institutional_sentiment.sentiment}
                </Badge>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Risk Appetite</div>
                <Badge variant="outline" className="text-xs md:text-sm">{data.institutional_sentiment.risk_appetite}</Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Regulatory Landscape - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('regulatory')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Scale className="h-4 w-4 md:h-5 md:w-5" />
              <span>Regulatory Environment</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('regulatory') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('regulatory') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-muted/50">
              <div className="text-xs md:text-sm text-muted-foreground">Clarity</div>
              <Badge
                className="text-xs md:text-sm"
                variant={
                  data.regulatory_landscape.regulatory_clarity === 'High' ? 'default' :
                  data.regulatory_landscape.regulatory_clarity === 'Medium' ? 'secondary' : 'destructive'
                }
              >
                {data.regulatory_landscape.regulatory_clarity}
              </Badge>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-xs md:text-sm leading-relaxed">
              {data.regulatory_landscape.impact_assessment}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Institutional Outlook - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('outlook')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Outlook</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('outlook') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('outlook') && (
          <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
            <div>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Next 30 Days</div>
              <p className="text-xs md:text-sm leading-relaxed">{data.institutional_outlook.next_30_days}</p>
            </div>

            <Separator />

            <div>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Next 90 Days</div>
              <p className="text-xs md:text-sm leading-relaxed">{data.institutional_outlook.next_90_days}</p>
            </div>

            {data.institutional_outlook.catalysts && data.institutional_outlook.catalysts.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success dark:text-success" />
                    <div className="text-xs md:text-sm font-medium">Key Catalysts</div>
                  </div>
                  <div className="space-y-2">
                    {data.institutional_outlook.catalysts.slice(0, 3).map((catalyst: string, idx: number) => (
                      <div key={idx} className="p-2 md:p-3 rounded-lg bg-success/5 border border-success/10 text-xs md:text-sm">
                        {catalyst}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {data.institutional_outlook.risks && data.institutional_outlook.risks.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    <div className="text-xs md:text-sm font-medium">Key Risks</div>
                  </div>
                  <div className="space-y-2">
                    {data.institutional_outlook.risks.slice(0, 3).map((risk: string, idx: number) => (
                      <div key={idx} className="p-2 md:p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs md:text-sm">
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
