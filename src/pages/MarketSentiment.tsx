import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { marketIndicesService, EnhancedIndexData, FearGreedData, AltcoinSeasonData, BitcoinDominanceData } from '@/services/marketIndicesService';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/AppHeader';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IndexError {
  fearGreed?: string;
  altcoinSeason?: string;
  btcDominance?: string;
}

const MarketSentiment = () => {
  const [fearGreed, setFearGreed] = useState<EnhancedIndexData<FearGreedData> | null>(null);
  const [altcoinSeason, setAltcoinSeason] = useState<EnhancedIndexData<AltcoinSeasonData> | null>(null);
  const [btcDominance, setBtcDominance] = useState<EnhancedIndexData<BitcoinDominanceData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<IndexError>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = 'Market Sentiment | IgniteX';
    const metaDesc = 'Track Fear & Greed Index, Altcoin Season, and Bitcoin Dominance';
    let descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.name = 'description';
      document.head.appendChild(descTag);
    }
    descTag.content = metaDesc;

    fetchAllIndices();
  }, []);

  const fetchAllIndices = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    const newErrors: IndexError = {};

    // Fetch all indices in parallel for faster loading
    const results = await Promise.allSettled([
      marketIndicesService.getEnhancedFearGreed(),
      marketIndicesService.getEnhancedAltcoinSeason(),
      marketIndicesService.getEnhancedBitcoinDominance(),
    ]);

    // Process Fear & Greed result
    if (results[0].status === 'fulfilled') {
      setFearGreed(results[0].value);
    } else {
      newErrors.fearGreed = 'Failed to load';
      if (showToast) toast.error('Failed to update Fear & Greed Index');
      console.error('Fear & Greed error:', results[0].reason);
    }

    // Process Altcoin Season result
    if (results[1].status === 'fulfilled') {
      setAltcoinSeason(results[1].value);
    } else {
      newErrors.altcoinSeason = 'Failed to load';
      if (showToast) toast.error('Failed to update Altcoin Season');
      console.error('Altcoin Season error:', results[1].reason);
    }

    // Process Bitcoin Dominance result
    if (results[2].status === 'fulfilled') {
      setBtcDominance(results[2].value);
    } else {
      newErrors.btcDominance = 'Failed to load';
      if (showToast) toast.error('Failed to update Bitcoin Dominance');
      console.error('Bitcoin Dominance error:', results[2].reason);
    }

    setErrors(newErrors);
    setLoading(false);
    setRefreshing(false);

    // Show success toast if refreshing and at least one succeeded
    if (showToast && Object.keys(newErrors).length < 3) {
      toast.success('Market data updated');
    }
  };

  const getValueColor = (value: number, type: string) => {
    if (type === 'fear-greed') {
      if (value <= 25) return '#EF4444';
      if (value <= 45) return '#F59E0B';
      if (value <= 55) return '#6B7280';
      if (value <= 75) return '#10B981';
      return '#3B82F6';
    }
    return '#6B7280';
  };

  const renderTrend = (trend: number | null) => {
    if (trend === null) return null;
    const isPositive = trend >= 0;
    return (
      <span className={cn("text-sm font-medium flex items-center gap-1", isPositive ? "text-green-600" : "text-red-600")}>
        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {isPositive ? '+' : ''}{trend.toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Market Sentiment</h1>
            <p className="text-muted-foreground">Real-time cryptocurrency market indicators</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllIndices(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="space-y-6">
          {/* Fear & Greed Index */}
          {fearGreed && !errors.fearGreed ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Fear & Greed Index</CardTitle>
                <CardDescription>
                  Analyzes emotions and sentiments from different sources and crunches them into one simple number
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Main Value */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-5xl font-bold mb-1"
                        style={{ color: getValueColor(parseInt(fearGreed.current.value), 'fear-greed') }}
                      >
                        {fearGreed.current.value}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        {fearGreed.current.value_classification}
                      </div>
                    </div>
                    {/* Trends */}
                    {(fearGreed.trend24h !== null || fearGreed.trend7d !== null) && (
                      <div className="flex flex-col gap-2 items-end">
                        {fearGreed.trend24h !== null && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">24h:</span>
                            {renderTrend(fearGreed.trend24h)}
                          </div>
                        )}
                        {fearGreed.trend7d !== null && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">7d:</span>
                            {renderTrend(fearGreed.trend7d)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar - Simple & Clean */}
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${fearGreed.current.value}%`,
                          backgroundColor: getValueColor(parseInt(fearGreed.current.value), 'fear-greed')
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Extreme Fear</span>
                      <span>Fear</span>
                      <span>Neutral</span>
                      <span>Greed</span>
                      <span>Extreme Greed</span>
                    </div>
                  </div>

                  {/* Sparkline */}
                  {fearGreed.history.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">30 Day History</div>
                      <SparklineChart
                        data={fearGreed.history}
                        color="#6B7280"
                        height={50}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : errors.fearGreed ? (
            <Card className="border-destructive/50">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Unable to load Fear & Greed Index</h3>
                <Button onClick={() => fetchAllIndices(true)} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Altcoin Season Index */}
          {altcoinSeason && !errors.altcoinSeason ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Altcoin Season Index</CardTitle>
                <CardDescription>
                  Measures whether altcoins or Bitcoin are performing better in the market
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-5xl font-bold mb-1 text-foreground">
                        {altcoinSeason.current.value}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        {altcoinSeason.current.classification}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-500"
                        style={{ width: `${altcoinSeason.current.value}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Bitcoin Season</span>
                      <span>Neutral</span>
                      <span>Altcoin Season</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : errors.altcoinSeason ? (
            <Card className="border-destructive/50">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Unable to load Altcoin Season Index</h3>
                <Button onClick={() => fetchAllIndices(true)} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Bitcoin Dominance */}
          {btcDominance && !errors.btcDominance ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Bitcoin Dominance</CardTitle>
                <CardDescription>
                  Bitcoin's market cap as a percentage of total cryptocurrency market cap
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-5xl font-bold mb-1 text-foreground">
                        {btcDominance.current.value.toFixed(1)}%
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Market Share
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all duration-500"
                        style={{ width: `${btcDominance.current.value}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : errors.btcDominance ? (
            <Card className="border-destructive/50">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Unable to load Bitcoin Dominance</h3>
                <Button onClick={() => fetchAllIndices(true)} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Footer Info */}
        <Card className="mt-8 bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex gap-3 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>
                Data is updated every 5 minutes. Fear & Greed Index from Alternative.me,
                Altcoin Season calculated from market dominance, Bitcoin Dominance from CoinGecko.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MarketSentiment;
