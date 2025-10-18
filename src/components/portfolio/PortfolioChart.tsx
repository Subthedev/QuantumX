import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Holding {
  coin_symbol: string;
  coin_name: string;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
}

interface PortfolioChartProps {
  holdings: Holding[];
}

const COLORS = [
  '#FF5F6D',
  '#16DB65',
  '#FFC371',
  '#5D9CEC',
  '#FC6767',
  '#FF8CC3',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#FFD700',
  '#7B68EE',
  '#20B2AA',
];

export function PortfolioChart({ holdings }: PortfolioChartProps) {
  const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
  
  const data = holdings
    .filter(h => h.value && h.value > 0)
    .map((holding, index) => ({
      name: holding.coin_symbol.toUpperCase(),
      value: holding.value || 0,
      percentage: ((holding.value || 0) / totalValue) * 100,
      fullName: holding.coin_name,
      profitLoss: holding.profit_loss_percentage || 0,
      profitLossValue: holding.profit_loss || 0,
    }))
    .sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">{data.name}</p>
          <p className="font-medium mt-1">
            Value: ${data.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className="text-sm">
            Allocation: {data.percentage.toFixed(2)}%
          </p>
          <p className={`text-sm ${data.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            P&L: {data.profitLoss >= 0 ? '+' : ''}{data.profitLoss.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-base md:text-lg">Portfolio Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Stats */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-2xl md:text-3xl font-bold">
              {holdings.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Assets
            </div>
          </div>
        </div>

        {/* Legend List */}
        <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto">
          {data.map((item, index) => (
            <div 
              key={item.name} 
              className="flex items-center justify-between p-2 md:p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs md:text-sm truncate">{item.fullName}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2 md:ml-3">
                <div className="font-semibold text-xs md:text-sm">
                  {item.percentage.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  ${item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value.toFixed(0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}