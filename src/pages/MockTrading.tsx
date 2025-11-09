/**
 * Mock Trading Page
 * Real-time paper trading with live market data
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { RiskManagementPanel } from '@/components/trading/RiskManagementPanel';
import { TradingAnalytics } from '@/components/trading/TradingAnalytics';
import { CustomBalanceDialog } from '@/components/trading/CustomBalanceDialog';
import { TrendingUp, TrendingDown, DollarSign, Activity, History, RotateCcw, ArrowUpRight, ArrowDownRight, Search, Zap, Settings, BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';
import type { CryptoData } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';

export default function MockTrading() {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [coins, setCoins] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [calculatedPositionSize, setCalculatedPositionSize] = useState(0);

  // Use the exact same service as dashboard
  const loadCryptoData = useCallback(async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(100);
      setCoins(data);
    } catch (error) {
      console.error('Failed to load coins:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCryptoData();
    // Refresh every 2 minutes like dashboard
    const interval = setInterval(loadCryptoData, 120000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);

  // Get selected coin data
  const selectedCoin = useMemo(() => {
    const symbol = selectedSymbol.replace('USDT', '').toLowerCase();
    return coins.find(c => c.symbol.toLowerCase() === symbol);
  }, [selectedSymbol, coins]);
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

  const currentPrice = selectedCoin?.current_price ?? 0;
  const priceChange24h = selectedCoin?.price_change_percentage_24h ?? 0;

  // Filter coins based on search - show all 100 coins by default like dashboard
  const filteredCoins = useMemo(() => {
    if (!searchQuery) {
      return coins; // Show all 100 coins by default
    }
    return coins.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, coins]);

  // Update all open position prices in real-time
  useEffect(() => {
    if (!openPositions.length || !coins.length) return;
    
    const interval = setInterval(() => {
      openPositions.forEach(position => {
        const symbol = position.symbol.replace('USDT', '').toLowerCase();
        const coin = coins.find(c => c.symbol.toLowerCase() === symbol);
        if (coin?.current_price) {
          updatePrices(position.symbol, coin.current_price);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [openPositions, coins, updatePrices]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handlePlaceOrder = () => {
    if (!quantity || !currentPrice) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const effectivePrice = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : currentPrice;

    placeOrder({
      symbol: selectedSymbol,
      side: orderSide,
      quantity: qty * leverage, // Apply leverage to quantity
      price: effectivePrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });

    // Reset form
    setQuantity('');
    setLimitPrice('');
    setStopLoss('');
    setTakeProfit('');
  };

  const calculateMargin = () => {
    if (!quantity || !currentPrice) return 0;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return 0;
    return (qty * currentPrice) / leverage;
  };

  const calculatePotentialPnL = (percentage: number) => {
    if (!quantity || !currentPrice) return 0;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return 0;
    return (qty * currentPrice * (percentage / 100) * leverage) * (orderSide === 'BUY' ? 1 : -1);
  };

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const accountValue = (account?.balance || 0) + totalUnrealizedPnL;
  const totalReturn = account ? ((accountValue - account.initial_balance) / account.initial_balance) * 100 : 0;

  // Custom balance setter
  const handleSetCustomBalance = async (newBalance: number) => {
    if (!user) return;
    
    try {
      await supabase
        .from('mock_trading_accounts')
        .update({
          balance: newBalance,
          initial_balance: newBalance,
          total_profit_loss: 0,
          total_trades: 0,
          winning_trades: 0,
          losing_trades: 0
        })
        .eq('user_id', user.id);
      
      // Refresh account data
      window.location.reload();
    } catch (error) {
      console.error('Failed to set custom balance:', error);
    }
  };

  // Apply calculated position size to quantity
  const handleApplyPositionSize = () => {
    if (calculatedPositionSize > 0 && currentPrice > 0) {
      const qty = calculatedPositionSize / currentPrice;
      setQuantity(qty.toFixed(6));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-foreground">Paper Trading</h1>
              <p className="text-xs text-muted-foreground">Real-time simulation • All 100 coins</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setBalanceDialogOpen(true)} 
                className="gap-2"
              >
                <Settings className="h-3 w-3" />
                Set Balance
              </Button>
              <Button variant="outline" size="sm" onClick={() => resetAccount()} className="gap-2">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="px-4 py-2 flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Balance:</span>
              <span className="text-sm font-semibold text-foreground">
                ${(account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Equity:</span>
              <span className="text-sm font-semibold text-foreground">
                ${accountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Unrealized P&L:</span>
              <span className={`text-sm font-semibold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${Math.abs(totalUnrealizedPnL).toFixed(2)}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Win Rate:</span>
              <span className="text-sm font-semibold text-foreground">
                {account?.total_trades ? ((account.winning_trades / account.total_trades) * 100).toFixed(1) : '0'}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({account?.winning_trades || 0}W/{account?.losing_trades || 0}L)
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 min-w-fit">
              <span className="text-xs text-muted-foreground">Positions:</span>
              <Badge variant="secondary" className="text-xs">{openPositions.length}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0 h-[calc(100vh-140px)]">
          {/* Left - Compact Coin List */}
          <div className="col-span-2 flex flex-col border-r border-border/40 bg-card/20">
            {/* Symbol Search */}
            <div className="p-2 border-b border-border/40 bg-card/30">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>

            {/* Compact Symbol List with Scroll */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-2 space-y-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1.5 animate-pulse">
                        <div className="w-6 h-6 bg-muted rounded-full" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                        <div className="h-3 bg-muted rounded w-12" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-1 space-y-0.5">
                    {filteredCoins.map((coin) => {
                      const symbol = `${coin.symbol.toUpperCase()}USDT`;
                      const isSelected = selectedSymbol === symbol;
                      return (
                        <button
                          key={coin.id}
                          onClick={() => setSelectedSymbol(symbol)}
                          className={`w-full px-2 py-1.5 rounded text-left transition-all ${
                            isSelected 
                              ? 'bg-primary/15 border-l-2 border-primary' 
                              : 'hover:bg-muted/30 border-l-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <img 
                              src={coin.image} 
                              alt={coin.name}
                              className="w-6 h-6 rounded-full"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{coin.symbol.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold">
                                ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(4)}
                              </p>
                              <p className={`text-[10px] font-semibold ${
                                (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                                {(coin.price_change_percentage_24h ?? 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {filteredCoins.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No pairs found
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Center-Left - Order Entry */}
          <div className="col-span-2 flex flex-col border-r border-border/40 bg-card/10">
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-3 bg-card/30">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Futures Order</Label>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {selectedSymbol.replace('USDT', '')}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                    <Zap className="h-2.5 w-2.5" />
                    {leverage}x
                  </Badge>
                </div>

                {/* Current Price */}
                <div className="p-2 bg-muted/50 rounded border border-border/40 mb-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {selectedCoin && (
                      <img src={selectedCoin.image} alt={selectedCoin.name} className="w-4 h-4 rounded-full" />
                    )}
                    <p className="text-[10px] text-muted-foreground">Mark Price</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold">
                      ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                    </p>
                    <p className={`text-xs font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Order Type Toggle */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <Button
                    variant={orderType === 'MARKET' ? 'default' : 'outline'}
                    onClick={() => setOrderType('MARKET')}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Market
                  </Button>
                  <Button
                    variant={orderType === 'LIMIT' ? 'default' : 'outline'}
                    onClick={() => setOrderType('LIMIT')}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Limit
                  </Button>
                </div>

                {/* Limit Price (conditional) */}
                {orderType === 'LIMIT' && (
                  <div className="space-y-1 mb-3">
                    <Label className="text-xs">Limit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={currentPrice.toString()}
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                {/* Order Side - Green/Red */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button
                    variant={orderSide === 'BUY' ? 'default' : 'outline'}
                    onClick={() => setOrderSide('BUY')}
                    size="sm"
                    className={`h-8 gap-1 ${orderSide === 'BUY' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-600/10 hover:text-green-600'}`}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Long
                  </Button>
                  <Button
                    variant={orderSide === 'SELL' ? 'default' : 'outline'}
                    onClick={() => setOrderSide('SELL')}
                    size="sm"
                    className={`h-8 gap-1 ${orderSide === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-600/10 hover:text-red-600'}`}
                  >
                    <ArrowDownRight className="h-3 w-3" />
                    Short
                  </Button>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Leverage</Label>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 font-bold">
                        {leverage}x
                      </Badge>
                    </div>
                  </div>
                  <Slider
                    value={[leverage]}
                    onValueChange={(val) => setLeverage(val[0])}
                    min={1}
                    max={125}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>1x</span>
                    <span>25x</span>
                    <span>50x</span>
                    <span>75x</span>
                    <span>125x</span>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1 mb-3">
                  <Label className="text-xs">Amount ({selectedSymbol.replace('USDT', '')})</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-8 text-xs"
                  />
                  {quantity && currentPrice > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Cost: ${calculateMargin().toFixed(2)}</span>
                      <span>Value: ${(parseFloat(quantity) * currentPrice).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const balance = account?.balance || 0;
                        const amount = (balance * (percent / 100)) / currentPrice;
                        setQuantity(amount.toFixed(6));
                      }}
                      className="h-6 text-[10px] px-1"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {/* Stop Loss & Take Profit */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Stop Loss</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Take Profit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* Potential PnL Preview */}
                {quantity && currentPrice > 0 && (
                  <div className="p-2 bg-muted/30 rounded text-[10px] space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Margin:</span>
                      <span className="font-semibold">${calculateMargin().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+1% PnL:</span>
                      <span className="text-green-500 font-semibold">+${Math.abs(calculatePotentialPnL(1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">-1% PnL:</span>
                      <span className="text-red-500 font-semibold">-${Math.abs(calculatePotentialPnL(-1)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Place Order Button */}
                <Button
                  className={`w-full h-9 font-semibold ${
                    orderSide === 'BUY' 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  onClick={handlePlaceOrder}
                  disabled={!quantity || !currentPrice || currentPrice === 0 || isPlacingOrder}
                >
                  {isPlacingOrder ? 'Placing...' : `${orderSide === 'BUY' ? 'Open Long' : 'Open Short'}`}
                </Button>
              </div>
            </div>
          </div>

          {/* Center - Chart */}
          <div className="col-span-5 flex flex-col border-r border-border/40">
            {/* Chart Header */}
            <div className="p-3 border-b border-border/40 bg-card/20">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {selectedCoin && (
                    <img 
                      src={selectedCoin.image} 
                      alt={selectedCoin.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-bold">{selectedCoin?.name || selectedSymbol.replace('USDT', '')}</h2>
                    <p className="text-[10px] text-muted-foreground uppercase">{selectedSymbol}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                  </span>
                  <span className={`text-sm font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 bg-card/10">
              <div className="h-full" style={{ minHeight: '400px' }}>
                <TradingViewChart
                  coinId={selectedCoin?.id || 'bitcoin'}
                  symbol={selectedCoin?.symbol || 'BTC'}
                  currentPrice={currentPrice}
                  key={selectedSymbol}
                />
              </div>
            </div>
          </div>

          {/* Right - Risk & Analytics */}
          <div className="col-span-3 flex flex-col bg-card/20">
            <Tabs defaultValue="positions" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent p-0">
                <TabsTrigger 
                  value="positions" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
                >
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="risk" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
                >
                  Risk Mgmt
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs"
                >
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {openPositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Activity className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No open positions</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {openPositions.map((position) => (
                        <div key={position.id} className="p-3 rounded-lg border border-border/40 bg-card/50 hover:bg-card transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{position.symbol.replace('USDT', '')}</span>
                                <Badge 
                                  variant={position.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-xs px-1.5 py-0"
                                >
                                  {position.side}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Entry: ${position.entry_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {position.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}${Math.abs(position.unrealized_pnl).toFixed(2)}
                              </p>
                              <p className={`text-xs font-semibold ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <span className="text-xs text-muted-foreground">
                              Current: ${position.current_price.toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => closePosition({ positionId: position.id, exitPrice: position.current_price })}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="risk" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <RiskManagementPanel
                      accountBalance={account?.balance || 0}
                      currentPrice={currentPrice}
                      symbol={selectedSymbol}
                      openPositionsCount={openPositions.length}
                      onPositionSizeCalculated={setCalculatedPositionSize}
                    />
                    {calculatedPositionSize > 0 && (
                      <Button
                        className="w-full mt-3"
                        variant="outline"
                        onClick={handleApplyPositionSize}
                      >
                        Apply Position Size to Order
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <TradingAnalytics account={account} history={history} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <History className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">No trading history</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {history.slice(0, 50).map((trade) => (
                        <div key={trade.id} className="p-3 rounded-lg border border-border/40 bg-card/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{trade.symbol.replace('USDT', '')}</span>
                                <Badge 
                                  variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-xs px-1.5 py-0"
                                >
                                  {trade.side}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ${trade.entry_price.toFixed(2)} → ${trade.exit_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(trade.closed_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}${Math.abs(trade.profit_loss).toFixed(2)}
                              </p>
                              <p className={`text-xs font-semibold ${trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.profit_loss >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Custom Balance Dialog */}
        <CustomBalanceDialog
          open={balanceDialogOpen}
          onOpenChange={setBalanceDialogOpen}
          currentBalance={account?.balance || 10000}
          onSetBalance={handleSetCustomBalance}
        />
      </div>
    </div>
  );
}
