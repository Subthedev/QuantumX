import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush, ComposedChart, Bar } from 'recharts';
import { format } from 'date-fns';

interface TradingViewChartProps {
  data: number[] | { price: number[] } | any[];
  symbol: string;
  timeframe?: string;
  height?: number;
  showVolume?: boolean;
  indicators?: {
    sma20?: number[];
    sma50?: number[];
    bollinger?: { upper: number[]; lower: number[]; middle: number[] };
  };
}

export const TradingViewChart = ({ 
  data, 
  symbol, 
  timeframe = '7D',
  height = 400,
  showVolume = false,
  indicators 
}: TradingViewChartProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  useEffect(() => {
    // Process data based on input format
    let processedData: any[] = [];
    
    if (Array.isArray(data)) {
      if (typeof data[0] === 'number') {
        // Simple price array
        processedData = data.map((price, index) => ({
          time: index,
          price,
          volume: Math.random() * 1000000,
          date: new Date(Date.now() - (data.length - index) * 3600000).toISOString()
        }));
      } else if (data[0]?.price !== undefined) {
        // Sparkline format
        const prices = data[0].price;
        processedData = prices.map((price: number, index: number) => ({
          time: index,
          price,
          volume: Math.random() * 1000000,
          date: new Date(Date.now() - (prices.length - index) * 3600000).toISOString()
        }));
      }
    }

    // Add moving averages
    if (processedData.length > 20) {
      processedData = processedData.map((item, index) => {
        const sma20 = index >= 19 
          ? processedData.slice(index - 19, index + 1).reduce((sum, d) => sum + d.price, 0) / 20
          : null;
        const sma50 = index >= 49
          ? processedData.slice(index - 49, index + 1).reduce((sum, d) => sum + d.price, 0) / 50
          : null;
        return { ...item, sma20, sma50 };
      });
    }

    setChartData(processedData);
  }, [data]);

  const formatXAxis = (tickItem: any) => {
    if (chartData.length > 0 && chartData[tickItem]?.date) {
      const date = new Date(chartData[tickItem].date);
      if (timeframe === '24H') return format(date, 'HH:mm');
      if (timeframe === '7D') return format(date, 'MMM dd');
      if (timeframe === '30D') return format(date, 'MMM dd');
      return format(date, 'MMM dd');
    }
    return '';
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'volume') return `$${(value / 1000000).toFixed(2)}M`;
    return `$${value?.toFixed(2) || '0.00'}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">
          {chartData[label]?.date && format(new Date(chartData[label].date), 'MMM dd, yyyy HH:mm')}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name === 'price' ? 'Price' : entry.name === 'volume' ? 'Volume' : entry.name.toUpperCase()}: {formatTooltip(entry.value, entry.name)}
          </p>
        ))}
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <Card className="p-6">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No chart data available
        </div>
      </Card>
    );
  }

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const priceRange = maxPrice - minPrice;
  const yDomain = [minPrice - priceRange * 0.1, maxPrice + priceRange * 0.1];

  return (
    <Card className="p-6 bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <div className="flex gap-2">
          {['24H', '7D', '30D'].map((tf) => (
            <button
              key={tf}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeframe === tf 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {showVolume ? (
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis 
              yAxisId="price"
              orientation="right"
              domain={yDomain}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              yAxisId="volume"
              dataKey="volume" 
              fill="hsl(var(--muted-foreground))" 
              opacity={0.3}
            />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorPrice)"
            />
            {activeIndicators.includes('sma20') && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma20"
                stroke="hsl(var(--warning))"
                strokeWidth={1}
                dot={false}
              />
            )}
            {activeIndicators.includes('sma50') && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma50"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                dot={false}
              />
            )}
            <Brush 
              dataKey="time" 
              height={30} 
              stroke="hsl(var(--primary))"
              fill="hsl(var(--muted))"
              tickFormatter={formatXAxis}
            />
          </ComposedChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis 
              domain={yDomain}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={() => setActiveIndicators(prev => 
            prev.includes('sma20') 
              ? prev.filter(i => i !== 'sma20')
              : [...prev, 'sma20']
          )}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            activeIndicators.includes('sma20')
              ? 'bg-warning text-warning-foreground' 
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          SMA 20
        </button>
        <button
          onClick={() => setActiveIndicators(prev => 
            prev.includes('sma50') 
              ? prev.filter(i => i !== 'sma50')
              : [...prev, 'sma50']
          )}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            activeIndicators.includes('sma50')
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          SMA 50
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          Powered by IgniteX AI
        </span>
      </div>
    </Card>
  );
};