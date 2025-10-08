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
  Info,
  Globe,
  Github,
  Twitter,
  Users,
  Code,
  GitFork,
  Star,
  ArrowRight
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { cryptoDataService } from '@/services/cryptoDataService';
import { enhancedCryptoDataService } from '@/services/enhancedCryptoDataService';
import PriceChart from './charts/PriceChart';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { formatNumber, formatPercentage } from '@/lib/utils';

interface CryptoDetailsModalProps {
  coin: any;
  open: boolean;
  onClose: () => void;
}

export default function CryptoDetailsModal({ coin, open, onClose }: CryptoDetailsModalProps) {
  const [detailedData, setDetailedData] = useState<any>(null);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (coin && open) {
      loadDetailedData();
    } else if (!open) {
      // Reset state when modal closes
      setIsLoading(true);
      setDetailedData(null);
      setEnhancedData(null);
    }
  }, [coin, open]);

  const loadDetailedData = async () => {
    setIsLoading(true);
    try {
      const [basicData, enhanced] = await Promise.all([
        cryptoDataService.getCryptoDetails(coin.id),
        enhancedCryptoDataService.getDetailedMarketData(coin.id)
      ]);
      setDetailedData(basicData);
      setEnhancedData(enhanced);
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
                <img 
                  src={coin.image} 
                  alt={coin.name} 
                  width="64" 
                  height="64" 
                  className="w-16 h-16 rounded-full object-cover" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="market">Market Data</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Price Chart */}
                <div className="w-full">
                  <PriceChart 
                    coinId={coin.id}
                    symbol={coin.symbol}
                    currentPrice={coin.current_price}
                    sparklineData={coin.sparkline_in_7d?.price}
                    height={400}
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

              <TabsContent value="market" className="space-y-6">
                {/* Enhanced Market Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Market Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Market Cap Rank</div>
                        <div className="text-2xl font-bold">#{coin.market_cap_rank}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                        <div className="text-2xl font-bold">{formatNumber(coin.market_cap)}</div>
                        {coin.market_cap_change_percentage_24h && (
                          <div className={`text-sm ${getChangeColor(coin.market_cap_change_percentage_24h)}`}>
                            {coin.market_cap_change_percentage_24h > 0 ? '+' : ''}{coin.market_cap_change_percentage_24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">24h Trading Volume</div>
                        <div className="text-2xl font-bold">{formatNumber(coin.total_volume)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Volume / Market Cap</div>
                        <div className="text-2xl font-bold">{((coin.total_volume / coin.market_cap) * 100).toFixed(2)}%</div>
                        <div className="text-xs text-muted-foreground">Liquidity ratio</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Fully Diluted Valuation</div>
                        <div className="text-2xl font-bold">
                          {coin.fully_diluted_valuation ? formatNumber(coin.fully_diluted_valuation) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Circulating Supply</div>
                        <div className="text-2xl font-bold">
                          {coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) + '%' : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatSupply(coin.circulating_supply, coin.symbol)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Range Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Price Range (24h)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Low</span>
                        <span className="font-bold">${coin.low_24h?.toFixed(coin.low_24h < 1 ? 6 : 2) || '0'}</span>
                      </div>
                      <Progress 
                        value={coin.high_24h && coin.low_24h ? ((coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)) * 100 : 50} 
                        className="h-2" 
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">High</span>
                        <span className="font-bold">${coin.high_24h?.toFixed(coin.high_24h < 1 ? 6 : 2) || '0'}</span>
                      </div>
                      <div className="text-center text-xs text-muted-foreground">
                        Current: ${coin.current_price?.toFixed(coin.current_price < 1 ? 6 : 2) || '0'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historical Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Historical Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="text-xs text-muted-foreground mb-1">All-Time High</div>
                        <div className="text-lg font-bold">${coin.ath?.toFixed(coin.ath < 1 ? 6 : 2) || '0'}</div>
                        <div className="text-xs text-red-500 mt-1">
                          {coin.ath_change_percentage?.toFixed(2)}% from ATH
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(coin.ath_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="text-xs text-muted-foreground mb-1">All-Time Low</div>
                        <div className="text-lg font-bold">${coin.atl?.toFixed(coin.atl < 1 ? 8 : 2) || '0'}</div>
                        <div className="text-xs text-green-500 mt-1">
                          +{coin.atl_change_percentage?.toFixed(2)}% from ATL
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(coin.atl_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="text-xs text-muted-foreground mb-1">7-Day Change</div>
                        <div className={`text-lg font-bold ${getChangeColor(coin.price_change_percentage_7d_in_currency || 0)}`}>
                          {coin.price_change_percentage_7d_in_currency ? 
                            `${coin.price_change_percentage_7d_in_currency > 0 ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%` 
                            : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Weekly trend</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social & Community Metrics */}
                {enhancedData?.socialMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Social & Community
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {enhancedData.socialMetrics.twitterFollowers > 0 && (
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <Twitter className="w-4 h-4 text-blue-500" />
                              <div className="text-xs text-muted-foreground">Twitter Followers</div>
                            </div>
                            <div className="text-xl font-bold">{enhancedCryptoDataService.formatLargeNumber(enhancedData.socialMetrics.twitterFollowers)}</div>
                          </div>
                        )}
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-2">Community Sentiment</div>
                          <div className="text-xl font-bold text-green-500">{enhancedData.socialMetrics.sentimentScore?.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground mt-1">Positive outlook</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-2">Community Score</div>
                          <div className="text-xl font-bold">{enhancedData.socialMetrics.communityScore?.toFixed(1)}/100</div>
                          <div className="text-xs text-muted-foreground mt-1">Engagement rating</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Developer Activity */}
                {enhancedData?.developerMetrics && enhancedData.developerMetrics.githubStars > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Developer Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <div className="text-xs text-muted-foreground">GitHub Stars</div>
                          </div>
                          <div className="text-xl font-bold">{enhancedCryptoDataService.formatLargeNumber(enhancedData.developerMetrics.githubStars)}</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <GitFork className="w-4 h-4 text-muted-foreground" />
                            <div className="text-xs text-muted-foreground">Forks</div>
                          </div>
                          <div className="text-xl font-bold">{enhancedCryptoDataService.formatLargeNumber(enhancedData.developerMetrics.githubForks)}</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-2">Commits (4 weeks)</div>
                          <div className="text-xl font-bold">{enhancedData.developerMetrics.commits4Weeks}</div>
                        </div>
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-2">Developer Score</div>
                          <div className="text-xl font-bold">{enhancedData.developerMetrics.developerScore?.toFixed(1)}/100</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                {/* Description */}
                {detailedData?.description?.en && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        About {coin.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm text-muted-foreground leading-relaxed" 
                           dangerouslySetInnerHTML={{ __html: detailedData.description.en }} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Key Information Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {detailedData?.genesis_date && (
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">Launch Date</div>
                          <div className="font-semibold">{new Date(detailedData.genesis_date).toLocaleDateString()}</div>
                        </div>
                      )}
                      {detailedData?.hashing_algorithm && (
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">Algorithm</div>
                          <div className="font-semibold">{detailedData.hashing_algorithm}</div>
                        </div>
                      )}
                      {coin.symbol && (
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">Symbol</div>
                          <div className="font-semibold uppercase">{coin.symbol}</div>
                        </div>
                      )}
                      {detailedData?.asset_platform_id && (
                        <div className="p-3 rounded-lg border bg-card">
                          <div className="text-xs text-muted-foreground mb-1">Platform</div>
                          <div className="font-semibold">{detailedData.asset_platform_id}</div>
                        </div>
                      )}
                      {detailedData?.categories && detailedData.categories.length > 0 && (
                        <div className="p-3 rounded-lg border bg-card col-span-2">
                          <div className="text-xs text-muted-foreground mb-2">Categories</div>
                          <div className="flex flex-wrap gap-1">
                            {detailedData.categories.slice(0, 5).map((category: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Links & Resources */}
                {detailedData?.links && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Links & Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {detailedData.links.homepage?.[0] && (
                          <a href={detailedData.links.homepage[0]} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Official Website</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        {detailedData.links.blockchain_site?.[0] && (
                          <a href={detailedData.links.blockchain_site[0]} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Blockchain Explorer</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        {detailedData.links.repos_url?.github?.[0] && (
                          <a href={detailedData.links.repos_url.github[0]} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Github className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">GitHub Repository</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        {detailedData.links.twitter_screen_name && (
                          <a href={`https://twitter.com/${detailedData.links.twitter_screen_name}`} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Twitter className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Twitter/X Profile</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        {detailedData.links.official_forum_url?.[0] && (
                          <a href={detailedData.links.official_forum_url[0]} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Community Forum</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        {detailedData.links.chat_url?.[0] && (
                          <a href={detailedData.links.chat_url[0]} target="_blank" rel="noopener noreferrer" 
                             className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Community Chat</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
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