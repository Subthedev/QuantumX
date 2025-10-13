import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, BarChart3, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { ohlcDataService } from '@/services/ohlcDataService';
import type { ChartType, ChartTimeframe, OHLCData, PriceInfo } from '@/types/chart';
import { useTheme } from 'next-themes';

interface TradingViewChartProps {
  coinId: string;
  symbol: string;
  currentPrice?: number;
  height?: number;
}

const TIMEFRAMES: { label: string; value: ChartTimeframe; days: number }[] = [
  { label: '1H', value: '1H', days: 1 },
  { label: '4H', value: '4H', days: 1 },
  { label: '1D', value: '1D', days: 1 },
  { label: '7D', value: '7D', days: 7 },
  { label: '30D', value: '30D', days: 30 },
  { label: '90D', value: '90D', days: 90 },
  { label: '1Y', value: '1Y', days: 365 },
  { label: 'ALL', value: 'ALL', days: 9999 },
];

const CHART_TYPES: { label: string; value: ChartType; icon: React.ReactNode }[] = [
  { label: 'Candlestick', value: 'candlestick', icon: <BarChart3 className="w-3 h-3" /> },
  { label: 'Line', value: 'line', icon: <TrendingUp className="w-3 h-3" /> },
  { label: 'Area', value: 'area', icon: <Activity className="w-3 h-3" /> },
];

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  coinId,
  symbol,
  currentPrice,
  height = 450,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const isInitializedRef = useRef(false);
  const { theme: appTheme } = useTheme();

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('7D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    current: currentPrice || 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    volume: 0,
  });

  // Theme configuration
  const chartTheme = useMemo(() => {
    const isDark = appTheme === 'dark';
    return {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#9ca3af' : '#6b7280',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          width: 1 as any,
          style: 3 as any,
        },
        horzLine: {
          color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          width: 1 as any,
          style: 3 as any,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    };
  }, [appTheme]);

  // Load data function - defined early so it can be used in useEffects
  const loadChartData = useCallback(async () => {
    if (!chartRef.current) {
      console.warn('Chart not initialized yet, skipping data load');
      return;
    }

    console.log('Loading chart data for', coinId, timeframe, chartType);
    setLoading(true);
    setError(null);

    try {
      const data = await ohlcDataService.fetchDataForTimeframe(coinId, timeframe);

      if (!data.ohlc || data.ohlc.length === 0) {
        throw new Error('No data available for this timeframe');
      }

      console.log(`Received ${data.ohlc.length} data points for ${timeframe}`);

      // CRITICAL: Sort data by time to ensure proper display
      const sortedOHLC = [...data.ohlc].sort((a, b) => a.time - b.time);

      console.log('Time range:', {
        first: new Date(sortedOHLC[0].time * 1000).toISOString(),
        last: new Date(sortedOHLC[sortedOHLC.length - 1].time * 1000).toISOString(),
        points: sortedOHLC.length
      });

      // Remove old series
      if (seriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }

      // Create appropriate series based on chart type using v5 API
      let series: ISeriesApi<any>;

      if (chartType === 'candlestick') {
        series = chartRef.current.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });
        series.setData(sortedOHLC);
      } else if (chartType === 'line') {
        series = chartRef.current.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
        });
        // Convert OHLC to line data (using close price)
        const lineData = sortedOHLC.map(d => ({ time: d.time, value: d.close }));
        series.setData(lineData);
      } else {
        // area
        series = chartRef.current.addSeries(AreaSeries, {
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineColor: '#3b82f6',
          lineWidth: 2,
        });
        // Convert OHLC to area data (using close price)
        const areaData = sortedOHLC.map(d => ({ time: d.time, value: d.close }));
        series.setData(areaData);
      }

      seriesRef.current = series;

      // CRITICAL: Configure timeScale to show ALL data with proper range
      const timeScale = chartRef.current.timeScale();

      // Fit content first to auto-scale
      timeScale.fitContent();

      // Force the chart to show the FULL time range from first to last data point
      // Using actual timestamps ensures the full horizontal range is visible
      if (sortedOHLC.length > 0) {
        const firstTime = sortedOHLC[0].time;
        const lastTime = sortedOHLC[sortedOHLC.length - 1].time;

        console.log('Setting visible time range:', {
          from: new Date(firstTime * 1000).toISOString(),
          to: new Date(lastTime * 1000).toISOString()
        });

        // Set visible range using actual timestamps with small padding
        timeScale.setVisibleRange({
          from: firstTime as any,
          to: lastTime as any,
        });

        // Alternative: Use logical range for complete coverage
        setTimeout(() => {
          timeScale.setVisibleLogicalRange({
            from: -0.5, // Small padding on left
            to: sortedOHLC.length - 0.5 // Small padding on right
          });
        }, 100);
      }

      // Calculate price info using sorted data
      if (sortedOHLC.length > 0) {
        const firstClose = sortedOHLC[0].close;
        const lastCandle = sortedOHLC[sortedOHLC.length - 1];
        const lastClose = lastCandle.close;
        const change = lastClose - firstClose;
        const changePercent = (change / firstClose) * 100;

        const high = Math.max(...sortedOHLC.map(d => d.high));
        const low = Math.min(...sortedOHLC.map(d => d.low));

        setPriceInfo({
          current: lastClose,
          change,
          changePercent,
          high,
          low,
          volume: 0, // TODO: Add volume when available
        });
      }

      console.log('✓ Chart data loaded successfully');
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [coinId, timeframe, chartType]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    console.log('Initializing chart for', coinId);

    // Reset initialization flag when creating new chart
    isInitializedRef.current = false;

    const chart = createChart(chartContainerRef.current, {
      ...chartTheme,
      width: chartContainerRef.current.clientWidth,
      height,
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true, // Enable pinch zoom
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      timeScale: {
        ...chartTheme.timeScale,
        rightOffset: 5,
        barSpacing: 6,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: true,
        borderVisible: true,
        visible: true,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        ...chartTheme.rightPriceScale,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    chartRef.current = chart;

    // Handle resize - preserve visible range
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const timeScale = chartRef.current.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();

        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });

        // Restore visible range after resize
        if (currentRange) {
          requestAnimationFrame(() => {
            timeScale.setVisibleLogicalRange(currentRange);
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log('Cleaning up chart');
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      isInitializedRef.current = false;
    };
  }, [height, chartTheme, coinId]);

  // Load initial data when chart is ready and coinId is available
  useEffect(() => {
    if (!chartRef.current || !coinId) {
      console.log('Skipping initial data load - chart or coinId not ready');
      return;
    }

    if (isInitializedRef.current) {
      console.log('Already initialized, skipping duplicate initial load');
      return;
    }

    console.log('Chart ready, loading initial data for', coinId);
    isInitializedRef.current = true;
    loadChartData();
  }, [coinId, loadChartData]);

  // Load data when timeframe or chart type changes (skip initial mount)
  useEffect(() => {
    if (!chartRef.current) {
      console.log('Skipping data load - chart not ready');
      return;
    }

    // Only reload if already initialized (skip first mount)
    if (!isInitializedRef.current) {
      console.log('Skipping timeframe/chartType effect - not yet initialized');
      return;
    }

    console.log('Timeframe/ChartType changed, reloading data');
    loadChartData();
  }, [timeframe, chartType, loadChartData]);

  const handleRefresh = () => {
    ohlcDataService.clearCache(coinId);
    loadChartData();
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="p-2 sm:p-4 space-y-3 sm:space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Price Info */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <div className="text-lg sm:text-2xl font-bold truncate">
              ${priceInfo.current.toFixed(priceInfo.current < 1 ? 6 : 2)}
            </div>
            <div className={`text-xs sm:text-sm ${getChangeColor(priceInfo.changePercent)}`}>
              {priceInfo.changePercent >= 0 ? '+' : ''}
              {priceInfo.changePercent.toFixed(2)}% ({timeframe})
            </div>
          </div>
          <div className="hidden sm:flex gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">H:</span>{' '}
              <span className="font-semibold">${priceInfo.high.toFixed(priceInfo.high < 1 ? 6 : 2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">L:</span>{' '}
              <span className="font-semibold">${priceInfo.low.toFixed(priceInfo.low < 1 ? 6 : 2)}</span>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Chart Type Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
        {CHART_TYPES.map((type) => (
          <Button
            key={type.value}
            onClick={() => setChartType(type.value)}
            variant={chartType === type.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 sm:h-8 text-xs flex-shrink-0 px-2 sm:px-3"
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              {type.icon}
              <span className="hidden sm:inline">{type.label}</span>
            </span>
          </Button>
        ))}
      </div>

      {/* Timeframe Selector */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            variant={timeframe === tf.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
            <div className="text-center space-y-2 p-4">
              <p className="text-destructive text-xs sm:text-sm">{error}</p>
              <Button onClick={loadChartData} variant="outline" size="sm" className="text-xs">
                Retry
              </Button>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full rounded-lg overflow-hidden border border-border touch-pan-y"
          style={{ height: `${height}px` }}
        />
      </div>

      {/* Chart Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {symbol.toUpperCase()}
          </Badge>
          <span className="hidden sm:inline truncate">Real-time {chartType} chart</span>
        </div>
        <span className="flex-shrink-0 text-[10px] sm:text-xs">CoinGecko</span>
      </div>
    </Card>
  );
};

export default TradingViewChart;
