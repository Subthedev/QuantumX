import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, AreaSeries, LineStyle } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, TrendingUp, TrendingDown } from 'lucide-react';

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
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create chart with professional TradingView styling
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        vertLines: { 
          color: 'rgba(255, 255, 255, 0.05)',
          style: LineStyle.Solid,
        },
        horzLines: { 
          color: 'rgba(255, 255, 255, 0.05)',
          style: LineStyle.Solid,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.3)',
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.3)',
          style: LineStyle.Dashed,
          labelVisible: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create area series with design system colors
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(255, 95, 109, 0.4)',
      bottomColor: 'rgba(255, 95, 109, 0.0)',
      lineColor: 'rgba(255, 95, 109, 1)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: 'rgba(255, 95, 109, 1)',
      crosshairMarkerBackgroundColor: 'rgba(255, 95, 109, 1)',
      crosshairMarkerBorderWidth: 2,
    });

    seriesRef.current = areaSeries;
    
    // Subscribe to crosshair move for price display
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const data = param.seriesData.get(areaSeries);
        if (data && 'value' in data) {
          setCurrentPrice(data.value as number);
        }
      }
    });

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
          
          // Calculate price change
          if (chartData.length > 0) {
            const firstPrice = chartData[0].value;
            const lastPrice = chartData[chartData.length - 1].value;
            const change = lastPrice - firstPrice;
            const changePercent = (change / firstPrice) * 100;
            
            setCurrentPrice(lastPrice);
            setPriceChange(change);
            setPriceChangePercent(changePercent);
            
            // Update line color based on trend
            const isPositive = changePercent >= 0;
            seriesRef.current.applyOptions({
              topColor: isPositive ? 'rgba(22, 219, 101, 0.4)' : 'rgba(255, 95, 109, 0.4)',
              lineColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
              crosshairMarkerBorderColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
              crosshairMarkerBackgroundColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
            });
          }
          
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
          
          // Calculate price change
          if (chartData.length > 0) {
            const firstPrice = chartData[0].value;
            const lastPrice = chartData[chartData.length - 1].value;
            const change = lastPrice - firstPrice;
            const changePercent = (change / firstPrice) * 100;
            
            setCurrentPrice(lastPrice);
            setPriceChange(change);
            setPriceChangePercent(changePercent);
            
            // Update line color based on trend
            const isPositive = changePercent >= 0;
            seriesRef.current.applyOptions({
              topColor: isPositive ? 'rgba(22, 219, 101, 0.4)' : 'rgba(255, 95, 109, 0.4)',
              lineColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
              crosshairMarkerBorderColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
              crosshairMarkerBackgroundColor: isPositive ? 'rgba(22, 219, 101, 1)' : 'rgba(255, 95, 109, 1)',
            });
          }
          
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

  const formatPrice = (price: number | null) => {
    if (!price) return '$0.00';
    if (price < 1) return `$${price.toFixed(6)}`;
    if (price < 10) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex flex-col gap-3 mb-4">
        {/* Header with price info */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">{symbol.toUpperCase()}/USD</h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            {currentPrice !== null && (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(currentPrice)}
                </span>
                {priceChangePercent !== null && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {priceChangePercent >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {priceChangePercent >= 0 ? '+' : ''}
                      {priceChangePercent.toFixed(2)}%
                    </span>
                    {priceChange !== null && (
                      <span className="text-xs text-muted-foreground">
                        ({priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Timeframe selector */}
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
        </div>
      </div>
      {error ? (
        <div 
          className="w-full flex items-center justify-center bg-background/50 rounded-lg border border-dashed border-border/50"
          style={{ height: `${height}px` }}
        >
          <div className="text-center p-6">
            <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Chart Temporarily Unavailable</p>
            <p className="text-xs text-muted-foreground">
              {error.includes('429') || error.includes('rate limit') 
                ? 'API rate limit reached. Try again in a moment.' 
                : 'Unable to load chart data. Using 7D for available data.'}
            </p>
            {timeframe !== '7D' && sparklineData && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTimeframe('7D')}
                className="mt-3 text-xs"
              >
                Switch to 7D
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div 
          ref={chartContainerRef} 
          className="w-full rounded-lg bg-background/30 border border-border/30" 
          style={{ height: `${height}px` }} 
        />
      )}
    </Card>
  );
};

export default TradingViewWidget;
