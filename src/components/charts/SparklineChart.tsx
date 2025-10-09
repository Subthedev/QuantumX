import { useMemo } from 'react';
import { HistoricalPoint } from '@/services/marketIndicesService';

interface SparklineChartProps {
  data: HistoricalPoint[];
  className?: string;
  color?: string;
  height?: number;
}

export const SparklineChart = ({
  data,
  className = '',
  color = 'hsl(var(--primary))',
  height = 60
}: SparklineChartProps) => {
  const { path, isPositiveTrend } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', isPositiveTrend: true };
    }

    const values = data.map(p => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    const width = 200;
    const padding = 4;
    const chartHeight = height - padding * 2;
    const stepX = width / (data.length - 1);

    // Build SVG path
    const pathData = data
      .map((point, index) => {
        const x = index * stepX;
        const normalizedValue = (point.value - minValue) / range;
        const y = chartHeight - (normalizedValue * chartHeight) + padding;
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');

    // Determine trend (first vs last)
    const isPositive = data[data.length - 1].value >= data[0].value;

    return { path: pathData, isPositiveTrend: isPositive };
  }, [data, height]);

  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-xs text-muted-foreground">No historical data</span>
      </div>
    );
  }

  const trendColor = isPositiveTrend ? 'hsl(142, 71%, 45%)' : 'hsl(var(--destructive))';
  const finalColor = color === 'auto' ? trendColor : color;

  return (
    <svg
      className={`w-full ${className}`}
      height={height}
      viewBox={`0 0 200 ${height}`}
      preserveAspectRatio="none"
    >
      {/* Gradient for fill */}
      <defs>
        <linearGradient id={`gradient-${data[0].timestamp}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={finalColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={finalColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Fill area under the curve */}
      <path
        d={`${path} L 200,${height} L 0,${height} Z`}
        fill={`url(#gradient-${data[0].timestamp})`}
        className="transition-all duration-300"
      />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={finalColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
    </svg>
  );
};
