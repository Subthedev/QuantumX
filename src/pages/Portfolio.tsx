import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Edit2, Trash2, Wallet, ChartBar } from 'lucide-react';
import { MobileOptimizedHeader } from '@/components/MobileOptimizedHeader';
import { AddHoldingDialog } from '@/components/portfolio/AddHoldingDialog';
import { EditHoldingDialog } from '@/components/portfolio/EditHoldingDialog';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import { ProfitGuardRecommendations } from '@/components/portfolio/ProfitGuardRecommendations';
import { cryptoDataService } from '@/services/cryptoDataService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Holding {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
  current_price?: number;
  value?: number;
  profit_loss?: number;
  profit_loss_percentage?: number;
}

function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [marketData, setMarketData] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchHoldings();
    fetchMarketData();
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
    }, 60000); // Update prices every minute

    return () => clearInterval(interval);
  }, [holdings]);

  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHoldings(data || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portfolio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(250);
      const marketMap = new Map();
      data.forEach(coin => {
        marketMap.set(coin.id, coin);
      });
      setMarketData(marketMap);
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const calculatePortfolioMetrics = () => {
    let totalValue = 0;
    let totalCost = 0;
    let holdingsWithPrices = [];

    for (const holding of holdings) {
      const marketCoin = marketData.get(holding.coin_id);
      const currentPrice = marketCoin?.current_price || holding.purchase_price;
      const value = holding.quantity * currentPrice;
      const cost = holding.quantity * holding.purchase_price;
      const profitLoss = value - cost;
      const profitLossPercentage = cost > 0 ? (profitLoss / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      holdingsWithPrices.push({
        ...holding,
        current_price: currentPrice,
        value,
        profit_loss: profitLoss,
        profit_loss_percentage: profitLossPercentage,
      });
    }

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercentage = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalProfitLoss,
      totalProfitLossPercentage,
      holdings: holdingsWithPrices,
    };
  };

  const handleDeleteHolding = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Holding deleted successfully',
      });
      fetchHoldings();
    } catch (error) {
      console.error('Error deleting holding:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete holding',
        variant: 'destructive',
      });
    }
  };

  const metrics = calculatePortfolioMetrics();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileOptimizedHeader />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileOptimizedHeader />
      
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        {/* Header Section - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Portfolio Tracker</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Track your cryptocurrency investments
            </p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="w-full sm:w-auto gap-2"
            size="lg"
          >
            <Plus className="h-4 w-4" />
            Add Holding
          </Button>
        </div>

        {/* Portfolio Summary Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                <Wallet className="h-4 w-4" />
                Total Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                ${metrics.totalValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                <DollarSign className="h-4 w-4" />
                Total Cost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                ${metrics.totalCost.toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                {metrics.totalProfitLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                P&L
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-lg md:text-2xl font-bold ${
                metrics.totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                ${Math.abs(metrics.totalProfitLoss).toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })}
              </div>
              <Badge 
                variant={metrics.totalProfitLoss >= 0 ? 'default' : 'destructive'}
                className="mt-1 text-xs"
              >
                {metrics.totalProfitLoss >= 0 ? '+' : ''}{metrics.totalProfitLossPercentage.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader className="pb-2 md:pb-3">
              <CardDescription className="text-xs md:text-sm">Holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{holdings.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Positions</p>
            </CardContent>
          </Card>
        </div>

        {/* ProfitGuard Recommendations */}
        {holdings.length > 0 && metrics.holdings.length > 0 && (
          <div className="mb-6">
            <ProfitGuardRecommendations holdings={metrics.holdings} />
          </div>
        )}

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4">
            {metrics.holdings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
                    Start building your portfolio by adding your first cryptocurrency holding
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Holding
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Mobile View - Card Layout */}
                <div className="lg:hidden space-y-3">
                  {metrics.holdings.map((holding) => (
                    <Card key={holding.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={holding.coin_image} 
                              alt={holding.coin_name}
                              className="h-10 w-10 rounded-full"
                            />
                            <div>
                              <div className="font-semibold">{holding.coin_name}</div>
                              <div className="text-sm text-muted-foreground uppercase">
                                {holding.coin_symbol}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingHolding(holding)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteHolding(holding.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Quantity</p>
                            <p className="font-medium">
                              {holding.quantity.toLocaleString(undefined, { 
                                maximumFractionDigits: 4 
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Value</p>
                            <p className="font-medium">
                              ${holding.value?.toLocaleString(undefined, { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Avg Buy</p>
                            <p className="font-medium">
                              ${holding.purchase_price.toLocaleString(undefined, { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">P&L</p>
                            <p className={`font-medium ${holding.profit_loss! >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {holding.profit_loss! >= 0 ? '+' : ''}{holding.profit_loss_percentage?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop View - Table Layout */}
                <Card className="hidden lg:block">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="text-left p-4 font-medium">Asset</th>
                            <th className="text-right p-4 font-medium">Quantity</th>
                            <th className="text-right p-4 font-medium">Purchase Price</th>
                            <th className="text-right p-4 font-medium">Current Price</th>
                            <th className="text-right p-4 font-medium">Value</th>
                            <th className="text-right p-4 font-medium">P&L</th>
                            <th className="text-right p-4 font-medium">Date</th>
                            <th className="text-right p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.holdings.map((holding) => (
                            <tr key={holding.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={holding.coin_image} 
                                    alt={holding.coin_name}
                                    className="h-8 w-8 rounded-full"
                                  />
                                  <div>
                                    <div className="font-medium">{holding.coin_name}</div>
                                    <div className="text-sm text-muted-foreground uppercase">
                                      {holding.coin_symbol}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-right p-4">
                                {holding.quantity.toLocaleString(undefined, { 
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8 
                                })}
                              </td>
                              <td className="text-right p-4">
                                ${holding.purchase_price.toLocaleString(undefined, { 
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2 
                                })}
                              </td>
                              <td className="text-right p-4">
                                ${holding.current_price?.toLocaleString(undefined, { 
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2 
                                })}
                              </td>
                              <td className="text-right p-4 font-medium">
                                ${holding.value?.toLocaleString(undefined, { 
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2 
                                })}
                              </td>
                              <td className="text-right p-4">
                                <div className={holding.profit_loss! >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  <div className="font-medium">
                                    ${Math.abs(holding.profit_loss!).toLocaleString(undefined, { 
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2 
                                    })}
                                  </div>
                                  <div className="text-sm">
                                    {holding.profit_loss! >= 0 ? '+' : ''}{holding.profit_loss_percentage?.toFixed(2)}%
                                  </div>
                                </div>
                              </td>
                              <td className="text-right p-4 text-sm text-muted-foreground">
                                {format(new Date(holding.purchase_date), 'MMM dd, yyyy')}
                              </td>
                              <td className="text-right p-4">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingHolding(holding)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteHolding(holding.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="allocation">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
                <CardDescription>
                  Visual breakdown of your cryptocurrency holdings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.holdings.length > 0 ? (
                  <PortfolioChart holdings={metrics.holdings} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ChartBar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Add holdings to see your portfolio allocation
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddHoldingDialog 
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={fetchHoldings}
        />

        {editingHolding && (
          <EditHoldingDialog
            holding={editingHolding}
            open={!!editingHolding}
            onOpenChange={(open) => !open && setEditingHolding(null)}
            onSuccess={() => {
              fetchHoldings();
              setEditingHolding(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

export default Portfolio;