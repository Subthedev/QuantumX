import { useState, useEffect, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { enhancedFundingRateService } from "@/services/enhancedFundingRateService";
import { TrendingUp, TrendingDown, Search, Activity, Timer, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        highest: null,
        lowest: null,
        avgPositive: 0,
        avgNegative: 0,
        positiveCount: 0,
        negativeCount: 0
      };
    }

    const positive = fundingRates.filter(r => r.fundingRate > 0);
    const negative = fundingRates.filter(r => r.fundingRate < 0);

    return {
      highest: fundingRates[0],
      lowest: fundingRates[fundingRates.length - 1],
      avgPositive: positive.length > 0 
        ? positive.reduce((sum, r) => sum + r.fundingRate, 0) / positive.length 
        : 0,
      avgNegative: negative.length > 0
        ? negative.reduce((sum, r) => sum + r.fundingRate, 0) / negative.length
        : 0,
      positiveCount: positive.length,
      negativeCount: negative.length
    };
  }, [fundingRates]);

  const CountdownTimer = ({ nextFundingTime }: { nextFundingTime: number }) => {
    const timeData = enhancedFundingRateService.getTimeUntilFunding(nextFundingTime);
    
    if (timeData.total <= 0) {
      return <span className="text-xs text-muted-foreground">Updating...</span>;
    }

    return (
      <div className="flex items-center gap-1 text-xs font-mono">
        <Timer className="h-3 w-3 text-primary" />
        <span className="font-semibold">
          {String(timeData.hours).padStart(2, '0')}:
          {String(timeData.minutes).padStart(2, '0')}:
          {String(timeData.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  };

  const TrendBadge = ({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) => {
    const config = {
      increasing: { icon: TrendingUp, color: 'text-green-500', label: 'Rising' },
      decreasing: { icon: TrendingDown, color: 'text-red-500', label: 'Falling' },
      stable: { icon: Activity, color: 'text-gray-500', label: 'Stable' }
    };

    const { icon: Icon, color, label } = config[trend];

    return (
      <Badge variant="outline" className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-xs">{label}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-3 sm:px-4 py-6 pt-20 sm:pt-24 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Funding Rates
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time perpetual futures funding rates across 100+ markets
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-2 w-fit">
              <Activity className="h-3 w-3 animate-pulse text-green-500" />
              <span className="text-xs">Live Updates</span>
            </Badge>
          </div>

          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              <strong>Positive rates:</strong> Longs pay shorts (bullish sentiment). 
              <strong className="ml-2">Negative rates:</strong> Shorts pay longs (bearish sentiment).
            </AlertDescription>
          </Alert>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Highest Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : stats.highest ? (
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-500">
                    {enhancedFundingRateService.formatFundingRate(stats.highest.fundingRate)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stats.highest.coinName}</div>
                </div>
              ) : (
                <span className="text-sm">N/A</span>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Lowest Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : stats.lowest ? (
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-500">
                    {enhancedFundingRateService.formatFundingRate(stats.lowest.fundingRate)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stats.lowest.coinName}</div>
                </div>
              ) : (
                <span className="text-sm">N/A</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Bullish Markets</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-500">
                    {stats.positiveCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {stats.avgPositive.toFixed(4)}%
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Bearish Markets</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-500">
                    {stats.negativeCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {stats.avgNegative.toFixed(4)}%
                  </div>
                </div>
              )}
            </CardContent>
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
              className="pl-10"
            />
          </div>
        </div>

        {/* Funding Rates Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop/Tablet View */}
                <table className="w-full hidden sm:table">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold">Asset</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">Mark Price</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center justify-end gap-1 ml-auto">
                              Current Rate
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>8-hour funding rate</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center justify-end gap-1 ml-auto">
                              <Zap className="h-3 w-3" />
                              Predicted
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>Next funding rate prediction</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">Daily APR</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">Annual APR</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold">Trend</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold">Next Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRates.map((rate) => (
                      <tr 
                        key={rate.symbol}
                        className={`border-b border-border/50 hover:bg-accent/5 transition-colors ${enhancedFundingRateService.getFundingRateBg(rate.fundingRate)}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{rate.coinName}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">PERP</Badge>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-mono text-sm">
                          ${rate.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right py-3 px-4 font-mono font-bold text-sm ${enhancedFundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {enhancedFundingRateService.formatFundingRate(rate.fundingRate)}
                        </td>
                        <td className={`text-right py-3 px-4 font-mono text-sm ${enhancedFundingRateService.getFundingRateColor(rate.predictedFundingRate)}`}>
                          {enhancedFundingRateService.formatFundingRate(rate.predictedFundingRate)}
                        </td>
                        <td className={`text-right py-3 px-4 font-mono text-sm ${enhancedFundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {enhancedFundingRateService.calculateDailyRate(rate.fundingRate).toFixed(4)}%
                        </td>
                        <td className={`text-right py-3 px-4 font-mono text-sm ${enhancedFundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {enhancedFundingRateService.calculateAPR(rate.fundingRate).toFixed(2)}%
                        </td>
                        <td className="text-center py-3 px-4">
                          <TrendBadge trend={rate.trend} />
                        </td>
                        <td className="text-right py-3 px-4">
                          <CountdownTimer nextFundingTime={rate.nextFundingTime} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="sm:hidden divide-y divide-border">
                  {filteredRates.map((rate) => (
                    <div 
                      key={rate.symbol}
                      className={`p-4 ${enhancedFundingRateService.getFundingRateBg(rate.fundingRate)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{rate.coinName}</span>
                          <Badge variant="outline" className="text-xs">PERP</Badge>
                        </div>
                        <TrendBadge trend={rate.trend} />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Mark Price</div>
                          <div className="font-mono font-semibold">
                            ${rate.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Current Rate</div>
                          <div className={`font-mono font-bold ${enhancedFundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                            {enhancedFundingRateService.formatFundingRate(rate.fundingRate)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Predicted
                          </div>
                          <div className={`font-mono font-semibold ${enhancedFundingRateService.getFundingRateColor(rate.predictedFundingRate)}`}>
                            {enhancedFundingRateService.formatFundingRate(rate.predictedFundingRate)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Annual APR</div>
                          <div className={`font-mono font-semibold ${enhancedFundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                            {enhancedFundingRateService.calculateAPR(rate.fundingRate).toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Next Funding:</span>
                          <CountdownTimer nextFundingTime={rate.nextFundingTime} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredRates.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Powered by IgniteX Analytics Platform • Data updates every hour • {fundingRates.length}+ markets tracked</p>
        </div>
      </div>
    </div>
  );
};

export default FundingRates;
