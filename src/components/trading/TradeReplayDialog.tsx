import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, X, TrendingUp, TrendingDown, Clock, DollarSign, Percent } from 'lucide-react';
import TradingViewChart from '@/components/charts/TradingViewChart';
import type { MockTradingHistory } from '@/services/mockTradingService';
import { format } from 'date-fns';

interface TradeReplayDialogProps {
  trade: MockTradingHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coinId: string;
  symbol: string;
}

export function TradeReplayDialog({ trade, open, onOpenChange, coinId, symbol }: TradeReplayDialogProps) {
  if (!trade) return null;

  const isProfitable = trade.profit_loss > 0;
  const duration = trade.duration_minutes 
    ? trade.duration_minutes >= 60 
      ? `${Math.floor(trade.duration_minutes / 60)}h ${trade.duration_minutes % 60}m`
      : `${trade.duration_minutes}m`
    : 'N/A';

  // Calculate ROI
  const investment = trade.quantity * trade.entry_price;
  const roi = (trade.profit_loss / investment) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>Trade Replay - {trade.symbol.replace('USDT', '')}/USDT</DialogTitle>
              <Badge variant={isProfitable ? 'default' : 'destructive'} className="gap-1">
                {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isProfitable ? 'Profitable' : 'Loss'}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <TradingViewChart
                coinId={coinId}
                symbol={symbol}
                currentPrice={trade.exit_price}
                tradeMarkers={[
                  {
                    time: new Date(trade.opened_at).getTime() / 1000,
                    position: 'belowBar',
                    color: trade.side === 'BUY' ? '#10b981' : '#ef4444',
                    shape: 'arrowUp',
                    text: `Entry: $${trade.entry_price.toFixed(2)}`
                  },
                  {
                    time: new Date(trade.closed_at).getTime() / 1000,
                    position: 'aboveBar',
                    color: isProfitable ? '#10b981' : '#ef4444',
                    shape: 'arrowDown',
                    text: `Exit: $${trade.exit_price.toFixed(2)}`
                  }
                ]}
                height={600}
              />
            </div>
          </div>

          {/* Trade Details Panel */}
          <div className="w-80 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold text-sm mb-3">Trade Summary</h3>
              
              {/* P&L Card */}
              <div className={`p-4 rounded-lg border-2 mb-4 ${
                isProfitable 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="text-xs text-muted-foreground mb-1">Total Profit/Loss</div>
                <div className={`text-2xl font-bold font-mono ${
                  isProfitable ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isProfitable ? '+' : ''}${trade.profit_loss.toFixed(2)}
                </div>
                <div className={`text-sm font-mono ${
                  isProfitable ? 'text-green-500' : 'text-red-500'
                }`}>
                  {isProfitable ? '+' : ''}{trade.profit_loss_percent.toFixed(2)}%
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background p-3 rounded border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <DollarSign className="w-3 h-3" />
                    ROI
                  </div>
                  <div className={`text-lg font-bold font-mono ${
                    roi >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-background p-3 rounded border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    Duration
                  </div>
                  <div className="text-lg font-bold font-mono">
                    {duration}
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Trade Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground">Trade Details</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Side</span>
                      <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                        {trade.side}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-mono font-medium">{trade.quantity.toFixed(6)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leverage</span>
                      <span className="font-mono font-medium">{trade.leverage}x</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Entry Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground">Entry</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-mono font-medium">${trade.entry_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono text-xs">
                        {format(new Date(trade.opened_at), 'MMM dd, HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-mono font-medium">${investment.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Exit Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground">Exit</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-mono font-medium">${trade.exit_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono text-xs">
                        {format(new Date(trade.closed_at), 'MMM dd, HH:mm:ss')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-mono font-medium">
                        ${(trade.quantity * trade.exit_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Fees & Net */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground">Costs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trading Fees</span>
                      <span className="font-mono text-red-500">-${trade.fees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Net P&L</span>
                      <span className={`font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                        {isProfitable ? '+' : ''}${trade.profit_loss.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Change */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="text-xs text-muted-foreground mb-2">Price Movement</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono">${trade.entry_price.toFixed(2)}</span>
                    <div className="flex-1 mx-3 h-px bg-border relative">
                      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                        isProfitable ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <span className="text-sm font-mono">${trade.exit_price.toFixed(2)}</span>
                  </div>
                  <div className={`text-xs text-center mt-1 font-mono ${
                    isProfitable ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {((trade.exit_price - trade.entry_price) / trade.entry_price * 100 * (trade.side === 'BUY' ? 1 : -1)).toFixed(2)}% move
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
