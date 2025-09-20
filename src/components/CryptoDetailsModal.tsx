import React, { useEffect, useState } from 'react';
import { CryptoData, cryptoDataService } from '@/services/cryptoDataService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, DollarSign, Coins, Activity, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface CryptoDetailsModalProps {
  crypto: CryptoData;
}

const CryptoDetailsModal: React.FC<CryptoDetailsModalProps> = ({ crypto }) => {
  const [detailedData, setDetailedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetailedData();
  }, [crypto.id]);

  const loadDetailedData = async () => {
    try {
      const data = await cryptoDataService.getCryptoDetails(crypto.id);
      setDetailedData(data);
    } catch (error) {
      console.error('Error loading detailed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sparklineData = crypto.sparkline_in_7d?.price?.map((price, index) => ({
    time: index,
    price: price
  })) || [];

  const supplyPercentage = crypto.max_supply 
    ? (crypto.circulating_supply / crypto.max_supply) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center space-x-4">
          <img src={crypto.image} alt={crypto.name} className="w-12 h-12 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold">{crypto.name}</h2>
            <span className="text-muted-foreground uppercase">{crypto.symbol}</span>
          </div>
          <Badge variant="secondary">Rank #{crypto.market_cap_rank}</Badge>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">
            ${crypto.current_price.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: crypto.current_price < 1 ? 6 : 2
            })}
          </div>
          <div className={cn(
            "flex items-center justify-end space-x-1 text-sm",
            crypto.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {crypto.price_change_percentage_24h >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>7 Day Price Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `$${value.toFixed(crypto.current_price < 1 ? 6 : 2)}`}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Market Cap</span>
            </div>
            <div className="text-xl font-bold">
              {cryptoDataService.formatNumber(crypto.market_cap)}
            </div>
            <div className={cn(
              "text-xs",
              crypto.market_cap_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {cryptoDataService.formatPercentage(crypto.market_cap_change_percentage_24h)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-2">
              <BarChart3 className="w-4 h-4" />
              <span>24h Volume</span>
            </div>
            <div className="text-xl font-bold">
              {cryptoDataService.formatNumber(crypto.total_volume)}
            </div>
            <div className="text-xs text-muted-foreground">
              Vol/MCap: {((crypto.total_volume / crypto.market_cap) * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>24h High</span>
            </div>
            <div className="text-xl font-bold">
              ${crypto.high_24h.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto.high_24h < 1 ? 6 : 2
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-2">
              <TrendingDown className="w-4 h-4" />
              <span>24h Low</span>
            </div>
            <div className="text-xl font-bold">
              ${crypto.low_24h.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto.low_24h < 1 ? 6 : 2
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="w-5 h-5" />
            <span>Supply Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Circulating Supply</span>
              <span className="font-medium">
                {crypto.circulating_supply.toLocaleString(undefined, { maximumFractionDigits: 0 })} {crypto.symbol.toUpperCase()}
              </span>
            </div>
            {crypto.max_supply && (
              <>
                <Progress value={supplyPercentage} className="h-2" />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {supplyPercentage.toFixed(1)}% of max supply
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Max: {crypto.max_supply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </>
            )}
          </div>

          {crypto.total_supply && (
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total Supply</span>
              <span className="font-medium">
                {crypto.total_supply.toLocaleString(undefined, { maximumFractionDigits: 0 })} {crypto.symbol.toUpperCase()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All-Time High/Low */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">All-Time High</span>
              <Badge variant="secondary" className="text-xs">
                {new Date(crypto.ath_date).toLocaleDateString()}
              </Badge>
            </div>
            <div className="text-xl font-bold">
              ${crypto.ath.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto.ath < 1 ? 6 : 2
              })}
            </div>
            <div className="text-sm text-red-500">
              {crypto.ath_change_percentage.toFixed(2)}% from ATH
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">All-Time Low</span>
              <Badge variant="secondary" className="text-xs">
                {new Date(crypto.atl_date).toLocaleDateString()}
              </Badge>
            </div>
            <div className="text-xl font-bold">
              ${crypto.atl.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto.atl < 1 ? 8 : 2
              })}
            </div>
            <div className="text-sm text-green-500">
              +{crypto.atl_change_percentage.toFixed(2)}% from ATL
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CryptoDetailsModal;