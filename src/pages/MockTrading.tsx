import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { TradingAnalytics } from '@/components/trading/TradingAnalytics';
import { CustomBalanceDialog } from '@/components/trading/CustomBalanceDialog';
import { Search, ChevronDown, BarChart3, History, Settings, RotateCcw, X } from 'lucide-react';
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
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [coins, setCoins] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);

  const {
    account,
    openPositions,
    history,
    placeOrder,
    closePosition,
    resetAccount,
    updatePrices,
    isPlacingOrder
  } = useMockTrading();

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
    const interval = setInterval(loadCryptoData, 120000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);

  const selectedCoin = useMemo(() => {
    const symbol = selectedSymbol.replace('USDT', '').toLowerCase();
    return coins.find(c => c.symbol.toLowerCase() === symbol);
  }, [selectedSymbol, coins]);

  const currentPrice = selectedCoin?.current_price ?? 0;
  const priceChange24h = selectedCoin?.price_change_percentage_24h ?? 0;

  const filteredCoins = useMemo(() => {
    if (!searchQuery) return coins;
    return coins.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, coins]);

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

  if (!user) return <Navigate to="/auth" replace />;

  const handlePlaceOrder = () => {
    if (!quantity || !currentPrice) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    placeOrder({
      symbol: selectedSymbol,
      side: orderSide,
      quantity: qty * leverage,
      price: currentPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    });

    setQuantity('');
    setStopLoss('');
    setTakeProfit('');
  };

  const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
  const accountValue = (account?.balance || 0) + totalUnrealizedPnL;
  const totalReturn = account ? ((accountValue - account.initial_balance) / account.initial_balance) * 100 : 0;

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
      window.location.reload();
    } catch (error) {
      console.error('Failed to set custom balance:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Compact Header - Hyperliquid Style */}
      <header className="h-12 border-b border-border/40 flex items-center px-3 bg-background">
        <div className="flex items-center flex-1 gap-4">
          {/* Market Selector */}
          <Sheet open={marketsOpen} onOpenChange={setMarketsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="h-8 gap-1.5 hover:bg-accent text-sm">
                {selectedCoin && <img src={selectedCoin.image} alt="" className="w-4 h-4 rounded-full" />}
                <span className="font-medium">
                  {selectedCoin?.symbol.toUpperCase() || 'BTC'}/USDT
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Markets</SheetTitle>
              </SheetHeader>
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-140px)]">
                {filteredCoins.map((coin) => {
                  const symbol = `${coin.symbol.toUpperCase()}USDT`;
                  const isSelected = selectedSymbol === symbol;
                  return (
                    <button
                      key={coin.id}
                      onClick={() => {
                        setSelectedSymbol(symbol);
                        setMarketsOpen(false);
                      }}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      <img src={coin.image} alt="" className="w-8 h-8 rounded-full" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">{coin.symbol.toUpperCase()}</span>
                          <span className={`text-sm font-mono ${
                            (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                            {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">
                          ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Price Display */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-mono ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
              </span>
              <span className={`text-xs ${priceChange24h >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>H ${selectedCoin?.high_24h?.toFixed(2) || '0.00'}</span>
              <span>L ${selectedCoin?.low_24h?.toFixed(2) || '0.00'}</span>
              <span>Vol ${((selectedCoin?.total_volume || 0) / 1e9).toFixed(2)}B</span>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-mono">${(account?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">Equity:</span>
              <span className="font-mono">${accountValue.toFixed(2)}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground">PnL:</span>
              <span className={`font-mono ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[600px] sm:max-w-[600px]">
                <SheetHeader>
                  <SheetTitle>Trading Analytics</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-6">
                  <TradingAnalytics account={account} history={history} />
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={() => setBalanceDialogOpen(true)} className="h-7 w-7">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Trading Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chart + Order Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 bg-card">
            <TradingViewChart
              coinId={selectedCoin?.id || 'bitcoin'}
              symbol={selectedCoin?.symbol || 'BTC'}
              currentPrice={currentPrice}
              key={selectedSymbol}
            />
          </div>

          {/* Order Panel - Right Side */}
          <div className="w-72 border-l border-border/40 bg-background flex flex-col">
            <div className="p-2 space-y-2.5">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted rounded">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`py-1.5 text-xs font-medium rounded transition-all ${
                    orderSide === 'BUY' 
                      ? 'bg-green-600 text-white' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`py-1.5 text-xs font-medium rounded transition-all ${
                    orderSide === 'SELL' 
                      ? 'bg-red-600 text-white' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Leverage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Leverage</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent rounded">
                    <span className="text-xs font-mono font-medium">{leverage}x</span>
                  </div>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1x</span>
                  <span>50x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Amount ({selectedSymbol.replace('USDT', '')})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    ≈ ${(parseFloat(quantity) * currentPrice * leverage).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Quick % Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const amt = (balance * (pct / 100)) / currentPrice / leverage;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-1 text-xs font-medium bg-muted hover:bg-accent rounded transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Stop Loss</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Take Profit</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
                className={`w-full h-10 text-sm font-medium ${
                  orderSide === 'BUY' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isPlacingOrder ? 'Placing...' : orderSide === 'BUY' ? 'Buy' : 'Sell'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Panel - Hyperliquid Style */}
        <div className="h-48 border-t border-border/40 bg-background">
          <Tabs defaultValue="positions" className="h-full flex flex-col">
            <div className="flex items-center px-3 py-1.5 border-b border-border/40">
              <TabsList className="h-8 bg-transparent p-0">
                <TabsTrigger value="positions" className="text-xs h-7 data-[state=active]:bg-accent">
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs h-7 data-[state=active]:bg-accent">
                  Orders (0)
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-7 data-[state=active]:bg-accent">
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="positions" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                {openPositions.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No open positions
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-8 gap-2 text-xs text-muted-foreground mb-2 px-2">
                      <div>Symbol</div>
                      <div>Side</div>
                      <div className="text-right">Size</div>
                      <div className="text-right">Entry</div>
                      <div className="text-right">Mark</div>
                      <div className="text-right">Liq.</div>
                      <div className="text-right">PnL</div>
                      <div className="text-right">Action</div>
                    </div>
                    {openPositions.map((pos) => {
                      return (
                        <div key={pos.id} className="grid grid-cols-8 gap-2 text-xs py-2 px-2 hover:bg-accent/50 rounded items-center">
                          <div className="font-medium">{pos.symbol.replace('USDT', '')}</div>
                          <div>
                            <Badge variant={pos.side === 'BUY' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0">
                              {pos.side}
                            </Badge>
                          </div>
                          <div className="text-right font-mono">{pos.quantity.toFixed(4)}</div>
                          <div className="text-right font-mono">${pos.entry_price.toFixed(2)}</div>
                          <div className="text-right font-mono">${pos.current_price.toFixed(2)}</div>
                          <div className="text-right font-mono text-muted-foreground">-</div>
                          <div className={`text-right font-mono font-medium ${pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${pos.unrealized_pnl.toFixed(2)} ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%)
                          </div>
                          <div className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="orders" className="flex-1 m-0 overflow-hidden">
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No open orders
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                {history.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No trade history
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2 px-2">
                      <div>Time</div>
                      <div>Symbol</div>
                      <div>Side</div>
                      <div className="text-right">Size</div>
                      <div className="text-right">Entry</div>
                      <div className="text-right">Exit</div>
                      <div className="text-right">PnL</div>
                    </div>
                    {history.map((trade) => (
                      <div key={trade.id} className="grid grid-cols-7 gap-2 text-xs py-2 px-2 hover:bg-accent/50 rounded items-center">
                        <div className="text-muted-foreground">
                          {new Date(trade.closed_at).toLocaleTimeString()}
                        </div>
                        <div className="font-medium">{trade.symbol.replace('USDT', '')}</div>
                        <div>
                          <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-xs px-1.5 py-0">
                            {trade.side}
                          </Badge>
                        </div>
                        <div className="text-right font-mono">{trade.quantity.toFixed(4)}</div>
                        <div className="text-right font-mono">${trade.entry_price.toFixed(2)}</div>
                        <div className="text-right font-mono">${trade.exit_price?.toFixed(2) || '-'}</div>
                        <div className={`text-right font-mono font-medium ${(trade.profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${trade.profit_loss?.toFixed(2) || '-'}
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

      <CustomBalanceDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        currentBalance={account?.balance || 10000}
        onSetBalance={handleSetCustomBalance}
      />
    </div>
  );
}
