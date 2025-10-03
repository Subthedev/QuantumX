import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TradingViewWidgetProps {
  coinId: string;
  symbol: string;
  height?: number;
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  coinId, 
  symbol,
  height = 400 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D' | '1Y'>('7D');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

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
    const areaSeries = (chart as any).addAreaSeries({
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
  }, [height]);

  useEffect(() => {
    const fetchData = async () => {
      if (!seriesRef.current) return;
      
      setLoading(true);
      try {
        const days = {
          '1D': 1,
          '7D': 7,
          '30D': 30,
          '90D': 90,
          '1Y': 365
        }[timeframe];

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days === 1 ? 'hourly' : 'daily'}`
        );
        
        const data = await response.json();
        
        if (data.prices) {
          const chartData = data.prices.map(([timestamp, price]: [number, number]) => ({
            time: Math.floor(timestamp / 1000),
            value: price,
          }));

          seriesRef.current.setData(chartData);
          
          // Fit content with some padding
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId, timeframe]);

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
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </Card>
  );
};

export default TradingViewWidget;
