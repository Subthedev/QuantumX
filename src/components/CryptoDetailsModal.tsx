import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  BarChart3,
  Clock,
  Percent,
  Coins,
  Info
} from 'lucide-react';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { cryptoDataService } from '@/services/cryptoDataService';
import CryptoReport from './CryptoReport';
import { TradingViewChart } from './charts/TradingViewChart';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface CryptoDetailsModalProps {
  coin: any;
  open: boolean;
  onClose: () => void;
}

export default function CryptoDetailsModal({ coin, open, onClose }: CryptoDetailsModalProps) {
  const [detailedData, setDetailedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (coin && open) {
      loadDetailedData();
    }
  }, [coin, open]);

  const loadDetailedData = async () => {
    setIsLoading(true);
    try {
      const data = await cryptoDataService.getCryptoDetails(coin.id);
      setDetailedData(data);
    } catch (error) {
      console.error('Error loading detailed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSupply = (value: number, symbol: string) => {
    if (!value) return 'N/A';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ${symbol.toUpperCase()}`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ${symbol.toUpperCase()}`;
    return `${value.toLocaleString()} ${symbol.toUpperCase()}`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  if (!coin) return null;

  const metrics = [
    { label: 'Market Cap', value: cryptoDataService.formatNumber(coin.market_cap), change: coin.market_cap_change_percentage_24h },
    { label: '24h Volume', value: cryptoDataService.formatNumber(coin.total_volume), change: null },
    { label: '24h High', value: `$${coin.high_24h?.toFixed(coin.high_24h < 1 ? 6 : 2) || '0'}`, change: null },
    { label: '24h Low', value: `$${coin.low_24h?.toFixed(coin.low_24h < 1 ? 6 : 2) || '0'}`, change: null },
  ];

  const supplyMetrics = [
    { label: 'Circulating Supply', value: formatSupply(coin.circulating_supply, coin.symbol) },
    { label: 'Total Supply', value: formatSupply(coin.total_supply, coin.symbol) },
    { label: 'Max Supply', value: formatSupply(coin.max_supply, coin.symbol) },
    { label: 'Market Dominance', value: detailedData?.market_data?.market_cap_dominance ? `${detailedData.market_data.market_cap_dominance.toFixed(2)}%` : 'N/A' },
  ];

  const priceChanges = [
    { period: '1h', value: detailedData?.market_data?.price_change_percentage_1h_in_currency?.usd },
    { period: '24h', value: coin.price_change_percentage_24h },
    { period: '7d', value: coin.price_change_percentage_7d_in_currency },
    { period: '30d', value: detailedData?.market_data?.price_change_percentage_30d },
    { period: '1y', value: detailedData?.market_data?.price_change_percentage_1y },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>{coin.name} Details</DialogTitle>
          <DialogDescription>Detailed information and analysis for {coin.name}</DialogDescription>
        </VisuallyHidden>
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={coin.image} alt={coin.name} className="w-16 h-16 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold">{coin.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground uppercase">{coin.symbol}</span>
                    <Badge variant="secondary">Rank #{coin.market_cap_rank}</Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  ${coin.current_price?.toFixed(coin.current_price < 1 ? 6 : 2) || '0'}
                </div>
                <div className={`flex items-center justify-end gap-1 ${getChangeColor(coin.price_change_percentage_24h)}`}>
                  {coin.price_change_percentage_24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="market">Market Data</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* TradingView-style Chart */}
                <div className="col-span-2">
                  <TradingViewChart 
                    data={coin.sparkline_in_7d?.price || []}
                    symbol={coin.symbol.toUpperCase()}
                    timeframe="7D"
                    height={300}
                    showVolume={true}
                  />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.map((metric, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
                        <div className="text-xl font-bold">{metric.value}</div>
                        {metric.change !== null && (
                          <div className={`text-sm ${getChangeColor(metric.change)}`}>
                            {cryptoDataService.formatPercentage(metric.change)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Price Changes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Price Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      {priceChanges.map((change, index) => (
                        <div key={index} className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">{change.period}</div>
                          <div className={`font-bold ${getChangeColor(change.value || 0)}`}>
                            {change.value ? `${change.value >= 0 ? '+' : ''}${change.value.toFixed(2)}%` : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Supply Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Supply Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {supplyMetrics.map((metric, index) => (
                        <div key={index}>
                          <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
                          <div className="font-semibold">{metric.value}</div>
                        </div>
                      ))}
                    </div>
                    {coin.max_supply && (
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-2">Circulating Supply Progress</div>
                        <Progress value={(coin.circulating_supply / coin.max_supply) * 100} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {((coin.circulating_supply / coin.max_supply) * 100).toFixed(1)}% of max supply
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ATH/ATL */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">All-Time High</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(coin.ath_date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-xl font-bold">
                        ${coin.ath?.toFixed(coin.ath < 1 ? 6 : 2) || '0'}
                      </div>
                      <div className="text-sm text-red-500">
                        {coin.ath_change_percentage?.toFixed(2)}% from ATH
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">All-Time Low</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(coin.atl_date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-xl font-bold">
                        ${coin.atl?.toFixed(coin.atl < 1 ? 8 : 2) || '0'}
                      </div>
                      <div className="text-sm text-green-500">
                        +{coin.atl_change_percentage?.toFixed(2)}% from ATL
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analysis">
                <CryptoReport 
                  coin={coin.id} 
                  icon={<img src={coin.image} alt={coin.name} className="w-8 h-8" />}
                  name={coin.name}
                />
              </TabsContent>

              <TabsContent value="market" className="space-y-6">
                {/* Market Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Market Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Market Cap Rank</div>
                        <div className="text-xl font-bold">#{coin.market_cap_rank}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Volume / Market Cap</div>
                        <div className="text-xl font-bold">
                          {((coin.total_volume / coin.market_cap) * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">FDV</div>
                        <div className="text-xl font-bold">
                          {coin.fully_diluted_valuation ? cryptoDataService.formatNumber(coin.fully_diluted_valuation) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional market data from detailed data */}
                {detailedData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Community & Development</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {detailedData.community_score && (
                          <div>
                            <div className="text-sm text-muted-foreground">Community Score</div>
                            <div className="text-xl font-bold">{detailedData.community_score.toFixed(1)}</div>
                          </div>
                        )}
                        {detailedData.developer_score && (
                          <div>
                            <div className="text-sm text-muted-foreground">Developer Score</div>
                            <div className="text-xl font-bold">{detailedData.developer_score.toFixed(1)}</div>
                          </div>
                        )}
                        {detailedData.liquidity_score && (
                          <div>
                            <div className="text-sm text-muted-foreground">Liquidity Score</div>
                            <div className="text-xl font-bold">{detailedData.liquidity_score.toFixed(1)}</div>
                          </div>
                        )}
                        {detailedData.public_interest_score && (
                          <div>
                            <div className="text-sm text-muted-foreground">Public Interest</div>
                            <div className="text-xl font-bold">{detailedData.public_interest_score.toFixed(1)}</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                {detailedData?.description?.en && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        About {coin.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed" 
                         dangerouslySetInnerHTML={{ __html: detailedData.description.en.slice(0, 1000) + '...' }} />
                    </CardContent>
                  </Card>
                )}

                {detailedData?.links && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Links & Resources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {detailedData.links.homepage?.[0] && (
                          <a href={detailedData.links.homepage[0]} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline text-sm">
                            Website →
                          </a>
                        )}
                        {detailedData.links.blockchain_site?.[0] && (
                          <a href={detailedData.links.blockchain_site[0]} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline text-sm">
                            Explorer →
                          </a>
                        )}
                        {detailedData.links.official_forum_url?.[0] && (
                          <a href={detailedData.links.official_forum_url[0]} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline text-sm">
                            Forum →
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}