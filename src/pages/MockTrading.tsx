/**
 * Mock Trading Page
 * Real-time paper trading with live market data
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import { useBinancePrices } from '@/hooks/useBinancePrices';
import { TrendingUp, TrendingDown, DollarSign, Activity, History, RotateCcw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const POPULAR_PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'];

export default function MockTrading() {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const { prices } = useBinancePrices({ symbols: POPULAR_PAIRS });
  const {
    account,
    openPositions,
    history,
    isLoading,
    placeOrder,
    closePosition,
    resetAccount,
    updatePrices,
    isPlacingOrder
  } = useMockTrading();

  const currentPrice = prices[selectedSymbol]?.price || 0;

  // Update position prices in real-time
  useEffect(() => {
    if (!currentPrice || !selectedSymbol) return;
    
    const interval = setInterval(() => {
      const price = prices[selectedSymbol]?.price;
      if (price) {
        updatePrices(selectedSymbol, price);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [prices, selectedSymbol, updatePrices]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handlePlaceOrder = () => {
    if (!quantity || !currentPrice) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    placeOrder({
      symbol: selectedSymbol,
      side: orderSide,
      quantity: qty,
      price: currentPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });

    // Reset form
    setQuantity('');
    setStopLoss('');
    setTakeProfit('');
  };

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const accountValue = (account?.balance || 0) + totalUnrealizedPnL;
  const totalReturn = account ? ((accountValue - account.initial_balance) / account.initial_balance) * 100 : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mock Trading</h1>
            <p className="text-muted-foreground mt-1">Practice trading with real-time market data</p>
          </div>
          <Button variant="outline" onClick={() => resetAccount()} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Account
          </Button>
        </div>

        {/* Account Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">${(account?.balance || 0).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">${accountValue.toFixed(2)}</span>
              </div>
              <p className={`text-sm mt-1 ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {totalUnrealizedPnL >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${Math.abs(totalUnrealizedPnL).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {account?.total_trades ? 
                    ((account.winning_trades / account.total_trades) * 100).toFixed(1) : 
                    '0'}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {account?.winning_trades || 0}W / {account?.losing_trades || 0}L
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Symbol Selection */}
              <div className="space-y-2">
                <Label>Trading Pair</Label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_PAIRS.map((symbol) => (
                    <Button
                      key={symbol}
                      variant={selectedSymbol === symbol ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSymbol(symbol)}
                      className="justify-start"
                    >
                      {symbol.replace('USDT', '')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Current Price */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
              </div>

              {/* Order Side */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'BUY' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('BUY')}
                  className="gap-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  BUY
                </Button>
                <Button
                  variant={orderSide === 'SELL' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('SELL')}
                  className="gap-2"
                >
                  <ArrowDownRight className="h-4 w-4" />
                  SELL
                </Button>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {quantity && currentPrice > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Total: ${(parseFloat(quantity) * currentPrice).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <Label>Stop Loss (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <Label>Take Profit (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing Order...' : `${orderSide} ${selectedSymbol.replace('USDT', '')}`}
              </Button>
            </CardContent>
          </Card>

          {/* Positions & History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Positions & History</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="positions">
                <TabsList className="w-full">
                  <TabsTrigger value="positions" className="flex-1">
                    Open Positions ({openPositions.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">
                    History ({history.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="space-y-3">
                  {openPositions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No open positions
                    </div>
                  ) : (
                    openPositions.map((position) => (
                      <Card key={position.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{position.symbol}</span>
                                <Badge variant={position.side === 'BUY' ? 'default' : 'secondary'}>
                                  {position.side}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Entry: ${position.entry_price.toFixed(2)} | Qty: {position.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
                              </p>
                              <p className={`text-sm ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              Current: ${position.current_price.toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => closePosition({ positionId: position.id, exitPrice: position.current_price })}
                            >
                              Close
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-3">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No trading history
                    </div>
                  ) : (
                    history.slice(0, 20).map((trade) => (
                      <Card key={trade.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{trade.symbol}</span>
                                <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                                  {trade.side}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Entry: ${trade.entry_price.toFixed(2)} → Exit: ${trade.exit_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(trade.closed_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                              </p>
                              <p className={`text-sm ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
