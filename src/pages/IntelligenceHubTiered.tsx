/**
 * INTELLIGENCE HUB - TIERED VERSION
 *
 * Displays tier-based signals with monetization features
 * FREE: 2 signals/day scheduled | PRO: 15/day realtime | MAX: 30/day + early access
 */

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Signal,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Shield,
  Sparkles,
  Crown,
  ChevronRight,
} from 'lucide-react';

// Hooks and services
import { useTieredSignals } from '@/hooks/useTieredSignals';
import { useUserSubscription } from '@/hooks/useUserSubscription';

// Components
import { LockedSignalCard } from '@/components/hub/LockedSignalCard';
import { SignalsYouMissed } from '@/components/hub/SignalsYouMissed';
import { TierComparisonCard } from '@/components/hub/TierComparisonCard';
import { QuotaStatusBanner } from '@/components/hub/QuotaStatusBanner';
import { useNavigate } from 'react-router-dom';

export default function IntelligenceHubTiered() {
  const navigate = useNavigate();
  const { tier, isActive, loading: subLoading } = useUserSubscription();
  const {
    signals,
    quotaStatus,
    missedSignals,
    loading: signalsLoading,
    markViewed,
    markClicked,
  } = useTieredSignals();

  const [activeTab, setActiveTab] = useState<'signals' | 'missed' | 'upgrade'>('signals');

  const handleUpgradeClick = () => {
    setActiveTab('upgrade');
  };

  const handleTierSelect = (selectedTier: 'PRO' | 'MAX') => {
    console.log('🎯 Upgrade to:', selectedTier);
    // TODO: Redirect to Stripe checkout
  };

  if (subLoading || signalsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeSignals = signals.filter((s) => new Date(s.expires_at) > new Date());
  const lockedSignals = activeSignals.filter((s) => !s.full_details);
  const unlockedSignals = activeSignals.filter((s) => s.full_details);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Signal className="w-8 h-8 text-primary" />
              Intelligence Hub
              <Badge
                className={`${
                  tier === 'FREE'
                    ? 'bg-gray-500'
                    : tier === 'PRO'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                } text-white border-0`}
              >
                {tier === 'FREE' && <Sparkles className="w-3 h-3 mr-1" />}
                {tier === 'PRO' && <Sparkles className="w-3 h-3 mr-1" />}
                {tier === 'MAX' && <Crown className="w-3 h-3 mr-1" />}
                {tier} TIER
              </Badge>
            </h1>

            {tier === 'FREE' && (
              <Button
                onClick={handleUpgradeClick}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            AI-powered trading signals tailored to your subscription tier
          </p>
        </div>

        {/* Quota Status Banner */}
        {quotaStatus && (
          <div className="mb-6">
            <QuotaStatusBanner
              tier={quotaStatus.tier}
              limit={quotaStatus.limit}
              used={quotaStatus.used}
              remaining={quotaStatus.remaining}
              onUpgradeClick={handleUpgradeClick}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signals" className="flex items-center gap-2">
              <Signal className="w-4 h-4" />
              Live Signals ({activeSignals.length})
            </TabsTrigger>
            <TabsTrigger value="missed" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Missed ({missedSignals.length})
            </TabsTrigger>
            <TabsTrigger value="upgrade" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Upgrade
            </TabsTrigger>
          </TabsList>

          {/* Live Signals Tab */}
          <TabsContent value="signals" className="space-y-6 mt-6">
            {activeSignals.length === 0 ? (
              <Card className="p-12 text-center">
                <Signal className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No Active Signals</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {tier === 'FREE'
                    ? 'Next FREE signals drop at 9:00 AM & 6:00 PM UTC'
                    : 'New signals arrive in real-time when market conditions are optimal'}
                </p>
                {tier === 'FREE' && (
                  <Button onClick={handleUpgradeClick} variant="outline">
                    Get Real-Time Signals
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Unlocked signals (full details) */}
                {unlockedSignals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onView={() => markViewed(signal.id)}
                    onClick={() => markClicked(signal.id)}
                  />
                ))}

                {/* Locked signals (FREE tier preview) */}
                {lockedSignals.map((signal) => (
                  <LockedSignalCard
                    key={signal.id}
                    symbol={signal.symbol}
                    signalType={signal.signal_type}
                    confidence={signal.confidence}
                    qualityScore={signal.quality_score}
                    expiresAt={signal.expires_at}
                    tier={signal.tier as 'PRO' | 'MAX'}
                    onUpgradeClick={handleUpgradeClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Missed Signals Tab */}
          <TabsContent value="missed" className="mt-6">
            {tier === 'FREE' && missedSignals.length > 0 ? (
              <SignalsYouMissed
                missedSignals={missedSignals}
                onUpgradeClick={handleUpgradeClick}
              />
            ) : (
              <Card className="p-12 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">
                  {tier === 'FREE' ? 'No Missed Signals Yet' : 'Premium Member'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tier === 'FREE'
                    ? 'You haven\'t missed any signals today'
                    : 'You receive all signals in real-time'}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Upgrade Tab */}
          <TabsContent value="upgrade" className="mt-6">
            <TierComparisonCard currentTier={tier} onUpgradeClick={handleTierSelect} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Signal Card Component (for unlocked signals)
interface SignalCardProps {
  signal: any;
  onView: () => void;
  onClick: () => void;
}

function SignalCard({ signal, onView, onClick }: SignalCardProps) {
  const isLong = signal.signal_type === 'LONG';
  const hoursLeft = Math.max(
    0,
    (new Date(signal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)
  );

  return (
    <Card
      className={`p-6 border-l-4 ${
        isLong ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'
      } hover:shadow-lg transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${
              isLong ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {isLong ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-2xl font-bold">{signal.symbol}</h3>
            <Badge variant="outline" className="mt-1">
              {signal.signal_type}
            </Badge>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Quality Score</p>
          <p className="text-2xl font-bold">{signal.quality_score.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-background/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
          <p className="text-lg font-bold">{signal.confidence.toFixed(1)}%</p>
        </div>
        {signal.entry_price && (
          <>
            <div className="bg-background/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Entry</p>
              <p className="text-lg font-bold font-mono">${signal.entry_price.toFixed(2)}</p>
            </div>
            {signal.take_profit && signal.take_profit[0] && (
              <div className="bg-background/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">TP1</p>
                <p className="text-lg font-bold font-mono text-green-500">
                  ${signal.take_profit[0].toFixed(2)}
                </p>
              </div>
            )}
            {signal.stop_loss && (
              <div className="bg-background/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                <p className="text-lg font-bold font-mono text-red-500">
                  ${signal.stop_loss.toFixed(2)}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>
            Expires in {hoursLeft.toFixed(1)}h
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3" />
          <span>Created {new Date(signal.created_at).toLocaleTimeString()}</span>
        </div>
      </div>
    </Card>
  );
}
