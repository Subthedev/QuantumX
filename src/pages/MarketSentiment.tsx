import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { marketIndicesService, EnhancedIndexData, FearGreedData, AltcoinSeasonData, BitcoinDominanceData } from '@/services/marketIndicesService';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/AppHeader';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Clock, Info } from 'lucide-react';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
    document.title = 'Market Sentiment Indices | IgniteX';
    const metaDesc = 'Track Fear & Greed Index, Altcoin Season Index, and Bitcoin Dominance with real-time data and historical trends';
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

    // Fetch Fear & Greed
    try {
      const data = await marketIndicesService.getEnhancedFearGreed();
      setFearGreed(data);
    } catch (error) {
      console.error('Error fetching Fear & Greed:', error);
      newErrors.fearGreed = error instanceof Error ? error.message : 'Failed to load';
      if (showToast) toast.error('Failed to update Fear & Greed Index');
    }

    // Fetch Altcoin Season
    try {
      const data = await marketIndicesService.getEnhancedAltcoinSeason();
      setAltcoinSeason(data);
    } catch (error) {
      console.error('Error fetching Altcoin Season:', error);
      newErrors.altcoinSeason = error instanceof Error ? error.message : 'Failed to load';
      if (showToast) toast.error('Failed to update Altcoin Season Index');
    }

    // Fetch Bitcoin Dominance
    try {
      const data = await marketIndicesService.getEnhancedBitcoinDominance();
      setBtcDominance(data);
    } catch (error) {
      console.error('Error fetching Bitcoin Dominance:', error);
      newErrors.btcDominance = error instanceof Error ? error.message : 'Failed to load';
      if (showToast) toast.error('Failed to update Bitcoin Dominance');
    }

    setErrors(newErrors);
    setLoading(false);
    setRefreshing(false);

    if (showToast && Object.keys(newErrors).length === 0) {
      toast.success('All indices updated successfully');
    }
  };

  const getColorForValue = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      if (value <= 25) return 'hsl(var(--destructive))';
      if (value <= 45) return 'hsl(24, 95%, 53%)';
      if (value <= 55) return 'hsl(45, 93%, 47%)';
      if (value <= 75) return 'hsl(142, 71%, 45%)';
      return 'hsl(var(--primary))';
    }
    if (type === 'altcoin') {
      if (value >= 75) return 'hsl(var(--primary))';
      if (value >= 50) return 'hsl(45, 93%, 47%)';
      return 'hsl(142, 71%, 45%)';
    }
    if (value >= 60) return 'hsl(142, 71%, 45%)';
    if (value >= 45) return 'hsl(45, 93%, 47%)';
    return 'hsl(var(--primary))';
  };

  const getInsightText = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance'): string => {
    if (type === 'fear-greed') {
      if (value <= 25) return 'Extreme fear suggests a potential buying opportunity. Markets may be oversold.';
      if (value <= 45) return 'Fear in the market. Could be a good time to accumulate quality assets.';
      if (value <= 55) return 'Neutral sentiment. Market is balanced between fear and greed.';
      if (value <= 75) return 'Greed is building. Consider taking some profits on winners.';
      return 'Extreme greed indicates potential market top. Exercise caution and consider profit-taking.';
    }
    if (type === 'altcoin') {
      if (value >= 75) return 'Strong altcoin season. Altcoins are outperforming Bitcoin significantly.';
      if (value >= 50) return 'Transitioning phase. Mixed performance between Bitcoin and altcoins.';
      return 'Bitcoin season. Bitcoin is leading the market while altcoins may underperform.';
    }
    if (value >= 60) return 'High Bitcoin dominance. Bitcoin is leading market direction.';
    if (value >= 45) return 'Moderate dominance. Market cap is relatively balanced.';
    return 'Low Bitcoin dominance. Altcoins have significant market share.';
  };

  const renderTrendIndicator = (trend: number | null, label: string) => {
    if (trend === null) return null;

    const isPositive = trend >= 0;
    return (
      <div className="flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600" />
        ) : (
          <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-600" />
        )}
        <span className={cn(
          "text-xs sm:text-sm font-medium",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {label}: {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderIndexCard = (
    title: string,
    data: EnhancedIndexData<any> | null,
    error: string | undefined,
    type: 'fear-greed' | 'altcoin' | 'dominance',
    valueGetter: (data: any) => number,
    labelGetter: (data: any) => string,
    iconGetter: (value: number) => JSX.Element
  ) => {
    if (error) {
      return (
        <Card className="border-destructive">
          <CardContent className="py-6 sm:py-8 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">{title} Unavailable</h3>
            <p className="text-sm text-muted-foreground mb-3 sm:mb-4">{error}</p>
            <Button onClick={() => fetchAllIndices(true)} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!data) return null;

    const value = valueGetter(data.current);
    const label = labelGetter(data.current);
    const color = getColorForValue(value, type);

    return (
      <Card className="border-2 hover:border-primary/50 transition-all duration-300">
        <CardHeader className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1 sm:space-y-2 flex-1">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 flex-wrap">
                {title}
                {data.lastUpdated && (
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(data.lastUpdated, { addSuffix: true })}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base leading-relaxed">
                {type === 'fear-greed' && 'Measures market emotions and sentiment. Values below 25 indicate extreme fear, above 75 show extreme greed.'}
                {type === 'altcoin' && 'Shows whether Bitcoin or altcoins are leading the market based on relative performance.'}
                {type === 'dominance' && 'Bitcoin\'s share of the total cryptocurrency market capitalization.'}
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5 w-fit"
              style={{
                backgroundColor: `${color}20`,
                color: color,
                borderColor: color
              }}
            >
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Value Display */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="text-4xl sm:text-6xl font-bold" style={{ color }}>
                {type === 'dominance' ? `${value.toFixed(1)}%` : value}
              </div>
              <div className="text-base sm:text-xl font-semibold text-muted-foreground">
                {label}
              </div>
            </div>
            {iconGetter(value)}
          </div>

          {/* Trend Indicators */}
          {(data.trend24h !== null || data.trend7d !== null || data.trend30d !== null) && (
            <div className="flex flex-wrap gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
              {renderTrendIndicator(data.trend24h, '24h')}
              {renderTrendIndicator(data.trend7d, '7d')}
              {renderTrendIndicator(data.trend30d, '30d')}
            </div>
          )}

          {/* Sparkline Chart */}
          {data.history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">90-Day Trend</span>
                {data.percentile !== null && (
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {data.percentile.toFixed(0)}th percentile
                  </span>
                )}
              </div>
              <SparklineChart data={data.history} color="auto" height={60} />
            </div>
          )}

          {/* Clean Gradient Bar */}
          <div className="space-y-3">
            <div className="relative h-12 sm:h-16 rounded-xl overflow-hidden bg-gradient-to-r from-destructive/20 via-yellow-500/20 to-primary/20">
              <div
                className="absolute left-0 top-0 h-full transition-all duration-700 ease-out rounded-xl"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${color}dd 0%, ${color} 100%)`
                }}
              />
            </div>

            <div className="flex justify-between text-xs sm:text-sm font-medium text-muted-foreground px-1">
              <span>0{type === 'dominance' ? '%' : ''}</span>
              <span className="hidden sm:inline">{type === 'dominance' ? '25%' : '25'}</span>
              <span>50{type === 'dominance' ? '%' : ''}</span>
              <span className="hidden sm:inline">{type === 'dominance' ? '75%' : '75'}</span>
              <span>100{type === 'dominance' ? '%' : ''}</span>
            </div>

            {/* Labels */}
            <div className={cn(
              "grid gap-2 text-[10px] sm:text-xs text-center",
              type === 'fear-greed' ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3"
            )}>
              {type === 'fear-greed' && (
                <>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(12, type) }}></div>
                    <div className="font-medium">Extreme Fear</div>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <div className="h-2 rounded" style={{ background: getColorForValue(35, type) }}></div>
                    <div className="font-medium">Fear</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(50, type) }}></div>
                    <div className="font-medium">Neutral</div>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <div className="h-2 rounded" style={{ background: getColorForValue(65, type) }}></div>
                    <div className="font-medium">Greed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(88, type) }}></div>
                    <div className="font-medium">Extreme Greed</div>
                  </div>
                </>
              )}
              {type === 'altcoin' && (
                <>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(12, type) }}></div>
                    <div className="font-medium">Bitcoin Season</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(50, type) }}></div>
                    <div className="font-medium">Neutral</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(88, type) }}></div>
                    <div className="font-medium">Altcoin Season</div>
                  </div>
                </>
              )}
              {type === 'dominance' && (
                <>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(30, type) }}></div>
                    <div className="font-medium">Low</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(50, type) }}></div>
                    <div className="font-medium">Moderate</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 rounded" style={{ background: getColorForValue(70, type) }}></div>
                    <div className="font-medium">High</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* What This Means Section */}
          <div className="flex gap-3 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400">What This Means</p>
              <p className="text-xs sm:text-sm text-blue-600/90 dark:text-blue-300/90">
                {getInsightText(value, type)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
              <Skeleton className="h-4 sm:h-5 w-full max-w-md" />
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
                  <Skeleton className="h-3 sm:h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 sm:h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        <div className="space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Market Sentiment Indices</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Real-time market sentiment indicators with historical trends
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllIndices(true)}
              disabled={refreshing}
              className="w-fit"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Fear & Greed Index */}
          {renderIndexCard(
            'Fear & Greed Index',
            fearGreed,
            errors.fearGreed,
            'fear-greed',
            (data) => parseInt(data.value),
            (data) => data.value_classification,
            (value) => value > 50 ? (
              <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            ) : (
              <TrendingDown className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />
            )
          )}

          {/* Altcoin Season Index */}
          {renderIndexCard(
            'Altcoin Season Index',
            altcoinSeason,
            errors.altcoinSeason,
            'altcoin',
            (data) => data.value,
            (data) => data.classification,
            (value) => value >= 50 ? (
              <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16" style={{ color: getColorForValue(value, 'altcoin') }} />
            ) : (
              <TrendingDown className="h-12 w-12 sm:h-16 sm:w-16" style={{ color: getColorForValue(value, 'altcoin') }} />
            )
          )}

          {/* Bitcoin Dominance */}
          {renderIndexCard(
            'Bitcoin Dominance Index',
            btcDominance,
            errors.btcDominance,
            'dominance',
            (data) => Math.round(data.value),
            () => 'Market Share',
            (value) => <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16" style={{ color: getColorForValue(value, 'dominance') }} />
          )}

          {/* Info Section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
              <div className="flex gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium">About These Indices</p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Fear & Greed Index from Alternative.me with 90-day historical data.
                    Altcoin Season Index calculated from market dominance metrics.
                    Bitcoin Dominance from CoinGecko. All data cached for 5 minutes with automatic retry and fallback support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MarketSentiment;
