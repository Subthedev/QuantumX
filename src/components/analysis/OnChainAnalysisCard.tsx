import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkIcon, Activity, TrendingUp, TrendingDown, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { OnChainAnalysis } from '@/schemas/analysis-schemas';

interface OnChainAnalysisProps {
  data: OnChainAnalysis;
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

export const OnChainAnalysisCard: React.FC<OnChainAnalysisProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['network', 'whale']));

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

  const getPhaseColor = (phase: string) => {
    if (phase === 'Accumulation') return 'default';
    if (phase === 'Markup') return 'default';
    if (phase === 'Distribution') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Network Health - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('network')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <LinkIcon className="h-4 w-4 md:h-5 md:w-5" />
              <span>Network Health</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('network') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('network') && (
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Activity</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.network_health.activity_trend === 'Growing' ? 'default' :
                    data.network_health.activity_trend === 'Declining' ? 'destructive' : 'secondary'
                  }
                >
                  {data.network_health.activity_trend}
                </Badge>
              </div>
              <div className="col-span-1 md:col-span-2 p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Network Usage</div>
                <div className="text-xs md:text-sm font-medium">{data.network_health.network_usage}</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Supply Dynamics - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('supply')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Supply Dynamics</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('supply') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('supply') && (
          <CardContent className="p-3 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Circulating</div>
                <div className="text-xl md:text-2xl font-bold text-primary">{data.supply_dynamics.circulating_percentage}</div>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Concentration</div>
                <Badge
                  className="text-xs md:text-sm"
                  variant={
                    data.supply_dynamics.supply_concentration === 'Well Distributed' ? 'default' : 'destructive'
                  }
                >
                  {data.supply_dynamics.supply_concentration}
                </Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Whale Activity - Mobile Optimized */}
      <Card className="border-primary/20">
        <CardHeader
          className="bg-primary/5 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('whale')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              <span>Whale Activity</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('whale') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('whale') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-0">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Large Holders</div>
                <Badge
                  className="text-sm md:text-base"
                  variant={
                    data.whale_activity.large_holder_trend === 'Accumulating' ? 'default' :
                    data.whale_activity.large_holder_trend === 'Distributing' ? 'destructive' : 'secondary'
                  }
                >
                  {data.whale_activity.large_holder_trend}
                </Badge>
              </div>
              {data.whale_activity.large_holder_trend === 'Accumulating' && (
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-success dark:text-success" />
              )}
              {data.whale_activity.large_holder_trend === 'Distributing' && (
                <TrendingDown className="h-6 w-6 md:h-8 md:w-8 text-destructive" />
              )}
              {data.whale_activity.large_holder_trend === 'Holding' && (
                <Activity className="h-6 w-6 md:h-8 md:w-8 text-warning" />
              )}
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-xs md:text-sm leading-relaxed">
              {data.whale_activity.whale_transaction_analysis}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Exchange Flows - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('flows')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Exchange Flows</CardTitle>
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0 p-3 md:p-4 rounded-lg bg-muted/50">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Net Flow</div>
                <Badge
                  className="text-sm md:text-base"
                  variant={
                    data.exchange_flows.net_flow.includes('Outflows') ? 'default' :
                    data.exchange_flows.net_flow.includes('Inflows') ? 'destructive' : 'secondary'
                  }
                >
                  {data.exchange_flows.net_flow}
                </Badge>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                {data.exchange_flows.net_flow.includes('Outflows') ? '↓ Cold storage' :
                 data.exchange_flows.net_flow.includes('Inflows') ? '↑ To exchanges' : '→ Neutral'}
              </div>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-xs md:text-sm leading-relaxed">
              {data.exchange_flows.flow_interpretation}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Market Cycle Phase - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('cycle')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Market Cycle Phase</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('cycle') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('cycle') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
              <div>
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Phase</div>
                <Badge className="text-base md:text-lg" variant={getPhaseColor(data.accumulation_phase.current_phase)}>
                  {data.accumulation_phase.current_phase}
                </Badge>
              </div>
              <Badge variant="outline" className="text-sm md:text-base">
                {data.accumulation_phase.phase_confidence}
              </Badge>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-muted/50 text-xs md:text-sm leading-relaxed">
              {data.accumulation_phase.phase_analysis}
            </div>
          </CardContent>
        )}
      </Card>

      {/* On-Chain Outlook - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('outlook')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">On-Chain Outlook</CardTitle>
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
            {data.onchain_outlook.bullish_signals && data.onchain_outlook.bullish_signals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success dark:text-success" />
                  <div className="text-xs md:text-sm font-medium">Bullish Signals</div>
                </div>
                <div className="space-y-2">
                  {data.onchain_outlook.bullish_signals.slice(0, 3).map((signal: string, idx: number) => (
                    <div key={idx} className="p-2 md:p-3 rounded-lg bg-success/5 border border-success/10 text-xs md:text-sm">
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
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    <div className="text-xs md:text-sm font-medium">Bearish Signals</div>
                  </div>
                  <div className="space-y-2">
                    {data.onchain_outlook.bearish_signals.slice(0, 3).map((signal: string, idx: number) => (
                      <div key={idx} className="p-2 md:p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs md:text-sm">
                        {signal}
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
