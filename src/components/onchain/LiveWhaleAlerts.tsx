import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown, ArrowRight, Activity } from 'lucide-react';
import { whaleAlertService, type WhaleTransaction } from '@/services/whaleAlertService';
import { cn } from '@/lib/utils';

export function LiveWhaleAlerts() {
  const [alerts, setAlerts] = useState<WhaleTransaction[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Live Whale Alerts</CardTitle>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="text-xs font-medium text-green-600">LIVE</span>
              </div>
            )}
          </div>
          <button
            onClick={requestNotificationPermission}
            className={cn(
              "text-xs transition-colors px-3 py-1.5 rounded-md font-medium",
              notificationPermission === 'granted'
                ? "bg-green-500/10 text-green-600 cursor-default"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {notificationPermission === 'granted' ? '✓ Notifications Enabled' :
             notificationPermission === 'denied' ? '✗ Notifications Blocked' :
             'Enable Notifications'}
          </button>
        </div>
        <CardDescription>
          Real-time whale transaction monitoring across all blockchains
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Waiting for whale transactions...</p>
            <p className="text-xs mt-1">Monitoring {whaleAlertService.getSubscriberCount()} blockchain(s)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'border-l-4 p-3 rounded-r-lg transition-all duration-300',
                  getTransactionTypeColor(alert.transactionType)
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTransactionTypeIcon(alert.transactionType)}
                    <span className="font-semibold text-sm">{alert.symbol}</span>
                    <Badge variant="outline" className="text-xs">{alert.blockchain}</Badge>
                    {getSignificanceBadge(alert.significance)}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(alert.timestamp)}</span>
                </div>

                {/* Amount */}
                <div className="mb-2">
                  <div className="text-lg font-bold">
                    {formatAmount(alert.amount)} {alert.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatUSD(alert.amountUSD)}
                  </div>
                </div>

                {/* Transaction details */}
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium">From:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{formatAddress(alert.from)}</code>
                    {alert.fromOwner && <span className="text-foreground">({alert.fromOwner})</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium">To:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{formatAddress(alert.to)}</code>
                    {alert.toOwner && <span className="text-foreground">({alert.toOwner})</span>}
                  </div>
                </div>

                {/* Interpretation */}
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground italic">
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
