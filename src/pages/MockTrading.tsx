/**
 * Mock Trading Page - Binance-Inspired Professional Interface
 * Clean, minimal, and well-structured for real trading experience
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  History, 
  RotateCcw, 
  Search, 
  Settings, 
  BarChart3,
  X
} from 'lucide-react';
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
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [calculatedPositionSize, setCalculatedPositionSize] = useState(0);

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

  // Load crypto data
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

  // Get selected coin
  const selectedCoin = useMemo(() => {
    const symbol = selectedSymbol.replace('USDT', '').toLowerCase();
    return coins.find(c => c.symbol.toLowerCase() === symbol);
  }, [selectedSymbol, coins]);

  const currentPrice = selectedCoin?.current_price ?? 0;
  const priceChange24h = selectedCoin?.price_change_percentage_24h ?? 0;

  // Filter coins
  const filteredCoins = useMemo(() => {
    if (!searchQuery) return coins;
    return coins.filter(coin => 
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, coins]);

  // Update positions in real-time
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

  const handleApplyPositionSize = () => {
    if (calculatedPositionSize > 0 && currentPrice > 0) {
      const qty = calculatedPositionSize / currentPrice;
      setQuantity(qty.toFixed(6));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header - Clean & Minimal */}
      <div className="h-14 border-b border-border/40 bg-card/30 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-base font-semibold">Paper Trading</h1>
            <p className="text-[10px] text-muted-foreground">Real-time simulation</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold font-mono">
                ${(account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Equity:</span>
              <span className="font-semibold font-mono">${accountValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`font-semibold ${totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">P&L:</span>
              <span className={`font-semibold font-mono ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${Math.abs(totalUnrealizedPnL).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(!showAnalytics)} className="h-8 text-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Analytics
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setBalanceDialogOpen(true)} className="h-8 text-xs">
            <Settings className="h-3.5 w-3.5 mr-1" />
            Balance
          </Button>
          <Button variant="ghost" size="sm" onClick={() => resetAccount()} className="h-8 text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Trading Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Coin List */}
        <div className="w-64 border-r border-border/40 flex flex-col bg-card/20">
          {/* Search */}
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search coins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background"
              />
            </div>
          </div>

          {/* Coin List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-2 space-y-1">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="p-1">
                {filteredCoins.map((coin) => {
                  const symbol = `${coin.symbol.toUpperCase()}USDT`;
                  const isSelected = selectedSymbol === symbol;
                  return (
                    <button
                      key={coin.id}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`w-full p-2 rounded transition-colors text-left ${
                        isSelected 
                          ? 'bg-primary/10 border-l-2 border-primary' 
                          : 'hover:bg-muted/50 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{coin.symbol.toUpperCase()}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{coin.name}</p>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs font-semibold font-mono">
                            ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                          </p>
                          <p className={`text-[10px] font-semibold ${
                            (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                            {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Center - Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Header */}
          <div className="h-12 border-b border-border/40 bg-card/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              {selectedCoin && (
                <img src={selectedCoin.image} alt={selectedCoin.name} className="w-6 h-6 rounded-full" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{selectedCoin?.name || selectedSymbol.replace('USDT', '')}</span>
                  <span className="text-[10px] text-muted-foreground">{selectedSymbol}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-lg font-bold font-mono">
                  ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                </span>
                <span className={`text-sm font-semibold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </span>
              </div>
            </div>
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

          {/* Bottom Panel - Positions & History */}
          <div className="h-64 border-t border-border/40 bg-card/10">
            <Tabs defaultValue="positions" className="h-full flex flex-col">
              <TabsList className="w-full h-10 rounded-none border-b border-border/40 bg-transparent justify-start px-4">
                <TabsTrigger value="positions" className="data-[state=active]:bg-background text-xs">
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-background text-xs">
                  History ({history.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {openPositions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Activity className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">No open positions</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="text-left pb-2 font-medium text-muted-foreground">Symbol</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground">Side</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Size</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Entry</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Current</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">P&L</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">P&L%</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openPositions.map((position) => (
                            <tr key={position.id} className="border-b border-border/40 hover:bg-muted/30">
                              <td className="py-3 font-semibold">{position.symbol.replace('USDT', '')}</td>
                              <td className="py-3">
                                <Badge 
                                  variant={position.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-[10px] px-2"
                                >
                                  {position.side}
                                </Badge>
                              </td>
                              <td className="py-3 text-right font-mono">{position.quantity.toFixed(4)}</td>
                              <td className="py-3 text-right font-mono">${position.entry_price.toFixed(2)}</td>
                              <td className="py-3 text-right font-mono">${position.current_price.toFixed(2)}</td>
                              <td className={`py-3 text-right font-mono font-semibold ${
                                position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
                              </td>
                              <td className={`py-3 text-right font-mono font-semibold ${
                                position.unrealized_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {position.unrealized_pnl_percent >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => closePosition({ positionId: position.id, exitPrice: position.current_price })}
                                  className="h-7 text-xs"
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
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <History className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">No trading history</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="text-left pb-2 font-medium text-muted-foreground">Symbol</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground">Side</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Entry</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">Exit</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">P&L</th>
                            <th className="text-right pb-2 font-medium text-muted-foreground">P&L%</th>
                            <th className="text-left pb-2 font-medium text-muted-foreground">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.slice(0, 50).map((trade) => (
                            <tr key={trade.id} className="border-b border-border/40 hover:bg-muted/30">
                              <td className="py-3 font-semibold">{trade.symbol.replace('USDT', '')}</td>
                              <td className="py-3">
                                <Badge 
                                  variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                                  className="text-[10px] px-2"
                                >
                                  {trade.side}
                                </Badge>
                              </td>
                              <td className="py-3 text-right font-mono">${trade.entry_price.toFixed(2)}</td>
                              <td className="py-3 text-right font-mono">${trade.exit_price.toFixed(2)}</td>
                              <td className={`py-3 text-right font-mono font-semibold ${
                                trade.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                              </td>
                              <td className={`py-3 text-right font-mono font-semibold ${
                                trade.profit_loss_percent >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {new Date(trade.closed_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Order Entry */}
        <div className="w-80 border-l border-border/40 flex flex-col bg-card/20">
          {/* Order Form */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Side Selector */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'BUY' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('BUY')}
                  className={`h-10 ${orderSide === 'BUY' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-600/10 hover:text-green-600'}`}
                >
                  Buy / Long
                </Button>
                <Button
                  variant={orderSide === 'SELL' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('SELL')}
                  className={`h-10 ${orderSide === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-600/10 hover:text-red-600'}`}
                >
                  Sell / Short
                </Button>
              </div>

              {/* Leverage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Leverage</Label>
                  <Badge variant="secondary" className="text-xs font-mono">{leverage}x</Badge>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1x</span>
                  <span>25x</span>
                  <span>50x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-xs">Amount ({selectedSymbol.replace('USDT', '')})</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 font-mono"
                />
                {quantity && currentPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ ${(parseFloat(quantity) * currentPrice).toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Quick Percentage */}
              <div className="grid grid-cols-4 gap-2">
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
                    className="h-8 text-xs"
                  >
                    {percent}%
                  </Button>
                ))}
              </div>

              <Separator />

              {/* Stop Loss & Take Profit */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Stop Loss (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Take Profit (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                className={`w-full h-11 font-semibold ${
                  orderSide === 'BUY' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
              >
                {isPlacingOrder ? 'Placing Order...' : `${orderSide === 'BUY' ? 'Open Long' : 'Open Short'}`}
              </Button>

              {/* Risk Management Tool */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRiskPanel(!showRiskPanel)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Risk Management
              </Button>
            </div>
          </div>
        </div>

        {/* Risk Panel Overlay */}
        {showRiskPanel && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-full max-w-2xl max-h-[80vh] bg-card rounded-lg shadow-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold">Risk Management</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRiskPanel(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-[calc(80vh-80px)]">
                <div className="p-4">
                  <RiskManagementPanel
                    accountBalance={account?.balance || 0}
                    currentPrice={currentPrice}
                    symbol={selectedSymbol}
                    openPositionsCount={openPositions.length}
                    onPositionSizeCalculated={setCalculatedPositionSize}
                  />
                  {calculatedPositionSize > 0 && (
                    <Button
                      className="w-full mt-4"
                      onClick={() => {
                        handleApplyPositionSize();
                        setShowRiskPanel(false);
                      }}
                    >
                      Apply to Order
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Analytics Panel Overlay */}
        {showAnalytics && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-full max-w-4xl max-h-[80vh] bg-card rounded-lg shadow-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold">Trading Analytics</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-[calc(80vh-80px)]">
                <div className="p-4">
                  <TradingAnalytics account={account} history={history} />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

      {/* Custom Balance Dialog */}
      <CustomBalanceDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        currentBalance={account?.balance || 10000}
        onSetBalance={handleSetCustomBalance}
      />
    </div>
  );
}
