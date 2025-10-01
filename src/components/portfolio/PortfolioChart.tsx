import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Holding {
  coin_symbol: string;
  coin_name: string;
  value?: number;
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

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null; // Don't show label for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-medium text-sm"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.percentage.toFixed(1)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 space-y-2">
        {data.slice(0, 5).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div>
                <span className="font-medium">{item.fullName}</span>
                <span className="text-sm text-muted-foreground ml-2">({item.name})</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                ${item.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.percentage.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}