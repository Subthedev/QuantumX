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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* Clean Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-hover">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">On-Chain Analysis</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time blockchain intelligence & actionable insights
                </p>
              </div>
            </div>
          </div>

          {/* Coin Selector - Clean & Minimal */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Select Cryptocurrency</CardTitle>
                  <CardDescription className="text-xs">
                    {cryptos.length} coins with verified on-chain data
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Updated {format(lastUpdate, 'HH:mm:ss')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={onChainLoading}
                    className="h-8"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', onChainLoading && 'animate-spin')} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Select value={selectedCoin} onValueChange={setSelectedCoin} disabled={cryptosLoading}>
                <SelectTrigger className="h-12">
                  <SelectValue>
                    {selectedCoinData && (
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedCoinData.image}
                          alt={selectedCoinData.name}
                          className="h-6 w-6 rounded-full"
                        />
                        <span className="font-semibold">{selectedCoinData.name}</span>
                        <span className="text-muted-foreground">({selectedCoinData.symbol.toUpperCase()})</span>
                        {supportedCoinInfo && (
                          <Badge className={supportedCoinsService.getQualityColor(supportedCoinInfo.dataQuality)}>
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
                    const info = supportedCoinsService.getSupportedCoin(crypto.id);
                    return (
                      <SelectItem key={crypto.id} value={crypto.id}>
                        <div className="flex items-center gap-3 py-1">
                          <img src={crypto.image} alt={crypto.name} className="h-5 w-5 rounded-full" />
                          <span className="font-medium">{crypto.name}</span>
                          <span className="text-muted-foreground text-xs">({crypto.symbol.toUpperCase()})</span>
                          {info && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {info.chain === 'bitcoin' ? 'BTC' :
                               info.chain === 'ethereum' ? 'ETH' :
                               info.chain === 'binance-smart-chain' ? 'BSC' : 'MATIC'}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Quick Stats - Clean Grid */}
          {onChainData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-muted-foreground">Outflow (Bullish)</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {onChainDataService.formatNumber(Math.abs(onChainData.exchangeFlows.outflow24h))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">24h withdrawals</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-muted-foreground">Inflow (Bearish)</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {onChainDataService.formatNumber(onChainData.exchangeFlows.inflow24h)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">24h deposits</p>
                </CardContent>
              </Card>

              <Card className={cn(
                "border-l-4",
                onChainData.exchangeFlows.netFlow24h < 0 ? "border-l-green-500" :
                onChainData.exchangeFlows.netFlow24h > 0 ? "border-l-red-500" : "border-l-blue-500"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpFromLine className={cn(
                      "h-4 w-4",
                      onChainData.exchangeFlows.netFlow24h < 0 ? "text-green-600" :
                      onChainData.exchangeFlows.netFlow24h > 0 ? "text-red-600" : "text-blue-600"
                    )} />
                    <span className="text-xs font-medium text-muted-foreground">Net Flow</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    onChainData.exchangeFlows.netFlow24h < 0 ? "text-green-600" :
                    onChainData.exchangeFlows.netFlow24h > 0 ? "text-red-600" : "text-blue-600"
                  )}>
                    {onChainData.exchangeFlows.netFlow24h > 0 && "+"}
                    {onChainDataService.formatNumber(onChainData.exchangeFlows.netFlow24h)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {onChainData.exchangeFlows.netFlow24h < 0 ? "Accumulation" :
                     onChainData.exchangeFlows.netFlow24h > 0 ? "Distribution" : "Neutral"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Waves className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-muted-foreground">Whale Activity</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {onChainData.whaleActivity.topHoldersPercentage}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Top 100 holders</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content - Clean Tabs */}
          {selectedCoinData && (
            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="whales">Whale Activity</TabsTrigger>
                <TabsTrigger value="flows">Exchange Flows</TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-6">
                <ActionableInsights
                  coinSymbol={selectedCoinData.symbol}
                  autoRefresh={true}
                  refreshInterval={60000}
                />
              </TabsContent>

              <TabsContent value="whales" className="space-y-6">
                <WhaleActivityFeed
                  coinSymbol={selectedCoinData.symbol}
                  limit={50}
                  autoRefresh={true}
                  refreshInterval={30000}
                />
              </TabsContent>

              <TabsContent value="flows" className="space-y-6">
                <ExchangeFlowChart
                  coinSymbol={selectedCoinData.symbol}
                  autoRefresh={true}
                  refreshInterval={60000}
                />

                {/* Educational Info */}
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Understanding Exchange Flows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                          <ArrowUpFromLine className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-green-600 mb-1">Outflows (Bullish)</div>
                          <p className="text-xs text-muted-foreground">
                            Users moving crypto to wallets = accumulation
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <ArrowDownToLine className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-red-600 mb-1">Inflows (Bearish)</div>
                          <p className="text-xs text-muted-foreground">
                            Users moving crypto to exchanges = selling pressure
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-blue-600 mb-1">Net Flow</div>
                          <p className="text-xs text-muted-foreground">
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

          {/* Loading State */}
          {onChainLoading && !onChainData && (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading real-time on-chain data...</p>
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
