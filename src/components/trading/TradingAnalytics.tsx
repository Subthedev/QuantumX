/**
 * Trading Analytics Dashboard
 * Performance metrics and statistics for mock trading
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Award, AlertCircle, Target } from "lucide-react";
import { MockTradingAccount, MockTradingHistory } from "@/services/mockTradingService";

interface TradingAnalyticsProps {
  account: MockTradingAccount | null;
  history: MockTradingHistory[];
}

export function TradingAnalytics({ account, history }: TradingAnalyticsProps) {
  if (!account) return null;

  const totalTrades = account.total_trades;
  const winRate = totalTrades > 0 ? (account.winning_trades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (account.losing_trades / totalTrades) * 100 : 0;
  const profitFactor = calculateProfitFactor(history);
  const averageWin = calculateAverageWin(history);
  const averageLoss = calculateAverageLoss(history);
  const largestWin = findLargestWin(history);
  const largestLoss = findLargestLoss(history);
  const roi = ((account.balance - account.initial_balance) / account.initial_balance) * 100;
  const maxDrawdown = calculateMaxDrawdown(account);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total P&L */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total P&L</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {account.total_profit_loss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <p className={`text-xl font-bold font-mono ${
                account.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                ${account.total_profit_loss.toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ROI: {roi.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Win Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <p className="text-xl font-bold font-mono">{winRate.toFixed(1)}%</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {account.winning_trades}W / {account.losing_trades}L
            </p>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Profit Factor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="text-xl font-bold font-mono">{profitFactor.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitFactor >= 2 ? 'Excellent' : profitFactor >= 1.5 ? 'Good' : profitFactor >= 1 ? 'Break-even' : 'Poor'}
            </p>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Max Drawdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-xl font-bold font-mono text-destructive">
                {maxDrawdown.toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From peak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Win:</span>
                <span className="font-mono text-success">${averageWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Loss:</span>
                <span className="font-mono text-destructive">${averageLoss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Largest Win:</span>
                <span className="font-mono text-success">${largestWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Largest Loss:</span>
                <span className="font-mono text-destructive">${largestLoss.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trades:</span>
                <span className="font-mono">{totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Winning Trades:</span>
                <span className="font-mono text-success">{account.winning_trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Losing Trades:</span>
                <span className="font-mono text-destructive">{account.losing_trades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win/Loss Ratio:</span>
                <span className="font-mono">
                  {account.losing_trades > 0 
                    ? (account.winning_trades / account.losing_trades).toFixed(2)
                    : account.winning_trades > 0 ? '∞' : '0'
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function calculateProfitFactor(history: MockTradingHistory[]): number {
  const grossProfit = history.filter(t => t.profit_loss > 0).reduce((sum, t) => sum + t.profit_loss, 0);
  const grossLoss = Math.abs(history.filter(t => t.profit_loss < 0).reduce((sum, t) => sum + t.profit_loss, 0));
  return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
}

function calculateAverageWin(history: MockTradingHistory[]): number {
  const wins = history.filter(t => t.profit_loss > 0);
  return wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit_loss, 0) / wins.length : 0;
}

function calculateAverageLoss(history: MockTradingHistory[]): number {
  const losses = history.filter(t => t.profit_loss < 0);
  return losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.profit_loss, 0) / losses.length) : 0;
}

function findLargestWin(history: MockTradingHistory[]): number {
  const wins = history.filter(t => t.profit_loss > 0);
  return wins.length > 0 ? Math.max(...wins.map(t => t.profit_loss)) : 0;
}

function findLargestLoss(history: MockTradingHistory[]): number {
  const losses = history.filter(t => t.profit_loss < 0);
  return losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.profit_loss))) : 0;
}

function calculateMaxDrawdown(account: MockTradingAccount): number {
  const peak = account.initial_balance + account.total_profit_loss;
  const current = account.balance;
  return peak > 0 ? ((peak - current) / peak) * 100 : 0;
}
