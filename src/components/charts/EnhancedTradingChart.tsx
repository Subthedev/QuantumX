import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, TrendingUp, BarChart3, CandlestickChart } from 'lucide-react';
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
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function EnhancedTradingChart({ coinId, symbol, currentPrice }: EnhancedTradingChartProps) {
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);

  const timeframeConfig = {
    '1H': { days: 1, interval: 'hourly' },
    '4H': { days: 7, interval: 'hourly' },
    '1D': { days: 30, interval: 'daily' },
    '1W': { days: 90, interval: 'daily' }
  };

  useEffect(() => {
    loadChartData();
  }, [coinId, timeframe]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const config = timeframeConfig[timeframe];
      
      // Fetch OHLC data for candlestick charts directly
      const ohlcUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${config.days}`;
      const ohlcResponse = await fetch(ohlcUrl);
      
      if (!ohlcResponse.ok) {
        console.error('Failed to fetch OHLC data');
        // Generate mock data if API fails
        const mockData = generateMockChartData(config.days, timeframe);
        setChartData(mockData);
        return;
      }
      
      const ohlcData: number[][] = await ohlcResponse.json();
      
      // Fetch regular market chart data for line charts and volume
      const marketUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}&interval=${config.interval}`;
      const marketResponse = await fetch(marketUrl);
      
      let marketData = { prices: [], total_volumes: [] };
      if (marketResponse.ok) {
        marketData = await marketResponse.json();
      }
      
      // Process and combine data
      const processedData = processOHLCData(ohlcData, marketData, timeframe);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Generate mock data on error
      const config = timeframeConfig[timeframe];
      const mockData = generateMockChartData(config.days, timeframe);
      setChartData(mockData);
    } finally {
      setLoading(false);
    }
  };
  
  const generateMockChartData = (days: number, tf: string): ChartData[] => {
    const dataPoints = days === 1 ? 24 : days === 7 ? 168 : days === 30 ? 720 : 2160;
    const data: ChartData[] = [];
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / dataPoints;
    
    let basePrice = currentPrice || 1000;
    let currentValue = basePrice;
    
    for (let i = 0; i < dataPoints; i++) {
      const time = new Date(now - (dataPoints - i) * interval);
      const volatility = 0.02;
      const trend = Math.random() > 0.5 ? 1.002 : 0.998;
      
      currentValue = currentValue * trend;
      const open = currentValue * (1 + (Math.random() - 0.5) * volatility);
      const close = open * (1 + (Math.random() - 0.5) * volatility);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = 1000000 + Math.random() * 9000000;
      
      data.push({
        time: formatTimeByTimeframe(time, tf),
        price: close,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentValue = close;
    }
    
    return calculateIndicators(data);
  };

  const processOHLCData = (ohlcData: number[][], marketData: any, tf: string): ChartData[] => {
    const prices = marketData.prices || [];
    const volumes = marketData.total_volumes || [];
    
    // Handle empty or invalid data
    if (!ohlcData || ohlcData.length === 0) {
      return generateMockChartData(timeframeConfig[tf].days, tf);
    }
    
    // For candlestick data
    const candleData = ohlcData.map((candle, index) => {
      const [timestamp, open, high, low, close] = candle;
      const date = new Date(timestamp);
      
      // Find corresponding volume
      const volumeEntry = volumes.find((v: number[]) => 
        Math.abs(v[0] - timestamp) < 3600000 // Within 1 hour
      );
      
      return {
        time: formatTimeByTimeframe(date, tf),
        open: open || 0,
        high: high || 0,
        low: low || 0,
        close: close || 0,
        price: close || 0,
        volume: volumeEntry ? volumeEntry[1] : 0
      };
    });

    // Calculate technical indicators
    return calculateIndicators(candleData);
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
      case '4H':
        return date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit',
          minute: '2-digit'
        });
      case '1D':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1W':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <div className="text-xs font-medium mb-2">{label}</div>
          {chartType === 'candle' && data.open && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Open:</span>
                <span className="font-medium">${formatNumber(data.open)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">High:</span>
                <span className="font-medium text-green-500">${formatNumber(data.high)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Low:</span>
                <span className="font-medium text-red-500">${formatNumber(data.low)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Close:</span>
                <span className="font-medium">${formatNumber(data.close)}</span>
              </div>
            </div>
          )}
          {chartType === 'line' && (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">${formatNumber(data.price)}</span>
            </div>
          )}
          {showVolume && data.volume && (
            <div className="flex justify-between gap-4 text-xs mt-1">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-medium">${formatNumber(data.volume)}</span>
            </div>
          )}
          {showSMA && data.sma20 && (
            <div className="flex justify-between gap-4 text-xs mt-1">
              <span className="text-muted-foreground">SMA20:</span>
              <span className="font-medium text-blue-500">${formatNumber(data.sma20)}</span>
            </div>
          )}
          {showSMA && data.sma50 && (
            <div className="flex justify-between gap-4 text-xs mt-1">
              <span className="text-muted-foreground">SMA50:</span>
              <span className="font-medium text-purple-500">${formatNumber(data.sma50)}</span>
            </div>
          )}
          {showRSI && data.rsi && (
            <div className="flex justify-between gap-4 text-xs mt-1">
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
      );
    }
    return null;
  };

  const CandlestickBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    const isGreen = payload.close >= payload.open;
    const color = isGreen ? '#16DB65' : '#FF5F6D';
    
    const highLowLineX = x + width / 2;
    const candleHeight = Math.abs(((payload.close - payload.open) / (payload.high - payload.low)) * height) || 1;
    const candleY = y + ((payload.high - Math.max(payload.open, payload.close)) / (payload.high - payload.low)) * height;
    
    return (
      <g>
        {/* High-Low line */}
        <line
          x1={highLowLineX}
          y1={y}
          x2={highLowLineX}
          y2={y + height}
          stroke={color}
          strokeWidth={1}
        />
        {/* Open-Close rectangle */}
        <rect
          x={x}
          y={candleY}
          width={width}
          height={candleHeight}
          fill={color}
          stroke={color}
        />
      </g>
    );
  };

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
          <TabsList>
            <TabsTrigger value="1H">1H</TabsTrigger>
            <TabsTrigger value="4H">4H</TabsTrigger>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Line
          </Button>
          <Button
            variant={chartType === 'candle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('candle')}
          >
            <CandlestickChart className="w-4 h-4 mr-1" />
            Candles
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Badge
            variant={showSMA ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowSMA(!showSMA)}
          >
            SMA
          </Badge>
          <Badge
            variant={showVolume ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowVolume(!showVolume)}
          >
            Volume
          </Badge>
          <Badge
            variant={showRSI ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowRSI(!showRSI)}
          >
            RSI
          </Badge>
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{symbol.toUpperCase()}/USD</span>
            {currentPrice && (
              <span className="text-2xl font-bold">
                ${formatNumber(currentPrice)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                tick={{ fontSize: 11 }}
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `$${formatNumber(value)}`}
              />
              {showVolume && (
                <YAxis
                  yAxisId="volume"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              
              {chartType === 'line' ? (
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
              ) : (
                <Bar
                  yAxisId="price"
                  dataKey="high"
                  shape={CandlestickBar}
                />
              )}
              
              {showSMA && (
                <>
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma20"
                    stroke="#3B82F6"
                    strokeWidth={1}
                    dot={false}
                    name="SMA 20"
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="sma50"
                    stroke="#8B5CF6"
                    strokeWidth={1}
                    dot={false}
                    name="SMA 50"
                  />
                </>
              )}
              
              {showVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="hsl(var(--muted-foreground) / 0.3)"
                  barSize={20}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* RSI Chart */}
          {showRSI && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">RSI (14)</div>
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="time" hide />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[30, 50, 70]}
                    tick={{ fontSize: 11 }}
                  />
                  <ReferenceLine y={70} stroke="#FF5F6D" strokeDasharray="3 3" />
                  <ReferenceLine y={30} stroke="#16DB65" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}