import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Activity } from 'lucide-react';

interface TradingViewWidgetProps {
  coinId: string;
  symbol: string;
  height?: number;
  sparklineData?: number[]; // Optional pre-loaded sparkline data
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  coinId, 
  symbol,
  height = 400,
  sparklineData
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D' | '1Y'>('7D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create chart with TradingView styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground))',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: 'hsl(var(--muted-foreground))',
          style: 3,
        },
      },
    });

    chartRef.current = chart;

    // Create area series with TradingView colors
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(38, 198, 218, 0.56)',
      bottomColor: 'rgba(38, 198, 218, 0.04)',
      lineColor: 'rgba(38, 198, 218, 1)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      crosshairMarkerBorderColor: 'rgba(38, 198, 218, 1)',
      crosshairMarkerBackgroundColor: 'rgba(255, 255, 255, 1)',
    });

    seriesRef.current = areaSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, coinId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!seriesRef.current) return;
      
      setLoading(true);
      setError(null);
      
      // If sparkline data is provided and we're on 7D timeframe, use it directly
      if (sparklineData && sparklineData.length > 0 && timeframe === '7D') {
        try {
          const now = Math.floor(Date.now() / 1000);
          const interval = Math.floor((7 * 24 * 60 * 60) / sparklineData.length);
          
          const chartData = sparklineData.map((price, index) => ({
            time: now - (sparklineData.length - index) * interval,
            value: price,
          }));

          seriesRef.current.setData(chartData);
          
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
          setError(null);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Failed to process sparkline data:', error);
          // Fall through to API fetch
        }
      }
      
      // Fetch from API for other timeframes or if sparkline data not available
      try {
        const days = {
          '1D': 1,
          '7D': 7,
          '30D': 30,
          '90D': 90,
          '1Y': 365
        }[timeframe];

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days === 1 ? 'hourly' : 'daily'}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.prices && data.prices.length > 0) {
          const chartData = data.prices.map(([timestamp, price]: [number, number]) => ({
            time: Math.floor(timestamp / 1000),
            value: price,
          }));

          seriesRef.current.setData(chartData);
          
          // Fit content with some padding
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
          setError(null);
        } else {
          throw new Error('No price data available');
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chart data');
        
        // Set empty data to prevent errors
        if (seriesRef.current) {
          seriesRef.current.setData([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId, timeframe, sparklineData]);

  const timeframes: Array<'1D' | '7D' | '30D' | '90D' | '1Y'> = ['1D', '7D', '30D', '90D', '1Y'];

  return (
    <Card className="p-4 bg-card border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{symbol.toUpperCase()}/USD</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? 'default' : 'ghost'}
              onClick={() => setTimeframe(tf)}
              className="h-7 px-3 text-xs"
              disabled={loading}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>
      {error ? (
        <div 
          className="w-full flex items-center justify-center bg-muted/50 rounded-lg border border-dashed"
          style={{ height: `${height}px` }}
        >
          <div className="text-center p-6">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-1">Chart temporarily unavailable</p>
            <p className="text-xs text-muted-foreground/70">Data source rate limit reached</p>
          </div>
        </div>
      ) : (
        <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
      )}
    </Card>
  );
};

export default TradingViewWidget;
