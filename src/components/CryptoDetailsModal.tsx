import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
  ArrowRight,
  Plus,
  Bell,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

import { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';
import { enhancedCryptoDataService } from '@/services/enhancedCryptoDataService';
import PriceChart from './charts/PriceChart';
import TradingViewChart from './charts/TradingViewChart';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { formatNumber, formatPercentage } from '@/lib/utils';
import type { CoinData, DetailedCoinData, EnhancedMarketData, PriceChange } from '@/types/crypto';

interface CryptoDetailsModalProps {
  coin: CoinData;
  open: boolean;
  onClose: () => void;
}

const CryptoDetailsModal = ({ coin, open, onClose }: CryptoDetailsModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [detailedData, setDetailedData] = useState<DetailedCoinData | null>(null);
  const [enhancedData, setEnhancedData] = useState<EnhancedMarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState<string>('');

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
    setError(null);
    try {
      // Try to fetch basic data first
      const basicData = await cryptoDataService.getCryptoDetails(coin.id);
      setDetailedData(basicData);

      // Then try to fetch enhanced data separately (graceful degradation)
      try {
        const enhanced = await enhancedCryptoDataService.getDetailedMarketData(coin.id);
        setEnhancedData(enhanced);
      } catch (enhancedErr) {
        console.warn('Could not load enhanced data, continuing with basic data:', enhancedErr);
        // Don't set error, just continue without enhanced data
      }
    } catch (err) {
      console.error('Error loading detailed data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load coin details. Please try again.';
      setError(errorMessage.includes('Rate limit') ?
        'API rate limit reached. Please wait a moment and try again.' :
        errorMessage
      );
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

  // Memoized metrics arrays for performance
  const metrics = useMemo(() => [
    { label: 'Market Cap', value: cryptoDataService.formatNumber(coin.market_cap), change: coin.market_cap_change_percentage_24h },
    { label: '24h Volume', value: cryptoDataService.formatNumber(coin.total_volume), change: null },
    { label: '24h High', value: `$${coin.high_24h?.toFixed(coin.high_24h < 1 ? 6 : 2) || '0'}`, change: null },
    { label: '24h Low', value: `$${coin.low_24h?.toFixed(coin.low_24h < 1 ? 6 : 2) || '0'}`, change: null },
  ], [coin]);

  const supplyMetrics = useMemo(() => [
    { label: 'Circulating Supply', value: formatSupply(coin.circulating_supply, coin.symbol) },
    { label: 'Total Supply', value: formatSupply(coin.total_supply || 0, coin.symbol) },
    { label: 'Max Supply', value: formatSupply(coin.max_supply || 0, coin.symbol) },
    { label: 'Market Dominance', value: detailedData?.market_data?.market_cap_dominance ? `${detailedData.market_data.market_cap_dominance.toFixed(2)}%` : 'N/A' },
  ], [coin, detailedData]);

  const priceChanges: PriceChange[] = useMemo(() => [
    { period: '1h', value: detailedData?.market_data?.price_change_percentage_1h_in_currency?.usd },
    { period: '24h', value: coin.price_change_percentage_24h },
    { period: '7d', value: coin.price_change_percentage_7d_in_currency },
    { period: '30d', value: detailedData?.market_data?.price_change_percentage_30d },
    { period: '1y', value: detailedData?.market_data?.price_change_percentage_1y },
  ], [coin, detailedData]);

  const handleAddToPortfolio = () => {
    // Close the modal
    onClose();
    // Navigate to portfolio page with coin info
    navigate('/portfolio', { state: { selectedCoin: coin } });
  };

  const handleSetAlert = () => {
    const price = parseFloat(alertPrice);

    if (!alertPrice || isNaN(price) || price <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid price for the alert.',
        variant: 'destructive',
      });
      return;
    }

    // Store alert in localStorage
    const existingAlerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
    const newAlert = {
      id: `${coin.id}-${Date.now()}`,
      coinId: coin.id,
      coinName: coin.name,
      symbol: coin.symbol,
      targetPrice: price,
      currentPrice: coin.current_price,
      createdAt: new Date().toISOString(),
    };

    existingAlerts.push(newAlert);
    localStorage.setItem('priceAlerts', JSON.stringify(existingAlerts));

    toast({
      title: 'Price Alert Set!',
      description: `You'll be notified when ${coin.name} reaches $${formatNumber(price)}`,
    });

    setAlertPrice('');
  };

  if (!coin) return null;

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
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-destructive opacity-50" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Failed to Load Data</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={loadDetailedData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAddToPortfolio} className="flex-1 min-w-[140px]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Portfolio
                </Button>
              </div>

              {/* Price Alert Section */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label htmlFor="alertPrice" className="text-sm font-medium mb-2 block">
                    Set Price Alert (USD)
                  </label>
                  <Input
                    id="alertPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Current: $${formatNumber(coin.current_price)}`}
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleSetAlert} className="min-w-[140px]">
                  <Bell className="w-4 h-4 mr-2" />
                  Set Alert
                </Button>
              </div>
            </div>

            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="market">Market</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              {/* CHART TAB - Clean, focused on chart only */}
              <TabsContent value="chart" className="space-y-4">
                <div className="w-full">
                  <TradingViewChart
                    coinId={coin.id}
                    symbol={coin.symbol}
                    currentPrice={coin.current_price}
                    height={500}
                  />
                </div>

                {/* Minimal Price Changes - Inline */}
                <div className="flex items-center justify-center gap-6 py-3 bg-muted/30 rounded-lg">
                  {priceChanges.slice(0, 5).map((change, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-muted-foreground">{change.period}</div>
                      <div className={`text-sm font-semibold ${getChangeColor(change.value || 0)}`}>
                        {change.value ? `${change.value >= 0 ? '+' : ''}${change.value.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* STATS TAB - Key metrics and supply */}
              <TabsContent value="stats" className="space-y-6">
                {/* Key Metrics - Compact Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {metrics.map((metric, index) => (
                    <Card key={index} className="border-muted">
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
                        <div className="text-base font-bold">{metric.value}</div>
                        {metric.change !== null && (
                          <div className={`text-xs ${getChangeColor(metric.change)}`}>
                            {cryptoDataService.formatPercentage(metric.change)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Supply Information - Compact */}
                <Card className="border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Supply
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      {supplyMetrics.slice(0, 3).map((metric, index) => (
                        <div key={index}>
                          <div className="text-xs text-muted-foreground">{metric.label}</div>
                          <div className="text-sm font-semibold">{metric.value}</div>
                        </div>
                      ))}
                    </div>
                    {coin.max_supply && (
                      <div className="mt-3">
                        <Progress value={(coin.circulating_supply / coin.max_supply) * 100} className="h-1.5" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {((coin.circulating_supply / coin.max_supply) * 100).toFixed(1)}% circulating
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ATH/ATL - Compact */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-muted">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">ATH</span>
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {new Date(coin.ath_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold">
                        ${coin.ath?.toFixed(coin.ath < 1 ? 6 : 2) || '0'}
                      </div>
                      <div className="text-xs text-red-500">
                        {coin.ath_change_percentage?.toFixed(1)}% from ATH
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
                {detailedData?.description?.en ? (
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
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No description available for {coin.name}</p>
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
};

export default memo(CryptoDetailsModal);