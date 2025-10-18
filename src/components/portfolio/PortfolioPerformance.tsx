import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Holding {
  coin_symbol: string;
  coin_name: string;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
}

interface PortfolioPerformanceProps {
  holdings: Holding[];
}

const PortfolioPerformanceComponent = ({ holdings }: PortfolioPerformanceProps) => {
  const performanceData = holdings
    .filter(h => h.value && h.value > 0)
    .map((holding) => ({
      name: holding.coin_symbol.toUpperCase(),
      fullName: holding.coin_name,
      performance: holding.profit_loss_percentage || 0,
      value: holding.value || 0,
    }))
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 8);

  const gainers = performanceData.filter(d => d.performance > 0);
  const losers = performanceData.filter(d => d.performance < 0);

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-base md:text-lg">Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart 
            data={performanceData} 
            margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)}%`, 'P&L']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar 
              dataKey="performance" 
              fill="hsl(var(--primary))"
              radius={[6, 6, 0, 0]}
            >
              {performanceData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.performance >= 0 ? '#16DB65' : '#FF5F6D'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-xs text-muted-foreground mb-1">Gainers</div>
            <div className="text-xl md:text-2xl font-bold text-green-500">
              {gainers.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {gainers.length > 0 ? `Avg: +${(gainers.reduce((sum, g) => sum + g.performance, 0) / gainers.length).toFixed(1)}%` : 'No gainers'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-xs text-muted-foreground mb-1">Losers</div>
            <div className="text-xl md:text-2xl font-bold text-red-500">
              {losers.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {losers.length > 0 ? `Avg: ${(losers.reduce((sum, l) => sum + l.performance, 0) / losers.length).toFixed(1)}%` : 'No losers'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PortfolioPerformance = memo(PortfolioPerformanceComponent);
