import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
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

// FIXED TIMEFRAME: All coins show daily candles with maximum historic data
const FIXED_TIMEFRAME: ChartTimeframe = '1D'; // Daily candles for all coins

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const isInitializedRef = useRef(false);
  const { theme: appTheme } = useTheme();

  const [chartType] = useState<ChartType>('candlestick'); // Fixed to candlestick only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataPointsCount, setDataPointsCount] = useState<number>(0);
  const [showVolume, setShowVolume] = useState(true);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({
    current: currentPrice || 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    volume: 0,
  });

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Theme configuration with mobile optimizations
  const chartTheme = useMemo(() => {
    const isDark = appTheme === 'dark';
    return {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#9ca3af' : '#6b7280',
        fontSize: isMobile ? 10 : 12,
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: isMobile,
        fixRightEdge: isMobile,
      },
      // Enable touch-based pinch zoom for mobile
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true, // Enable pinch zoom on mobile
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
    };
  }, [appTheme, isMobile]);

  // Load data function - defined early so it can be used in useEffects
  const loadChartData = useCallback(async () => {
    if (!chartRef.current) {
      console.warn('Chart not initialized yet, skipping data load');
      return;
    }

    console.log('Loading chart data for', coinId, FIXED_TIMEFRAME, chartType);
    setLoading(true);
    setError(null);

    try {
      const data = await ohlcDataService.fetchDataForTimeframe(coinId, FIXED_TIMEFRAME);

      if (!data.ohlc || data.ohlc.length === 0) {
        throw new Error('No data available for this timeframe');
      }

      console.log(`Received ${data.ohlc.length} data points for ${FIXED_TIMEFRAME}`);

      setDataPointsCount(data.ohlc.length);

      // CRITICAL: Sort data by time to ensure proper display
      const sortedOHLC = [...data.ohlc].sort((a, b) => a.time - b.time);

      console.log('Time range:', {
        first: new Date(sortedOHLC[0].time * 1000).toISOString(),
        last: new Date(sortedOHLC[sortedOHLC.length - 1].time * 1000).toISOString(),
        points: sortedOHLC.length
      });

      // Remove old series and reset time scale for fresh start
      if (seriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(seriesRef.current);
        seriesRef.current = null;

        // Reset time scale to default state when switching timeframes
        const timeScale = chartRef.current.timeScale();
        timeScale.resetTimeScale();
      }
      if (volumeSeriesRef.current && chartRef.current) {
        chartRef.current.removeSeries(volumeSeriesRef.current);
        volumeSeriesRef.current = null;
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

      // Add Volume indicator if data exists and enabled
      if (showVolume && data.volume && data.volume.length > 0) {
        const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
        });

        const sortedVolume = [...data.volume].sort((a, b) => a.time - b.time);
        volumeSeries.setData(sortedVolume as any);
        volumeSeriesRef.current = volumeSeries;

        // Configure volume price scale (bottom 20% of chart)
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.8, // Volume takes bottom 20%
            bottom: 0,
          },
        });
      }

      // FIT ALL DATA: Show complete chart with dynamic spacing based on candle count
      const timeScale = chartRef.current.timeScale();

      if (sortedOHLC.length > 0) {
        const numberOfCandles = sortedOHLC.length;
        const firstCandle = sortedOHLC[0];
        const lastCandle = sortedOHLC[sortedOHLC.length - 1];
        const firstDate = new Date((firstCandle.time as number) * 1000).toLocaleDateString();
        const lastDate = new Date((lastCandle.time as number) * 1000).toLocaleDateString();

        console.log(`📊 ${FIXED_TIMEFRAME}: ${numberOfCandles} candles from ${firstDate} to ${lastDate}`);

        // Calculate bar spacing to fit ALL candles in view
        const chartWidth = chartContainerRef.current?.clientWidth || 1000;
        const availableWidth = chartWidth - 80; // Account for price scale
        const calculatedSpacing = availableWidth / numberOfCandles;

        // Ensure minimum readable spacing (0.5px) - will require scroll if too many candles
        const barSpacing = Math.max(0.5, calculatedSpacing);

        console.log(`📊 Spacing: ${barSpacing.toFixed(2)}px for ${numberOfCandles} candles in ${availableWidth}px`);

        // Configure time scale for zoom/scroll experience
        timeScale.applyOptions({
          barSpacing: barSpacing,
          minBarSpacing: 0.5,
          rightOffset: 5,
          fixLeftEdge: false,
          fixRightEdge: false,
          lockVisibleTimeRangeOnResize: false,
          shiftVisibleRangeOnNewBar: true,
        });

        // Fit all content to show complete data range
        timeScale.fitContent();

        console.log(`✅ Showing ALL ${numberOfCandles} candles - user can zoom/scroll`);
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';

      // Create user-friendly error message
      let userFriendlyError = 'Unable to load chart data. ';
      if (errorMessage.includes('No data returned') || errorMessage.includes('No chart data available')) {
        userFriendlyError += 'This cryptocurrency may not have historical data available at this time.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        userFriendlyError += 'Network connection issue. Please check your internet and try again.';
      } else if (errorMessage.includes('HTTP 429')) {
        userFriendlyError += 'Too many requests. Please wait a moment and try again.';
      } else {
        userFriendlyError += 'Please try again later or contact support if the issue persists.';
      }

      setError(userFriendlyError);
    } finally {
      setLoading(false);
    }
  }, [coinId, chartType]);

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
          time: true,    // Allow horizontal scaling (time axis)
          price: true,   // Allow vertical scaling (price axis)
        },
        mouseWheel: true,      // Enable zoom with mouse wheel
        pinch: true,           // Enable pinch-to-zoom on mobile
      },
      handleScroll: {
        mouseWheel: true,          // Scroll with mouse wheel
        pressedMouseMove: true,    // Scroll by dragging
        horzTouchDrag: true,       // Horizontal scroll on mobile
        vertTouchDrag: true,       // Vertical scroll on mobile
      },
      timeScale: {
        ...chartTheme.timeScale,
        rightOffset: 5,            // Small buffer on right
        minBarSpacing: 0.5,        // Minimum spacing when zoomed in
        barSpacing: 8,             // Default spacing (will be overridden per data load)
        fixLeftEdge: false,        // Allow scrolling to historic data
        fixRightEdge: false,       // Allow scrolling forward
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: true,
        shiftVisibleRangeOnNewBar: true,
        borderVisible: true,
        visible: true,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        ...chartTheme.rightPriceScale,
        autoScale: true, // Enable autoscale for price
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    chartRef.current = chart;

    // Handle resize - preserve user's zoom/scroll position
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const timeScale = chartRef.current.timeScale();

        // Save current visible range before resize
        const currentRange = timeScale.getVisibleLogicalRange();
        const currentBarSpacing = timeScale.options().barSpacing;

        // Update chart width
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });

        // Restore visible range to maintain user's view
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
    <Card className={isMobile ? "p-2 space-y-2" : "p-3 space-y-3"}>
      {/* Minimal Header - Refresh Only */}
      <div className="flex items-center justify-end">
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-7 w-7"
          title="Refresh chart data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-10">
            <Card className="max-w-md mx-4 p-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Chart Load Failed</h3>
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={loadChartData} variant="default" size="sm">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full rounded-lg overflow-hidden border border-border"
          style={{
            height: `${isMobile ? Math.min(height, 300) : height}px`,
            touchAction: 'none' // Allow pinch-to-zoom and pan gestures
          }}
        />
      </div>
    </Card>
  );
};

export default TradingViewChart;
