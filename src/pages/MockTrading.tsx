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
      {/* Top Header - Professional Layout */}
      <header className="h-14 bg-card border-b border-border flex items-center px-4">
        <div className="flex items-center flex-1 gap-6">
          {/* Market Selector */}
          <Sheet open={marketsOpen} onOpenChange={setMarketsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 hover:bg-accent">
                {selectedCoin && <img src={selectedCoin.image} alt="" className="w-5 h-5 rounded-full" />}
                <span className="text-sm font-semibold">
                  {selectedCoin?.symbol.toUpperCase() || 'BTC'}/USDT
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
          <div className="flex items-center gap-1">
            <span className="text-xl font-mono font-bold">
              ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold ${
              priceChange24h >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
            </div>
          </div>

          {/* 24h Stats */}
          <div className="flex items-center gap-4 text-xs border-l border-border pl-6">
            <div className="flex flex-col">
              <span className="text-muted-foreground">24h High</span>
              <span className="font-mono font-medium">${selectedCoin?.high_24h?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">24h Low</span>
              <span className="font-mono font-medium">${selectedCoin?.low_24h?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">24h Vol</span>
              <span className="font-mono font-medium">${((selectedCoin?.total_volume || 0) / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        {/* Right Side - Account & Actions */}
        <div className="flex items-center gap-4 ml-auto pl-6 border-l border-border">
          {/* Account Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-mono font-semibold">${(account?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Equity</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-semibold">${accountValue.toFixed(2)}</span>
                <span className={`font-mono font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ({totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9">
                  <BarChart3 className="h-4 w-4" />
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
                <Button variant="ghost" size="sm" className="h-9">
                  <History className="h-4 w-4" />
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

            <Button variant="ghost" size="sm" onClick={() => setBalanceDialogOpen(true)} className="h-9">
              <Settings className="h-4 w-4" />
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

          {/* Positions Bar - Sleek */}
          {openPositions.length > 0 && (
            <div className="h-24 bg-card border-t border-border">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">OPEN POSITIONS</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <span className="text-xs font-bold text-primary">{openPositions.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Total P&L:</span>
                  <span className={`text-sm font-mono font-bold ${
                    totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
                  </span>
                </div>
              </div>
              <ScrollArea className="w-full h-[60px]">
                <div className="flex gap-2 px-4 py-2">
                  {openPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className="flex-shrink-0 p-2.5 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border transition-colors min-w-[220px]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{pos.symbol.replace('USDT', '')}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pos.side === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {pos.side}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                          className="h-6 px-2 text-[10px] bg-red-500/80 hover:bg-red-500"
                        >
                          Close
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="text-muted-foreground">
                          <span className="font-mono">{pos.quantity.toFixed(4)}</span>
                          <span className="mx-1">@</span>
                          <span className="font-mono">${pos.entry_price.toFixed(2)}</span>
                        </div>
                        <div className={`font-mono font-bold ${
                          pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                          <span className="ml-1 text-[10px]">
                            ({pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Order Panel - Right Side */}
        <aside className="w-80 bg-card border-l border-border flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trade</h3>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`py-2 text-sm font-bold rounded-md transition-all ${
                    orderSide === 'BUY' 
                      ? 'bg-green-500 text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buy / Long
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`py-2 text-sm font-bold rounded-md transition-all ${
                    orderSide === 'SELL' 
                      ? 'bg-red-500 text-white shadow-md' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sell / Short
                </button>
              </div>
              {/* Leverage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leverage</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md">
                    <span className="text-sm font-mono font-bold text-primary">{leverage}x</span>
                  </div>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>100x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Amount ({selectedSymbol.replace('USDT', '')})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-11 text-base font-mono bg-background border-border focus-visible:ring-primary"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    ≈ ${(parseFloat(quantity) * currentPrice * leverage).toFixed(2)} USDT
                  </div>
                )}
              </div>

              {/* Quick % Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const amt = (balance * (pct / 100)) / currentPrice / leverage;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-1.5 text-xs font-semibold bg-muted hover:bg-accent rounded-md transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Stop Loss
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-10 text-sm font-mono bg-background border-border"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Take Profit
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-10 text-sm font-mono bg-background border-border"
                />
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
                className={`w-full h-12 text-sm font-bold tracking-wide ${
                  orderSide === 'BUY' 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20' 
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                }`}
              >
                {isPlacingOrder ? 'Placing Order...' : orderSide === 'BUY' ? 'Place Buy Order' : 'Place Sell Order'}
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
