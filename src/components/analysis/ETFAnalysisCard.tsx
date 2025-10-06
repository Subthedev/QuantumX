import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Building2, Scale, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ETFAnalysisProps {
  data: any;
  coinData: any;
}

export const ETFAnalysisCard: React.FC<ETFAnalysisProps> = ({ data, coinData }) => {
  const getFlowColor = (flow: string) => {
    if (flow.includes('Inflows')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (flow.includes('Outflows')) return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
  };

  return (
    <div className="space-y-6">
      {/* ETF Landscape */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            ETF Landscape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Spot ETF Status</div>
              <div className="text-sm font-medium leading-relaxed">{data.etf_landscape.spot_etf_status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Approval Probability</div>
              <Badge className={
                data.etf_landscape.approval_probability === 'Very High' || data.etf_landscape.approval_probability === 'High'
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : data.etf_landscape.approval_probability === 'Medium'
                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
              }>
                {data.etf_landscape.approval_probability}
              </Badge>
            </div>
          </div>

          {data.etf_landscape.total_aum_estimate && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-1">Total AUM Estimate</div>
              <div className="text-2xl font-bold text-primary">{data.etf_landscape.total_aum_estimate}</div>
            </div>
          )}

          {data.etf_landscape.futures_etf_products && data.etf_landscape.futures_etf_products.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Futures ETF Products</div>
              <div className="flex flex-wrap gap-2">
                {data.etf_landscape.futures_etf_products.map((product: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{product}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Institutional Flows */}
      <Card className={`border-2 ${getFlowColor(data.institutional_flows.flow_direction)}`}>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Institutional Flows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Flow Direction</div>
              <Badge className={`text-lg ${getFlowColor(data.institutional_flows.flow_direction)}`}>
                {data.institutional_flows.flow_direction}
              </Badge>
            </div>
            {data.institutional_flows.flow_direction.includes('Inflows') && <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400" />}
            {data.institutional_flows.flow_direction.includes('Outflows') && <TrendingDown className="h-10 w-10 text-red-600 dark:text-red-400" />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {data.institutional_flows.weekly_flow_estimate && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Weekly Flows</div>
                <div className="text-lg font-bold">{data.institutional_flows.weekly_flow_estimate}</div>
              </div>
            )}
            {data.institutional_flows.cumulative_flows && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Cumulative</div>
                <div className="text-lg font-bold">{data.institutional_flows.cumulative_flows}</div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-1">Flow Sustainability</div>
            <Badge className={
              data.institutional_flows.flow_sustainability === 'Sustainable'
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : data.institutional_flows.flow_sustainability === 'Moderate'
                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }>
              {data.institutional_flows.flow_sustainability}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Spot vs Derivatives */}
      <Card>
        <CardHeader>
          <CardTitle>Spot vs Derivatives Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-1">Futures OI</div>
              <div className="text-lg font-bold">{data.spot_vs_derivatives.futures_oi}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-1">Spot Volume</div>
              <div className="text-lg font-bold">{data.spot_vs_derivatives.spot_volume}</div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Basis Analysis</div>
            <div className="text-sm leading-relaxed">{data.spot_vs_derivatives.basis_analysis}</div>
          </div>

          {data.spot_vs_derivatives.institutional_preference && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-sm font-medium text-muted-foreground mb-2">Institutional Preference</div>
              <div className="text-sm leading-relaxed">{data.spot_vs_derivatives.institutional_preference}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium/Discount */}
      {data.premium_discount && (
        <Card>
          <CardHeader>
            <CardTitle>Premium/Discount Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Current Premium</div>
                <div className="text-xl font-bold text-primary">{data.premium_discount.current_premium}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Trend</div>
                <Badge variant="outline">{data.premium_discount.premium_trend}</Badge>
              </div>
            </div>

            {data.premium_discount.arbitrage_opportunities && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-sm font-medium text-muted-foreground mb-2">Arbitrage Opportunities</div>
                <div className="text-sm leading-relaxed">{data.premium_discount.arbitrage_opportunities}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Institutional Sentiment */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Institutional Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Sentiment</div>
              <Badge className="text-base" variant={
                data.institutional_sentiment.sentiment.includes('Bullish') ? 'default' :
                data.institutional_sentiment.sentiment.includes('Bearish') ? 'destructive' : 'secondary'
              }>
                {data.institutional_sentiment.sentiment}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Risk Appetite</div>
              <Badge variant="outline">{data.institutional_sentiment.risk_appetite}</Badge>
            </div>
            <div className="col-span-3 md:col-span-1 p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Positioning</div>
              <div className="text-sm font-medium">{data.institutional_sentiment.positioning}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TradFi Integration */}
      {data.tradfi_integration && (
        <Card>
          <CardHeader>
            <CardTitle>Traditional Finance Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tradfi_integration.custody_solutions && data.tradfi_integration.custody_solutions.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Custody Solutions</div>
                <div className="flex flex-wrap gap-2">
                  {data.tradfi_integration.custody_solutions.map((solution: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{solution}</Badge>
                  ))}
                </div>
              </div>
            )}

            {data.tradfi_integration.banking_partnerships && data.tradfi_integration.banking_partnerships.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Banking Partnerships</div>
                <div className="flex flex-wrap gap-2">
                  {data.tradfi_integration.banking_partnerships.map((partner: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{partner}</Badge>
                  ))}
                </div>
              </div>
            )}

            {data.tradfi_integration.payment_integrations && data.tradfi_integration.payment_integrations.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Payment Integrations</div>
                <div className="flex flex-wrap gap-2">
                  {data.tradfi_integration.payment_integrations.map((integration: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{integration}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regulatory Landscape */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Regulatory Landscape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground">Regulatory Clarity</div>
            <Badge className={
              data.regulatory_landscape.regulatory_clarity === 'High'
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : data.regulatory_landscape.regulatory_clarity === 'Medium'
                ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-500/10 text-red-700 dark:text-red-400'
            }>
              {data.regulatory_landscape.regulatory_clarity}
            </Badge>
          </div>

          {data.regulatory_landscape.recent_developments && data.regulatory_landscape.recent_developments.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Recent Developments</div>
              <div className="space-y-2">
                {data.regulatory_landscape.recent_developments.map((dev: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{dev}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-2">Impact Assessment</div>
            <div className="text-sm leading-relaxed">{data.regulatory_landscape.impact_assessment}</div>
          </div>
        </CardContent>
      </Card>

      {/* Institutional Outlook */}
      <Card className="border-2 border-primary/30 shadow-glow">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle>Institutional Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 30 Days</div>
            <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
              {data.institutional_outlook.next_30_days}
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 90 Days</div>
            <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
              {data.institutional_outlook.next_90_days}
            </div>
          </div>

          {data.institutional_outlook.catalysts && data.institutional_outlook.catalysts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="text-sm font-medium">Upcoming Catalysts</div>
                </div>
                <div className="space-y-2">
                  {data.institutional_outlook.catalysts.map((catalyst: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm">
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
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="text-sm font-medium">Key Risks</div>
                </div>
                <div className="space-y-2">
                  {data.institutional_outlook.risks.map((risk: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-sm">
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
