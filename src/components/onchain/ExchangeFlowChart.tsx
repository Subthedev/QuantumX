import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react';
import { exchangeFlowService, type ExchangeFlowData } from '@/services/exchangeFlowService';
import { cn } from '@/lib/utils';

interface ExchangeFlowChartProps {
  coinSymbol: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const ExchangeFlowChart = ({
  coinSymbol,
  autoRefresh = true,
  refreshInterval = 60000
}: ExchangeFlowChartProps) => {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [flowData, setFlowData] = useState<ExchangeFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch flow data
  const fetchFlowData = async () => {
    setIsLoading(true);
    try {
      const data = await exchangeFlowService.getExchangeFlows(coinSymbol, timeframe);
      setFlowData(data);
    } catch (error) {
      console.error('Error fetching exchange flow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowData();

    if (autoRefresh) {
      const interval = setInterval(fetchFlowData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [coinSymbol, timeframe, autoRefresh, refreshInterval]);

  // Get sentiment icon and color based on net flow
  const getFlowIndicator = (netFlow: number) => {
    if (netFlow < -10000000) { // Strong outflow (very bullish)
      return {
        icon: <TrendingUp className="h-5 w-5 text-green-600" />,
        text: 'STRONG ACCUMULATION',
        color: 'text-green-600'
      };
    } else if (netFlow < 0) { // Outflow (bullish)
      return {
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        text: 'ACCUMULATION',
        color: 'text-green-500'
      };
    } else if (netFlow > 10000000) { // Strong inflow (very bearish)
      return {
        icon: <TrendingDown className="h-5 w-5 text-red-600" />,
        text: 'STRONG DISTRIBUTION',
        color: 'text-red-600'
      };
    } else if (netFlow > 0) { // Inflow (bearish)
      return {
        icon: <TrendingDown className="h-5 w-5 text-red-500" />,
        text: 'DISTRIBUTION',
        color: 'text-red-500'
      };
    } else { // Neutral
      return {
        icon: <Minus className="h-5 w-5 text-blue-500" />,
        text: 'NEUTRAL',
        color: 'text-blue-500'
      };
    }
  };

  if (!flowData && !isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No exchange flow data available</p>
        </CardContent>
      </Card>
    );
  }

  const flowIndicator = flowData ? getFlowIndicator(flowData.netFlow) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Exchange Flow Analysis
              {flowIndicator && flowIndicator.icon}
            </CardTitle>
            <CardDescription>
              Real-time tracking of deposits & withdrawals
            </CardDescription>
          </div>
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="1h" className="text-xs">1H</TabsTrigger>
              <TabsTrigger value="24h" className="text-xs">24H</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : flowData ? (
          <div className="space-y-6">
            {/* Flow Status Badge */}
            {flowIndicator && (
              <div className="flex items-center justify-center">
                <Badge
                  variant="outline"
                  className={cn("px-6 py-2 text-base font-semibold", flowIndicator.color)}
                >
                  {flowIndicator.text}
                </Badge>
              </div>
            )}

            {/* Flow Metrics - Consistent Color Scheme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Inflow (RED = Bearish) */}
              <Card className="border-2 border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
                      Inflow (Bearish)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {exchangeFlowService.formatUsd(flowData.inflow)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Deposits to exchanges
                  </p>
                </CardContent>
              </Card>

              {/* Net Flow (Dynamic Color) */}
              <Card className={cn(
                "border-2",
                flowData.netFlow < 0
                  ? "border-green-500/30 bg-green-500/5"
                  : flowData.netFlow > 0
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-blue-500/30 bg-blue-500/5"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Net Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-3xl font-bold",
                    flowData.netFlow < 0
                      ? "text-green-600 dark:text-green-400"
                      : flowData.netFlow > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}>
                    {flowData.netFlow > 0 && "+"}
                    {exchangeFlowService.formatUsd(flowData.netFlow)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {flowData.netFlow < 0
                      ? "Outflow > Inflow (Bullish)"
                      : flowData.netFlow > 0
                      ? "Inflow > Outflow (Bearish)"
                      : "Balanced"}
                  </p>
                </CardContent>
              </Card>

              {/* Outflow (GREEN = Bullish) */}
              <Card className="border-2 border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                      Outflow (Bullish)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {exchangeFlowService.formatUsd(flowData.outflow)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Withdrawals from exchanges
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visual Flow Bar - GREEN (outflow) vs RED (inflow) */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-center">Flow Distribution</div>
              <div className="relative h-8 bg-muted rounded-full overflow-hidden flex">
                {flowData.inflow + flowData.outflow > 0 && (
                  <>
                    {/* Inflow (RED) */}
                    <div
                      className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center text-xs font-semibold text-white"
                      style={{
                        width: `${(flowData.inflow / (flowData.inflow + flowData.outflow)) * 100}%`
                      }}
                    >
                      {((flowData.inflow / (flowData.inflow + flowData.outflow)) * 100).toFixed(0)}%
                    </div>
                    {/* Outflow (GREEN) */}
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-xs font-semibold text-white"
                      style={{
                        width: `${(flowData.outflow / (flowData.inflow + flowData.outflow)) * 100}%`
                      }}
                    >
                      {((flowData.outflow / (flowData.inflow + flowData.outflow)) * 100).toFixed(0)}%
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-red-600">◀ Inflows (Sell Pressure)</span>
                <span className="text-green-600">Outflows (Accumulation) ▶</span>
              </div>
            </div>

            {/* Largest Transactions */}
            {(flowData.largestDeposit || flowData.largestWithdrawal) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {flowData.largestDeposit && (
                  <div className="p-4 rounded-lg border-2 border-red-500/30 bg-red-500/5">
                    <div className="text-xs text-muted-foreground mb-2">Largest Inflow</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {exchangeFlowService.formatUsd(flowData.largestDeposit.amountUsd)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      to {flowData.largestDeposit.to.owner}
                    </div>
                  </div>
                )}
                {flowData.largestWithdrawal && (
                  <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                    <div className="text-xs text-muted-foreground mb-2">Largest Outflow</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {exchangeFlowService.formatUsd(flowData.largestWithdrawal.amountUsd)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      from {flowData.largestWithdrawal.from.owner}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
