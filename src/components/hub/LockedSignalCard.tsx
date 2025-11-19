/**
 * LOCKED SIGNAL CARD COMPONENT
 *
 * Displays signal preview for FREE tier users with FOMO mechanics
 * Shows locked details with upgrade CTAs to drive conversions
 */

import { Lock, TrendingUp, TrendingDown, Sparkles, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LockedSignalCardProps {
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  confidence: number;
  qualityScore: number;
  expiresAt: string;
  tier: 'PRO' | 'MAX';
  onUpgradeClick: () => void;
}

export function LockedSignalCard({
  symbol,
  signalType,
  confidence,
  qualityScore,
  expiresAt,
  tier,
  onUpgradeClick,
}: LockedSignalCardProps) {
  const isPro = tier === 'PRO';
  const isLong = signalType === 'LONG';

  const tierColor = isPro ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500';
  const tierBadgeColor = isPro ? 'bg-blue-500' : 'bg-purple-500';
  const tierIcon = isPro ? <Sparkles className="w-3 h-3" /> : <Crown className="w-3 h-3" />;

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-card/50 backdrop-blur-sm">
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tierColor} opacity-5`}></div>

      {/* Lock icon overlay */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
        <Lock className="w-32 h-32 text-foreground" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Signal direction indicator */}
            <div
              className={`p-2 rounded-lg ${
                isLong ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}
            >
              {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>

            {/* Symbol and type */}
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {symbol}
                <Badge variant="outline" className="text-xs font-normal">
                  {signalType}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">AI Signal Detected</p>
            </div>
          </div>

          {/* Tier badge */}
          <Badge className={`${tierBadgeColor} text-white flex items-center gap-1`}>
            {tierIcon}
            {tier}
          </Badge>
        </div>

        {/* Visible metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-background/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <p className="text-lg font-bold">{confidence.toFixed(1)}%</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Quality</p>
            <p className="text-lg font-bold">{qualityScore.toFixed(1)}</p>
          </div>
        </div>

        {/* Locked details with blur */}
        <div className="relative mb-4">
          <div className="blur-md select-none pointer-events-none">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-background/50 rounded p-2 border border-border">
                <p className="text-xs text-muted-foreground">Entry</p>
                <p className="text-sm font-mono">$XX,XXX</p>
              </div>
              <div className="bg-background/50 rounded p-2 border border-border">
                <p className="text-xs text-muted-foreground">TP1</p>
                <p className="text-sm font-mono">$XX,XXX</p>
              </div>
              <div className="bg-background/50 rounded p-2 border border-border">
                <p className="text-xs text-muted-foreground">SL</p>
                <p className="text-sm font-mono">$XX,XXX</p>
              </div>
            </div>
            <div className="bg-background/50 rounded p-3 border border-border">
              <p className="text-xs font-medium mb-1">AI Analysis</p>
              <p className="text-xs">
                Advanced market analysis with institutional order flow detection and momentum
                indicators suggesting high probability setup...
              </p>
            </div>
          </div>

          {/* Lock overlay with CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-muted-foreground/50">
            <Lock className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Full Details Locked</p>
            <p className="text-xs text-muted-foreground mb-3">Entry, Targets & Analysis</p>
            <Button
              onClick={onUpgradeClick}
              size="sm"
              className={`bg-gradient-to-r ${tierColor} text-white hover:opacity-90 transition-opacity`}
            >
              Upgrade to {tier}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" />
            <span>{tier} Exclusive Signal</span>
          </div>
          <div>
            Expires: {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </Card>
  );
}
