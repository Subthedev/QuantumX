/**
 * QUOTA STATUS BANNER COMPONENT
 *
 * Shows user's daily signal quota with progress bar
 * Creates urgency as quota depletes throughout the day
 */

import { Signal, Clock, ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuotaStatusBannerProps {
  tier: 'FREE' | 'PRO' | 'MAX';
  limit: number;
  used: number;
  remaining: number;
  onUpgradeClick: () => void;
}

export function QuotaStatusBanner({
  tier,
  limit,
  used,
  remaining,
  onUpgradeClick,
}: QuotaStatusBannerProps) {
  const percentage = (used / limit) * 100;
  const isLow = remaining <= 2 && remaining > 0;
  const isExhausted = remaining === 0;

  const tierColors = {
    FREE: 'from-gray-500 to-gray-600',
    PRO: 'from-blue-500 to-cyan-500',
    MAX: 'from-purple-500 to-pink-500',
  };

  const progressColor = isExhausted
    ? 'bg-red-500'
    : isLow
    ? 'bg-orange-500'
    : tier === 'FREE'
    ? 'bg-gray-500'
    : tier === 'PRO'
    ? 'bg-blue-500'
    : 'bg-purple-500';

  return (
    <Card
      className={`${
        isExhausted
          ? 'border-red-500/50 bg-red-500/5'
          : isLow
          ? 'border-orange-500/50 bg-orange-500/5'
          : 'border-border'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isExhausted
                  ? 'bg-red-500/10 text-red-500'
                  : isLow
                  ? 'bg-orange-500/10 text-orange-500'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <Signal className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Daily Signal Quota
                <Badge variant="outline" className={`ml-2 bg-gradient-to-r ${tierColors[tier]} text-white border-0`}>
                  {tier}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {isExhausted ? (
                  <span className="text-red-500 font-medium">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Quota exhausted • Resets at midnight UTC
                  </span>
                ) : (
                  `${remaining} of ${limit} signals remaining today`
                )}
              </p>
            </div>
          </div>

          {tier === 'FREE' && (
            <Button
              onClick={onUpgradeClick}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90"
            >
              <ArrowUp className="w-3 h-3 mr-1" />
              Get More
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative">
            <Progress value={percentage} className="h-2" indicatorClassName={progressColor} />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {used} used
            </span>
            <span className={isExhausted ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
              {remaining} left
            </span>
          </div>
        </div>

        {/* Upgrade CTA for FREE users when low/exhausted */}
        {tier === 'FREE' && (isLow || isExhausted) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/30">
              <p className="text-sm font-medium mb-2">
                {isExhausted ? '🚫 Out of signals for today' : '⚠️ Running low on signals'}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                PRO members get 15 signals/day with real-time delivery. MAX members get 30
                signals/day with 10-minute early access.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={onUpgradeClick}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                >
                  Upgrade to PRO
                </Button>
                <Button
                  onClick={onUpgradeClick}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-purple-500/30 hover:bg-purple-500/10"
                >
                  View MAX
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule info for FREE users */}
        {tier === 'FREE' && !isExhausted && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Next FREE signals: 9:00 AM & 6:00 PM UTC daily</span>
          </div>
        )}
      </div>
    </Card>
  );
}
