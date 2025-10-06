import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Activity, Info } from 'lucide-react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, Bar, ReferenceLine, CartesianGrid } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface PriceChartProps {
  coinId: string;
  symbol: string;
  currentPrice?: number;
  sparklineData?: number[];
  height?: number;
}

type Timeframe = '1H' | '4H' | '1D' | '7D';

const PriceChart: React.FC<PriceChartProps> = ({
  coinId,
  symbol,
  currentPrice: initialPrice,
  sparklineData,
  height = 450,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState({
    current: initialPrice || 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    volume: 0,
  });
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    loadChartData();
    
    return () => {
      isMountedRef.current = false;
      // Abort any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [coinId, timeframe]);

  const loadChartData = async () => {
    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);

    // ALWAYS use sparkline data first if available - it's instant and reliable
    if (sparklineData && sparklineData.length > 0) {
      try {
        const now = Date.now();
        const totalDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const interval = totalDuration / sparklineData.length;
        
        // Filter data based on timeframe
        let filteredData = sparklineData;
        let startIndex = 0;
        
        switch (timeframe) {
          case '1H':
            // Last hour from 7 days of data
            startIndex = Math.floor(sparklineData.length - (sparklineData.length / (7 * 24)));
            filteredData = sparklineData.slice(Math.max(0, startIndex));
            break;
          case '4H':
            // Last 4 hours
            startIndex = Math.floor(sparklineData.length - (sparklineData.length / (7 * 24)) * 4);
            filteredData = sparklineData.slice(Math.max(0, startIndex));
            break;
          case '1D':
            // Last 24 hours
            startIndex = Math.floor(sparklineData.length - (sparklineData.length / 7));
            filteredData = sparklineData.slice(Math.max(0, startIndex));
            break;
          case '7D':
            // All data
            filteredData = sparklineData;
            break;
        }
        
        const data = filteredData.map((price, index) => {
          const timestamp = now - (filteredData.length - index) * interval;
          // Add synthetic volume data (actual volume would come from API)
          const baseVolume = price * 1000000; // Synthetic volume
          const volumeVariation = Math.random() * 0.5 + 0.75; // 75-125% variation
          
          return {
            time: new Date(timestamp).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: (timeframe === '1H' || timeframe === '4H') && index % 4 === 0 ? '2-digit' : undefined,
            }),
            price: price,
            volume: baseVolume * volumeVariation,
            timestamp,
          };
        });

        if (!isMountedRef.current) return;

        // Calculate moving averages and technical indicators
        const enrichedData = calculateTechnicalIndicators(data);
        setChartData(enrichedData);
        
        if (enrichedData.length > 0 && isMountedRef.current) {
          const prices = enrichedData.map(d => d.price);
          const firstPrice = enrichedData[0].price;
          const lastPrice = enrichedData[enrichedData.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const totalVolume = enrichedData.reduce((sum, d) => sum + (d.volume || 0), 0);
          
          setPriceInfo({
            current: lastPrice,
            change,
            changePercent,
            high,
            low,
            volume: totalVolume,
          });
        }
        
        if (isMountedRef.current) {
          setLoading(false);
          setError(null);
        }
        return;
      } catch (err) {
        console.error('Sparkline data error:', err);
        // Continue to API fetch if sparkline fails
      }
    }

    // Fetch from API
    try {
      const timeframeConfig: Record<Timeframe, { days: number; interval: string; filterHours?: number }> = {
        '1H': { days: 1, interval: 'hourly', filterHours: 1 },
        '4H': { days: 1, interval: 'hourly', filterHours: 4 },
        '1D': { days: 1, interval: 'hourly' },
        '7D': { days: 7, interval: 'hourly' },
      };

      const config = timeframeConfig[timeframe];
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}&interval=${config.interval}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const apiData = await response.json();
      
      // Check if still mounted before processing
      if (!isMountedRef.current) return;

      if (apiData.prices && apiData.prices.length > 0) {
        let prices = apiData.prices;

        // Filter by time window if needed
        if (config.filterHours) {
          const cutoffTime = Date.now() - (config.filterHours * 60 * 60 * 1000);
          prices = prices.filter(([timestamp]: [number, number]) => timestamp >= cutoffTime);
        }

        if (prices.length === 0) {
          throw new Error('No data available for selected timeframe');
        }

        const formattedData = prices.map(([timestamp, price]: [number, number]) => ({
          time: new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: timeframe === '1H' || timeframe === '4H' ? '2-digit' : undefined,
            minute: timeframe === '1H' ? '2-digit' : undefined,
          }),
          price: price,
          volume: price * 1000000 * (Math.random() * 0.5 + 0.75), // Synthetic volume
          timestamp,
        }));

        if (!isMountedRef.current) return;

        const enrichedData = calculateTechnicalIndicators(formattedData);
        setChartData(enrichedData);

        if (enrichedData.length > 0 && isMountedRef.current) {
          const priceList = enrichedData.map(d => d.price);
          const firstPrice = enrichedData[0].price;
          const lastPrice = enrichedData[enrichedData.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercent = (change / firstPrice) * 100;
          const high = Math.max(...priceList);
          const low = Math.min(...priceList);
          const totalVolume = enrichedData.reduce((sum, d) => sum + (d.volume || 0), 0);

          setPriceInfo({
            current: lastPrice,
            change,
            changePercent,
            high,
            low,
            volume: totalVolume,
          });
        }

        if (isMountedRef.current) {
          setError(null);
        }
      } else {
        throw new Error('No data available');
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      if (!isMountedRef.current) return;
      
      console.error('Chart data error:', err);
      
      // Try sparkline as fallback for any timeframe
      if (sparklineData && sparklineData.length > 0 && isMountedRef.current) {
        try {
          const now = Date.now();
          const interval = (7 * 24 * 60 * 60 * 1000) / sparklineData.length;
          
          const data = sparklineData.map((price, index) => ({
            time: new Date(now - (sparklineData.length - index) * interval).toLocaleDateString(),
            price: price,
          }));
          
          setChartData(data);
          setError(null);
          return;
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr);
        }
      }
      
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Calculate moving averages and support/resistance
  const calculateTechnicalIndicators = (data: any[]) => {
    if (data.length === 0) return data;
    
    const enriched = data.map((item, index) => {
      // Calculate 7-period and 25-period moving averages
      const ma7Start = Math.max(0, index - 6);
      const ma25Start = Math.max(0, index - 24);
      
      const ma7Data = data.slice(ma7Start, index + 1);
      const ma25Data = data.slice(ma25Start, index + 1);
      
      const ma7 = ma7Data.length > 0 
        ? ma7Data.reduce((sum, d) => sum + d.price, 0) / ma7Data.length 
        : item.price;
      
      const ma25 = ma25Data.length > 0 
        ? ma25Data.reduce((sum, d) => sum + d.price, 0) / ma25Data.length 
        : item.price;
      
      return {
        ...item,
        ma7,
        ma25,
      };
    });
    
    return enriched;
  };

  // Calculate support and resistance levels
  const supportResistance = useMemo(() => {
    if (chartData.length === 0) return { support: 0, resistance: 0 };
    
    const prices = chartData.map(d => d.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    
    // Find local support (price floor) and resistance (price ceiling)
    const support = sortedPrices[Math.floor(sortedPrices.length * 0.15)]; // 15th percentile
    const resistance = sortedPrices[Math.floor(sortedPrices.length * 0.85)]; // 85th percentile
    
    return { support, resistance };
  }, [chartData]);

  // Determine trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';
    const recentData = chartData.slice(-10);
    const firstPrice = recentData[0].price;
    const lastPrice = recentData[recentData.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 2) return 'bullish';
    if (change < -2) return 'bearish';
    return 'neutral';
  }, [chartData]);

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
    return `$${vol.toFixed(2)}`;
  };

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(6)}`;
    if (price < 10) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const isPositive = priceInfo.changePercent >= 0;
  const timeframes: Timeframe[] = ['1H', '4H', '1D', '7D'];

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">
                {symbol.toUpperCase()}/USD
              </h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              <Badge 
                variant={trend === 'bullish' ? 'default' : trend === 'bearish' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {trend === 'bullish' ? '🐂 Bullish' : trend === 'bearish' ? '🐻 Bearish' : '➡️ Neutral'}
              </Badge>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(priceInfo.current)}
              </span>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {isPositive ? '+' : ''}
                  {priceInfo.changePercent.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({isPositive ? '+' : ''}
                  {formatPrice(Math.abs(priceInfo.change))})
                </span>
              </div>
            </div>
            
            {/* Key Metrics */}
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <div>
                <span className="opacity-70">H:</span>{' '}
                <span className="text-foreground font-medium">{formatPrice(priceInfo.high)}</span>
              </div>
              <div>
                <span className="opacity-70">L:</span>{' '}
                <span className="text-foreground font-medium">{formatPrice(priceInfo.low)}</span>
              </div>
              <div>
                <span className="opacity-70">Vol:</span>{' '}
                <span className="text-foreground font-medium">{formatVolume(priceInfo.volume)}</span>
              </div>
              {supportResistance.support > 0 && (
                <>
                  <div>
                    <span className="opacity-70">Support:</span>{' '}
                    <span className="text-green-500 font-medium">{formatPrice(supportResistance.support)}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Resistance:</span>{' '}
                    <span className="text-red-500 font-medium">{formatPrice(supportResistance.resistance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? 'default' : 'ghost'}
                  onClick={() => setTimeframe(tf)}
                  className="h-7 px-2.5 text-xs font-medium"
                  disabled={loading}
                >
                  {tf}
                </Button>
              ))}
            </div>
            <div className="flex gap-1 justify-end">
              <Button
                size="sm"
                variant={showMA ? 'default' : 'ghost'}
                onClick={() => setShowMA(!showMA)}
                className="h-6 px-2 text-xs"
              >
                MA
              </Button>
              <Button
                size="sm"
                variant={showVolume ? 'default' : 'ghost'}
                onClick={() => setShowVolume(!showVolume)}
                className="h-6 px-2 text-xs"
              >
                Vol
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {error ? (
        <div
          className="w-full flex items-center justify-center bg-background/50 rounded-lg border border-dashed border-border/50"
          style={{ height: `${height}px` }}
        >
          <div className="text-center p-6">
            <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Chart Temporarily Unavailable</p>
            <p className="text-xs text-muted-foreground">
              {error.includes('429') ? 'Rate limit reached. Try again in a moment.' : error}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`color-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255, 255, 255, 0.05)" 
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="rgba(255, 255, 255, 0.3)"
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              />
              <YAxis
                yAxisId="price"
                stroke="rgba(255, 255, 255, 0.3)"
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => formatPrice(value)}
              />
              {showVolume && (
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  stroke="rgba(255, 255, 255, 0.2)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}
                  tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tickFormatter={(value) => formatVolume(value)}
                />
              )}
              
              {/* Support and Resistance Lines */}
              {supportResistance.support > 0 && (
                <>
                  <ReferenceLine 
                    yAxisId="price"
                    y={supportResistance.support} 
                    stroke="rgb(22, 219, 101)" 
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{ 
                      value: `Support: ${formatPrice(supportResistance.support)}`, 
                      fill: 'rgb(22, 219, 101)',
                      fontSize: 10,
                      position: 'left'
                    }}
                  />
                  <ReferenceLine 
                    yAxisId="price"
                    y={supportResistance.resistance} 
                    stroke="rgb(255, 95, 109)" 
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{ 
                      value: `Resistance: ${formatPrice(supportResistance.resistance)}`, 
                      fill: 'rgb(255, 95, 109)',
                      fontSize: 10,
                      position: 'left'
                    }}
                  />
                </>
              )}
              
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', marginBottom: '4px' }}
                formatter={(value: any, name: string) => {
                  if (name === 'price') return [formatPrice(value), 'Price'];
                  if (name === 'ma7') return [formatPrice(value), 'MA(7)'];
                  if (name === 'ma25') return [formatPrice(value), 'MA(25)'];
                  if (name === 'volume') return [formatVolume(value), 'Volume'];
                  return [value, name];
                }}
              />
              
              {/* Volume Bars */}
              {showVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="rgba(255, 255, 255, 0.15)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              )}
              
              {/* Moving Averages */}
              {showMA && (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma7"
                    stroke="rgb(255, 193, 7)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeOpacity={0.8}
                    animationDuration={300}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma25"
                    stroke="rgb(156, 39, 176)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeOpacity={0.8}
                    animationDuration={300}
                  />
                </>
              )}
              
              {/* Price Area */}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke={isPositive ? 'rgb(22, 219, 101)' : 'rgb(255, 95, 109)'}
                strokeWidth={2.5}
                fill={`url(#color-${isPositive ? 'up' : 'down'})`}
                animationDuration={300}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default PriceChart;
