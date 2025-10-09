import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { marketIndicesService } from '@/services/marketIndicesService';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/AppHeader';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface IndexData {
  fearGreed: { value: number; label: string } | null;
  altcoinSeason: { value: number; label: string } | null;
  btcDominance: { value: number; label: string } | null;
}

const MarketSentiment = () => {
  const [indices, setIndices] = useState<IndexData>({
    fearGreed: null,
    altcoinSeason: null,
    btcDominance: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Market Sentiment Indices | IgniteX';
    const metaDesc = 'Track Fear & Greed Index, Altcoin Season Index, and Bitcoin Dominance with real-time data';
    let descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.name = 'description';
      document.head.appendChild(descTag);
    }
    descTag.content = metaDesc;
    
    fetchAllIndices();
  }, []);

  const fetchAllIndices = async () => {
    const newIndices: IndexData = {
      fearGreed: null,
      altcoinSeason: null,
      btcDominance: null,
    };

    // Fetch Fear & Greed Index
    try {
      const fearGreed = await marketIndicesService.getFearGreedIndex();
      newIndices.fearGreed = {
        value: parseInt(fearGreed.value),
        label: fearGreed.value_classification,
      };
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
    }

    // Fetch Altcoin Season Index
    try {
      const altcoinSeason = await marketIndicesService.getAltcoinSeasonIndex();
      newIndices.altcoinSeason = {
        value: altcoinSeason.value,
        label: altcoinSeason.classification,
      };
    } catch (error) {
      console.error('Error fetching Altcoin Season Index:', error);
    }

    // Fetch Bitcoin Dominance
    try {
      const btcDominance = await marketIndicesService.getBitcoinDominance();
      newIndices.btcDominance = {
        value: Math.round(btcDominance.value),
        label: `${btcDominance.value.toFixed(2)}%`,
      };
    } catch (error) {
      console.error('Error fetching Bitcoin Dominance:', error);
    }

    setIndices(newIndices);
    setLoading(false);
  };

  const getColorForValue = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      if (value <= 25) return 'hsl(var(--destructive))';
      if (value <= 45) return 'hsl(24, 95%, 53%)'; // orange
      if (value <= 55) return 'hsl(45, 93%, 47%)'; // yellow
      if (value <= 75) return 'hsl(142, 71%, 45%)'; // green
      return 'hsl(var(--primary))';
    }
    if (type === 'altcoin') {
      if (value >= 75) return 'hsl(var(--primary))';
      if (value >= 50) return 'hsl(45, 93%, 47%)';
      return 'hsl(142, 71%, 45%)';
    }
    // Bitcoin dominance
    if (value >= 60) return 'hsl(142, 71%, 45%)';
    if (value >= 45) return 'hsl(45, 93%, 47%)';
    return 'hsl(var(--primary))';
  };

  const getBadgeVariant = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      if (value <= 25 || value >= 75) return 'default';
      return 'secondary';
    }
    return 'secondary';
  };

  const getDescription = (type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      return 'The Fear & Greed Index measures market emotions and sentiment. Values below 25 indicate extreme fear, while values above 75 show extreme greed.';
    }
    if (type === 'altcoin') {
      return 'Shows whether the market is in Bitcoin season (< 25), neutral (25-75), or Altcoin season (> 75) based on altcoin performance vs Bitcoin.';
    }
    return "Bitcoin's market dominance shows BTC's share of the total crypto market cap. Higher values indicate Bitcoin dominance over altcoins.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
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
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Market Sentiment Indices</h1>
            <p className="text-muted-foreground">
              Real-time market sentiment indicators to gauge crypto market emotions and trends
            </p>
          </div>

          {/* Fear & Greed Index */}
          {indices.fearGreed && (
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Fear & Greed Index
                      <span className="text-sm font-normal text-muted-foreground">
                        • Updated Live
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {getDescription('fear-greed')}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={getBadgeVariant(indices.fearGreed.value, 'fear-greed')} 
                    className="text-sm px-4 py-1.5 animate-pulse"
                    style={{ 
                      backgroundColor: `${getColorForValue(indices.fearGreed.value, 'fear-greed')}20`,
                      color: getColorForValue(indices.fearGreed.value, 'fear-greed'),
                      borderColor: getColorForValue(indices.fearGreed.value, 'fear-greed')
                    }}
                  >
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Value Display */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-6xl font-bold" style={{ color: getColorForValue(indices.fearGreed.value, 'fear-greed') }}>
                      {indices.fearGreed.value}
                    </div>
                    <div className="text-xl font-semibold text-muted-foreground">
                      {indices.fearGreed.label}
                    </div>
                  </div>
                  {indices.fearGreed.value > 50 ? (
                    <TrendingUp className="h-16 w-16 text-primary" />
                  ) : (
                    <TrendingDown className="h-16 w-16 text-destructive" />
                  )}
                </div>

                {/* Bar Chart with Segments */}
                <div className="space-y-3">
                  <div className="relative h-16 rounded-lg overflow-hidden">
                    {/* Background segments */}
                    <div className="absolute inset-0 flex">
                      <div className="w-[25%] bg-destructive/20"></div>
                      <div className="w-[20%] bg-orange-500/20"></div>
                      <div className="w-[10%] bg-yellow-500/20"></div>
                      <div className="w-[20%] bg-green-500/20"></div>
                      <div className="w-[25%] bg-primary/20"></div>
                    </div>
                    {/* Progress bar */}
                    <div 
                      className="absolute left-0 top-0 h-full transition-all duration-700 ease-out flex items-center justify-end pr-4 animate-fade-in"
                      style={{ 
                        width: `${indices.fearGreed.value}%`,
                        background: `linear-gradient(90deg, ${getColorForValue(indices.fearGreed.value, 'fear-greed')}dd, ${getColorForValue(indices.fearGreed.value, 'fear-greed')})`
                      }}
                    >
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        {indices.fearGreed.value}
                      </span>
                    </div>
                    {/* Current position indicator */}
                    <div 
                      className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-700"
                      style={{ left: `${indices.fearGreed.value}%` }}
                    ></div>
                  </div>
                  
                  {/* Scale markers */}
                  <div className="flex justify-between text-sm font-medium text-muted-foreground px-1">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  
                  {/* Labels */}
                  <div className="grid grid-cols-5 gap-2 text-xs text-center">
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(12, 'fear-greed') }}></div>
                      <div className="font-medium">Extreme Fear</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(35, 'fear-greed') }}></div>
                      <div className="font-medium">Fear</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(50, 'fear-greed') }}></div>
                      <div className="font-medium">Neutral</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(65, 'fear-greed') }}></div>
                      <div className="font-medium">Greed</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(88, 'fear-greed') }}></div>
                      <div className="font-medium">Extreme Greed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Altcoin Season Index */}
          {indices.altcoinSeason && (
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Altcoin Season Index
                      <span className="text-sm font-normal text-muted-foreground">
                        • Updated Live
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {getDescription('altcoin')}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={getBadgeVariant(indices.altcoinSeason.value, 'altcoin')} 
                    className="text-sm px-4 py-1.5 animate-pulse"
                    style={{ 
                      backgroundColor: `${getColorForValue(indices.altcoinSeason.value, 'altcoin')}20`,
                      color: getColorForValue(indices.altcoinSeason.value, 'altcoin'),
                      borderColor: getColorForValue(indices.altcoinSeason.value, 'altcoin')
                    }}
                  >
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Value Display */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-6xl font-bold" style={{ color: getColorForValue(indices.altcoinSeason.value, 'altcoin') }}>
                      {indices.altcoinSeason.value}
                    </div>
                    <div className="text-xl font-semibold text-muted-foreground">
                      {indices.altcoinSeason.label}
                    </div>
                  </div>
                  {indices.altcoinSeason.value >= 50 ? (
                    <TrendingUp className="h-16 w-16" style={{ color: getColorForValue(indices.altcoinSeason.value, 'altcoin') }} />
                  ) : (
                    <TrendingDown className="h-16 w-16" style={{ color: getColorForValue(indices.altcoinSeason.value, 'altcoin') }} />
                  )}
                </div>

                {/* Bar Chart with Segments */}
                <div className="space-y-3">
                  <div className="relative h-16 rounded-lg overflow-hidden">
                    {/* Background segments */}
                    <div className="absolute inset-0 flex">
                      <div className="w-[25%] bg-green-500/20"></div>
                      <div className="w-[25%] bg-green-400/20"></div>
                      <div className="w-[25%] bg-yellow-500/20"></div>
                      <div className="w-[25%] bg-primary/20"></div>
                    </div>
                    {/* Progress bar */}
                    <div 
                      className="absolute left-0 top-0 h-full transition-all duration-700 ease-out flex items-center justify-end pr-4 animate-fade-in"
                      style={{ 
                        width: `${indices.altcoinSeason.value}%`,
                        background: `linear-gradient(90deg, ${getColorForValue(indices.altcoinSeason.value, 'altcoin')}dd, ${getColorForValue(indices.altcoinSeason.value, 'altcoin')})`
                      }}
                    >
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        {indices.altcoinSeason.value}
                      </span>
                    </div>
                    {/* Current position indicator */}
                    <div 
                      className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-700"
                      style={{ left: `${indices.altcoinSeason.value}%` }}
                    ></div>
                  </div>
                  
                  {/* Scale markers */}
                  <div className="flex justify-between text-sm font-medium text-muted-foreground px-1">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  
                  {/* Labels */}
                  <div className="grid grid-cols-3 gap-4 text-xs text-center">
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(12, 'altcoin') }}></div>
                      <div className="font-medium">Bitcoin Season</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(50, 'altcoin') }}></div>
                      <div className="font-medium">Neutral</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(88, 'altcoin') }}></div>
                      <div className="font-medium">Altcoin Season</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bitcoin Dominance */}
          {indices.btcDominance && (
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      Bitcoin Dominance Index
                      <span className="text-sm font-normal text-muted-foreground">
                        • Updated Live
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {getDescription('dominance')}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={getBadgeVariant(indices.btcDominance.value, 'dominance')} 
                    className="text-sm px-4 py-1.5 animate-pulse"
                    style={{ 
                      backgroundColor: `${getColorForValue(indices.btcDominance.value, 'dominance')}20`,
                      color: getColorForValue(indices.btcDominance.value, 'dominance'),
                      borderColor: getColorForValue(indices.btcDominance.value, 'dominance')
                    }}
                  >
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Value Display */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-6xl font-bold" style={{ color: getColorForValue(indices.btcDominance.value, 'dominance') }}>
                      {indices.btcDominance.value}
                    </div>
                    <div className="text-xl font-semibold text-muted-foreground">
                      {indices.btcDominance.label} Market Share
                    </div>
                  </div>
                  <AlertCircle className="h-16 w-16" style={{ color: getColorForValue(indices.btcDominance.value, 'dominance') }} />
                </div>

                {/* Bar Chart with Segments */}
                <div className="space-y-3">
                  <div className="relative h-16 rounded-lg overflow-hidden">
                    {/* Background segments */}
                    <div className="absolute inset-0 flex">
                      <div className="w-[30%] bg-primary/20"></div>
                      <div className="w-[25%] bg-yellow-500/20"></div>
                      <div className="w-[20%] bg-green-400/20"></div>
                      <div className="w-[25%] bg-green-500/20"></div>
                    </div>
                    {/* Progress bar */}
                    <div 
                      className="absolute left-0 top-0 h-full transition-all duration-700 ease-out flex items-center justify-end pr-4 animate-fade-in"
                      style={{ 
                        width: `${indices.btcDominance.value}%`,
                        background: `linear-gradient(90deg, ${getColorForValue(indices.btcDominance.value, 'dominance')}dd, ${getColorForValue(indices.btcDominance.value, 'dominance')})`
                      }}
                    >
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        {indices.btcDominance.value}%
                      </span>
                    </div>
                    {/* Current position indicator */}
                    <div 
                      className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-700"
                      style={{ left: `${indices.btcDominance.value}%` }}
                    ></div>
                  </div>
                  
                  {/* Scale markers */}
                  <div className="flex justify-between text-sm font-medium text-muted-foreground px-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                  
                  {/* Labels */}
                  <div className="grid grid-cols-3 gap-4 text-xs text-center">
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(30, 'dominance') }}></div>
                      <div className="font-medium">Low Dominance</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(50, 'dominance') }}></div>
                      <div className="font-medium">Moderate</div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 rounded" style={{ background: getColorForValue(70, 'dominance') }}></div>
                      <div className="font-medium">High Dominance</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">About These Indices</p>
                  <p className="text-sm text-muted-foreground">
                    These indices are updated regularly from public APIs. Fear & Greed Index from Alternative.me, 
                    Altcoin Season Index from Blockchaincenter.net, and Bitcoin Dominance from CoinGecko. 
                    Data is cached for 5 minutes for optimal performance.
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
