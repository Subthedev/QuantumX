/**
 * TAKE TRADE BUTTON
 *
 * Allows users to join a signal from the Intelligence Hub
 * Integrates with user competition service
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userCompetitionService } from '@/services/userCompetitionService';
import type { HubSignal } from '@/services/globalHubService';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface TakeTradeButtonProps {
  signal: HubSignal;
  disabled?: boolean;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export function TakeTradeButton({ signal, disabled, variant = 'default', size = 'default' }: TakeTradeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positionSize, setPositionSize] = useState('1'); // Default 1% of portfolio
  const [error, setError] = useState<string | null>(null);

  // Handle take trade
  const handleTakeTrade = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to compete in the Arena',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate position size
      const size = parseFloat(positionSize);
      if (isNaN(size) || size <= 0 || size > 100) {
        throw new Error('Position size must be between 0.1% and 100%');
      }

      // Take the signal
      const position = await userCompetitionService.takeSignal(
        user.id,
        signal,
        undefined // Let service calculate based on percentage
      );

      toast({
        title: '✅ Trade Taken!',
        description: `Opened ${position.side} position on ${position.symbol}`,
      });

      // Show XP earned
      toast({
        title: '🎯 +10 XP',
        description: 'Experience points earned for taking a trade',
      });

      setOpen(false);

    } catch (err: any) {
      console.error('[TakeTrade] Error:', err);
      setError(err.message || 'Failed to take trade');

      // Check if rate limit error
      if (err.message?.includes('Daily trade limit')) {
        toast({
          title: 'Daily Limit Reached',
          description: 'Upgrade to Pro for unlimited trades',
          variant: 'destructive'
        });
      }

    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated position size
  const calculatePositionValue = () => {
    const defaultBalance = 10000; // Starting balance
    const percentage = parseFloat(positionSize) || 0;
    return (defaultBalance * (percentage / 100)).toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className="gap-2"
        >
          {signal.direction === 'LONG' ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          Take Trade
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signal.direction === 'LONG' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Take Trade: {signal.symbol} {signal.direction}
          </DialogTitle>
          <DialogDescription>
            Join this signal from the Intelligence Hub
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signal Details */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Symbol</span>
              <span className="font-bold">{signal.symbol}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Direction</span>
              <Badge variant={signal.direction === 'LONG' ? 'default' : 'destructive'}>
                {signal.direction}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Entry Price</span>
              <span className="font-bold">${signal.entry?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stop Loss</span>
              <span className="font-bold text-red-500">${signal.stopLoss?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Target 1</span>
              <span className="font-bold text-green-500">${signal.targets?.[0]?.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <span className="font-bold text-orange-500">{signal.confidence}%</span>
            </div>

            {signal.strategy && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Strategy</span>
                <span className="text-xs font-mono">{signal.strategy}</span>
              </div>
            )}
          </div>

          {/* Position Size Input */}
          <div className="space-y-2">
            <Label htmlFor="position-size">Position Size (% of Portfolio)</Label>
            <div className="flex gap-2">
              <Input
                id="position-size"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                placeholder="1.0"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPositionSize('0.5')}
                >
                  0.5%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPositionSize('1')}
                >
                  1%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPositionSize('5')}
                >
                  5%
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated value: ${calculatePositionValue()} (based on $10,000 portfolio)
            </p>
          </div>

          {/* Risk Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This is <strong>paper trading</strong> with virtual money. No real capital is at risk.
              Educational purposes only, not financial advice.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Indicators */}
          {!user && (
            <Alert>
              <AlertDescription>
                You must be logged in to take trades. <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>Sign in</Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTakeTrade}
            disabled={loading || !user}
            className={signal.direction === 'LONG' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Taking Trade...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Trade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
