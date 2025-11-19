/**
 * SIGNALS YOU MISSED COMPONENT
 *
 * FOMO mechanic showing FREE users what premium signals they missed
 * Drives urgency and conversions by highlighting opportunity cost
 */

import { TrendingUp, TrendingDown, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MissedSignal {
  symbol: string;
  signalType: 'LONG' | 'SHORT';
  confidence: number;
  tier: 'PRO' | 'MAX';
  timestamp: string;
  potentialGain?: number; // Percentage gain if followed
}

interface SignalsYouMissedProps {
  missedSignals: MissedSignal[];
  onUpgradeClick: () => void;
}

export function SignalsYouMissed({ missedSignals, onUpgradeClick }: SignalsYouMissedProps) {
  if (missedSignals.length === 0) return null;

  const totalMissed = missedSignals.length;
  const avgConfidence =
    missedSignals.reduce((sum, s) => sum + s.confidence, 0) / missedSignals.length;

  return (
    <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Signals You Missed Today
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                  {totalMissed} signals
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Avg Confidence: {avgConfidence.toFixed(1)}% • Premium subscribers got these
              </p>
            </div>
          </div>
        </div>

        {/* Missed signals list */}
        <div className="space-y-2 mb-4">
          {missedSignals.slice(0, 5).map((signal, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border hover:border-orange-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Direction icon */}
                <div
                  className={`p-1.5 rounded ${
                    signal.signalType === 'LONG'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {signal.signalType === 'LONG' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>

                {/* Signal info */}
                <div>
                  <p className="text-sm font-medium">{signal.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(signal.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Confidence */}
                <div className="text-right">
                  <p className="text-sm font-medium">{signal.confidence.toFixed(1)}%</p>
                  {signal.potentialGain && (
                    <p className="text-xs text-green-500">+{signal.potentialGain.toFixed(1)}%</p>
                  )}
                </div>

                {/* Tier badge */}
                <Badge
                  className={`${
                    signal.tier === 'PRO'
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                  } border`}
                >
                  <Lock className="w-3 h-3 mr-1" />
                  {signal.tier}
                </Badge>
              </div>
            </div>
          ))}

          {totalMissed > 5 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              +{totalMissed - 5} more signals you missed
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-4 border border-orange-500/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Don't miss out on profitable signals
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Premium members receive up to 30 high-quality signals daily in real-time with full
                trading details and AI analysis.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={onUpgradeClick}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90"
                >
                  Upgrade to PRO
                </Button>
                <Button
                  onClick={onUpgradeClick}
                  size="sm"
                  variant="outline"
                  className="border-purple-500/30 hover:bg-purple-500/10"
                >
                  View MAX
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats footer */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-orange-500">{totalMissed}</p>
            <p className="text-xs text-muted-foreground">Missed Today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{avgConfidence.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-500">15-30</p>
            <p className="text-xs text-muted-foreground">PRO/MAX Daily</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
