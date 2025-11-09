import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { TradingAnalytics } from '@/components/trading/TradingAnalytics';
import { CustomBalanceDialog } from '@/components/trading/CustomBalanceDialog';
import { Search, ChevronDown, BarChart3, History, Settings, RotateCcw, Menu } from 'lucide-react';
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
      {/* Top Header - Ultra Minimal */}
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Sheet open={marketsOpen} onOpenChange={setMarketsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {selectedCoin && <img src={selectedCoin.image} alt="" className="w-5 h-5 rounded-full" />}
                  <span className="text-sm font-semibold">
                    {selectedCoin?.symbol.toUpperCase() || 'BTC'}/USDT
                  </span>
                  <ChevronDown className="h-4 w-4" />
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

            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold">
                ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
              </span>
              <span className={`text-sm font-mono ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}% 24h
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground mr-2">Balance:</span>
              <span className="font-mono font-semibold">${(account?.balance || 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">Total:</span>
              <span className="font-mono font-semibold">${accountValue.toFixed(2)}</span>
              <span className={`ml-2 font-mono font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
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

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[800px] sm:max-w-[800px]">
                <SheetHeader>
                  <SheetTitle>Trade History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-6">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <History className="h-12 w-12 mb-4" />
                      <p>No trade history yet</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr className="text-muted-foreground text-left">
                          <th className="py-3 px-4 font-medium">Symbol</th>
                          <th className="py-3 px-4 font-medium">Side</th>
                          <th className="py-3 px-4 font-medium text-right">Entry</th>
                          <th className="py-3 px-4 font-medium text-right">Exit</th>
                          <th className="py-3 px-4 font-medium text-right">P&L</th>
                          <th className="py-3 px-4 font-medium text-right">ROI%</th>
                          <th className="py-3 px-4 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((trade) => (
                          <tr key={trade.id} className="border-t border-border hover:bg-accent/50">
                            <td className="py-3 px-4 font-semibold">{trade.symbol.replace('USDT', '')}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                trade.side === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">${trade.entry_price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono">${trade.exit_price.toFixed(2)}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              trade.profit_loss_percent >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">
                              {new Date(trade.closed_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="sm" onClick={() => setBalanceDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Main Trading Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area - Takes Most Space */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-background">
            <TradingViewChart
              coinId={selectedCoin?.id || 'bitcoin'}
              symbol={selectedCoin?.symbol || 'BTC'}
              currentPrice={currentPrice}
              key={selectedSymbol}
            />
          </div>

          {/* Positions Bar - Compact */}
          {openPositions.length > 0 && (
            <div className="h-20 bg-card border-t border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Open Positions ({openPositions.length})</span>
                <span className={`text-sm font-mono font-semibold ${
                  totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                </span>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3">
                  {openPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className="flex-shrink-0 p-3 bg-muted/50 rounded-lg border border-border min-w-[200px]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{pos.symbol.replace('USDT', '')}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          pos.side === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {pos.side}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {pos.quantity.toFixed(4)} @ ${pos.entry_price.toFixed(2)}
                        </span>
                        <span className={`font-mono font-bold ${
                          pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                        className="w-full mt-2 h-7 text-xs bg-red-500 hover:bg-red-600"
                      >
                        Close
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Order Panel - Right Side */}
        <aside className="w-80 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold mb-3">Place Order</h3>
            
            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  orderSide === 'BUY' 
                    ? 'bg-green-500 text-white shadow-lg' 
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  orderSide === 'SELL' 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Leverage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Leverage</span>
                  <span className="text-sm font-mono font-semibold">{leverage}x</span>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Amount ({selectedSymbol.replace('USDT', '')})</label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-11 text-sm font-mono"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ≈ ${(parseFloat(quantity) * currentPrice).toFixed(2)} USDT
                  </div>
                )}
              </div>

              {/* Quick % Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const amt = (balance * (pct / 100)) / currentPrice;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-2 text-xs font-medium bg-muted hover:bg-accent rounded transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Stop Loss (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Take Profit (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
                className={`w-full h-12 text-sm font-semibold ${
                  orderSide === 'BUY' 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isPlacingOrder ? 'Placing...' : orderSide === 'BUY' ? 'Buy / Long' : 'Sell / Short'}
              </Button>
            </div>
          </ScrollArea>
        </aside>
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
