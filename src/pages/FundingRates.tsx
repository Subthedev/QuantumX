import { useState, useEffect, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { enhancedFundingRateService } from "@/services/enhancedFundingRateService";
import { TrendingUp, TrendingDown, Search, Timer, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FundingRateData {
  symbol: string;
  coinName: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  nextFundingTime: number;
  predictedFundingRate: number;
  avg24h: number;
  avg7d: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  marketCap?: number;
  marketCapRank?: number;
}

const FundingRates = () => {
  const [fundingRates, setFundingRates] = useState<FundingRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchFundingRates = async () => {
    try {
      const rates = await enhancedFundingRateService.getAllFundingRates();
      setFundingRates(rates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundingRates();

    // Auto-refresh every hour
    const hourlyInterval = setInterval(fetchFundingRates, 60 * 60 * 1000);

    // Update current time every second for countdown timers
    const secondInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(hourlyInterval);
      clearInterval(secondInterval);
    };
  }, []);

  // Filter funding rates based on search
  const filteredRates = useMemo(() => {
    if (!searchQuery.trim()) return fundingRates;
    
    const query = searchQuery.toLowerCase();
    return fundingRates.filter(rate => 
      rate.coinName.toLowerCase().includes(query) ||
      rate.symbol.toLowerCase().includes(query)
    );
  }, [fundingRates, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (fundingRates.length === 0) {
      return {
        avgRate: 0,
        positiveCount: 0,
        negativeCount: 0,
        extremePositive: 0,
        extremeNegative: 0
      };
    }

    const positive = fundingRates.filter(r => r.fundingRate > 0);
    const negative = fundingRates.filter(r => r.fundingRate < 0);
    const totalRate = fundingRates.reduce((sum, r) => sum + r.fundingRate, 0);

    return {
      avgRate: totalRate / fundingRates.length,
      positiveCount: positive.length,
      negativeCount: negative.length,
      extremePositive: positive.filter(r => r.fundingRate > 0.05).length,
      extremeNegative: negative.filter(r => r.fundingRate < -0.05).length
    };
  }, [fundingRates]);

  const CountdownTimer = ({ nextFundingTime }: { nextFundingTime: number }) => {
    const timeData = enhancedFundingRateService.getTimeUntilFunding(nextFundingTime);
    
    if (timeData.total <= 0) {
      return <span className="text-xs text-muted-foreground">Updating...</span>;
    }

    return (
      <div className="flex items-center gap-1">
        <Timer className="h-3 w-3 text-primary" />
        <span className="text-xs font-mono tabular-nums">
          {String(timeData.hours).padStart(2, '0')}:
          {String(timeData.minutes).padStart(2, '0')}:
          {String(timeData.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  };

  const getRateColor = (rate: number) => {
    if (rate > 0.05) return 'text-green-500';
    if (rate > 0) return 'text-green-400';
    if (rate === 0) return 'text-muted-foreground';
    if (rate > -0.05) return 'text-red-400';
    return 'text-red-500';
  };

  const getRateBg = (rate: number) => {
    if (rate > 0.05) return 'bg-green-500/5';
    if (rate > 0) return 'bg-green-400/5';
    if (rate === 0) return '';
    if (rate > -0.05) return 'bg-red-400/5';
    return 'bg-red-500/5';
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-6 pt-16 sm:pt-20 max-w-[1400px]">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                Funding Rates
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time perpetual futures funding rates • {fundingRates.length}+ markets
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1.5 w-fit px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium">Live</span>
            </Badge>
          </div>

          {/* Info Alert */}
          <Card className="border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80">
                <strong className="text-foreground">Positive rates:</strong> Longs pay shorts (bullish sentiment). 
                <strong className="ml-2 text-foreground">Negative rates:</strong> Shorts pay longs (bearish sentiment).
              </p>
            </div>
          </Card>
        </div>

        {/* Market Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Rate</div>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className={`text-xl font-bold tabular-nums ${getRateColor(stats.avgRate)}`}>
                {stats.avgRate >= 0 ? '+' : ''}{stats.avgRate.toFixed(4)}%
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Long Bias</div>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-green-500">{stats.positiveCount}</div>
                <div className="text-xs text-muted-foreground">markets</div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Short Bias</div>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-red-500">{stats.negativeCount}</div>
                <div className="text-xs text-muted-foreground">markets</div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Extreme Rates</div>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="flex items-baseline gap-1">
                <div className="text-xl font-bold text-green-500">{stats.extremePositive}</div>
                <div className="text-muted-foreground">/</div>
                <div className="text-xl font-bold text-red-500">{stats.extremeNegative}</div>
              </div>
            )}
          </Card>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by coin name or symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Funding Rates Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(15)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop View */}
              <table className="w-full hidden md:table">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Symbol</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      Mark Price
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-end gap-1 ml-auto">
                            Funding Rate
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>Current 8-hour funding rate</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center justify-end gap-1 ml-auto">
                            Predicted
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>AI-predicted next funding rate</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Daily APR</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">
                      Next Funding
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredRates.map((rate, index) => (
                    <tr 
                      key={rate.symbol}
                      className={`hover:bg-accent/5 transition-colors ${getRateBg(rate.fundingRate)}`}
                    >
                      <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{rate.coinName}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">PERP</Badge>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-sm tabular-nums">
                        ${rate.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right py-3 px-4 font-mono font-bold text-sm tabular-nums ${getRateColor(rate.fundingRate)}`}>
                        {rate.fundingRate >= 0 ? '+' : ''}{rate.fundingRate.toFixed(4)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-mono text-sm tabular-nums ${getRateColor(rate.predictedFundingRate)}`}>
                        {rate.predictedFundingRate >= 0 ? '+' : ''}{rate.predictedFundingRate.toFixed(4)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-mono text-sm tabular-nums ${getRateColor(rate.fundingRate)}`}>
                        {(rate.fundingRate * 3).toFixed(4)}%
                      </td>
                      <td className="text-right py-3 px-4">
                        <CountdownTimer nextFundingTime={rate.nextFundingTime} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile/Tablet View */}
              <div className="md:hidden divide-y divide-border">
                {filteredRates.map((rate, index) => (
                  <div 
                    key={rate.symbol}
                    className={`p-4 ${getRateBg(rate.fundingRate)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">#{index + 1}</span>
                        <span className="font-bold">{rate.coinName}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">PERP</Badge>
                      </div>
                      {rate.trend !== 'stable' && (
                        rate.trend === 'increasing' ? 
                          <TrendingUp className="h-4 w-4 text-green-500" /> : 
                          <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Mark Price</div>
                        <div className="font-mono font-semibold tabular-nums">
                          ${rate.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Funding Rate</div>
                        <div className={`font-mono font-bold tabular-nums ${getRateColor(rate.fundingRate)}`}>
                          {rate.fundingRate >= 0 ? '+' : ''}{rate.fundingRate.toFixed(4)}%
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Predicted</div>
                        <div className={`font-mono font-semibold tabular-nums ${getRateColor(rate.predictedFundingRate)}`}>
                          {rate.predictedFundingRate >= 0 ? '+' : ''}{rate.predictedFundingRate.toFixed(4)}%
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Daily APR</div>
                        <div className={`font-mono font-semibold tabular-nums ${getRateColor(rate.fundingRate)}`}>
                          {(rate.fundingRate * 3).toFixed(4)}%
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Next Funding:</span>
                        <CountdownTimer nextFundingTime={rate.nextFundingTime} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRates.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Powered by IgniteX Analytics • Updates every hour • Market cap sorted</p>
        </div>
      </div>
    </div>
  );
};

export default FundingRates;
