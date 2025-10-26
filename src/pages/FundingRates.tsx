import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fundingRateService } from "@/services/fundingRateService";
import { TrendingUp, TrendingDown, Clock, Activity, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  nextFundingTime: number;
}

const FundingRates = () => {
  const [fundingRates, setFundingRates] = useState<FundingRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchFundingRates = async () => {
    try {
      const rates = await fundingRateService.getCurrentFundingRates();
      setFundingRates(rates);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch funding rates. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFundingRates();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchFundingRates, 60000);

    return () => clearInterval(interval);
  }, []);

  const getTimeUntilNextFunding = (nextFundingTime: number) => {
    const now = Date.now();
    const diff = nextFundingTime - now;
    
    if (diff <= 0) return 'Soon';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const calculateDailyRate = (fundingRate: number) => {
    return (fundingRate * 3).toFixed(4); // 3 funding periods per day
  };

  const calculateAnnualizedRate = (fundingRate: number) => {
    return (fundingRate * 3 * 365).toFixed(2); // 3 periods/day * 365 days
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Funding Rates
              </h1>
              <p className="text-muted-foreground">
                Real-time perpetual futures funding rates from Binance
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-2">
              <Activity className="h-3 w-3 animate-pulse text-green-500" />
              Live Data
            </Badge>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Funding rates are paid every 8 hours. <strong>Positive rates</strong> mean longs pay shorts (bullish sentiment). 
              <strong> Negative rates</strong> mean shorts pay longs (bearish sentiment).
            </AlertDescription>
          </Alert>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Highest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">
                    {fundingRates[0] ? fundingRateService.formatFundingRate(fundingRates[0].fundingRate) : 'N/A'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-500">
                    {fundingRates[fundingRates.length - 1] ? fundingRateService.formatFundingRate(fundingRates[fundingRates.length - 1].fundingRate) : 'N/A'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Funding</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {fundingRates[0] ? getTimeUntilNextFunding(fundingRates[0].nextFundingTime) : 'N/A'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Markets Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                <span className="text-2xl font-bold">{fundingRates.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Funding Rates Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Perpetual Futures Funding Rates</CardTitle>
                <CardDescription>
                  Updated: {lastUpdate.toLocaleTimeString()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Symbol</th>
                      <th className="text-right py-3 px-4 font-semibold">Mark Price</th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center justify-end gap-1">
                              Funding Rate
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Current 8-hour funding rate</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center justify-end gap-1">
                              Daily Rate
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Funding rate × 3 (per 24h)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center justify-end gap-1">
                              Annual (APR)
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Annualized funding rate (365 days)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                      <th className="text-right py-3 px-4 font-semibold">Next Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundingRates.map((rate) => (
                      <tr 
                        key={rate.symbol} 
                        className={`border-b border-border/50 hover:bg-accent/5 transition-colors ${fundingRateService.getFundingRateBgColor(rate.fundingRate)}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{rate.symbol.replace('USDT', '')}</span>
                            <Badge variant="outline" className="text-xs">PERP</Badge>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-mono">
                          ${rate.markPrice.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className={`text-right py-4 px-4 font-mono font-bold ${fundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {fundingRateService.formatFundingRate(rate.fundingRate)}
                        </td>
                        <td className={`text-right py-4 px-4 font-mono ${fundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {rate.fundingRate >= 0 ? '+' : ''}{calculateDailyRate(rate.fundingRate)}%
                        </td>
                        <td className={`text-right py-4 px-4 font-mono ${fundingRateService.getFundingRateColor(rate.fundingRate)}`}>
                          {rate.fundingRate >= 0 ? '+' : ''}{calculateAnnualizedRate(rate.fundingRate)}%
                        </td>
                        <td className="text-right py-4 px-4 text-sm text-muted-foreground">
                          {getTimeUntilNextFunding(rate.nextFundingTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Positive Funding Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Long positions pay short positions</p>
              <p>• Indicates bullish market sentiment</p>
              <p>• More traders are longing the market</p>
              <p>• Higher rates = stronger bullish bias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Negative Funding Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Short positions pay long positions</p>
              <p>• Indicates bearish market sentiment</p>
              <p>• More traders are shorting the market</p>
              <p>• Lower rates = stronger bearish bias</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FundingRates;
