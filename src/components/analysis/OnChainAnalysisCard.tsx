import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LinkIcon, Activity, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface OnChainAnalysisProps {
  data: any;
  coinData: any;
}

export const OnChainAnalysisCard: React.FC<OnChainAnalysisProps> = ({ data, coinData }) => {
  const getPhaseColor = (phase: string) => {
    if (phase === 'Accumulation') return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (phase === 'Markup') return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    if (phase === 'Distribution') return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Network Health */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Network Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Activity Trend</div>
              <Badge className={
                data.network_health.activity_trend === 'Growing' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.network_health.activity_trend === 'Declining' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }>
                {data.network_health.activity_trend}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Network Usage</div>
              <div className="text-sm font-medium">{data.network_health.network_usage}</div>
            </div>
            {data.network_health.congestion_level && (
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-sm text-muted-foreground mb-2">Congestion</div>
                <Badge variant="outline">{data.network_health.congestion_level}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supply Dynamics */}
      <Card>
        <CardHeader>
          <CardTitle>Supply Dynamics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-1">Circulating %</div>
              <div className="text-2xl font-bold text-primary">{data.supply_dynamics.circulating_percentage}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-1">Concentration</div>
              <Badge className={
                data.supply_dynamics.supply_concentration === 'Well Distributed' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.supply_dynamics.supply_concentration === 'Moderately Concentrated' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                'bg-red-500/10 text-red-700 dark:text-red-400'
              }>
                {data.supply_dynamics.supply_concentration}
              </Badge>
            </div>
          </div>
          {data.supply_dynamics.inflation_pressure && (
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Inflation Pressure</div>
              <div className="text-sm leading-relaxed">{data.supply_dynamics.inflation_pressure}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whale Activity */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Whale Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Large Holder Trend</div>
              <Badge className="text-base" variant={
                data.whale_activity.large_holder_trend === 'Accumulating' ? 'default' : 
                data.whale_activity.large_holder_trend === 'Distributing' ? 'destructive' : 'secondary'
              }>
                {data.whale_activity.large_holder_trend}
              </Badge>
            </div>
            {data.whale_activity.large_holder_trend === 'Accumulating' && <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />}
            {data.whale_activity.large_holder_trend === 'Distributing' && <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />}
            {data.whale_activity.large_holder_trend === 'Holding' && <Activity className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />}
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Transaction Analysis</div>
            <div className="text-sm leading-relaxed">{data.whale_activity.whale_transaction_analysis}</div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Top Holder Concentration</div>
            <div className="text-sm leading-relaxed">{data.whale_activity.top_holder_concentration}</div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Flows */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Net Flow Direction</div>
              <Badge className="text-base" variant={
                data.exchange_flows.net_flow.includes('Outflows') ? 'default' :
                data.exchange_flows.net_flow.includes('Inflows') ? 'destructive' : 'secondary'
              }>
                {data.exchange_flows.net_flow}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.exchange_flows.net_flow.includes('Outflows') ? '↓ Moving to cold storage' : 
               data.exchange_flows.net_flow.includes('Inflows') ? '↑ Moving to exchanges' : '→ Neutral'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Flow Interpretation</div>
            <div className="text-sm leading-relaxed">{data.exchange_flows.flow_interpretation}</div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Exchange Balance Trend</div>
            <div className="text-sm leading-relaxed">{data.exchange_flows.exchange_balance_trend}</div>
          </div>
        </CardContent>
      </Card>

      {/* Holder Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Holder Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Long-Term Holders</div>
              <Badge className={
                data.holder_behavior.long_term_holder_trend === 'Increasing' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.holder_behavior.long_term_holder_trend === 'Decreasing' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }>
                {data.holder_behavior.long_term_holder_trend}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Holding Time</div>
              <div className="text-sm font-medium">{data.holder_behavior.holding_time_analysis}</div>
            </div>
          </div>

          {data.holder_behavior.short_term_speculation && (
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-muted-foreground mb-2">Short-Term Speculation</div>
              <div className="text-sm leading-relaxed">{data.holder_behavior.short_term_speculation}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Money Signals */}
      {data.smart_money_signals && data.smart_money_signals.length > 0 && (
        <Card className="border-2 border-primary/30 shadow-glow">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Smart Money Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.smart_money_signals.map((signal: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="text-primary text-xl flex-shrink-0">💡</div>
                  <span className="text-sm font-medium leading-relaxed">{signal}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accumulation Phase */}
      <Card className={`border-l-4 ${getPhaseColor(data.accumulation_phase.current_phase)}`}>
        <CardHeader>
          <CardTitle>Market Cycle Phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Phase</div>
              <Badge className={`text-lg ${getPhaseColor(data.accumulation_phase.current_phase)}`}>
                {data.accumulation_phase.current_phase}
              </Badge>
            </div>
            <Badge variant="outline" className="text-base">
              {data.accumulation_phase.phase_confidence} Confidence
            </Badge>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm leading-relaxed">{data.accumulation_phase.phase_analysis}</div>
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
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="text-sm font-medium">Bullish Signals</div>
              </div>
              <div className="space-y-2">
                {data.onchain_outlook.bullish_signals.map((signal: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="text-green-600 dark:text-green-400 mt-1">✓</div>
                    <span className="text-sm">{signal}</span>
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
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="text-sm font-medium">Bearish Signals</div>
                </div>
                <div className="space-y-2">
                  {data.onchain_outlook.bearish_signals.map((signal: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div className="text-red-600 dark:text-red-400 mt-1">✗</div>
                      <span className="text-sm">{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {data.onchain_outlook.key_metrics_to_monitor && data.onchain_outlook.key_metrics_to_monitor.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Key Metrics to Monitor</div>
                <div className="flex flex-wrap gap-2">
                  {data.onchain_outlook.key_metrics_to_monitor.map((metric: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{metric}</Badge>
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
