import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, AreaSeries, LineStyle } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface TradingViewWidgetProps {
  coinId: string;
  symbol: string;
  height?: number;
  currentPrice?: number; // Current price for initial display
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  coinId, 
  symbol,
  height = 400,
  currentPrice: initialPrice
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '7D'>('1D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(initialPrice || null);
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
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: 'rgba(255, 255, 255, 0.05)',
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: { 
          color: 'rgba(255, 255, 255, 0.05)',
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        rightOffset: 5,
        barSpacing: 10,
        minBarSpacing: 5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        visible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderVisible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        visible: true,
        entireTextOnly: false,
        alignLabels: true,
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
          labelVisible: true,
          labelBackgroundColor: 'rgba(255, 95, 109, 0.9)',
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.3)',
          style: LineStyle.Dashed,
          labelVisible: true,
          labelBackgroundColor: 'rgba(255, 95, 109, 0.9)',
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
      if (!seriesRef.current || !chartRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Map timeframes to API parameters
        const timeframeMap = {
          '1H': { days: 1, interval: 'minutely' },
          '4H': { days: 1, interval: 'hourly' },
          '1D': { days: 1, interval: 'hourly' },
          '7D': { days: 7, interval: 'hourly' },
        };

        const { days, interval } = timeframeMap[timeframe];

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`,
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
          // Filter data based on timeframe
          let filteredPrices = data.prices;
          
          if (timeframe === '1H') {
            // Last hour only
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            filteredPrices = data.prices.filter(([timestamp]: [number, number]) => timestamp >= oneHourAgo);
          } else if (timeframe === '4H') {
            // Last 4 hours only
            const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
            filteredPrices = data.prices.filter(([timestamp]: [number, number]) => timestamp >= fourHoursAgo);
          }

          if (filteredPrices.length === 0) {
            throw new Error('No data available for this timeframe');
          }

          const chartData = filteredPrices.map(([timestamp, price]: [number, number]) => ({
            time: Math.floor(timestamp / 1000) as any,
            value: price,
          }));

          // Sort by time to ensure proper order
          chartData.sort((a, b) => a.time - b.time);

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
          
          // Fit content and ensure proper scaling
          chartRef.current.timeScale().fitContent();
          chartRef.current.timeScale().scrollToRealTime();
          
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
  }, [coinId, timeframe]);

  const timeframes: Array<'1H' | '4H' | '1D' | '7D'> = ['1H', '4H', '1D', '7D'];

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
                : 'Unable to load chart data. Try a different timeframe.'}
            </p>
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
