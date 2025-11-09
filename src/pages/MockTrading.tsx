/**
 * Mock Trading - Professional Binance-Inspired Interface
 * System Design: Clean, structured, everything visible at once
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
    <div className="h-screen flex flex-col bg-[#0B0E11]">
      {/* Top Header - 48px */}
      <div className="h-12 bg-[#161A1E] border-b border-[#23262B] flex items-center justify-between px-3">
        <div className="flex items-center gap-6 text-[11px]">
          <span className="text-sm font-semibold text-white">Paper Trading</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[#848E9C]">Balance:</span>
              <span className="text-white font-mono font-medium">
                ${(account?.balance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#848E9C]">Equity:</span>
              <span className="text-white font-mono font-medium">${accountValue.toFixed(2)}</span>
              <span className={`font-mono font-medium ${totalReturn >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#848E9C]">Unrealized P&L:</span>
              <span className={`font-mono font-medium ${totalUnrealizedPnL >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setBalanceDialogOpen(true)}
            className="h-7 text-[11px] text-[#848E9C] hover:text-white hover:bg-[#23262B]"
          >
            <Settings className="h-3 w-3 mr-1" />
            Balance
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => resetAccount()}
            className="h-7 text-[11px] text-[#848E9C] hover:text-white hover:bg-[#23262B]"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Market List (240px) */}
        <div className="w-60 bg-[#161A1E] border-r border-[#23262B] flex flex-col">
          <div className="h-10 px-2 flex items-center border-b border-[#23262B]">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2 h-3 w-3 text-[#474D57]" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 text-[11px] bg-[#0B0E11] border-[#23262B] text-white placeholder:text-[#474D57]"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-2 space-y-0.5">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-11 bg-[#0B0E11] rounded animate-pulse" />
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
                      className={`w-full px-2 py-1.5 flex items-center justify-between hover:bg-[#23262B] transition-colors ${
                        isSelected ? 'bg-[#23262B]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={coin.image} alt="" className="w-5 h-5 rounded-full" />
                        <span className="text-[11px] font-medium text-white">{coin.symbol.toUpperCase()}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-mono text-white">
                          ${coin.current_price >= 1 ? coin.current_price.toFixed(2) : coin.current_price.toFixed(6)}
                        </div>
                        <div className={`text-[10px] font-mono ${
                          (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
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
        </div>

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-[#161A1E] border-b border-[#23262B] px-3 flex items-center gap-4">
            {selectedCoin && (
              <>
                <img src={selectedCoin.image} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-[13px] font-semibold text-white">
                  {selectedCoin.symbol.toUpperCase()}/USDT
                </span>
                <span className="text-lg font-mono font-semibold text-white">
                  ${currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6)}
                </span>
                <span className={`text-[12px] font-mono font-semibold ${
                  priceChange24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                }`}>
                  {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                </span>
              </>
            )}
          </div>
          
          <div className="flex-1 bg-[#0B0E11]">
            <TradingViewChart
              coinId={selectedCoin?.id || 'bitcoin'}
              symbol={selectedCoin?.symbol || 'BTC'}
              currentPrice={currentPrice}
              key={selectedSymbol}
            />
          </div>

          {/* Bottom Panel - Positions & History */}
          <div className="h-56 bg-[#161A1E] border-t border-[#23262B]">
            <Tabs defaultValue="positions" className="h-full flex flex-col">
              <TabsList className="h-9 rounded-none bg-transparent border-b border-[#23262B] justify-start px-3">
                <TabsTrigger 
                  value="positions" 
                  className="text-[11px] data-[state=active]:text-white data-[state=active]:bg-[#23262B] text-[#848E9C]"
                >
                  Positions ({openPositions.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="text-[11px] data-[state=active]:text-white data-[state=active]:bg-[#23262B] text-[#848E9C]"
                >
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="text-[11px] data-[state=active]:text-white data-[state=active]:bg-[#23262B] text-[#848E9C]"
                >
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {openPositions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#474D57] text-[11px]">
                      No Open Positions
                    </div>
                  ) : (
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#0B0E11]">
                        <tr className="text-[#848E9C] text-left">
                          <th className="py-2 px-3 font-medium">Symbol</th>
                          <th className="py-2 px-3 font-medium">Side</th>
                          <th className="py-2 px-3 font-medium text-right">Size</th>
                          <th className="py-2 px-3 font-medium text-right">Entry Price</th>
                          <th className="py-2 px-3 font-medium text-right">Mark Price</th>
                          <th className="py-2 px-3 font-medium text-right">PnL</th>
                          <th className="py-2 px-3 font-medium text-right">PnL%</th>
                          <th className="py-2 px-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((pos) => (
                          <tr key={pos.id} className="border-t border-[#23262B] hover:bg-[#23262B]/50">
                            <td className="py-2 px-3 text-white font-medium">{pos.symbol.replace('USDT', '')}</td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-semibold ${
                                pos.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                              }`}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-white">{pos.quantity.toFixed(4)}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">${pos.entry_price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">${pos.current_price.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${
                              pos.unrealized_pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}>
                              {pos.unrealized_pnl >= 0 ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${
                              pos.unrealized_pnl_percent >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}>
                              {pos.unrealized_pnl_percent >= 0 ? '+' : ''}{pos.unrealized_pnl_percent.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => closePosition({ positionId: pos.id, exitPrice: pos.current_price })}
                                className="h-6 text-[10px] bg-[#F6465D] hover:bg-[#F6465D]/80 text-white"
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
                    <div className="flex items-center justify-center h-full text-[#474D57] text-[11px]">
                      No Trade History
                    </div>
                  ) : (
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#0B0E11]">
                        <tr className="text-[#848E9C] text-left">
                          <th className="py-2 px-3 font-medium">Symbol</th>
                          <th className="py-2 px-3 font-medium">Side</th>
                          <th className="py-2 px-3 font-medium text-right">Entry</th>
                          <th className="py-2 px-3 font-medium text-right">Exit</th>
                          <th className="py-2 px-3 font-medium text-right">PnL</th>
                          <th className="py-2 px-3 font-medium text-right">PnL%</th>
                          <th className="py-2 px-3 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 50).map((trade) => (
                          <tr key={trade.id} className="border-t border-[#23262B] hover:bg-[#23262B]/50">
                            <td className="py-2 px-3 text-white font-medium">{trade.symbol.replace('USDT', '')}</td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-semibold ${
                                trade.side === 'BUY' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                              }`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-white">${trade.entry_price.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-white">${trade.exit_price.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${
                              trade.profit_loss >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}>
                              {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${
                              trade.profit_loss_percent >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                            }`}>
                              {trade.profit_loss_percent >= 0 ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-[#848E9C]">{new Date(trade.closed_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="analytics" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-3">
                    <TradingAnalytics account={account} history={history} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right - Order Entry (280px) */}
        <div className="w-72 bg-[#161A1E] border-l border-[#23262B] flex flex-col">
          <div className="h-10 px-3 flex items-center border-b border-[#23262B]">
            <span className="text-[11px] font-semibold text-white">Spot</span>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Buy/Sell Tabs */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0B0E11] rounded">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                    orderSide === 'BUY' 
                      ? 'bg-[#0ECB81] text-white' 
                      : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                    orderSide === 'SELL' 
                      ? 'bg-[#F6465D] text-white' 
                      : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Leverage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#848E9C]">Leverage</span>
                  <span className="text-[11px] font-mono text-white font-semibold">{leverage}x</span>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={(val) => setLeverage(val[0])}
                  min={1}
                  max={125}
                  step={1}
                  className="[&_[role=slider]]:bg-[#FCD535] [&_[role=slider]]:border-0"
                />
                <div className="flex justify-between text-[9px] text-[#474D57]">
                  <span>1x</span>
                  <span>50x</span>
                  <span>125x</span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#848E9C]">Amount</span>
                  <span className="text-[10px] text-[#474D57]">{selectedSymbol.replace('USDT', '')}</span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-[11px] font-mono bg-[#0B0E11] border-[#23262B] text-white"
                />
                {quantity && currentPrice > 0 && (
                  <div className="text-[10px] text-[#848E9C]">
                    ≈ ${(parseFloat(quantity) * currentPrice).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Quick % */}
              <div className="grid grid-cols-4 gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = account?.balance || 0;
                      const amt = (balance * (pct / 100)) / currentPrice;
                      setQuantity(amt.toFixed(6));
                    }}
                    className="py-1 text-[10px] font-medium text-[#848E9C] hover:text-white bg-[#0B0E11] rounded transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#848E9C]">Stop Loss</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="h-8 text-[11px] font-mono bg-[#0B0E11] border-[#23262B] text-white"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#848E9C]">Take Profit</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="h-8 text-[11px] font-mono bg-[#0B0E11] border-[#23262B] text-white"
                />
              </div>

              {/* Place Order */}
              <Button
                onClick={handlePlaceOrder}
                disabled={!quantity || !currentPrice || isPlacingOrder}
                className={`w-full h-10 text-[12px] font-semibold ${
                  orderSide === 'BUY' 
                    ? 'bg-[#0ECB81] hover:bg-[#0ECB81]/80 text-white' 
                    : 'bg-[#F6465D] hover:bg-[#F6465D]/80 text-white'
                }`}
              >
                {isPlacingOrder ? 'Placing...' : orderSide === 'BUY' ? 'Buy / Long' : 'Sell / Short'}
              </Button>
            </div>
          </ScrollArea>
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
