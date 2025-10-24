import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, TrendingUp, TrendingDown, ArrowRight, Activity } from 'lucide-react';
import { whaleAlertService, type WhaleTransaction } from '@/services/whaleAlertService';
import { cn } from '@/lib/utils';

export function LiveWhaleAlerts() {
  const [alerts, setAlerts] = useState<WhaleTransaction[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    try {
      console.log('[LiveWhaleAlerts] Component mounted, subscribing to whale alerts...');
      setIsLive(true);

      // Check notification permission
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }

      // Subscribe to whale alerts
      const subscription = whaleAlertService.subscribe((transaction) => {
        console.log('[LiveWhaleAlerts] New whale transaction:', transaction);

        // Add to top of list, keep only last 10
        setAlerts((prev) => [transaction, ...prev].slice(0, 10));

        // Show browser notification for significant transactions
        if (transaction.significance === 'high' || transaction.significance === 'critical') {
          showBrowserNotification(transaction);
        }
      });

      return () => {
        console.log('[LiveWhaleAlerts] Component unmounting, unsubscribing...');
        subscription.unsubscribe();
        setIsLive(false);
      };
    } catch (error) {
      console.error('[LiveWhaleAlerts] Error initializing:', error);
      setIsLive(false);
    }
  }, []);

  const showBrowserNotification = (tx: WhaleTransaction) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🐋 Whale Alert!', {
        body: `${tx.symbol}: ${formatAmount(tx.amount)} (${formatUSD(tx.amountUSD)}) ${getTransactionTypeLabel(tx.transactionType)}`,
        icon: '/favicon.ico',
        tag: tx.id
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      alert('Notifications are already enabled!');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // Show test notification
        new Notification('🐋 Whale Alerts Enabled!', {
          body: 'You will now receive notifications for significant whale transactions.',
          icon: '/favicon.ico'
        });
      } else {
        alert('Notification permission was denied.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Failed to request notification permission.');
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  };

  const formatUSD = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatAddress = (address: string) => {
    if (address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'exchange_deposit':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'exchange_withdrawal':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      default:
        return <ArrowRight className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'exchange_deposit':
        return 'deposited to exchange';
      case 'exchange_withdrawal':
        return 'withdrawn from exchange';
      case 'whale_transfer':
        return 'whale-to-whale transfer';
      default:
        return 'transferred';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'exchange_deposit':
        return 'border-l-red-500 bg-red-500/5';
      case 'exchange_withdrawal':
        return 'border-l-green-500 bg-green-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const getSignificanceBadge = (significance: string) => {
    switch (significance) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-600">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <CardTitle className="text-sm sm:text-lg truncate">Live Whale Alerts</CardTitle>
            {isLive && (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-medium text-green-600">LIVE</span>
              </div>
            )}
          </div>
          <Button
            onClick={requestNotificationPermission}
            size="sm"
            variant={notificationPermission === 'granted' ? 'outline' : 'default'}
            disabled={notificationPermission === 'granted'}
            className={cn(
              "text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 transition-colors whitespace-nowrap",
              notificationPermission === 'granted'
                ? "bg-green-500/10 text-green-600 border-green-500/20 cursor-default hover:bg-green-500/10"
                : notificationPermission === 'denied'
                ? "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                : ""
            )}
          >
            {notificationPermission === 'granted' ? '✓ On' :
             notificationPermission === 'denied' ? '✗ Off' :
             '🔔 Enable'}
          </Button>
        </div>
        <CardDescription className="text-[10px] sm:text-sm">
          Real-time whale transaction monitoring across all blockchains
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <Bell className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-xs sm:text-sm">Waiting for whale transactions...</p>
            <p className="text-[10px] sm:text-xs mt-1">Monitoring {whaleAlertService.getSubscriberCount()} blockchain(s)</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'border-l-4 p-2.5 sm:p-3 rounded-r-lg transition-all duration-300',
                  getTransactionTypeColor(alert.transactionType)
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {getTransactionTypeIcon(alert.transactionType)}
                    <span className="font-semibold text-xs sm:text-sm">{alert.symbol}</span>
                    <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-1.5">{alert.blockchain}</Badge>
                    {getSignificanceBadge(alert.significance)}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(alert.timestamp)}</span>
                </div>

                {/* Amount */}
                <div className="mb-1.5 sm:mb-2">
                  <div className="text-base sm:text-lg font-bold">
                    {formatAmount(alert.amount)} {alert.symbol}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {formatUSD(alert.amountUSD)}
                  </div>
                </div>

                {/* Transaction details */}
                <div className="text-[10px] sm:text-xs space-y-1">
                  <div className="flex items-start gap-1 sm:gap-1.5 text-muted-foreground">
                    <span className="font-medium whitespace-nowrap">From:</span>
                    <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-xs truncate">{formatAddress(alert.from)}</code>
                    {alert.fromOwner && <span className="text-foreground truncate">({alert.fromOwner})</span>}
                  </div>
                  <div className="flex items-start gap-1 sm:gap-1.5 text-muted-foreground">
                    <span className="font-medium whitespace-nowrap">To:</span>
                    <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-xs truncate">{formatAddress(alert.to)}</code>
                    {alert.toOwner && <span className="text-foreground truncate">({alert.toOwner})</span>}
                  </div>
                </div>

                {/* Interpretation */}
                <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/50">
                  <p className="text-[10px] sm:text-xs text-muted-foreground italic leading-relaxed">
                    {alert.transactionType === 'exchange_deposit' && '📉 Bearish signal: Large deposit to exchange may indicate selling pressure'}
                    {alert.transactionType === 'exchange_withdrawal' && '📈 Bullish signal: Large withdrawal from exchange indicates accumulation'}
                    {alert.transactionType === 'whale_transfer' && '🔄 Neutral: Whale-to-whale transfer, monitoring for further activity'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
