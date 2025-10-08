import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { marketIndicesService } from '@/services/marketIndicesService';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IndexData {
  fearGreed: { value: number; label: string } | null;
  altcoinSeason: { value: number; label: string } | null;
  btcDominance: { value: number; label: string } | null;
}

export const MarketIndices = () => {
  const [indices, setIndices] = useState<IndexData>({
    fearGreed: null,
    altcoinSeason: null,
    btcDominance: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllIndices();
  }, []);

  const fetchAllIndices = async () => {
    try {
      const [fearGreed, altcoinSeason, btcDominance] = await Promise.all([
        marketIndicesService.getFearGreedIndex(),
        marketIndicesService.getAltcoinSeasonIndex(),
        marketIndicesService.getBitcoinDominance(),
      ]);

      setIndices({
        fearGreed: {
          value: parseInt(fearGreed.value),
          label: fearGreed.value_classification,
        },
        altcoinSeason: {
          value: altcoinSeason.value,
          label: altcoinSeason.classification,
        },
        btcDominance: {
          value: Math.round(btcDominance.value),
          label: `${btcDominance.value.toFixed(2)}%`,
        },
      });
    } catch (error) {
      console.error('Error fetching indices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      if (value <= 25) return 'text-destructive';
      if (value <= 45) return 'text-orange-500';
      if (value <= 55) return 'text-yellow-500';
      if (value <= 75) return 'text-accent';
      return 'text-primary';
    }
    if (type === 'altcoin') {
      if (value >= 75) return 'text-primary';
      if (value >= 50) return 'text-yellow-500';
      return 'text-accent';
    }
    // Bitcoin dominance
    if (value >= 60) return 'text-accent';
    if (value >= 45) return 'text-yellow-500';
    return 'text-primary';
  };

  const getProgressColor = (value: number, type: 'fear-greed' | 'altcoin' | 'dominance') => {
    if (type === 'fear-greed') {
      if (value <= 25) return 'bg-destructive';
      if (value <= 45) return 'bg-orange-500';
      if (value <= 55) return 'bg-yellow-500';
      if (value <= 75) return 'bg-accent';
      return 'bg-primary';
    }
    if (type === 'altcoin') {
      if (value >= 75) return 'bg-primary';
      if (value >= 50) return 'bg-yellow-500';
      return 'bg-accent';
    }
    // Bitcoin dominance
    if (value >= 60) return 'bg-accent';
    if (value >= 45) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const getTrendIcon = (value: number, threshold: number) => {
    if (value > threshold) return <TrendingUp className="h-4 w-4" />;
    if (value < threshold) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Market Sentiment Indices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Market Sentiment Indices
          <Badge variant="outline" className="text-xs">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fear & Greed Index */}
        {indices.fearGreed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Fear & Greed Index</span>
                {getTrendIcon(indices.fearGreed.value, 50)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getColorClass(indices.fearGreed.value, 'fear-greed')}`}>
                  {indices.fearGreed.value}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {indices.fearGreed.label}
                </Badge>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={indices.fearGreed.value} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(indices.fearGreed.value, 'fear-greed')}`}
                style={{ width: `${indices.fearGreed.value}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Extreme Fear</span>
              <span>Neutral</span>
              <span>Extreme Greed</span>
            </div>
          </div>
        )}

        {/* Altcoin Season Index */}
        {indices.altcoinSeason && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Altcoin Season Index</span>
                {getTrendIcon(indices.altcoinSeason.value, 50)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getColorClass(indices.altcoinSeason.value, 'altcoin')}`}>
                  {indices.altcoinSeason.value}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {indices.altcoinSeason.label}
                </Badge>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={indices.altcoinSeason.value} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(indices.altcoinSeason.value, 'altcoin')}`}
                style={{ width: `${indices.altcoinSeason.value}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Bitcoin Season</span>
              <span>Neutral</span>
              <span>Altcoin Season</span>
            </div>
          </div>
        )}

        {/* Bitcoin Dominance */}
        {indices.btcDominance && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Bitcoin Dominance</span>
                {getTrendIcon(indices.btcDominance.value, 50)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getColorClass(indices.btcDominance.value, 'dominance')}`}>
                  {indices.btcDominance.value}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {indices.btcDominance.label}
                </Badge>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={indices.btcDominance.value} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(indices.btcDominance.value, 'dominance')}`}
                style={{ width: `${indices.btcDominance.value}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low Dominance</span>
              <span>Moderate</span>
              <span>High Dominance</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
