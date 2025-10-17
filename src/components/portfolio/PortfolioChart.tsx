import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend as RechartsLegend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const performanceData = data.map(item => ({
    name: item.name,
    performance: item.profitLoss,
  })).slice(0, 8);

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
    <Tabs defaultValue="allocation" className="w-full">
      <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-4">
        <TabsTrigger value="allocation">Allocation</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="allocation" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portfolio Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
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
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl md:text-3xl font-bold">
                  {holdings.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Assets
                </div>
              </div>
            </div>

            {/* Legend List */}
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
              {data.map((item, index) => (
                <div 
                  key={item.name} 
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{item.fullName}</div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-semibold text-sm">
                      {item.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${(item.value / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'P&L']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
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
                <div className="text-xl font-bold text-green-500">
                  {data.filter(d => d.profitLoss > 0).length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-xs text-muted-foreground mb-1">Losers</div>
                <div className="text-xl font-bold text-red-500">
                  {data.filter(d => d.profitLoss < 0).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}