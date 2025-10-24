import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppHeader } from '@/components/AppHeader';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Waves
} from 'lucide-react';
import { cryptoDataService } from '@/services/cryptoDataService';
import { onChainDataService } from '@/services/onChainDataService';
import { supportedCoinsService } from '@/services/supportedCoinsService';
import { WhaleActivityFeed } from '@/components/onchain/WhaleActivityFeed';
import { ExchangeFlowChart } from '@/components/onchain/ExchangeFlowChart';
import { ActionableInsights } from '@/components/onchain/ActionableInsights';
import { LiveWhaleAlerts } from '@/components/onchain/LiveWhaleAlerts';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const OnChainAnalysis = () => {
  const [selectedCoin, setSelectedCoin] = useState<string>('bitcoin');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch available cryptos and filter to supported only
  const { data: allCryptos = [], isLoading: cryptosLoading } = useQuery({
    queryKey: ['top-cryptos-onchain'],
    queryFn: () => cryptoDataService.getTopCryptos(100),
    refetchInterval: 60000
  });

  // Filter to only supported coins with real on-chain data
  const cryptos = useMemo(() => {
    return supportedCoinsService.filterSupportedCoins(allCryptos);
  }, [allCryptos]);

  // Fetch on-chain data
  const { data: onChainData, isLoading: onChainLoading, refetch } = useQuery({
    queryKey: ['onchain-data', selectedCoin],
    queryFn: async () => {
      const data = await onChainDataService.getOnChainData(selectedCoin);
      setLastUpdate(new Date());
      return data;
    },
    enabled: !!selectedCoin && supportedCoinsService.isCoinSupported(selectedCoin),
    refetchInterval: 120000 // 2 minutes
  });

  // Get selected coin data
  const selectedCoinData = useMemo(() => {
    return cryptos.find(c => c.id === selectedCoin);
  }, [cryptos, selectedCoin]);

  // Get supported coin info
  const supportedCoinInfo = supportedCoinsService.getSupportedCoin(selectedCoin);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="space-y-4 sm:space-y-6">
          {/* Clean Header - Mobile Optimized */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-hover shrink-0">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">On-Chain Analysis</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Real-time blockchain intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Coin Selector - Mobile Optimized */}
          <Card>
            <CardHeader className="p-3 sm:p-4 sm:pb-4 pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg truncate">Select Cryptocurrency</CardTitle>
                  <CardDescription className="text-xs">
                    {cryptos.length} coins with verified data
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Updated {format(lastUpdate, 'HH:mm:ss')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={onChainLoading}
                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', onChainLoading && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Select value={selectedCoin} onValueChange={setSelectedCoin} disabled={cryptosLoading}>
                <SelectTrigger className="h-11 sm:h-12">
                  <SelectValue>
                    {selectedCoinData && (
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <img
                          src={selectedCoinData.image}
                          alt={selectedCoinData.name}
                          className="h-5 w-5 sm:h-6 sm:w-6 rounded-full shrink-0"
                        />
                        <span className="font-semibold text-sm sm:text-base truncate">{selectedCoinData.name}</span>
                        <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">({selectedCoinData.symbol.toUpperCase()})</span>
                        {supportedCoinInfo && (
                          <Badge className={cn(supportedCoinsService.getQualityColor(supportedCoinInfo.dataQuality), "hidden md:flex")}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {supportedCoinInfo.dataQuality}
                          </Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cryptos.map(crypto => {
                    return (
                      <SelectItem key={crypto.id} value={crypto.id}>
                        <div className="flex items-center gap-2 sm:gap-3 py-1">
                          <img src={crypto.image} alt={crypto.name} className="h-5 w-5 rounded-full" />
                          <span className="font-medium text-sm">{crypto.name}</span>
                          <span className="text-muted-foreground text-xs">({crypto.symbol.toUpperCase()})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Quick Stats - Mobile Optimized Grid */}
          {onChainData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Outflow</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                    {onChainDataService.formatNumber(Math.abs(onChainData.exchangeFlows.outflow24h))}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">24h withdrawals</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Inflow</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-red-600 truncate">
                    {onChainDataService.formatNumber(onChainData.exchangeFlows.inflow24h)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">24h deposits</p>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-l-4",
                onChainData.exchangeFlows.netFlow24h < 0 ? "border-l-green-500" :
                onChainData.exchangeFlows.netFlow24h > 0 ? "border-l-red-500" : "border-l-blue-500"
              )}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <ArrowUpFromLine className={cn(
                      "h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0",
                      onChainData.exchangeFlows.netFlow24h < 0 ? "text-green-600" :
                      onChainData.exchangeFlows.netFlow24h > 0 ? "text-red-600" : "text-blue-600"
                    )} />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Net Flow</span>
                  </div>
                  <div className={cn(
                    "text-lg sm:text-2xl font-bold truncate",
                    onChainData.exchangeFlows.netFlow24h < 0 ? "text-green-600" :
                    onChainData.exchangeFlows.netFlow24h > 0 ? "text-red-600" : "text-blue-600"
                  )}>
                    {onChainDataService.formatCurrency(onChainData.exchangeFlows.netFlow24h)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    {onChainData.exchangeFlows.netFlow24h < 0 ? "Accumulation" :
                     onChainData.exchangeFlows.netFlow24h > 0 ? "Distribution" : "Neutral"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Waves className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Whale</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                    {onChainData.whaleActivity.topHoldersPercentage}%
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">Top 100 holders</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content - Mobile Optimized Tabs */}
          {selectedCoinData && (
            <Tabs defaultValue="insights" className="space-y-4 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
                <TabsTrigger value="insights" className="text-xs sm:text-sm px-2 py-2">Insights</TabsTrigger>
                <TabsTrigger value="live-alerts" className="text-xs sm:text-sm px-2 py-2">🔴 Live</TabsTrigger>
                <TabsTrigger value="whales" className="text-xs sm:text-sm px-2 py-2">Whales</TabsTrigger>
                <TabsTrigger value="flows" className="text-xs sm:text-sm px-2 py-2">Flows</TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-4 sm:space-y-6">
                <ActionableInsights
                  coinSymbol={selectedCoinData.symbol}
                  autoRefresh={true}
                  refreshInterval={60000}
                />
              </TabsContent>

              <TabsContent value="live-alerts" className="space-y-4 sm:space-y-6">
                <LiveWhaleAlerts />
              </TabsContent>

              <TabsContent value="whales" className="space-y-4 sm:space-y-6">
                <WhaleActivityFeed
                  coinSymbol={selectedCoinData.symbol}
                  limit={50}
                  autoRefresh={true}
                  refreshInterval={30000}
                />
              </TabsContent>

              <TabsContent value="flows" className="space-y-4 sm:space-y-6">
                <ExchangeFlowChart
                  coinSymbol={selectedCoinData.symbol}
                  autoRefresh={true}
                  refreshInterval={60000}
                />

                {/* Educational Info - Mobile Optimized */}
                <Card className="bg-muted/30">
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base">Understanding Exchange Flows</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 border border-green-500/20 shrink-0">
                          <ArrowUpFromLine className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-green-600 mb-1 text-xs sm:text-sm">Outflows (Bullish)</div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Users moving crypto to wallets = accumulation
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
                          <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-red-600 mb-1 text-xs sm:text-sm">Inflows (Bearish)</div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Users moving crypto to exchanges = selling pressure
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
                          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-blue-600 mb-1 text-xs sm:text-sm">Net Flow</div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Negative = bullish, Positive = bearish
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Loading State - Mobile Optimized */}
          {onChainLoading && !onChainData && (
            <Card>
              <CardContent className="p-8 sm:p-12">
                <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                  <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
                  <p className="text-sm sm:text-base text-muted-foreground text-center">Loading real-time on-chain data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnChainAnalysis;
