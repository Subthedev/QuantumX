import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
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
      {/* Header */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Markets */}
        <aside className="w-60 bg-card border-r border-border flex flex-col">
          <div className="h-10 px-3 flex items-center border-b border-border">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 text-xs"
              />
            </div>
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
                      className={`w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors border-b border-border ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={coin.image} alt="" className="w-5 h-5 rounded-full" />
                        <span className="text-xs font-medium">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono">
                          ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                        </div>
                        <div className={`text-[10px] font-mono ${
                          (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                          {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Chart Header */}
          <div className="h-11 bg-card border-b border-border px-4 flex items-center gap-4">
            {selectedCoin && (
              <>
                <img src={selectedCoin.image} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-sm font-semibold">
                  {selectedCoin.symbol.toUpperCase()}/USDT
                </span>
                <span className="text-lg font-mono font-bold">
                  ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                </span>
                <span className={`text-xs font-mono font-semibold ${
                  priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </span>
              </>
            )}
          </div>
          
          {/* Chart */}
          <div className="flex-1 bg-background">
            <TradingViewChart
              coinId={selectedCoin?.id || 'bitcoin'}
              symbol={selectedCoin?.symbol || 'BTC'}
              currentPrice={currentPrice}
              key={selectedSymbol}
            />
          </div>

          {/* Bottom Panel */}
          <div className="h-56 bg-card border-t border-border">
            <Tabs defaultValue="positions" className="h-full flex flex-col">
              <TabsList className="h-10 rounded-none bg-transparent border-b border-border justify-start px-4">
                <TabsTrigger value="positions" className="text-xs">
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  History
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs">
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {openPositions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      No Open Positions
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr className="text-muted-foreground text-left">
                          <th className="py-2 px-4 font-medium">Symbol</th>
                          <th className="py-2 px-4 font-medium">Side</th>
                          <th className="py-2 px-4 font-medium text-right">Size</th>
                          <th className="py-2 px-4 font-medium text-right">Entry</th>
                          <th className="py-2 px-4 font-medium text-right">Current</th>
                          <th className="py-2 px-4 font-medium text-right">P&L</th>
                          <th className="py-2 px-4 font-medium text-right">P&L%</th>
                          <th className="py-2 px-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((pos) => (
                          <tr key={pos.id} className="border-t border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-medium">{pos.symbol.replace('USDT', '')}</td>
                            <td className="py-2 px-4">
                              <span className={`text-[10px] font-bold ${
                                pos.side === 'BUY' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right font-mono">{pos.quantity.toFixed(4)}</td>
                            <td className="py-2 px-4 text-right font-mono">${pos.entry_price.toFixed(2)}</td>
                            <td className="py-2 px-4 text-right font-mono">${pos.current_price.toFixed(2)}</td>
                            <td className={`py-2 px-4 text-right font-mono font-semibold ${
                              pos.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                            </td>
                            <td className={`py-2 px-4 text-right font-mono font-semibold ${
                              pos.unrealized_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%
                            </td>
                            <td className="py-2 px-4 text-right">
                              <Button
                                size="sm"
                                onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                                className="h-6 text-[10px] bg-red-500 hover:bg-red-600"
                              >
                                Close
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {history.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                      No Trade History
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr className="text-muted-foreground text-left">
                          <th className="py-2 px-4 font-medium">Symbol</th>
                          <th className="py-2 px-4 font-medium">Side</th>
                          <th className="py-2 px-4 font-medium text-right">Entry</th>
                          <th className="py-2 px-4 font-medium text-right">Exit</th>
                          <th className="py-2 px-4 font-medium text-right">P&L</th>
                          <th className="py-2 px-4 font-medium text-right">P&L%</th>
                          <th className="py-2 px-4 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 50).map((trade) => (
                          <tr key={trade.id} className="border-t border-border hover:bg-accent/50">
                            <td className="py-2 px-4 font-medium">{trade.symbol.replace('USDT', '')}</td>
                            <td className="py-2 px-4">
                              <span className={`text-[10px] font-bold ${
                                trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right font-mono">${trade.entry_price.toFixed(2)}</td>
                            <td className="py-2 px-4 text-right font-mono">${trade.exit_price.toFixed(2)}</td>
                            <td className={`py-2 px-4 text-right font-mono font-semibold ${
                              trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                            </td>
                            <td className={`py-2 px-4 text-right font-mono font-semibold ${
                              trade.profit_loss_percent >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                            </td>
                            <td className="py-2 px-4 text-muted-foreground text-[10px]">
                              {new Date(trade.closed_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <TradingAnalytics account={account} history={history} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
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
    </div>
  );
}
