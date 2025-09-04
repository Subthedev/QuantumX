import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
interface TechnicalAnalysisProps {
  analysis: any;
  marketData: any;
}
export const TechnicalAnalysisSection: React.FC<TechnicalAnalysisProps> = ({
  analysis,
  marketData
}) => {
  const formatPrice = (value: number | string) => {
    if (typeof value === 'string') return value;
    if (value >= 100) return `$${value.toFixed(2)}`;
    if (value >= 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };
  const getTrendStrength = (trend: string) => {
    const trendLower = trend?.toLowerCase() || '';
    if (trendLower.includes('strong') && trendLower.includes('bullish')) return 90;
    if (trendLower.includes('bullish')) return 70;
    if (trendLower.includes('strong') && trendLower.includes('bearish')) return 30;
    if (trendLower.includes('bearish')) return 20;
    return 50;
  };
  const parseIndicators = (indicators: any) => {
    if (Array.isArray(indicators)) return indicators;
    if (typeof indicators === 'string') return indicators.split(',').map((i: string) => i.trim());
    return [];
  };
  const parseLevels = (levels: any) => {
    if (Array.isArray(levels)) return levels;
    if (typeof levels === 'string') {
      const matches = levels.match(/[\d.]+/g);
      return matches ? matches.map(Number) : [];
    }
    return [];
  };
  return;
};