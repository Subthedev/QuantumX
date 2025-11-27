import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Activity, BarChart3, Info } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface EnhancedTradingChartProps {
  coinId: string;
  symbol: string;
  currentPrice?: number;
}

interface ChartData {
  time: string;
  price: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
}

export function EnhancedTradingChart({ coinId, symbol, currentPrice }: EnhancedTradingChartProps) {
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  const timeframeConfig = {
    '1H': { days: 1, interval: 'hourly', points: 24 },
    '4H': { days: 7, interval: 'hourly', points: 42 },
    '1D': { days: 30, interval: 'daily', points: 30 },
    '1W': { days: 90, interval: 'daily', points: 90 }
  };

  useEffect(() => {
    loadChartData();
  }, [coinId, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const config = timeframeConfig[timeframe];
      
      // Fetch market chart data
      const marketUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}&interval=${config.interval}`;
      const marketResponse = await fetch(marketUrl);
      
      if (!marketResponse.ok) {
        console.error('Failed to fetch market data');
        const mockData = generateMockChartData(config.points, timeframe);
        setChartData(mockData);
        return;
      }
      
      const marketData = await marketResponse.json();
      const processedData = processMarketData(marketData, timeframe);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      const config = timeframeConfig[timeframe];
      const mockData = generateMockChartData(config.points, timeframe);
      setChartData(mockData);
    } finally {
      setLoading(false);
    }
  };
  
  const processMarketData = (marketData: any, tf: string): ChartData[] => {
    const prices = marketData.prices || [];
    const volumes = marketData.total_volumes || [];
    
    if (prices.length === 0) {
      return generateMockChartData(timeframeConfig[tf].points, tf);
    }
    
    const data = prices.map((pricePoint: number[], index: number) => {
      const [timestamp, price] = pricePoint;
      const volumePoint = volumes[index] || [timestamp, 0];
      
      return {
        time: formatTimeByTimeframe(new Date(timestamp), tf),
        price: price,
        volume: volumePoint[1] || 0
      };
    });
    
    return calculateIndicators(data);
  };
  
  const generateMockChartData = (points: number, tf: string): ChartData[] => {
    const data: ChartData[] = [];
    const now = Date.now();
    const interval = timeframe === '1H' ? 3600000 : 
                     timeframe === '4H' ? 14400000 : 
                     timeframe === '1D' ? 86400000 : 604800000;
    
    let basePrice = currentPrice || 1000;
    let currentValue = basePrice;
    
    for (let i = 0; i < points; i++) {
      const time = new Date(now - (points - i) * interval);
      const volatility = 0.015;
      const trend = Math.random() > 0.5 ? 1.001 : 0.999;
      
      currentValue = currentValue * trend * (1 + (Math.random() - 0.5) * volatility);
      const volume = 1000000 + Math.random() * 9000000;
      
      data.push({
        time: formatTimeByTimeframe(time, tf),
        price: currentValue,
        volume: volume
      });
    }
    
    return calculateIndicators(data);
  };

  const calculateIndicators = (data: ChartData[]): ChartData[] => {
    const dataWithIndicators = [...data];
    
    // Calculate SMA20 and SMA50
    for (let i = 0; i < dataWithIndicators.length; i++) {
      if (i >= 19) {
        const sma20 = dataWithIndicators
          .slice(i - 19, i + 1)
          .reduce((sum, d) => sum + d.price, 0) / 20;
        dataWithIndicators[i].sma20 = sma20;
      }
      
      if (i >= 49) {
        const sma50 = dataWithIndicators
          .slice(i - 49, i + 1)
          .reduce((sum, d) => sum + d.price, 0) / 50;
        dataWithIndicators[i].sma50 = sma50;
      }
    }
    
    // Calculate RSI
    const rsiPeriod = 14;
    for (let i = rsiPeriod; i < dataWithIndicators.length; i++) {
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let j = i - rsiPeriod + 1; j <= i; j++) {
        const change = dataWithIndicators[j].price - dataWithIndicators[j - 1].price;
        if (change > 0) {
          gains.push(change);
          losses.push(0);
        } else {
          gains.push(0);
          losses.push(Math.abs(change));
        }
      }
      
      const avgGain = gains.reduce((a, b) => a + b, 0) / rsiPeriod;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / rsiPeriod;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      dataWithIndicators[i].rsi = rsi;
    }
    
    return dataWithIndicators;
  };

  const formatTimeByTimeframe = (date: Date, tf: string): string => {
    switch (tf) {
      case '1H':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit'
        });
      case '4H':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit'
        });
      case '1D':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1W':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur p-3 shadow-lg">
          <div className="text-xs font-medium mb-2 text-muted-foreground">{label}</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold text-foreground">${formatNumber(data.price)}</span>
            </div>
            {showVolume && data.volume && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-medium">${formatNumber(data.volume)}</span>
              </div>
            )}
            {showSMA && data.sma20 && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">SMA20:</span>
                <span className="font-medium text-blue-500">${formatNumber(data.sma20)}</span>
              </div>
            )}
            {showSMA && data.sma50 && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">SMA50:</span>
                <span className="font-medium text-purple-500">${formatNumber(data.sma50)}</span>
              </div>
            )}
            {showRSI && data.rsi && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">RSI:</span>
                <span className={`font-medium ${
                  data.rsi > 70 ? 'text-red-500' : 
                  data.rsi < 30 ? 'text-green-500' : 
                  'text-yellow-500'
                }`}>
                  {data.rsi.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate price change
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0 };
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = (change / firstPrice) * 100;
    return { value: change, percentage };
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <TabsList className="grid grid-cols-4 w-[200px]">
            <TabsTrigger value="1H">1H</TabsTrigger>
            <TabsTrigger value="4H">4H</TabsTrigger>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2">
          <Badge
            variant={showSMA ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowSMA(!showSMA)}
          >
            SMA
          </Badge>
          <Badge
            variant={showVolume ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowVolume(!showVolume)}
          >
            Volume
          </Badge>
          <Badge
            variant={showRSI ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowRSI(!showRSI)}
          >
            RSI
          </Badge>
        </div>
      </div>

      {/* Main Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {symbol.toUpperCase()}/USD
            </CardTitle>
            <div className="text-right">
              {currentPrice && (
                <div className="text-2xl font-bold">
                  ${formatNumber(currentPrice)}
                </div>
              )}
              <div className={`text-sm font-medium ${priceChange.percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChange.percentage >= 0 ? '+' : ''}{priceChange.value.toFixed(2)} ({priceChange.percentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div style={{ touchAction: 'none' }}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${formatNumber(value)}`}
                stroke="hsl(var(--muted-foreground))"
              />
              {showVolume && (
                <YAxis
                  yAxisId="volume"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  stroke="hsl(var(--muted-foreground))"
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                fill="url(#colorPrice)"
                strokeWidth={2}
              />
              
              {showSMA && (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma20"
                    stroke="#3B82F6"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8B5CF6"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </>
              )}
              
              {showVolume && (
                <Area
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  fill="url(#colorVolume)"
                  stroke="transparent"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          </div>

          {/* RSI Chart */}
          {showRSI && (
            <div className="mt-4 px-6 pb-4">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                RSI (14)
              </div>
              <div style={{ touchAction: 'none' }}>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="time" hide />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[30, 50, 70]}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <ReferenceLine y={70} stroke="#FF5F6D" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={30} stroke="#16DB65" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.3} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
              
              {/* RSI Legend */}
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[2px] bg-green-500"></div>
                  <span className="text-muted-foreground">Oversold (&lt;30)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-[2px] bg-red-500"></div>
                  <span className="text-muted-foreground">Overbought (&gt;70)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}