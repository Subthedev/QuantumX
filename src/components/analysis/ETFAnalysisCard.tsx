import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Building2, Scale, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { ETFAnalysis } from '@/schemas/analysis-schemas';

interface ETFAnalysisProps {
  data: ETFAnalysis;
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

export const ETFAnalysisCard: React.FC<ETFAnalysisProps> = ({ data, coinData }) => {
  const getFlowColor = (flow: string) => {
    if (flow.includes('Inflows')) return 'default';
    if (flow.includes('Outflows')) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* ETF Landscape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            ETF Landscape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="text-sm font-medium">{data.etf_landscape.spot_etf_status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Approval</div>
              <Badge variant={
                data.etf_landscape.approval_probability === 'High' ? 'default' :
                data.etf_landscape.approval_probability === 'Medium' ? 'secondary' : 'destructive'
              }>
                {data.etf_landscape.approval_probability}
              </Badge>
            </div>
          </div>
          {data.etf_landscape.total_aum_estimate && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-1">Total AUM</div>
              <div className="text-2xl font-bold text-primary">{data.etf_landscape.total_aum_estimate}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institutional Flows */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Institutional Flows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Direction</div>
              <Badge className="text-lg" variant={getFlowColor(data.institutional_flows.flow_direction)}>
                {data.institutional_flows.flow_direction}
              </Badge>
            </div>
            {data.institutional_flows.flow_direction.includes('Inflows') && <TrendingUp className="h-10 w-10 text-success dark:text-success" />}
            {data.institutional_flows.flow_direction.includes('Outflows') && <TrendingDown className="h-10 w-10 text-destructive" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {data.institutional_flows.weekly_flow_estimate && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Weekly</div>
                <div className="text-lg font-bold">{data.institutional_flows.weekly_flow_estimate}</div>
              </div>
            )}
            {data.institutional_flows.cumulative_flows && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-1">Cumulative</div>
                <div className="text-lg font-bold">{data.institutional_flows.cumulative_flows}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spot vs Derivatives */}
      <Card>
        <CardHeader>
          <CardTitle>Market Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Futures OI</div>
              <div className="text-lg font-bold">{data.spot_vs_derivatives.futures_oi}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Spot Volume</div>
              <div className="text-lg font-bold">{data.spot_vs_derivatives.spot_volume}</div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {data.spot_vs_derivatives.basis_analysis}
          </div>
        </CardContent>
      </Card>

      {/* Institutional Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institutional Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-sm text-muted-foreground mb-2">Sentiment</div>
              <Badge variant={
                data.institutional_sentiment.sentiment.includes('Bullish') ? 'default' :
                data.institutional_sentiment.sentiment.includes('Bearish') ? 'destructive' : 'secondary'
              }>
                {data.institutional_sentiment.sentiment}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-sm text-muted-foreground mb-2">Risk Appetite</div>
              <Badge variant="outline">{data.institutional_sentiment.risk_appetite}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Landscape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Regulatory Environment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Clarity</div>
            <Badge variant={
              data.regulatory_landscape.regulatory_clarity === 'High' ? 'default' :
              data.regulatory_landscape.regulatory_clarity === 'Medium' ? 'secondary' : 'destructive'
            }>
              {data.regulatory_landscape.regulatory_clarity}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {data.regulatory_landscape.impact_assessment}
          </div>
        </CardContent>
      </Card>

      {/* Institutional Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 30 Days</div>
            <p className="text-sm leading-relaxed">{data.institutional_outlook.next_30_days}</p>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 90 Days</div>
            <p className="text-sm leading-relaxed">{data.institutional_outlook.next_90_days}</p>
          </div>

          {data.institutional_outlook.catalysts && data.institutional_outlook.catalysts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-success dark:text-success" />
                  <div className="text-sm font-medium">Key Catalysts</div>
                </div>
                <div className="space-y-2">
                  {data.institutional_outlook.catalysts.slice(0, 3).map((catalyst: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-success/5 border border-success/10 text-sm">
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
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div className="text-sm font-medium">Key Risks</div>
                </div>
                <div className="space-y-2">
                  {data.institutional_outlook.risks.slice(0, 3).map((risk: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
