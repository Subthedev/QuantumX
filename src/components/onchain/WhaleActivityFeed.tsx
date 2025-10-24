import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Waves,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { whaleAlertService, type WhaleTransaction } from '@/services/whaleAlertService';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface WhaleActivityFeedProps {
  coinSymbol?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const WhaleActivityFeed = ({
  coinSymbol,
  limit = 20,
  autoRefresh = true,
  refreshInterval = 30000
}: WhaleActivityFeedProps) => {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch whale transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await whaleAlertService.getRecentWhaleTransactions(coinSymbol, limit);
      setTransactions(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching whale transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    if (autoRefresh) {
      const interval = setInterval(fetchTransactions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [coinSymbol, limit, autoRefresh, refreshInterval]);

  // Get transaction type icon - CONSISTENT COLORS
  const getTransactionIcon = (tx: WhaleTransaction) => {
    switch (tx.transactionType) {
      case 'exchange_deposit':
        return <ArrowDownToLine className="h-5 w-5 text-red-600" />; // RED = Inflow/Bearish
      case 'exchange_withdrawal':
        return <ArrowUpFromLine className="h-5 w-5 text-green-600" />; // GREEN = Outflow/Bullish
      case 'whale_transfer':
        return <Waves className="h-5 w-5 text-blue-600" />; // BLUE = Neutral
      default:
        return <ArrowLeftRight className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get significance badge color
  const getSignificanceBadge = (significance: WhaleTransaction['significance']) => {
    switch (significance) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">CRITICAL</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30">HIGH</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">MEDIUM</Badge>;
      default:
        return <Badge variant="outline">LOW</Badge>;
    }
  };

  // Get transaction description
  const getTransactionDescription = (tx: WhaleTransaction) => {
    switch (tx.transactionType) {
      case 'exchange_deposit':
        return (
          <span className="text-sm">
            <span className="font-medium text-red-600 dark:text-red-400">Deposit to {tx.to.owner}</span>
            <span className="text-muted-foreground"> - Potential sell pressure</span>
          </span>
        );
      case 'exchange_withdrawal':
        return (
          <span className="text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">Withdrawal from {tx.from.owner}</span>
            <span className="text-muted-foreground"> - Bullish signal</span>
          </span>
        );
      case 'whale_transfer':
        return (
          <span className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">Whale movement</span>
            <span className="text-muted-foreground"> - Large holder activity</span>
          </span>
        );
      default:
        return <span className="text-sm text-muted-foreground">Transfer detected</span>;
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Waves className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Whale Activity</CardTitle>
              <CardDescription>Real-time large transactions {coinSymbol && `for ${coinSymbol.toUpperCase()}`}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchTransactions}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-3" />
              <p>Loading whale transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-3 opacity-50" />
              <p>No whale transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors",
                    index === 0 && "bg-muted/30" // Highlight most recent
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTransactionIcon(tx)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {getTransactionDescription(tx)}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                            <span>•</span>
                            <span className="font-mono">{tx.blockchain}</span>
                          </div>
                        </div>
                        {getSignificanceBadge(tx.significance)}
                      </div>

                      {/* Amount */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {whaleAlertService.formatAmount(tx.amount, tx.symbol)}
                        </span>
                        <span className="text-lg text-muted-foreground">
                          ({whaleAlertService.formatUsd(tx.amountUsd)})
                        </span>
                      </div>

                      {/* Addresses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">From:</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatAddress(tx.from.address)}
                            </Badge>
                            {tx.from.ownerType === 'exchange' && (
                              <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-xs">
                                {tx.from.owner}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">To:</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {formatAddress(tx.to.address)}
                            </Badge>
                            {tx.to.ownerType === 'exchange' && (
                              <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 text-xs">
                                {tx.to.owner}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* View on explorer */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
