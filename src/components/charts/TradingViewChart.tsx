import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Activity, RefreshCw } from 'lucide-react';
import { ohlcDataService } from '@/services/ohlcDataService';
import type { ChartType, ChartTimeframe, OHLCData, PriceInfo } from '@/types/chart';
import { useTheme } from 'next-themes';

interface TradingViewChartProps {
  coinId: string;
  symbol: string;
  currentPrice?: number;
  height?: number;
  tradeMarkers?: TradeMarker[];
}

interface TradeMarker {
  time: number; // Unix timestamp in seconds
  position: 'belowBar' | 'aboveBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
}

const TIMEFRAMES: { label: string; value: ChartTimeframe; days: number }[] = [
  { label: '1m', value: '1H', days: 1 },
  { label: '5m', value: '4H', days: 1 },
  { label: '15m', value: '1D', days: 1 },
  { label: '1H', value: '7D', days: 7 },
  { label: '4H', value: '30D', days: 30 },
  { label: '1D', value: '90D', days: 90 },
  { label: '1W', value: '1Y', days: 365 },
];

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  coinId,
  symbol,
  currentPrice,
  height = 450,
  tradeMarkers = [],
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const isInitializedRef = useRef(false);
  const { theme: appTheme } = useTheme();

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('90D');
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

    console.log('Loading chart data for', coinId, timeframe, chartType);
    setLoading(true);
    setError(null);

    try {
      const data = await ohlcDataService.fetchDataForTimeframe(coinId, timeframe);

      if (!data.ohlc || data.ohlc.length === 0) {
        throw new Error('No data available for this timeframe');
      }

      console.log(`Received ${data.ohlc.length} data points for ${timeframe}`);

      setDataPointsCount(data.ohlc.length);

      // CRITICAL: Sort data by time to ensure proper display
      const sortedOHLC = [...data.ohlc].sort((a, b) => a.time - b.time);

      console.log('Time range:', {
        first: new Date(sortedOHLC[0].time * 1000).toISOString(),
        last: new Date(sortedOHLC[sortedOHLC.length - 1].time * 1000).toISOString(),
        points: sortedOHLC.length
      });

      // Remove old series - with safety checks
      if (seriesRef.current && chartRef.current) {
        try {
          chartRef.current.removeSeries(seriesRef.current);
        } catch (e) {
          console.warn('Failed to remove main series (already removed):', e);
        }
        seriesRef.current = null;
      }
      if (volumeSeriesRef.current && chartRef.current) {
        try {
          chartRef.current.removeSeries(volumeSeriesRef.current);
        } catch (e) {
          console.warn('Failed to remove volume series (already removed):', e);
        }
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
      } else {
        // Line chart with area fill (combined)
        series = chartRef.current.addSeries(AreaSeries, {
          topColor: 'rgba(59, 130, 246, 0.3)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineColor: '#3b82f6',
          lineWidth: 2,
          lineType: 2, // Smooth line
        });
        // Convert OHLC to area data (using close price)
        const areaData = sortedOHLC.map(d => ({ time: d.time, value: d.close }));
        series.setData(areaData);
      }

      seriesRef.current = series;

      // Add trade markers if provided (for trade replay)
      if (tradeMarkers.length > 0 && chartType === 'candlestick') {
        try {
          const markers = tradeMarkers.map(marker => ({
            time: marker.time,
            position: marker.position,
            color: marker.color,
            shape: marker.shape,
            text: marker.text,
          }));
          (series as any).setMarkers(markers);
        } catch (e) {
          console.warn('Failed to set markers:', e);
        }
      }

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

      // Configure timeScale to show ALL data - Binance style
      const timeScale = chartRef.current.timeScale();

      // Show ALL data points from first to last with small padding
      // This is the key to displaying the full chart without empty space
      if (sortedOHLC.length > 0) {
        // Add small negative padding to show from very start
        timeScale.setVisibleLogicalRange({
          from: -0.5,
          to: sortedOHLC.length - 0.5,
        });

        // Force the range again after a short delay to override any defaults
        setTimeout(() => {
          timeScale.setVisibleLogicalRange({
            from: -0.5,
            to: sortedOHLC.length - 0.5,
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
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true, // ✅ Enable pinch-to-zoom on mobile
      },
      timeScale: {
        ...chartTheme.timeScale,
        rightOffset: 0,
        barSpacing: 6,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: false,
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
  }, [timeframe, chartType, tradeMarkers, loadChartData]);

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 p-3 border-b border-border">
        {/* Price Info */}
        <div className="flex-1 min-w-0">
          <div className={isMobile ? "text-lg font-semibold" : "text-2xl font-semibold"}>
            ${priceInfo.current.toFixed(priceInfo.current < 1 ? 6 : 2)}
          </div>
          <div className={`text-xs ${getChangeColor(priceInfo.changePercent)}`}>
            {priceInfo.changePercent >= 0 ? '+' : ''}
            {priceInfo.changePercent.toFixed(2)}% ({timeframe})
          </div>
          {!isMobile && (
            <div className="flex gap-3 text-xs mt-1">
              <div>
                <span className="text-muted-foreground">H:</span>{' '}
                <span className="font-semibold">${priceInfo.high.toFixed(priceInfo.high < 1 ? 6 : 2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">L:</span>{' '}
                <span className="font-semibold">${priceInfo.low.toFixed(priceInfo.low < 1 ? 6 : 2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Compact controls */}
        <div className="flex items-center gap-1">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  timeframe === tf.value 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <Button
            onClick={() => setChartType(chartType === 'candlestick' ? 'line' : 'candlestick')}
            variant="ghost"
            size={isMobile ? 'icon' : 'sm'}
            className={isMobile ? "h-7 w-7" : "h-7 px-2"}
            title={chartType === 'candlestick' ? 'Line Chart' : 'Candlestick'}
          >
            {chartType === 'candlestick' ? <Activity className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
          </Button>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size={isMobile ? 'icon' : 'sm'}
            disabled={loading}
            className={isMobile ? "h-7 w-7" : "h-7 w-7"}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* High/Low for mobile - shown below price */}
      {isMobile && (
        <div className="flex gap-4 text-[10px] px-1">
          <div>
            <span className="text-muted-foreground">High:</span>{' '}
            <span className="font-semibold">${priceInfo.high.toFixed(priceInfo.high < 1 ? 6 : 2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Low:</span>{' '}
            <span className="font-semibold">${priceInfo.low.toFixed(priceInfo.low < 1 ? 6 : 2)}</span>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="max-w-md mx-4 p-6 bg-card border border-border rounded-lg shadow-lg">
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
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-full rounded-lg overflow-hidden border border-border"
          style={{
            touchAction: 'none' // Allow pinch-to-zoom and pan gestures
          }}
        />
      </div>
    </div>
  );
};

export default TradingViewChart;
