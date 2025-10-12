import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LinkIcon, Activity, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { OnChainAnalysis } from '@/schemas/analysis-schemas';

interface OnChainAnalysisProps {
  data: OnChainAnalysis;
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

export const OnChainAnalysisCard: React.FC<OnChainAnalysisProps> = ({ data, coinData }) => {
  const getPhaseColor = (phase: string) => {
    if (phase === 'Accumulation') return 'default';
    if (phase === 'Markup') return 'default';
    if (phase === 'Distribution') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Network Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Network Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Activity</div>
              <Badge variant={
                data.network_health.activity_trend === 'Growing' ? 'default' :
                data.network_health.activity_trend === 'Declining' ? 'destructive' : 'secondary'
              }>
                {data.network_health.activity_trend}
              </Badge>
            </div>
            <div className="col-span-2 p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Network Usage</div>
              <div className="text-sm font-medium">{data.network_health.network_usage}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Dynamics */}
      <Card>
        <CardHeader>
          <CardTitle>Supply Dynamics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Circulating</div>
              <div className="text-2xl font-bold text-primary">{data.supply_dynamics.circulating_percentage}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">Concentration</div>
              <Badge variant={
                data.supply_dynamics.supply_concentration === 'Well Distributed' ? 'default' : 'destructive'
              }>
                {data.supply_dynamics.supply_concentration}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whale Activity */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Whale Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Large Holders</div>
              <Badge className="text-base" variant={
                data.whale_activity.large_holder_trend === 'Accumulating' ? 'default' : 
                data.whale_activity.large_holder_trend === 'Distributing' ? 'destructive' : 'secondary'
              }>
                {data.whale_activity.large_holder_trend}
              </Badge>
            </div>
            {data.whale_activity.large_holder_trend === 'Accumulating' && <TrendingUp className="h-8 w-8 text-success dark:text-success" />}
            {data.whale_activity.large_holder_trend === 'Distributing' && <TrendingDown className="h-8 w-8 text-destructive" />}
            {data.whale_activity.large_holder_trend === 'Holding' && <Activity className="h-8 w-8 text-warning" />}
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {data.whale_activity.whale_transaction_analysis}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Flows */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Net Flow</div>
              <Badge className="text-base" variant={
                data.exchange_flows.net_flow.includes('Outflows') ? 'default' :
                data.exchange_flows.net_flow.includes('Inflows') ? 'destructive' : 'secondary'
              }>
                {data.exchange_flows.net_flow}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.exchange_flows.net_flow.includes('Outflows') ? '↓ Cold storage' : 
               data.exchange_flows.net_flow.includes('Inflows') ? '↑ To exchanges' : '→ Neutral'}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {data.exchange_flows.flow_interpretation}
          </div>
        </CardContent>
      </Card>

      {/* Market Cycle Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Market Cycle Phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Phase</div>
              <Badge className="text-lg" variant={getPhaseColor(data.accumulation_phase.current_phase)}>
                {data.accumulation_phase.current_phase}
              </Badge>
            </div>
            <Badge variant="outline" className="text-base">
              {data.accumulation_phase.phase_confidence}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            {data.accumulation_phase.phase_analysis}
          </div>
        </CardContent>
      </Card>

      {/* On-Chain Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>On-Chain Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.onchain_outlook.bullish_signals && data.onchain_outlook.bullish_signals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-success dark:text-success" />
                <div className="text-sm font-medium">Bullish Signals</div>
              </div>
              <div className="space-y-2">
                {data.onchain_outlook.bullish_signals.slice(0, 3).map((signal: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-success/5 border border-success/10 text-sm">
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.onchain_outlook.bearish_signals && data.onchain_outlook.bearish_signals.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <div className="text-sm font-medium">Bearish Signals</div>
                </div>
                <div className="space-y-2">
                  {data.onchain_outlook.bearish_signals.slice(0, 3).map((signal: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-sm">
                      {signal}
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
