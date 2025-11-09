import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useMockTrading } from '@/hooks/useMockTrading';
import { useAuth } from '@/hooks/useAuth';
import TradingViewChart from '@/components/charts/TradingViewChart';
import { TradingAnalytics } from '@/components/trading/TradingAnalytics';
import { CustomBalanceDialog } from '@/components/trading/CustomBalanceDialog';
import { Search, RotateCcw, Settings } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';
import type { CryptoData } from '@/services/cryptoDataService';
import { supabase } from '@/integrations/supabase/client';

function MockTradingContent() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
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
  const [mainView, setMainView] = useState<'chart' | 'positions' | 'history' | 'analytics'>('chart');

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
    <>
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-sm font-semibold">Paper Trading</h1>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-mono font-medium">${(account?.balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Equity:</span>
              <span className="font-mono font-medium">${accountValue.toFixed(2)}</span>
              <span className={`font-mono font-medium ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Unrealized P&L:</span>
              <span className={`font-mono font-medium ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setBalanceDialogOpen(true)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Balance
          </Button>
          <Button variant="ghost" size="sm" onClick={() => resetAccount()}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Markets Sidebar */}
        <Sidebar collapsible="icon" className={collapsed ? "w-16" : "w-64"}>
          <SidebarContent>
            <div className="p-3 border-b border-border">
              {!collapsed && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-2 space-y-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div>
                  {filteredCoins.map((coin) => {
                    const symbol = `${coin.symbol.toUpperCase()}USDT`;
                    const isSelected = selectedSymbol === symbol;
                    return (
                      <button
                        key={coin.id}
                        onClick={() => setSelectedSymbol(symbol)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border ${
                          isSelected ? 'bg-accent' : ''
                        }`}
                        title={collapsed ? `${coin.name} - $${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}` : ''}
                      >
                        <img src={coin.image} alt="" className="w-6 h-6 rounded-full shrink-0" />
                        {!collapsed && (
                          <>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium">{coin.symbol.toUpperCase()}</span>
                                <span className={`text-[10px] font-mono ${
                                  (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                                  {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                                </span>
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">
                                ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                              </div>
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Price Header + View Tabs */}
          <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {selectedCoin && (
                <>
                  <img src={selectedCoin.image} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-semibold">
                    {selectedCoin.symbol.toUpperCase()}/USDT
                  </span>
                  <span className="text-xl font-mono font-bold">
                    ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                  </span>
                  <span className={`text-sm font-mono font-semibold ${
                    priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </span>
                </>
              )}
            </div>

            {/* View Tabs */}
            <Tabs value={mainView} onValueChange={(v) => setMainView(v as any)} className="h-full">
              <TabsList className="h-full bg-transparent border-0">
                <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
                <TabsTrigger value="positions" className="text-xs">
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area - Full Height */}
          <div className="flex-1 bg-background overflow-hidden">
            {mainView === 'chart' && (
              <TradingViewChart
                coinId={selectedCoin?.id || 'bitcoin'}
                symbol={selectedCoin?.symbol || 'BTC'}
                currentPrice={currentPrice}
                key={selectedSymbol}
              />
            )}

            {mainView === 'positions' && (
              <ScrollArea className="h-full">
                {openPositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No Open Positions</p>
                    <p className="text-xs mt-2">Place an order to start trading</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr className="text-muted-foreground text-left">
                          <th className="py-3 px-4 font-medium">Symbol</th>
                          <th className="py-3 px-4 font-medium">Side</th>
                          <th className="py-3 px-4 font-medium text-right">Size</th>
                          <th className="py-3 px-4 font-medium text-right">Entry Price</th>
                          <th className="py-3 px-4 font-medium text-right">Mark Price</th>
                          <th className="py-3 px-4 font-medium text-right">Unrealized P&L</th>
                          <th className="py-3 px-4 font-medium text-right">ROI%</th>
                          <th className="py-3 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((pos) => (
                          <tr key={pos.id} className="border-t border-border hover:bg-accent/50">
                            <td className="py-3 px-4 font-semibold">{pos.symbol.replace('USDT', '')}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                pos.side === 'BUY' 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">{pos.quantity.toFixed(4)}</td>
                            <td className="py-3 px-4 text-right font-mono">${pos.entry_price.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono">${pos.current_price.toFixed(2)}</td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              pos.unrealized_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Close
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
            )}

            {mainView === 'history' && (
              <ScrollArea className="h-full">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No Trade History</p>
                    <p className="text-xs mt-2">Your closed trades will appear here</p>
                  </div>
                ) : (
                  <div className="p-4">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr className="text-muted-foreground text-left">
                          <th className="py-3 px-4 font-medium">Symbol</th>
                          <th className="py-3 px-4 font-medium">Side</th>
                          <th className="py-3 px-4 font-medium text-right">Entry Price</th>
                          <th className="py-3 px-4 font-medium text-right">Exit Price</th>
                          <th className="py-3 px-4 font-medium text-right">Realized P&L</th>
                          <th className="py-3 px-4 font-medium text-right">ROI%</th>
                          <th className="py-3 px-4 font-medium">Closed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 100).map((trade) => (
                          <tr key={trade.id} className="border-t border-border hover:bg-accent/50">
                            <td className="py-3 px-4 font-semibold">{trade.symbol.replace('USDT', '')}</td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                trade.side === 'BUY' 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : 'bg-red-500/10 text-red-500'
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
                  </div>
                )}
              </ScrollArea>
            )}

            {mainView === 'analytics' && (
              <ScrollArea className="h-full">
                <div className="p-6 max-w-7xl mx-auto">
                  <TradingAnalytics account={account} history={history} />
                </div>
              </ScrollArea>
            )}
          </div>
        </main>

        {/* Right Sidebar - Order Entry */}
        <aside className="w-72 bg-card border-l border-border flex flex-col">
          <div className="h-10 px-4 flex items-center border-b border-border">
            <span className="text-xs font-semibold">Spot</span>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`py-2 text-xs font-semibold rounded transition-colors ${
                    orderSide === 'BUY' 
                      ? 'bg-green-500 text-white' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`py-2 text-xs font-semibold rounded transition-colors ${
                    orderSide === 'SELL' 
                      ? 'bg-red-500 text-white' 
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
                  <span className="text-xs font-mono font-semibold">{leverage}x</span>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-[10px] text-muted-foreground">{selectedSymbol.replace('USDT', '')}</span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    ≈ ${(parseFloat(quantity) * currentPrice).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Quick Percentage Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const amt = (balance * (pct / 100)) / currentPrice;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Stop Loss</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Take Profit</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
                className={`w-full h-10 text-xs font-semibold ${
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
    </>
  );
}

export default function MockTrading() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex flex-col w-full bg-background">
        <MockTradingContent />
      </div>
    </SidebarProvider>
  );
}
