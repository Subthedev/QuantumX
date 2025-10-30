/**
 * Exchange Comparison Component
 * Compare order books and funding rates across multiple exchanges
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exchangeManager } from '@/services/exchanges/ExchangeManager';
import { ExchangeComparison as ExchangeComparisonType } from '@/services/exchanges/types';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface ExchangeComparisonProps {
  symbol: string;
  type?: 'orderbook' | 'funding' | 'both';
}

export const ExchangeComparison = ({
  symbol,
  type = 'both'
}: ExchangeComparisonProps) => {
  const [orderBookComparison, setOrderBookComparison] = useState<ExchangeComparisonType | null>(null);
  const [fundingComparison, setFundingComparison] = useState<ExchangeComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = [];

      if (type === 'orderbook' || type === 'both') {
        promises.push(
          exchangeManager.compareOrderBooks(symbol)
            .then(data => setOrderBookComparison(data))
            .catch(err => console.error('Order book comparison failed:', err))
        );
      }

      if (type === 'funding' || type === 'both') {
        promises.push(
          exchangeManager.compareFundingRates(symbol)
            .then(data => setFundingComparison(data))
            .catch(err => console.error('Funding comparison failed:', err))
        );
      }

      await Promise.all(promises);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, [symbol, type]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Comparison</CardTitle>
          <CardDescription>Loading comparison data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Exchange Comparison - {symbol}
            </CardTitle>
            <CardDescription>Real-time comparison across multiple exchanges</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComparisons}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {type === 'both' ? (
          <Tabs defaultValue="orderbook" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orderbook">Order Book</TabsTrigger>
              <TabsTrigger value="funding">Funding Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="orderbook" className="space-y-3 mt-4">
              {orderBookComparison && (
                <>
                  {orderBookComparison.exchanges.map((ex, idx) => (
                    <Card key={idx} className={ex.available ? 'border-green-500/20' : 'border-red-500/20'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              {ex.exchangeName}
                              {ex.available ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </h3>
                            {!ex.available && (
                              <p className="text-xs text-red-500 mt-1">{ex.error}</p>
                            )}
                          </div>
                          {ex.available && ex.orderBook && (
                            <Badge variant="outline" className="text-xs">
                              {ex.orderBook.status}
                            </Badge>
                          )}
                        </div>

                        {ex.available && ex.orderBook && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <div className="text-xs text-muted-foreground">Mid Price</div>
                              <div className="text-sm font-bold">{formatPrice(ex.orderBook.metrics.midPrice)}</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                              <div className="text-xs text-muted-foreground">Spread</div>
                              <div className="text-sm font-bold text-yellow-600">
                                {ex.orderBook.metrics.spreadPercent.toFixed(3)}%
                              </div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-green-500/10">
                              <div className="text-xs text-muted-foreground">Bid Vol</div>
                              <div className="text-sm font-bold text-green-600">
                                {formatVolume(ex.orderBook.metrics.totalBidVolume)}
                              </div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-red-500/10">
                              <div className="text-xs text-muted-foreground">Ask Vol</div>
                              <div className="text-sm font-bold text-red-600">
                                {formatVolume(ex.orderBook.metrics.totalAskVolume)}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="funding" className="space-y-3 mt-4">
              {fundingComparison && (
                <>
                  {fundingComparison.exchanges.map((ex, idx) => (
                    <Card key={idx} className={ex.available ? 'border-green-500/20' : 'border-red-500/20'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              {ex.exchangeName}
                              {ex.available ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </h3>
                            {!ex.available && (
                              <p className="text-xs text-red-500 mt-1">{ex.error}</p>
                            )}
                          </div>
                          {ex.available && ex.fundingRate && (
                            <div className="flex items-center gap-2">
                              {ex.fundingRate.trend === 'increasing' && <TrendingUp className="h-4 w-4 text-green-500" />}
                              {ex.fundingRate.trend === 'decreasing' && <TrendingDown className="h-4 w-4 text-red-500" />}
                              <Badge variant="outline" className="text-xs">
                                {ex.fundingRate.trend}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {ex.available && ex.fundingRate && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="text-center p-2 rounded-lg bg-primary/10">
                              <div className="text-xs text-muted-foreground">Current Rate</div>
                              <div className={`text-sm font-bold ${ex.fundingRate.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {ex.fundingRate.fundingRate >= 0 ? '+' : ''}{ex.fundingRate.fundingRate.toFixed(4)}%
                              </div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <div className="text-xs text-muted-foreground">24h Avg</div>
                              <div className="text-sm font-bold">{ex.fundingRate.avg24h.toFixed(4)}%</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <div className="text-xs text-muted-foreground">7d Avg</div>
                              <div className="text-sm font-bold">{ex.fundingRate.avg7d.toFixed(4)}%</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-muted/50">
                              <div className="text-xs text-muted-foreground">Mark Price</div>
                              <div className="text-sm font-bold">{formatPrice(ex.fundingRate.markPrice)}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Single type view (no tabs)
          <div className="space-y-3">
            {/* Render based on type */}
            {type === 'orderbook' && orderBookComparison && (
              <>
                {orderBookComparison.exchanges.map((ex, idx) => (
                  <Card key={idx} className={ex.available ? 'border-green-500/20' : 'border-red-500/20'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {ex.exchangeName}
                            {ex.available ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </h3>
                          {!ex.available && (
                            <p className="text-xs text-red-500 mt-1">{ex.error}</p>
                          )}
                        </div>
                        {ex.available && ex.orderBook && (
                          <Badge variant="outline" className="text-xs">
                            {ex.orderBook.status}
                          </Badge>
                        )}
                      </div>

                      {ex.available && ex.orderBook && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <div className="text-xs text-muted-foreground">Mid Price</div>
                            <div className="text-sm font-bold">{formatPrice(ex.orderBook.metrics.midPrice)}</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                            <div className="text-xs text-muted-foreground">Spread</div>
                            <div className="text-sm font-bold text-yellow-600">
                              {ex.orderBook.metrics.spreadPercent.toFixed(3)}%
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-green-500/10">
                            <div className="text-xs text-muted-foreground">Bid Vol</div>
                            <div className="text-sm font-bold text-green-600">
                              {formatVolume(ex.orderBook.metrics.totalBidVolume)}
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-red-500/10">
                            <div className="text-xs text-muted-foreground">Ask Vol</div>
                            <div className="text-sm font-bold text-red-600">
                              {formatVolume(ex.orderBook.metrics.totalAskVolume)}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            {type === 'funding' && fundingComparison && (
              <>
                {fundingComparison.exchanges.map((ex, idx) => (
                  <Card key={idx} className={ex.available ? 'border-green-500/20' : 'border-red-500/20'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {ex.exchangeName}
                            {ex.available ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </h3>
                          {!ex.available && (
                            <p className="text-xs text-red-500 mt-1">{ex.error}</p>
                          )}
                        </div>
                        {ex.available && ex.fundingRate && (
                          <div className="flex items-center gap-2">
                            {ex.fundingRate.trend === 'increasing' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {ex.fundingRate.trend === 'decreasing' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <Badge variant="outline" className="text-xs">
                              {ex.fundingRate.trend}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {ex.available && ex.fundingRate && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded-lg bg-primary/10">
                            <div className="text-xs text-muted-foreground">Current Rate</div>
                            <div className={`text-sm font-bold ${ex.fundingRate.fundingRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {ex.fundingRate.fundingRate >= 0 ? '+' : ''}{ex.fundingRate.fundingRate.toFixed(4)}%
                            </div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <div className="text-xs text-muted-foreground">24h Avg</div>
                            <div className="text-sm font-bold">{ex.fundingRate.avg24h.toFixed(4)}%</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <div className="text-xs text-muted-foreground">7d Avg</div>
                            <div className="text-sm font-bold">{ex.fundingRate.avg7d.toFixed(4)}%</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <div className="text-xs text-muted-foreground">Mark Price</div>
                            <div className="text-sm font-bold">{formatPrice(ex.fundingRate.markPrice)}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
