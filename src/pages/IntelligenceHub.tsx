/**
 * IGX INTELLIGENCE HUB - Final Production Polish
 *
 * Autonomous 24/7 operation with minimal, elegant design
 * Collapsible engine metrics, smooth animations, buttery performance
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Database,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  Filter,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  TrendingUpIcon,
  Coins,
  Clock,
  Sparkles,
  Crown,
  Zap,
  Lock
} from 'lucide-react';

// Global Hub Service (runs in background)
import { globalHubService, HubMetrics, HubSignal, MonthlyStats } from '@/services/globalHubService';
import { zetaLearningEngine, ZetaMetrics } from '@/services/zetaLearningEngine';
import { realOutcomeTracker } from '@/services/realOutcomeTracker';
import { signalQualityGate } from '@/services/signalQualityGate';
import { signalDatabaseService } from '@/services/signalDatabaseService';
import { supabase } from '@/integrations/supabase/client';
import { STRATEGY_METADATA, type StrategyName, type StrategyPerformance } from '@/services/strategies/strategyTypes';
import { strategyPerformanceTracker } from '@/services/strategies/strategyPerformanceTracker';
import { supabaseReconnectionManager } from '@/services/supabaseReconnectionManager';
import { signalBroadcaster } from '@/services/signalBroadcaster';

// Signal Drop Timer
import { SignalDropTimer } from '@/components/SignalDropTimer';

// Tiered System
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { QuotaStatusBanner } from '@/components/hub/QuotaStatusBanner';
import { PremiumSignalCard } from '@/components/hub/PremiumSignalCard';
import { useNavigate } from 'react-router-dom';

// Rejected Signal Type
interface RejectedSignal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  rejection_stage: 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';
  rejection_reason: string;
  quality_score?: number;
  confidence_score?: number;
  data_quality?: number;
  strategy_votes?: any[];
  created_at: string;
}

// ML-based priority classification
function classifyRejectionPriority(signal: RejectedSignal): 'CRITICAL' | 'IMPORTANT' | 'NOISE' {
  const quality = signal.quality_score || 0;
  const confidence = signal.confidence_score || 0;
  
  // CRITICAL: High quality but rejected
  if (quality >= 70 && confidence >= 65) return 'CRITICAL';
  if (signal.rejection_stage === 'DELTA' && quality >= 60) return 'CRITICAL';
  
  // NOISE: Low quality, expected
  if (quality < 40 && confidence < 50) return 'NOISE';
  if (signal.rejection_stage === 'ALPHA' && quality < 30) return 'NOISE';
  
  return 'IMPORTANT';
}

const CRYPTO_SYMBOLS = ['₿', 'Ξ', '◎', '♦', '●', '◆', '○', '▲'];

interface FlowingParticle {
  id: string;
  stage: number;
  progress: number;
  symbol: string;
  speed: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
}

export default function IntelligenceHub() {
  const navigate = useNavigate();
  const animationFrameRef = useRef<number>();
  const mountedRef = useRef(true);
  const metricsIntervalRef = useRef<NodeJS.Timeout>();

  // 🛡️ STABILITY: Request deduplication to prevent race conditions
  const fetchInProgress = useRef(false);

  // 🎯 TIERED SYSTEM
  const { tier, isActive, isPro, isMax, isFree } = useUserSubscription();
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(2);

  // Update quota limit based on tier
  useEffect(() => {
    if (tier === 'PRO') setQuotaLimit(15);
    else if (tier === 'MAX') setQuotaLimit(30);
    else setQuotaLimit(3); // ✅ FIX: FREE tier gets 3 signals, not 2
  }, [tier]);

  // Fetch quota usage from database
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { data } = await supabase
          .from('user_signal_quotas')
          .select('signals_received')
          .eq('date', new Date().toISOString().split('T')[0])
          .maybeSingle();

        setQuotaUsed(data?.signals_received || 0);
      } catch (error) {
        console.error('Error fetching quota:', error);
      }
    };

    fetchQuota();
    const interval = setInterval(fetchQuota, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // ✅ FETCH USER SIGNALS FROM DATABASE (Tier-based distribution)
  const fetchUserSignalsRef = useRef<() => Promise<void>>();
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const fetchUserSignals = async () => {
      // 🛡️ STABILITY: Prevent concurrent requests (race condition protection)
      if (fetchInProgress.current) {
        return;
      }

      try {
        fetchInProgress.current = true;

        // ✅ FIX: Only show loading on initial load, not during polling
        if (isInitialLoadRef.current) {
          setLoadingUserSignals(true);
        }

        // Get current user with null safety
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('[Hub] ⚠️ No authenticated user - skipping signal fetch');
          setLoadingUserSignals(false);
          isInitialLoadRef.current = false;
          return;
        }

        // Fetch user's tier-based signals from database (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        console.log(`[Hub] 🔍 Fetching signals for user: ${user.id}`);
        console.log(`[Hub] 🔍 Query filters: created_at >= ${twentyFourHoursAgo}, limit: ${quotaLimit}`);

        const { data, error } = await supabase
          .from('user_signals')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(quotaLimit); // ✅ FIX: Limit to tier quota

        if (error) {
          console.error('[Hub] ❌ Error fetching user signals:', error);
          setLoadingUserSignals(false);
          isInitialLoadRef.current = false;
          return;
        }

        console.log(`[Hub] 📊 Database returned ${data?.length || 0} signals`);
        if (data && data.length > 0) {
          console.log('[Hub] 📝 Sample signal:', data[0]);
        }

        // Map database signals to extract image URL from metadata
        const mappedSignals = (data || []).map(signal => ({
          ...signal,
          image: signal.metadata?.image || ''
        }));

        setUserSignals(mappedSignals);

        // ✅ CRITICAL FIX: Convert database signals to HubSignal format and update allSignalHistory
        const hubSignals: HubSignal[] = mappedSignals.map(dbSignal => {
          // Parse take_profit array from JSONB
          const takeProfitArray = Array.isArray(dbSignal.take_profit) ? dbSignal.take_profit : [];
          const targets = takeProfitArray.filter((t: any) => t !== null && typeof t === 'number') as number[];

          return {
            id: dbSignal.id,
            symbol: dbSignal.symbol,
            direction: dbSignal.signal_type as 'LONG' | 'SHORT',
            confidence: dbSignal.confidence,
            entry: dbSignal.entry_price || 0,
            stopLoss: dbSignal.stop_loss,
            targets,
            riskReward: targets.length > 0 && dbSignal.stop_loss
              ? Math.abs((targets[0] - (dbSignal.entry_price || 0)) / ((dbSignal.entry_price || 0) - dbSignal.stop_loss))
              : undefined,
            qualityTier: 'MEDIUM',
            riskLevel: 'MEDIUM',
            timestamp: new Date(dbSignal.created_at).getTime(),
            expiresAt: new Date(dbSignal.expires_at).getTime(),
            timeLimit: new Date(dbSignal.expires_at).getTime() - new Date(dbSignal.created_at).getTime(),
            outcome: null,
            strategyName: dbSignal.metadata?.strategy || 'Multi-Strategy',
            timeframe: dbSignal.metadata?.timeframe || '15m',
            qualityScore: dbSignal.quality_score || dbSignal.confidence,
            tier: dbSignal.tier
          };
        });

        // Update the signal history display
        setAllSignalHistory(hubSignals);
        console.log(`[Hub] ✅ Updated signal history with ${hubSignals.length} database signals`);

        // ✅ FIX: Only disable loading after initial load
        if (isInitialLoadRef.current) {
          setLoadingUserSignals(false);
          isInitialLoadRef.current = false;
        }
      } catch (error) {
        console.error('[Hub] Error in fetchUserSignals:', error);
        if (isInitialLoadRef.current) {
          setLoadingUserSignals(false);
          isInitialLoadRef.current = false;
        }
      } finally {
        // 🛡️ STABILITY: Always reset fetch flag to prevent permanent lock
        fetchInProgress.current = false;
      }
    };

    // ✅ FIX: Store fetch function in ref so timer callback can use it
    fetchUserSignalsRef.current = fetchUserSignals;

    // Reset initial load flag when tier changes
    isInitialLoadRef.current = true;
    fetchUserSignals();

    // 🛡️ STABILITY: Reduced from 1s to 3s polling for better performance
    // Still feels instant (<3s lag) but 66% fewer database queries
    const interval = setInterval(fetchUserSignals, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [tier, quotaLimit]);

  // ✅ FIX: Set up real-time subscription ONCE on mount, don't recreate on tier change
  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('[Hub] 🔔 Setting up real-time subscription for user signals...');

        channel = supabase
          .channel('user-signals-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_signals',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              try {
                if (!payload?.new) return;

                // Map signal to extract image from metadata
                const mappedRealtimeSignal = {
                  ...payload.new,
                  image: payload.new.metadata?.image || ''
                };

                setUserSignals(prev => {
                  try {
                    return [mappedRealtimeSignal, ...prev];
                  } catch (err) {
                    console.error('[Hub] Error adding real-time signal:', err);
                    return prev;
                  }
                });

                // Also update allSignalHistory with converted HubSignal
                const newSignal = payload.new;
                const takeProfitArray = Array.isArray(newSignal.take_profit) ? newSignal.take_profit : [];
                const targets = takeProfitArray.filter((t: any) => t !== null && typeof t === 'number') as number[];

                const hubSignal: HubSignal = {
                  id: newSignal.id,
                  symbol: newSignal.symbol,
                  direction: newSignal.signal_type as 'LONG' | 'SHORT',
                  confidence: newSignal.confidence,
                  entry: newSignal.entry_price || 0,
                  stopLoss: newSignal.stop_loss,
                  targets,
                  riskReward: targets.length > 0 && newSignal.stop_loss
                    ? Math.abs((targets[0] - (newSignal.entry_price || 0)) / ((newSignal.entry_price || 0) - newSignal.stop_loss))
                    : undefined,
                  qualityTier: 'MEDIUM',
                  riskLevel: 'MEDIUM',
                  timestamp: new Date(newSignal.created_at).getTime(),
                  expiresAt: new Date(newSignal.expires_at).getTime(),
                  timeLimit: new Date(newSignal.expires_at).getTime() - new Date(newSignal.created_at).getTime(),
                  outcome: null,
                  strategyName: newSignal.metadata?.strategy || 'Multi-Strategy',
                  timeframe: newSignal.metadata?.timeframe || '15m',
                  qualityScore: newSignal.quality_score || newSignal.confidence,
                  tier: newSignal.tier
                };

                setAllSignalHistory(prev => [hubSignal, ...prev]);
                console.log('[Hub] 🆕 Real-time signal added:', newSignal.symbol);
              } catch (error) {
                console.error('[Hub] Error in real-time INSERT handler:', error);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_signals',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              try {
                // 🛡️ STABILITY: Validate payload
                if (!payload?.new || !payload.new.id) {
                  console.warn('[Hub] Invalid UPDATE payload:', payload);
                  return;
                }

                console.log('[Hub] 📝 Signal updated via real-time:', payload.new);

                // ✅ PRODUCTION FIX: Map updated signal to extract image from metadata
                const updatedImageUrl = payload.new.metadata?.image || '';
                const mappedUpdatedSignal = {
                  ...payload.new,
                  image: updatedImageUrl // ✅ Extract image to top level
                };

                setUserSignals(prev => {
                  try {
                    return prev.map(sig => sig?.id === payload.new.id ? mappedUpdatedSignal : sig);
                  } catch (err) {
                    console.error('[Hub] Error updating real-time signal:', err);
                    return prev;
                  }
                });

                // Also update allSignalHistory
                const updatedSignal = payload.new;
                const takeProfitArray = Array.isArray(updatedSignal.take_profit) ? updatedSignal.take_profit : [];
                const targets = takeProfitArray.filter((t: any) => t !== null && typeof t === 'number') as number[];

                const hubSignal: HubSignal = {
                  id: updatedSignal.id,
                  symbol: updatedSignal.symbol,
                  direction: updatedSignal.signal_type as 'LONG' | 'SHORT',
                  confidence: updatedSignal.confidence,
                  entry: updatedSignal.entry_price || 0,
                  stopLoss: updatedSignal.stop_loss,
                  targets,
                  riskReward: targets.length > 0 && updatedSignal.stop_loss
                    ? Math.abs((targets[0] - (updatedSignal.entry_price || 0)) / ((updatedSignal.entry_price || 0) - updatedSignal.stop_loss))
                    : undefined,
                  qualityTier: 'MEDIUM',
                  riskLevel: 'MEDIUM',
                  timestamp: new Date(updatedSignal.created_at).getTime(),
                  expiresAt: new Date(updatedSignal.expires_at).getTime(),
                  timeLimit: new Date(updatedSignal.expires_at).getTime() - new Date(updatedSignal.created_at).getTime(),
                  outcome: null,
                  strategyName: updatedSignal.metadata?.strategy || 'Multi-Strategy',
                  timeframe: updatedSignal.metadata?.timeframe || '15m',
                  qualityScore: updatedSignal.quality_score || updatedSignal.confidence,
                  tier: updatedSignal.tier
                };

                setAllSignalHistory(prev => prev.map(sig => sig.id === updatedSignal.id ? hubSignal : sig));
              } catch (error) {
                console.error('[Hub] Error in real-time UPDATE handler:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('[Hub] 📡 Real-time subscription status:', status);
          });

        // ✅ 24/7 AUTONOMOUS OPERATION: Register channel with reconnection manager
        // This ensures automatic reconnection if the connection drops
        console.log('[Hub] 🔗 Registering channel with reconnection manager...');

        supabaseReconnectionManager.monitorChannel(
          'user-signals-realtime',
          channel,
          async () => {
            // Reconnection callback - recreate subscription
            console.log('[Hub] 🔄 Reconnection callback triggered - recreating subscription...');

            // Unsubscribe old channel first
            await channel.unsubscribe();

            // Recreate the entire subscription flow
            await setupRealtime();

            console.log('[Hub] ✅ Subscription recreated successfully');
          }
        );

        console.log('[Hub] ✅ Channel registered with auto-reconnect');
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        console.log('[Hub] 🔌 Unsubscribing from real-time channel');

        // Stop monitoring the channel
        supabaseReconnectionManager.stopMonitoring('user-signals-realtime');

        channel.unsubscribe();
      }
    };
  }, []); // ✅ FIX: Empty dependency array - only run once

  // 🚀 INSTANT SIGNAL UPDATES: Listen for instant-signal events for <0.5s lag
  useEffect(() => {
    const handleInstantSignal = (event: CustomEvent) => {
      try {
        // 🛡️ STABILITY: Validate event structure
        if (!event || !event.detail) {
          console.warn('[Hub] Invalid instant signal event:', event);
          return;
        }

        const newSignal = event.detail;

        // 🛡️ STABILITY: Validate signal structure
        if (!newSignal?.id || !newSignal?.symbol || !newSignal?.signal_type) {
          console.warn('[Hub] Invalid signal structure:', newSignal);
          return;
        }

        console.log(`[Hub] ⚡ INSTANT signal received: ${newSignal.symbol} ${newSignal.signal_type}`);
        console.log('[Hub] 📸 Instant signal metadata.image:', newSignal?.metadata?.image ?? 'none');

        // ✅ PRODUCTION FIX: Extract image URL from metadata to top level
        const imageUrl = newSignal.metadata?.image || '';
        const mappedSignal = {
          ...newSignal,
          image: imageUrl // ✅ Make image accessible at top level
        };

        if (imageUrl) {
          console.log(`[Hub] 📸 Instant signal mapped with image: "${imageUrl}"`);
        }

        // Add signal to state immediately (optimistic update)
        setUserSignals(prev => {
          try {
            // Check if signal already exists (prevent duplicates)
            const exists = prev.some(s => s?.id === newSignal.id);
            if (exists) {
              console.log('[Hub] ℹ️  Signal already exists, skipping duplicate');
              return prev;
            }

            console.log('[Hub] ✅ Adding instant signal to UI');
            return [mappedSignal, ...prev];
          } catch (err) {
            console.error('[Hub] Error updating signals array:', err);
            return prev; // Return unchanged on error
          }
        });
      } catch (error) {
        console.error('[Hub] Error in handleInstantSignal:', error);
        // Don't re-throw - log and continue
      }
    };

    window.addEventListener('instant-signal', handleInstantSignal as EventListener);

    return () => {
      window.removeEventListener('instant-signal', handleInstantSignal as EventListener);
    };
  }, []);

  // ⚡ ULTRA-LOW-LATENCY: Listen for signals from other tabs via BroadcastChannel (<10ms)
  useEffect(() => {
    console.log('[Hub] ⚡ Setting up BroadcastChannel listener for cross-tab signals...');

    const unsubscribe = signalBroadcaster.on('NEW_SIGNAL', (signal: any) => {
      try {
        console.log('\n' + '⚡'.repeat(40));
        console.log('[Hub] ⚡⚡⚡ SIGNAL FROM OTHER TAB VIA BROADCAST (<10ms latency)! ⚡⚡⚡');
        console.log(`[Hub] Signal: ${signal.symbol} ${signal.direction}`);
        console.log('⚡'.repeat(40) + '\n');

        // Convert to user_signals format if needed
        const userSignal = {
          id: signal.id,
          symbol: signal.symbol,
          signal_type: signal.direction,
          confidence: signal.confidence || 0,
          quality_score: signal.qualityScore || 0,
          entry_price: signal.entry,
          take_profit: signal.targets,
          stop_loss: signal.stopLoss,
          expires_at: signal.expiresAt ? new Date(signal.expiresAt).toISOString() : null,
          created_at: signal.timestamp ? new Date(signal.timestamp).toISOString() : new Date().toISOString(),
          metadata: {
            strategy: signal.strategyName || signal.strategy,
            patterns: signal.patterns,
            dataQuality: signal.dataQuality,
            marketRegime: signal.marketRegime,
            riskRewardRatio: signal.riskRewardRatio,
            timeframe: signal.timeframe,
            dynamicExpiry: signal.dynamicExpiry,
            expiryFactors: signal.expiryFactors,
            image: signal.image
          },
          image: signal.image, // ✅ PRODUCTION FIX: Add image at top level for easy UI access
          full_details: true,
          viewed: false,
          clicked: false
        };

        setUserSignals(prev => {
          try {
            // Check if signal already exists (prevent duplicates)
            const exists = prev.some(s => s?.id === signal.id);
            if (exists) {
              console.log('[Hub] ℹ️  Signal already exists (from BroadcastChannel), skipping duplicate');
              return prev;
            }

            console.log('[Hub] ✅ Adding BroadcastChannel signal to UI');
            return [userSignal, ...prev];
          } catch (err) {
            console.error('[Hub] Error updating signals from BroadcastChannel:', err);
            return prev;
          }
        });
      } catch (error) {
        console.error('[Hub] Error in BroadcastChannel handler:', error);
      }
    });

    console.log('[Hub] ✅ BroadcastChannel listener active');

    return () => {
      unsubscribe();
      console.log('[Hub] 🔌 BroadcastChannel listener removed');
    };
  }, []);

  // ✅ DIAGNOSTIC: Add global function to check signal state
  useEffect(() => {
    (window as any).debugSignals = () => {
      const history = globalHubService.getSignalHistory();
      const active = globalHubService.getActiveSignals();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 SIGNAL DIAGNOSTICS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Total signals in history:', history.length);
      console.log('🔴 Active signals:', active.length);

      if (history.length > 0) {
        const sorted = [...history].sort((a, b) => {
          const aTime = a.outcomeTimestamp || a.timestamp;
          const bTime = b.outcomeTimestamp || b.timestamp;
          return bTime - aTime;
        });

        console.log('\n📜 Last 10 signals (newest first):');
        sorted.slice(0, 10).forEach((s, i) => {
          const time = s.outcomeTimestamp || s.timestamp;
          const age = Math.round((Date.now() - time) / (1000 * 60));
          console.log(`  ${i + 1}. ${s.symbol} ${s.direction} - ${s.outcome || 'PENDING'} - ${age} min ago`);
        });

        const completed = history.filter(s => s.outcome && s.outcome !== 'PENDING');
        const wins = completed.filter(s => s.outcome === 'WIN').length;
        const losses = completed.filter(s => s.outcome === 'LOSS').length;
        const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

        console.log('\n📈 Metrics:');
        console.log(`  Total completed: ${completed.length}`);
        console.log(`  Wins: ${wins}`);
        console.log(`  Losses: ${losses}`);
        console.log(`  Win Rate: ${winRate.toFixed(1)}%`);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💡 TIP: Run window.debugSignals() to check signal state');
    };

    console.log('💡 DEBUG: Run window.debugSignals() in console to check signal state');

    return () => {
      delete (window as any).debugSignals;
    };
  }, []);

  // Timer state - needs to be declared BEFORE useMemo that depends on it
  const [currentTime, setCurrentTime] = useState(Date.now());

  // State from global service
  const [metrics, setMetrics] = useState<HubMetrics>(globalHubService.getMetrics());
  const [activeSignals, setActiveSignals] = useState<HubSignal[]>(globalHubService.getActiveSignals());
  const [allSignalHistory, setAllSignalHistory] = useState<HubSignal[]>(globalHubService.getSignalHistory());
  const [zetaMetrics, setZetaMetrics] = useState<ZetaMetrics>(zetaLearningEngine.getMetrics());

  // Strategy performance state
  const [strategyPerformances, setStrategyPerformances] = useState<StrategyPerformance[]>([]);

  // ✅ USER SIGNALS FROM DATABASE (Tier-based)
  const [userSignals, setUserSignals] = useState<any[]>([]);
  const [loadingUserSignals, setLoadingUserSignals] = useState(true);

  // ✅ TIMEOUT FILTER - Keep timeouts for ML, but allow hiding in UI
  const [showTimeouts, setShowTimeouts] = useState(true);

  // ✅ MEMOIZED SORTING - Re-compute when allSignalHistory or currentTime changes
  // This ensures React properly detects changes and re-renders the UI
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const signalHistory = useMemo(() => {
    // 🔥 REDUCED LOGGING - Only log every 60 seconds to prevent console spam
    if (currentTime % 60000 < 1000) {
      console.log(`[Hub UI] 📊 Signals: ${allSignalHistory.length} total, ${activeSignals.length} active`);
    }

    // Step 1: Filter by age (last 24 hours)
    const ageFiltered = allSignalHistory.filter(signal => {
      // Use outcomeTimestamp if available (completed), otherwise use creation timestamp
      const signalTime = signal.outcomeTimestamp || signal.timestamp;

      // 🛡️ SAFETY: Skip signals with invalid timestamps
      if (!signalTime || typeof signalTime !== 'number' || isNaN(signalTime)) {
        console.warn('[Hub] Skipping signal with invalid timestamp:', signal);
        return false;
      }

      const signalAge = currentTime - signalTime;
      return signalAge <= TWENTY_FOUR_HOURS && signalAge >= 0;
    });

    // Step 2: Filter by timeout preference (if user wants to hide timeouts)
    const filtered = showTimeouts
      ? ageFiltered
      : ageFiltered.filter(signal => {
          // Keep WIN and LOSS, exclude TIMEOUT outcomes
          return signal.outcome && !signal.outcome.startsWith('TIMEOUT');
        });

    // Step 3: Sort by NEWEST first (most recent activity)
    const sorted = [...filtered].sort((a, b) => {
      // Sort by outcome timestamp if available, otherwise by creation timestamp
      const aTime = a.outcomeTimestamp || a.timestamp || 0;
      const bTime = b.outcomeTimestamp || b.timestamp || 0;
      return bTime - aTime; // Descending order (newest first)
    });

    // Log sorted results every 10 seconds
    if (currentTime % 10000 < 1000 && sorted.length > 0) {
      console.log('[Hub UI] 📈 After filtering and sorting:', sorted.length, 'signals (showTimeouts:', showTimeouts + ')');
      const newestSignal = sorted[0];
      const newestTime = newestSignal?.outcomeTimestamp || newestSignal?.timestamp || Date.now();
      console.log('[Hub UI] Newest signal:', {
        symbol: newestSignal?.symbol || 'N/A',
        outcome: newestSignal?.outcome || 'N/A',
        time: new Date(newestTime).toLocaleString(),
        minutesAgo: Math.round((currentTime - newestTime) / 60000)
      });
      if (sorted.length > 1) {
        const oldestSignal = sorted[Math.min(19, sorted.length - 1)];
        const oldestTime = oldestSignal?.outcomeTimestamp || oldestSignal?.timestamp || Date.now();
        console.log('[Hub UI] Oldest signal on page 1:', {
          symbol: oldestSignal?.symbol || 'N/A',
          time: new Date(oldestTime).toLocaleString(),
          minutesAgo: Math.round((currentTime - oldestTime) / 60000)
        });
      }
    }

    return sorted;
  }, [allSignalHistory, currentTime, showTimeouts]); // Re-run when history, time, OR timeout filter changes

  // Visual state
  const [flowingParticles, setFlowingParticles] = useState<FlowingParticle[]>([]);
  const [recentSignal, setRecentSignal] = useState<HubSignal | null>(null);

  // Expanded engine states
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  // Rejected Signals State
  const [rejectedSignals, setRejectedSignals] = useState<RejectedSignal[]>([]);
  const [rejectedFilter, setRejectedFilter] = useState<'ALL' | 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA'>('ALL');

  // Pagination State for Signal History
  const [currentPage, setCurrentPage] = useState(1);
  const SIGNALS_PER_PAGE = 20;

  // Signal expansion state for detailed view
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);

  // Monthly Stats State
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyStats | null>(null);
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Activity pulses (subtle)
  const [dataEngineActive, setDataEngineActive] = useState(false);
  const [alphaEngineActive, setAlphaEngineActive] = useState(false);
  const [betaEngineActive, setBetaEngineActive] = useState(false);
  const [gammaEngineActive, setGammaEngineActive] = useState(false);
  const [deltaEngineActive, setDeltaEngineActive] = useState(false);
  const [zetaEngineActive, setZetaEngineActive] = useState(false);

  // Quality Gate Budget Status
  const [budgetStatus, setBudgetStatus] = useState(signalQualityGate.getBudgetStatus());

  // ===== TIMER UPDATE FOR COUNTDOWN =====
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // ===== UPDATE QUALITY GATE BUDGET STATUS =====
  useEffect(() => {
    const budgetInterval = setInterval(() => {
      setBudgetStatus(signalQualityGate.getBudgetStatus());
    }, 1000); // Update every second

    return () => clearInterval(budgetInterval);
  }, []);

  // ===== CONNECT TO GLOBAL SERVICE =====
  useEffect(() => {
    mountedRef.current = true;

    // Expose services to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).globalHubService = globalHubService;
      (window as any).realOutcomeTracker = realOutcomeTracker;
      console.log('[Hub UI] 🐛 Debug: Services exposed to window.globalHubService and window.realOutcomeTracker');
    }
    console.log('[Hub UI] Connecting to global service...');

    // ✅ SERVER-SIDE MODE: Frontend does NOT start signal generation
    // Signals are generated 24/7 by the Supabase Edge Function
    // Frontend is a PASSIVE RECEIVER ONLY
    const initializeService = async () => {
      console.log('[Hub UI] 🚀 SERVER-SIDE MODE: Frontend will NOT generate signals');
      console.log('[Hub UI] 📡 Frontend is PASSIVE RECEIVER - reading from database only');

      // DO NOT START THE SERVICE - it would generate frontend signals
      // if (!globalHubService.isRunning()) {
      //   await globalHubService.start();
      // }

      // Load initial state from database (not from service)
      console.log('[Hub UI] 📥 Loading initial signals from database...');
      const initialMetrics = globalHubService.getMetrics();
      const initialSignals = globalHubService.getActiveSignals();
      const initialZetaMetrics = zetaLearningEngine.getMetrics();

      console.log('[Hub UI] 📊 Initial metrics loaded:', initialMetrics);
      console.log('[Hub UI] 🔔 Initial active signals loaded:', initialSignals.length);
      console.log('[Hub UI] 🧠 Initial Zeta metrics loaded:', initialZetaMetrics);

      setMetrics(initialMetrics);
      setActiveSignals(initialSignals);
      setZetaMetrics(initialZetaMetrics);

      // Load strategy performances
      console.log('[Hub UI] 📈 Loading strategy performances...');
      try {
        const performances = await strategyPerformanceTracker.getAllStrategyPerformances();
        console.log('[Hub UI] ✅ Strategy performances loaded:', performances.length);
        setStrategyPerformances(performances);
      } catch (error) {
        console.error('[Hub UI] ❌ Error loading strategy performances:', error);
      }
    };

    // Subscribe to updates
    const handleMetricsUpdate = (newMetrics: HubMetrics) => {
      if (!mountedRef.current) return;
      setMetrics(newMetrics);

      // Trigger visual feedback with color
      setDataEngineActive(true);
      setTimeout(() => setDataEngineActive(false), 200);
    };

    const handleSignalLive = (signals: HubSignal[]) => {
      if (!mountedRef.current) {
        console.log('[Hub UI] ⚠️ signal:live event received but component not mounted - IGNORING');
        return;
      }
      console.log(`[Hub UI] 🔴 LIVE SIGNALS EVENT RECEIVED - ${signals.length} signals`);
      console.log(`[Hub UI] 📋 Signals:`, signals.map(s => `${s.symbol} ${s.direction}`));
      console.log(`[Hub UI] 📊 Current activeSignals state BEFORE update: ${activeSignals.length}`);
      setActiveSignals(signals);
      console.log(`[Hub UI] ✅ setActiveSignals() called with ${signals.length} signals`);
    };

    const handleSignalHistory = (history: HubSignal[]) => {
      if (!mountedRef.current) return;

      // Enhanced logging to debug real-time updates
      const last3 = history.slice(0, 3).map(s => ({
        symbol: s.symbol,
        outcome: s.outcome,
        timestamp: new Date(s.outcomeTimestamp || s.timestamp).toLocaleTimeString()
      }));

      console.log('[Hub UI] 📜 Signal history EVENT received:', history.length, 'signals');
      console.log('[Hub UI] 📜 Last 3 signals (unsorted):', last3);
      setAllSignalHistory(history);
    };

    const handleSignalNew = (signal: HubSignal) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] New signal:', signal.symbol, signal.direction);

      // Show recent signal highlight
      setRecentSignal(signal);
      setTimeout(() => setRecentSignal(null), 3000);

      // Pipeline pulses: Gamma (assembly) → Delta (filtering) → signal emitted
      setGammaEngineActive(true);
      setTimeout(() => setGammaEngineActive(false), 400);

      // Delta pulse (signal passed quality filter)
      setTimeout(() => {
        setDeltaEngineActive(true);
        setTimeout(() => setDeltaEngineActive(false), 400);
      }, 200);
    };

    const handleSignalOutcome = ({ outcome }: { signalId: string; outcome: 'WIN' | 'LOSS' }) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] Signal outcome:', outcome);

      // Zeta pulse (learning from outcome)
      setZetaEngineActive(true);
      setTimeout(() => setZetaEngineActive(false), 400);
    };

    const handleZetaMetricsUpdate = (newMetrics: ZetaMetrics) => {
      if (!mountedRef.current) return;
      console.log('[Hub UI] 🧠 Zeta metrics update received:', newMetrics);
      setZetaMetrics(newMetrics);
    };

    // Listen to events
    globalHubService.on('metrics:update', handleMetricsUpdate);
    globalHubService.on('signal:live', handleSignalLive);
    globalHubService.on('signal:history', handleSignalHistory); // ✅ Real-time history updates
    globalHubService.on('signal:new', handleSignalNew);
    globalHubService.on('signal:outcome', handleSignalOutcome);
    zetaLearningEngine.on('metrics:update', handleZetaMetricsUpdate);

    // Call the async initialization (after event listeners are set up)
    initializeService()
      .then(() => {
        console.log('[Hub UI] 🎯 Initialization complete - Setting up polling and animations...');
        console.log('[Hub UI] 📊 Service running:', globalHubService.isRunning());
        console.log('[Hub UI] 📊 Initial metrics:', globalHubService.getMetrics());
        console.log('[Hub UI] 🔔 Initial active signals:', globalHubService.getActiveSignals().length);
        console.log('[Hub UI] 📚 Signal history:', globalHubService.getState().signalHistory.length);

        // 🔥 PRODUCTION FIX: Start database polling for bulletproof signal updates
        // This replaces fragile event-driven system with reliable database polling
        console.log('[Hub UI] 🗄️ Starting database polling for signals...');
        signalDatabaseService.startPolling((newSignals) => {
          if (!mountedRef.current) return;

          console.log(`[Hub UI] 🆕 DATABASE: Received ${newSignals.length} new signals`);

          // Merge with existing signals (avoid duplicates)
          setActiveSignals(current => {
            const merged = [...current];
            for (const newSig of newSignals) {
              if (!merged.some(s => s.id === newSig.id)) {
                merged.unshift(newSig);
                console.log(`[Hub UI] ➕ Added new signal to UI: ${newSig.symbol} ${newSig.direction}`);
              }
            }
            return merged;
          });
        });

        // ✅ CRITICAL: Poll metrics every second for real-time updates (AFTER initialization)
        metricsIntervalRef.current = setInterval(() => {
          if (!mountedRef.current) return;

          const currentMetrics = globalHubService.getMetrics();
          const currentSignals = globalHubService.getActiveSignals();
          const currentHistory = globalHubService.getSignalHistory(); // ✅ Poll history for real-time updates
          const currentZetaMetrics = zetaLearningEngine.getMetrics();
          const monthlyStats = globalHubService.getCurrentMonthStats();

          // Reduced logging: Only log every 60 seconds instead of 10 to reduce console spam
          if (Date.now() % 60000 < 1000) {
            console.log('[Hub UI] 🔄 Polling update - Active signals:', currentSignals.length, 'History:', currentHistory.length, 'Zeta outcomes:', currentZetaMetrics.totalOutcomes);
          }

          // Check if history has actually changed before updating state
          const historyChanged = currentHistory.length !== allSignalHistory.length ||
                                 currentHistory[0]?.id !== allSignalHistory[0]?.id;

          if (historyChanged && Date.now() % 60000 < 1000) {
            console.log('[Hub UI] 🔄 History CHANGED detected in polling!',
                       'Old:', allSignalHistory.length, 'New:', currentHistory.length);
          }

          setMetrics(currentMetrics);
          setActiveSignals(currentSignals);
          setAllSignalHistory(currentHistory); // ✅ Update history state
          setZetaMetrics(currentZetaMetrics);
          setCurrentMonthStats(monthlyStats);

          // ✅ Fetch rejected signals every second for real-time transparency
          fetchRejectedSignals();
        }, 1000);

        // Start animations
        startParticleFlow();
        startActivityPulses();

        console.log('[Hub UI] ✅ Connected to global service - All systems operational');
      })
      .catch((error) => {
        console.error('[Hub UI] ❌ CRITICAL: Failed to initialize service:', error);
        console.error('[Hub UI] Stack trace:', error.stack);
      });

    return () => {
      mountedRef.current = false;
      globalHubService.off('metrics:update', handleMetricsUpdate);
      globalHubService.off('signal:live', handleSignalLive);
      globalHubService.off('signal:history', handleSignalHistory); // ✅ Cleanup history listener
      globalHubService.off('signal:new', handleSignalNew);
      globalHubService.off('signal:outcome', handleSignalOutcome);
      zetaLearningEngine.off('metrics:update', handleZetaMetricsUpdate);

      // 🔥 CRITICAL: Stop database polling on unmount
      signalDatabaseService.stopPolling();

      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      console.log('[Hub UI] Disconnected from global service and stopped database polling');
    };
  }, []);

  // ===== CONTINUOUS PARTICLE FLOW (24/7) WITH FILTERING FUNNEL =====
  const startParticleFlow = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'sm', 'md'];

    // ✅ SMOOTHER SPAWN RATES - More continuous 24/7 flow with better visual consistency
    // Increased spawn rates for smoother, more continuous particle flow
    const SPAWN_RATES = [
      0.9,  // Stage 0 (Data): 90% - High density (raw data ingestion) - INCREASED for continuous flow
      0.7,  // Stage 1 (Alpha): 70% - Pattern filtering reduces flow - INCREASED
      0.5,  // Stage 2 (Beta): 50% - Scoring reduces further - INCREASED
      0.35, // Stage 3 (Gamma): 35% - Assembly filters more - INCREASED
      0.2,  // Stage 4 (Delta): 20% - ML filter (CRITICAL GATE) - INCREASED
      0.08  // Stage 5 (Zeta): 8% - Learning from passed signals - INCREASED
    ];

    const animate = () => {
      setFlowingParticles(prev => {
        const particles = [...prev];

        // ✅ SPAWN PARTICLES AT EACH STAGE based on filtering logic
        // This creates the visual funnel effect showing data reduction
        for (let stage = 0; stage <= 5; stage++) {
          const spawnRate = SPAWN_RATES[stage];
          const maxParticlesPerStage = 12; // INCREASED for smoother continuous flow
          const currentStageCount = particles.filter(p => p.stage === stage).length;

          // Spawn if: random chance < spawn rate AND not too many particles AND total particles < 80 (INCREASED)
          if (Math.random() < spawnRate && currentStageCount < maxParticlesPerStage && particles.length < 80) {
            // ✅ CONDITIONAL ZETA PARTICLES - Only spawn when Delta has passed signals
            // Zeta only learns from Delta-approved signals, so particles should reflect this
            if (stage === 5) {
              // Only spawn Zeta particles if Delta has processed and passed some signals
              const deltaPassRate = metrics.deltaPassed && metrics.deltaProcessed
                ? metrics.deltaPassed / metrics.deltaProcessed
                : 0;

              // Skip Zeta particle if Delta hasn't passed any signals yet
              if (deltaPassRate === 0 || metrics.deltaPassed === 0) {
                continue;
              }
            }

            particles.push({
              id: `p${Date.now()}${Math.random()}`,
              stage: stage,
              progress: 0,
              symbol: CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)],
              speed: 2.0 + Math.random() * 2.0, // SMOOTHER: Slightly faster, tighter range for more consistent flow
              color: colors[Math.floor(Math.random() * colors.length)],
              size: sizes[Math.floor(Math.random() * sizes.length)]
            });
          }
        }

        // Animate existing particles
        return particles
          .map(p => {
            const newProgress = p.progress + p.speed;
            if (newProgress >= 100) {
              // Particle reached end of current stage
              if (p.stage < 5) {
                // Move to next stage with filtering probability
                const nextStage = p.stage + 1;
                const passRate = SPAWN_RATES[nextStage] / SPAWN_RATES[p.stage];

                // Filtering: particle may not pass to next stage
                if (Math.random() < passRate) {
                  return { ...p, stage: nextStage, progress: 0 };
                }
                // Filtered out - remove particle
                return null;
              }
              // Reached end of Zeta (final stage) - remove
              return null;
            }
            return { ...p, progress: newProgress };
          })
          .filter((p): p is FlowingParticle => p !== null);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // ===== ACTIVITY PULSES =====
  const startActivityPulses = () => {
    const pulse = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      setter(true);
      setTimeout(() => setter(false), 300);
    };

    const interval = setInterval(() => {
      if (!mountedRef.current) return;

      // Random engine pulses for "alive" feel
      const engines = [setAlphaEngineActive, setBetaEngineActive];
      const randomEngine = engines[Math.floor(Math.random() * engines.length)];

      if (Math.random() < 0.3) {
        pulse(randomEngine);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  // ===== FETCH REJECTED SIGNALS =====
  const fetchRejectedSignals = async () => {
    try {
      const { data, error} = await supabase
        .from('rejected_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // ✅ Professional quant-firm level: Track all rejections for analysis (increased from 100)

      if (error) {
        console.error('[Hub UI] Error fetching rejected signals:', error);
        return;
      }

      if (data) {
        setRejectedSignals(data);
      }
    } catch (err) {
      console.error('[Hub UI] Error fetching rejected signals:', err);
    }
  };

  // ===== HELPER FUNCTIONS =====
  const getStagePos = (stage: number): string => {
    const positions = ['6%', '21%', '36%', '51%', '66%', '81%'];
    return positions[Math.min(stage, 5)] || '6%';
  };

  const getParticleSize = (size: string) => {
    if (size === 'lg') return 'text-base';
    if (size === 'md') return 'text-sm';
    return 'text-xs';
  };

  const fmt = (num: number | undefined) => {
    // 🛡️ SAFETY: Handle undefined/null numbers
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString();
  };
  const fmtDec = (num: number | undefined) => {
    // 🛡️ SAFETY: Handle undefined/null numbers
    if (num === undefined || num === null || isNaN(num)) {
      return '0.0';
    }
    return num.toFixed(1);
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const timeAgo = (timestamp: number | undefined) => {
    // 🛡️ SAFETY: Handle undefined timestamps
    if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
      return 'N/A';
    }

    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };


  // Toggle engine expansion
  const toggleEngine = (engineName: string) => {
    setExpandedEngine(expandedEngine === engineName ? null : engineName);
  };

  // Reset expanded signal when page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setExpandedSignalId(null); // Close any expanded signal when navigating
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        {/* HEADER - Clean and professional */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-medium text-slate-900 tracking-tight mb-2 flex items-center gap-3">
                Intelligence Hub
                {/* 🎯 TIER BADGE */}
                <Badge
                  className={`${
                    tier === 'FREE'
                      ? 'bg-gray-500'
                      : tier === 'PRO'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  } text-white border-0 text-sm`}
                >
                  {tier === 'FREE' && <Zap className="w-3 h-3 mr-1" />}
                  {tier === 'PRO' && <Sparkles className="w-3 h-3 mr-1" />}
                  {tier === 'MAX' && <Crown className="w-3 h-3 mr-1" />}
                  {tier} TIER
                </Badge>
              </h1>
              <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-700">
                  <Circle className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live 24/7
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{fmt(metrics.totalTickers)}</span> Tickers
                <span className="text-slate-300">•</span>
                <span className="font-semibold">{fmt(metrics.totalAnalyses)}</span> Analyses
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">Uptime</div>
                <div className="text-base font-semibold text-slate-900">{formatUptime(metrics.uptime)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">Win Rate</div>
                <div className="text-base font-semibold text-emerald-600">{fmtDec(metrics.winRate)}%</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1">Quality Gate</div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="flex items-center gap-1 text-slate-900">
                    <Activity className="w-3 h-3" />
                    <span className="font-semibold">{budgetStatus.signalsPublishedToday}/{signalQualityGate.getConfig().maxSignalsPerDay}</span>
                    <span className="text-slate-500">today</span>
                  </div>
                  {budgetStatus.minutesSinceLastSignal !== null && (
                    <div className="text-slate-500">
                      {budgetStatus.minutesSinceLastSignal}m ago
                    </div>
                  )}
                  {budgetStatus.queuedCandidates > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" />
                      <span>{budgetStatus.queuedCandidates} queued</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 QUOTA STATUS BANNER */}
        <div className="mb-6">
          <QuotaStatusBanner
            tier={tier}
            limit={quotaLimit}
            used={quotaUsed}
            remaining={quotaLimit - quotaUsed}
            onUpgradeClick={() => navigate('/upgrade')}
          />
        </div>

        {/* PIPELINE - Clean flow without overlapping pipes */}
        <Card className="mb-6 border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800">Real-Time Pipeline</h2>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-700">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>Active</span>
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">{fmt(metrics.totalSignals)} Total Signals</div>
            </div>

            {/* Pipeline Visualization - Clean minimal design */}
            <div className="relative h-40 bg-gradient-to-r from-slate-50 via-slate-50/50 to-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              {/* Flowing Particles */}
              {flowingParticles.map(p => {
                const stagePos = parseFloat(getStagePos(p.stage));
                const nextStagePos = parseFloat(getStagePos(p.stage + 1));
                const currentLeft = stagePos + (nextStagePos - stagePos) * (p.progress / 100);

                return (
                  <div
                    key={p.id}
                    className={`absolute ${getParticleSize(p.size)} font-bold pointer-events-none transition-all duration-100 opacity-70`}
                    style={{
                      left: `${currentLeft}%`,
                      top: 'calc(50% - 8px)',
                      color: p.color
                    }}
                  >
                    {p.symbol}
                  </div>
                );
              })}

              {/* Engine Nodes - Clickable for details */}

              {/* Data Engine (Clickable) */}
              <div className="absolute left-[6%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('data')}
                  className={`relative transition-all duration-200 ${dataEngineActive ? 'scale-110' : ''} ${expandedEngine === 'data' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    dataEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'data'
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-white border-2 border-blue-200'
                  }`}>
                    <Database className={`w-6 h-6 transition-colors ${dataEngineActive ? 'text-white' : expandedEngine === 'data' ? 'text-blue-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Data</div>
                  </div>
                </button>
              </div>

              {/* Alpha Engine (Clickable) */}
              <div className="absolute left-[21%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('alpha')}
                  className={`relative transition-all duration-200 ${alphaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'alpha' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    alphaEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'alpha'
                      ? 'bg-violet-100 border-2 border-violet-300'
                      : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${alphaEngineActive ? 'text-white' : expandedEngine === 'alpha' ? 'text-violet-600' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Alpha</div>
                  </div>
                </button>
              </div>

              {/* Beta Engine (Clickable) */}
              <div className="absolute left-[36%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('beta')}
                  className={`relative transition-all duration-200 ${betaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'beta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    betaEngineActive
                      ? 'bg-blue-500 border-2 border-blue-400'
                      : expandedEngine === 'beta'
                      ? 'bg-amber-100 border-2 border-amber-300'
                      : 'bg-white border-2 border-amber-200'
                  }`}>
                    <Target className={`w-6 h-6 transition-colors ${betaEngineActive ? 'text-white' : expandedEngine === 'beta' ? 'text-amber-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Beta</div>
                  </div>
                </button>
              </div>

              {/* Gamma Engine (Clickable) */}
              <div className="absolute left-[51%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('gamma')}
                  className={`relative transition-all duration-200 ${gammaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'gamma' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    gammaEngineActive
                      ? 'bg-amber-500 border-2 border-amber-400'
                      : expandedEngine === 'gamma'
                      ? 'bg-rose-100 border-2 border-rose-300'
                      : 'bg-white border-2 border-amber-200'
                  }`}>
                    <CheckCircle2 className={`w-6 h-6 transition-colors ${gammaEngineActive ? 'text-white' : expandedEngine === 'gamma' ? 'text-rose-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Gamma</div>
                  </div>
                </button>
              </div>

              {/* Delta V2 - Quality Filter (Clickable) */}
              <div className="absolute left-[66%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('delta')}
                  className={`relative transition-all duration-200 ${deltaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'delta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    deltaEngineActive
                      ? 'bg-emerald-500 border-2 border-emerald-400'
                      : expandedEngine === 'delta'
                      ? 'bg-emerald-100 border-2 border-emerald-300'
                      : 'bg-white border-2 border-emerald-200'
                  }`}>
                    <Filter className={`w-6 h-6 transition-colors ${deltaEngineActive ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Delta</div>
                  </div>
                </button>
              </div>

              {/* Zeta - Learning Engine (Clickable) */}
              <div className="absolute left-[81%] top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => toggleEngine('zeta')}
                  className={`relative transition-all duration-200 ${zetaEngineActive ? 'scale-110' : ''} ${expandedEngine === 'zeta' ? 'scale-105' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-105 ${
                    zetaEngineActive
                      ? 'bg-violet-500 border-2 border-violet-400'
                      : expandedEngine === 'zeta'
                      ? 'bg-violet-100 border-2 border-violet-300'
                      : 'bg-white border-2 border-violet-200'
                  }`}>
                    <Brain className={`w-6 h-6 transition-colors ${zetaEngineActive ? 'text-white' : 'text-violet-600'}`} />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <div className="text-xs text-slate-700 font-semibold">Zeta</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Metrics Row - Minimal */}
            <div className="grid grid-cols-4 gap-4 mt-12 pt-6 border-t border-slate-100">
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Tickers</div>
                <div className="text-xl font-semibold text-blue-600">{fmt(metrics.totalTickers)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Analyses</div>
                <div className="text-xl font-semibold text-blue-600">{fmt(metrics.totalAnalyses)}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Strategies</div>
                <div className="text-xl font-semibold text-blue-600">{metrics.strategiesActive}/17</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-500 mb-1 font-medium">Approval</div>
                <div className="text-xl font-semibold text-amber-600">{fmtDec(metrics.approvalRate)}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Engine Details - Collapsible */}
        {expandedEngine === 'data' && (
          <Card className="mb-6 border border-blue-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-semibold text-slate-800">Data Engine</h2>
                  <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                    Live Data Ingestion
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Continuously ingests real-time ticker data from exchanges, building comprehensive market snapshots.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Tickers Fetched</div>
                  <div className="text-xl font-semibold text-blue-700">{fmt(metrics.dataTickersFetched || 0)}</div>
                </div>
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Data Points</div>
                  <div className="text-xl font-semibold text-violet-700">{fmt(metrics.dataPointsCollected || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Refresh Rate</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmtDec(metrics.dataRefreshRate || 0)}/min</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Last Fetch</div>
                  <div className="text-sm font-semibold text-slate-700">
                    {metrics.dataLastFetch ? timeAgo(metrics.dataLastFetch) : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Alpha Engine Details - Collapsible */}
        {expandedEngine === 'alpha' && (
          <Card className="mb-6 border border-violet-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <h2 className="text-base font-semibold text-slate-800">Alpha Engine</h2>
                  <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                    Pattern Detection
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Analyzes market data using {metrics.alphaStrategiesActive || 17} institutional-grade strategies to detect tradeable patterns and setups.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Patterns Detected</div>
                  <div className="text-xl font-semibold text-violet-700">{fmt(metrics.alphaPatternsDetected || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Signals Generated</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.alphaSignalsGenerated || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Active Strategies</div>
                  <div className="text-xl font-semibold text-blue-700">{metrics.alphaStrategiesActive || 0}/17</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Detection Rate</div>
                  <div className="text-xl font-semibold text-amber-700">{fmtDec(metrics.alphaDetectionRate || 0)}/min</div>
                </div>
              </div>

              {/* 17 Strategy Breakdown with Performance Metrics */}
              <div className="mt-6 pt-6 border-t border-violet-100">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-800">17 Institutional-Grade Strategies</h3>
                  <div className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-600">
                    Ranked by Performance
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    // Merge strategy metadata with performance data
                    const strategiesWithPerformance = Object.values(STRATEGY_METADATA).map(strategy => {
                      const performance = strategyPerformances.find(p => p.strategyName === strategy.name);
                      return { strategy, performance };
                    });

                    // Sort by success rate (descending), then by total signals (for strategies with no data)
                    const sortedStrategies = strategiesWithPerformance.sort((a, b) => {
                      const aRate = a.performance?.successRate || 0;
                      const bRate = b.performance?.successRate || 0;
                      const aSignals = a.performance?.totalSignals || 0;
                      const bSignals = b.performance?.totalSignals || 0;

                      // If both have data, sort by success rate
                      if (aSignals > 0 && bSignals > 0) {
                        return bRate - aRate;
                      }
                      // If only one has data, prioritize it
                      if (aSignals > 0) return -1;
                      if (bSignals > 0) return 1;
                      // If neither has data, maintain original order
                      return 0;
                    });

                    return sortedStrategies.map(({ strategy, performance }, index) => {
                      const hasData = performance && performance.totalSignals > 0;
                      const winRate = performance?.successRate || 0;
                      const totalSignals = performance?.totalSignals || 0;

                      return (
                        <div key={strategy.name} className="p-3 bg-slate-50 rounded border border-slate-200 hover:border-violet-300 transition-all group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {/* Rank Badge */}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  index === 0 && hasData ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                  index === 1 && hasData ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                  index === 2 && hasData ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                                  'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  #{index + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">{strategy.displayName}</span>
                                {/* Win Rate Badge */}
                                {hasData ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    winRate >= 70 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                                    winRate >= 55 ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                                    winRate >= 45 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                    'bg-rose-100 text-rose-700 border border-rose-300'
                                  }`}>
                                    {winRate.toFixed(1)}% WR
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] font-medium">
                                    No data yet
                                  </span>
                                )}
                                {/* Signal Count */}
                                {hasData && (
                                  <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded text-[10px] font-medium">
                                    {totalSignals} signals
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{strategy.description}</p>
                              <p className="text-[10px] text-violet-600 mt-1 font-medium">Best for: {strategy.bestFor}</p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Institutional Features */}
                <div className="mt-4 p-3 bg-gradient-to-r from-violet-50 to-blue-50 rounded border border-violet-200">
                  <div className="text-xs font-semibold text-slate-800 mb-2">Anti-Manipulation Features</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Spoofing Detection (Order Flow Tsunami)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> OI Validation (Funding Squeeze)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Multi-Exchange Consensus
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Coin Deduplication (1 signal/coin)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Beta Consensus (65% threshold)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-600">✓</span> Delta Win Rate Filter (52%+)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Beta Engine Details - Collapsible */}
        {expandedEngine === 'beta' && (
          <Card className="mb-6 border border-amber-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-slate-800">Beta Engine</h2>
                  <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                    Scoring & Ranking
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Evaluates and scores all Alpha signals, ranking them by confidence and quality metrics.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Signals Scored</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.betaSignalsScored || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">High Quality</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.betaHighQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">&gt;80%</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Medium Quality</div>
                  <div className="text-xl font-semibold text-blue-700">{fmt(metrics.betaMediumQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">60-80%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Low Quality</div>
                  <div className="text-xl font-semibold text-amber-700">{fmt(metrics.betaLowQuality || 0)}</div>
                  <div className="text-xs text-slate-500 mt-1">&lt;60%</div>
                </div>
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">Avg Confidence</div>
                  <div className="text-xl font-semibold text-violet-700">{fmtDec(metrics.betaAvgConfidence || 0)}%</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Gamma Engine Details - Collapsible */}
        {expandedEngine === 'gamma' && (
          <Card className="mb-6 border border-rose-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-rose-600" />
                  <h2 className="text-base font-semibold text-slate-800">Gamma Engine</h2>
                  <div className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-xs font-medium text-rose-700">
                    Signal Assembly
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Assembles complete signal packages from scored data, preparing them for final quality filtering.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Received</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.gammaSignalsReceived || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Passed</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.gammaSignalsPassed || 0)}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded border border-rose-100 hover:border-rose-200 transition-colors">
                  <div className="text-xs text-rose-600 mb-1.5 font-medium">Rejected</div>
                  <div className="text-xl font-semibold text-rose-700">{fmt(metrics.gammaSignalsRejected || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Pass Rate</div>
                  <div className="text-xl font-semibold text-blue-700">{fmtDec(metrics.gammaPassRate || 0)}%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Queue Size</div>
                  <div className="text-xl font-semibold text-amber-700">{fmt(metrics.gammaQueueSize || 0)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Delta V2 Engine Details - Collapsible */}
        {expandedEngine === 'delta' && (
          <Card className="mb-6 border border-emerald-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-semibold text-slate-800">Delta V2 Quality Engine</h2>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700">
                      ML Active
                    </div>
                    <div className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs font-medium text-emerald-700">
                      Regime-Aware
                    </div>
                    {metrics.currentRegime && (
                      <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                        {metrics.currentRegime}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  ML-powered quality filter with regime-aware thresholds. SIDEWAYS/LOW_VOL: Accepts quality ≥50 (MEDIUM). TRENDING/HIGH_VOL: Requires quality ≥60 (HIGH only).
                </p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">Processed</div>
                  <div className="text-xl font-semibold text-slate-800">{fmt(metrics.deltaProcessed || 0)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Passed</div>
                  <div className="text-xl font-semibold text-emerald-700">{fmt(metrics.deltaPassed || 0)}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded border border-rose-100 hover:border-rose-200 transition-colors">
                  <div className="text-xs text-rose-600 mb-1.5 font-medium">Rejected</div>
                  <div className="text-xl font-semibold text-rose-700">{fmt(metrics.deltaRejected || 0)}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-xs text-blue-600 mb-1.5 font-medium">Pass Rate</div>
                  <div className="text-xl font-semibold text-blue-700">{fmtDec(metrics.deltaPassRate || 0)}%</div>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-xs text-amber-600 mb-1.5 font-medium">Avg Quality</div>
                  <div className="text-xl font-semibold text-amber-700">{fmtDec(metrics.deltaQualityScore || 0)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Zeta Learning Engine Details - Collapsible */}
        {expandedEngine === 'zeta' && (
          <Card className="mb-6 border border-violet-200 shadow-sm bg-white animate-in slide-in-from-top duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-violet-600" />
                  <h2 className="text-base font-semibold text-slate-800">Zeta Learning Engine</h2>
                  <div className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded text-xs font-medium text-violet-700">
                    Learning Active
                  </div>
                </div>
                <button onClick={() => setExpandedEngine(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-slate-600">
                  Continuous Learning: Trains ML models from real outcomes, adapts strategy weights, optimizes thresholds.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-violet-50 rounded border border-violet-100 hover:border-violet-200 transition-colors">
                  <div className="text-xs text-violet-600 mb-1.5 font-medium">ML Accuracy</div>
                  <div className="text-xl font-semibold text-violet-700">{zetaMetrics.mlAccuracy.toFixed(1)}%</div>
                  <div className="text-xs text-slate-500 mt-1">{zetaMetrics.trainingCount} trainings</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-xs text-emerald-600 mb-1.5 font-medium">Top Strategy</div>
                  <div className="text-sm font-semibold text-emerald-700 truncate">{zetaMetrics.topStrategy}</div>
                  <div className="text-xs text-slate-500 mt-1">{zetaMetrics.totalOutcomes} outcomes</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="text-xs text-slate-600 mb-1.5 font-medium">System Health</div>
                  <div className="text-sm font-semibold text-slate-700">{zetaMetrics.health}</div>
                  <div className={`text-xs mt-1 font-medium ${
                    zetaMetrics.health === 'OPTIMAL' ? 'text-emerald-600' :
                    zetaMetrics.health === 'GOOD' ? 'text-blue-600' :
                    zetaMetrics.health === 'FAIR' ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    {zetaMetrics.health === 'OPTIMAL' ? '✓ Excellent' :
                     zetaMetrics.health === 'GOOD' ? '✓ Good' :
                     zetaMetrics.health === 'FAIR' ? '⚠ Fair' :
                     '✗ Degraded'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 🎯 YOUR TIER SIGNALS - Tier-based signal distribution from database */}
        <Card className={`border-2 shadow-lg mb-6 hover:shadow-xl transition-shadow ${
          tier === 'MAX' ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-white' :
          tier === 'PRO' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' :
          'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div>
                  {tier === 'MAX' && <Crown className="w-5 h-5 text-purple-600" />}
                  {tier === 'PRO' && <Sparkles className="w-5 h-5 text-blue-600" />}
                  {tier === 'FREE' && <Zap className="w-5 h-5 text-slate-600" />}
                </div>
                <div>
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${
                    tier === 'MAX' ? 'text-purple-900' :
                    tier === 'PRO' ? 'text-blue-900' :
                    'text-slate-900'
                  }`}>
                    Your {tier} Tier Signals
                    <Badge className={`${
                      tier === 'MAX' ? 'bg-purple-600' :
                      tier === 'PRO' ? 'bg-blue-600' :
                      'bg-slate-600'
                    } text-white border-0`}>
                      {quotaUsed}/{quotaLimit}
                    </Badge>
                  </h2>
                  <p className={`text-xs mt-0.5 ${
                    tier === 'MAX' ? 'text-purple-700' :
                    tier === 'PRO' ? 'text-blue-700' :
                    'text-gray-700'
                  }`}>
                    {tier === 'MAX' && 'Top 30 best signals • Real-time tracking • Active & completed signals'}
                    {tier === 'PRO' && 'Top 15 best signals • Real-time tracking • Active & completed signals'}
                    {tier === 'FREE' && 'Top 2 best signals • View signal history'}
                  </p>
                </div>
              </div>

              {/* Countdown Timer - Synchronized with Scheduler */}
              {/* ✅ Timer now READS scheduler's actual nextDropTime - no manual drops needed! */}
              <SignalDropTimer tier={tier} />
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {loadingUserSignals ? (
                // ✅ Professional loading skeleton
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 rounded-lg border-2 border-slate-200 bg-white animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-slate-200" />
                          <div className="flex-1">
                            <div className="h-6 w-32 bg-slate-200 rounded mb-2" />
                            <div className="h-4 w-48 bg-slate-200 rounded" />
                          </div>
                        </div>
                        <div className="h-10 w-16 bg-slate-200 rounded" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="h-20 bg-slate-100 rounded-lg" />
                        <div className="h-20 bg-slate-100 rounded-lg" />
                        <div className="h-20 bg-slate-100 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (() => {
                // ✅ PRODUCTION: Auto-separate active signals from history
                const now = new Date();
                const activeSignals = userSignals.filter(signal => {
                  const hasOutcome = signal.metadata?.mlOutcome || signal.metadata?.outcome;
                  const expiresAt = signal.expires_at ? new Date(signal.expires_at) : null;
                  const isExpired = expiresAt && expiresAt < now;

                  // Active = no outcome AND not expired
                  return !hasOutcome && !isExpired;
                });

                if (activeSignals.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">No active signals</p>
                      <p className="text-sm mt-1">
                        {tier === 'FREE' && 'Next drop in a few minutes. FREE users get 3 signals every 8 hours.'}
                        {tier === 'PRO' && 'Next signal drops in 96 minutes. PRO users get 15 signals daily.'}
                        {tier === 'MAX' && 'Next signal drops in 48 minutes. MAX users get 30 signals daily with early access.'}
                      </p>
                    </div>
                  );
                }

                return activeSignals.map(signal => {
                  const signalImageUrl = signal.image || signal.metadata?.image || '';

                  return (
                    <PremiumSignalCard
                      key={signal.id}
                      symbol={signal.symbol}
                      direction={signal.signal_type}
                      confidence={signal.confidence || 0}
                      tier={tier}
                      rank={signal.metadata?.rank}
                      isLocked={!signal.full_details}
                      entryPrice={signal.entry_price}
                      stopLoss={signal.stop_loss}
                      takeProfit={signal.take_profit}
                      strategyName={signal.metadata?.strategy}
                      timestamp={new Date(signal.created_at).getTime()}
                      expiresAt={signal.expires_at}
                      image={signalImageUrl}
                      status='ACTIVE'
                      onUpgrade={() => navigate('/upgrade')}
                    />
                  );
                });
              })()}
            </div>

            {/* Upgrade CTA for FREE users */}
            {tier === 'FREE' && userSignals.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-purple-900">Want more signals?</p>
                    <p className="text-sm text-purple-700">Upgrade to PRO for 15 signals/day or MAX for 30 signals/day with early access!</p>
                  </div>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-shadow"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Signal History - Last 24 Hours */}
        <Card className="border border-slate-200 shadow-sm bg-white mb-6 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Signal History - Last 24 Hours</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time performance tracking • {signalHistory.length} signals
                  {signalHistory.length > 0 && (
                    <span className="ml-2 text-emerald-600 font-semibold">
                      • Latest: {Math.round((currentTime - (signalHistory[0].outcomeTimestamp || signalHistory[0].timestamp)) / (1000 * 60))} min ago
                    </span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">
                    • Updated: {new Date(currentTime).toLocaleTimeString()}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTimeouts(!showTimeouts)}
                  className={`px-3 py-1.5 border rounded text-xs font-semibold transition-colors ${
                    showTimeouts
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                  title={showTimeouts ? 'Click to hide timeout signals' : 'Click to show timeout signals'}
                >
                  {showTimeouts ? '⏱️ Timeouts Shown' : '⏱️ Timeouts Hidden'}
                </button>
                <button
                  onClick={() => {
                    // ✅ Trigger re-fetch from database, not from stub service
                    if (fetchUserSignalsRef.current) {
                      fetchUserSignalsRef.current();
                      console.log('[Hub UI] 🔄 Manual refresh - Fetching from database');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors"
                >
                  Refresh
                </button>
                <a
                  href="/intelligence-hub/monthly"
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-xs font-semibold text-indigo-700 transition-colors"
                >
                  View Monthly Stats →
                </a>
              </div>
            </div>

            {/* 24-Hour Performance Summary */}
            {signalHistory.length > 0 && (() => {
              // Force metrics recalculation on every render for real-time updates
              const now = Date.now();
              const completed = signalHistory.filter(s => s.outcome && s.outcome !== 'PENDING');
              const wins = completed.filter(s => s.outcome === 'WIN').length;
              const losses = completed.filter(s => s.outcome === 'LOSS').length;
              const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
              const totalReturn = completed.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
              const avgReturn = completed.length > 0 ? totalReturn / completed.length : 0;

              // Log metrics every 5 seconds
              if (now % 5000 < 100) {
                console.log('[Hub UI] 📊 Metrics Update:', {
                  totalSignals: signalHistory.length,
                  completed: completed.length,
                  wins,
                  losses,
                  winRate: winRate.toFixed(1) + '%',
                  totalReturn: totalReturn.toFixed(2) + '%',
                  avgReturn: avgReturn.toFixed(2) + '%',
                  timestamp: new Date(now).toLocaleTimeString()
                });
              }

              return (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-emerald-900">
                      24-Hour Performance
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {/* Total Signals */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">
                        Total Signals
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {completed.length}
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="p-3 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-1">
                        Win Rate
                      </div>
                      <div className="text-2xl font-bold text-emerald-700">
                        {winRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        {wins}W / {losses}L
                      </div>
                    </div>

                    {/* Total Return */}
                    <div className={`p-3 bg-white rounded-lg border ${
                      totalReturn >= 0 ? 'border-emerald-200' : 'border-rose-200'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase mb-1 ${
                        totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Total Return
                      </div>
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {totalReturn >= 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(1)}%
                      </div>
                    </div>

                    {/* Avg Return per Trade */}
                    <div className={`p-3 bg-white rounded-lg border ${
                      avgReturn >= 0 ? 'border-emerald-200' : 'border-rose-200'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase mb-1 ${
                        avgReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Avg Return/Trade
                      </div>
                      <div className={`text-2xl font-bold flex items-center gap-1 ${
                        avgReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {avgReturn >= 0 ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {avgReturn > 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Timeout Breakdown Analysis */}
                  {(() => {
                    const timeouts = completed.filter(s => s.outcome?.startsWith('TIMEOUT'));
                    if (timeouts.length === 0) return null;

                    const timeoutValid = timeouts.filter(s => s.outcome === 'TIMEOUT_VALID').length;
                    const timeoutWrong = timeouts.filter(s => s.outcome === 'TIMEOUT_WRONG').length;
                    const timeoutStagnation = timeouts.filter(s => s.outcome === 'TIMEOUT_STAGNATION').length;
                    const timeoutLowvol = timeouts.filter(s => s.outcome === 'TIMEOUT_LOWVOL').length;
                    const timeoutPercent = (timeouts.length / completed.length) * 100;

                    // Generate insight based on timeout patterns
                    let insight = '';
                    let insightColor = 'text-slate-600';
                    if (timeoutPercent > 70) {
                      if (timeoutValid > timeouts.length * 0.6) {
                        insight = '💡 Most timeouts are VALID - consider increasing signal expiry times';
                        insightColor = 'text-blue-600';
                      } else if (timeoutWrong > timeouts.length * 0.5) {
                        insight = '⚠️ Many WRONG timeouts - signals moving opposite direction, review entry logic';
                        insightColor = 'text-rose-600';
                      } else if (timeoutStagnation > timeouts.length * 0.5) {
                        insight = '⚠️ High STAGNATION - targets too aggressive, reduce TP distances';
                        insightColor = 'text-amber-600';
                      } else if (timeoutLowvol > timeouts.length * 0.5) {
                        insight = '💡 Low volatility detected - signals need more volatile market conditions';
                        insightColor = 'text-indigo-600';
                      }
                    }

                    return (
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <h4 className="text-xs font-semibold text-amber-900">
                            Timeout Analysis ({timeouts.length} signals • {timeoutPercent.toFixed(0)}%)
                          </h4>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="p-2 bg-white rounded border border-blue-200">
                            <div className="text-[9px] text-blue-600 font-semibold uppercase">Valid</div>
                            <div className="text-lg font-bold text-blue-700">{timeoutValid}</div>
                            <div className="text-[9px] text-slate-500">Good signal, needs time</div>
                          </div>
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <div className="text-[9px] text-amber-600 font-semibold uppercase">Low Vol</div>
                            <div className="text-lg font-bold text-amber-700">{timeoutLowvol}</div>
                            <div className="text-[9px] text-slate-500">Waiting for volatility</div>
                          </div>
                          <div className="p-2 bg-white rounded border border-orange-200">
                            <div className="text-[9px] text-orange-600 font-semibold uppercase">Stagnation</div>
                            <div className="text-lg font-bold text-orange-700">{timeoutStagnation}</div>
                            <div className="text-[9px] text-slate-500">Targets too aggressive</div>
                          </div>
                          <div className="p-2 bg-white rounded border border-rose-200">
                            <div className="text-[9px] text-rose-600 font-semibold uppercase">Wrong</div>
                            <div className="text-lg font-bold text-rose-700">{timeoutWrong}</div>
                            <div className="text-[9px] text-slate-500">Wrong direction</div>
                          </div>
                        </div>
                        {insight && (
                          <div className={`text-xs font-medium ${insightColor} bg-white p-2 rounded border border-slate-200`}>
                            {insight}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {signalHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-600 font-medium">No signals yet</p>
                <p className="text-xs text-slate-500 mt-1">Signals will appear as they're generated</p>
              </div>
            ) : (
              <div>
                <div
                  className="space-y-2 max-h-[600px] overflow-y-auto"
                  key={`signal-list-${signalHistory.length}-${signalHistory[0]?.id || 'empty'}`}
                >
                  {signalHistory.slice((currentPage - 1) * SIGNALS_PER_PAGE, currentPage * SIGNALS_PER_PAGE).map(sig => {
                    const isExpanded = expandedSignalId === sig.id;

                    return (
                      <div
                        key={sig.id}
                        className="rounded-lg border bg-white border-slate-100 hover:border-slate-300 transition-all overflow-hidden"
                      >
                        {/* Main Signal Row - Clickable */}
                        <button
                          onClick={() => setExpandedSignalId(isExpanded ? null : sig.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Crypto Logo - Dashboard style */}
                            {sig.image && (
                              <img
                                src={sig.image}
                                alt={sig.symbol}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}

                            <div className={`w-16 h-10 rounded-md flex items-center justify-center text-sm font-semibold border ${
                              sig.direction === 'LONG'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {sig.direction}
                            </div>
                            <div>
                              <div className="text-base font-semibold text-slate-800">{sig.symbol}</div>
                              <div className="text-xs text-slate-600 font-medium">
                                {timeAgo(sig.timestamp)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-base font-semibold text-slate-800">{sig.confidence}%</div>
                              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                Confidence
                              </div>
                            </div>
                            {sig.outcome && (
                              <div className="text-right">
                                <div className={`px-3 py-1 rounded border text-xs font-semibold flex items-center gap-1.5 ${
                                  sig.outcome === 'WIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  sig.outcome === 'LOSS' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {sig.outcome === 'WIN' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {sig.outcome === 'LOSS' && <XCircle className="w-3.5 h-3.5" />}
                                  {sig.outcome === 'TIMEOUT' && <AlertTriangle className="w-3.5 h-3.5" />}
                                  {sig.outcome}
                                </div>
                                {sig.actualReturn !== undefined && (
                                  <div className={`text-xs font-bold mt-1 ${
                                    sig.actualReturn > 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {(sig.actualReturn ?? 0) > 0 ? '+' : ''}{sig.actualReturn?.toFixed(2) || '0.00'}%
                                  </div>
                                )}
                                {sig.outcomeReason && (
                                  <div className="text-[10px] text-slate-500 mt-1 max-w-[120px]">
                                    {sig.outcomeReason}
                                  </div>
                                )}
                              </div>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3 animate-in slide-in-from-top duration-200">
                            {/* Trading Levels */}
                            <div>
                              <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Trading Levels</div>
                              <div className="grid grid-cols-4 gap-2">
                                {sig.entry && (
                                  <div className="p-2 bg-white rounded border border-slate-200">
                                    <div className="text-[10px] text-slate-600 font-semibold uppercase mb-0.5">Entry</div>
                                    <div className="text-sm font-bold text-slate-900">${sig.entry?.toFixed(2) || '0.00'}</div>
                                  </div>
                                )}
                                {sig.stopLoss && (
                                  <div className="p-2 bg-white rounded border border-rose-200">
                                    <div className="text-[10px] text-rose-600 font-semibold uppercase mb-0.5">Stop Loss</div>
                                    <div className="text-sm font-bold text-rose-700">${sig.stopLoss?.toFixed(2) || '0.00'}</div>
                                  </div>
                                )}
                                {sig.riskRewardRatio && (
                                  <div className="p-2 bg-white rounded border border-blue-200">
                                    <div className="text-[10px] text-blue-600 font-semibold uppercase mb-0.5">R:R</div>
                                    <div className="text-sm font-bold text-blue-700">{sig.riskRewardRatio?.toFixed(1) || '0.0'}:1</div>
                                  </div>
                                )}
                                {sig.qualityScore && (
                                  <div className="p-2 bg-white rounded border border-emerald-200">
                                    <div className="text-[10px] text-emerald-600 font-semibold uppercase mb-0.5">Quality</div>
                                    <div className="text-sm font-bold text-emerald-700">{sig.qualityScore?.toFixed(0) || '0'}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Outcome Metrics for Zeta Learning */}
                            {sig.outcome && (
                              <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Outcome Metrics</div>
                                <div className="grid grid-cols-4 gap-2">
                                  {sig.actualReturn !== undefined && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Return</div>
                                      <div className={`text-sm font-bold ${
                                        sig.actualReturn > 0 ? 'text-emerald-600' : 'text-rose-600'
                                      }`}>
                                        {(sig.actualReturn ?? 0) > 0 ? '+' : ''}{sig.actualReturn?.toFixed(2) || '0.00'}%
                                      </div>
                                    </div>
                                  )}
                                  {sig.exitPrice && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Exit Price</div>
                                      <div className="text-sm font-bold text-slate-900">${sig.exitPrice.toFixed(2)}</div>
                                    </div>
                                  )}
                                  {sig.holdDuration && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Duration</div>
                                      <div className="text-sm font-bold text-slate-900">{Math.floor(sig.holdDuration / 60000)}m</div>
                                    </div>
                                  )}
                                  {sig.exitReason && (
                                    <div className="text-center">
                                      <div className="text-[10px] text-slate-500 font-semibold mb-0.5">Exit</div>
                                      <div className="text-xs font-bold text-blue-600">{sig.exitReason.replace(/_/g, ' ')}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Targets */}
                            {sig.targets && sig.targets.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Targets</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {sig.targets.map((target, idx) => (
                                    <div key={idx} className="px-2 py-1 bg-white rounded border border-emerald-200">
                                      <span className="text-[10px] text-emerald-600 font-semibold">T{idx + 1}:</span>
                                      <span className="text-xs font-bold text-emerald-700 ml-1">${target.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Strategy & Technical Details */}
                            <div>
                              <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Technical Details</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {sig.strategy && (
                                  <span className="text-[10px] px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded font-semibold">
                                    {sig.strategy.replace(/_/g, ' ')}
                                  </span>
                                )}
                                {sig.marketRegime && (
                                  <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">
                                    {sig.marketRegime}
                                  </span>
                                )}
                                {sig.mlProbability && (
                                  <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">
                                    ML: {(sig.mlProbability * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Outcome Details (if available) */}
                            {sig.outcome && (
                              <div>
                                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Outcome</div>
                                <div className="p-3 bg-white rounded border border-slate-200">
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Result</div>
                                      <div className={`text-sm font-bold ${
                                        sig.outcome === 'WIN' ? 'text-emerald-600' :
                                        sig.outcome === 'LOSS' ? 'text-rose-600' :
                                        'text-amber-600'
                                      }`}>
                                        {sig.outcome}
                                      </div>
                                    </div>
                                    {sig.actualReturn !== undefined && (
                                      <div>
                                        <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Return</div>
                                        <div className={`text-sm font-bold ${
                                          sig.actualReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>
                                          {(sig.actualReturn ?? 0) >= 0 ? '+' : ''}{sig.actualReturn?.toFixed(2) || '0.00'}%
                                        </div>
                                      </div>
                                    )}
                                    {sig.exitPrice && (
                                      <div>
                                        <div className="text-[10px] text-slate-600 font-semibold uppercase mb-1">Exit Price</div>
                                        <div className="text-sm font-bold text-slate-800">
                                          ${sig.exitPrice.toFixed(2)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-[10px] text-slate-500">
                                Generated: {sig.timestamp ? new Date(sig.timestamp).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              {/* Pagination Controls */}
              {(() => {
                const totalPages = Math.ceil(signalHistory.length / SIGNALS_PER_PAGE);
                if (totalPages <= 1) return null;

                return (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === 1
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="text-sm font-medium text-slate-600">
                      Page {currentPage} of {totalPages}
                    </div>

                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === totalPages
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
                      }`}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}
            </div>
            )}
          </div>
        </Card>

        {/* Rejected Signals - Institutional Transparency */}
        <Card className="border border-orange-200 shadow-sm bg-white mb-6 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-semibold text-slate-800">Rejected Signals</h2>
                <div className="px-2 py-0.5 bg-orange-50 border border-orange-200 rounded text-xs font-medium text-orange-700">
                  Transparency Log
                </div>
              </div>
              <div className="text-sm text-slate-600 font-medium">{rejectedSignals.length} Total</div>
            </div>

            {/* Statistics */}
            {rejectedSignals.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">Total</div>
                  <div className="text-lg font-bold text-slate-800">{rejectedSignals.length}</div>
                </div>
                <div className="p-2 bg-violet-50 rounded border border-violet-200">
                  <div className="text-[10px] text-violet-600 font-semibold uppercase">Alpha</div>
                  <div className="text-lg font-bold text-violet-700">{rejectedSignals.filter(s => s.rejection_stage === 'ALPHA').length}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-semibold uppercase">Beta</div>
                  <div className="text-lg font-bold text-amber-700">{rejectedSignals.filter(s => s.rejection_stage === 'BETA').length}</div>
                </div>
                <div className="p-2 bg-rose-50 rounded border border-rose-200">
                  <div className="text-[10px] text-rose-600 font-semibold uppercase">Gamma</div>
                  <div className="text-lg font-bold text-rose-700">{rejectedSignals.filter(s => s.rejection_stage === 'GAMMA').length}</div>
                </div>
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-[10px] text-red-600 font-semibold uppercase">Delta</div>
                  <div className="text-lg font-bold text-red-700">{rejectedSignals.filter(s => s.rejection_stage === 'DELTA').length}</div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              {['ALL', 'ALPHA', 'BETA', 'GAMMA', 'DELTA'].map(stage => {
                const stageCount = stage === 'ALL'
                  ? rejectedSignals.length
                  : rejectedSignals.filter(s => s.rejection_stage === stage).length;

                return (
                  <button
                    key={stage}
                    onClick={() => setRejectedFilter(stage as typeof rejectedFilter)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      rejectedFilter === stage
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {stage} ({stageCount})
                  </button>
                );
              })}
            </div>

            {rejectedSignals.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">No rejections yet</p>
                <p className="text-xs text-slate-500 mt-1">All signals are passing quality filters</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rejectedSignals
                  .filter(sig => rejectedFilter === 'ALL' || sig.rejection_stage === rejectedFilter)
                  .slice(0, 50)
                  .map(sig => {
                    const priority = classifyRejectionPriority(sig);
                    // Stage color mapping
                    const stageColors = {
                      'ALPHA': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                      'BETA': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                      'GAMMA': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
                      'DELTA': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
                    };
                    const colors = stageColors[sig.rejection_stage];

                    return (
                      <div
                        key={sig.id}
                        className="flex items-start justify-between p-3 rounded-lg border bg-white border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {/* Stage Badge */}
                          <div className={`w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {sig.rejection_stage}
                          </div>

                          <div className="flex-1">
                            {/* Symbol + Direction + Priority */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-base font-semibold text-slate-800">{sig.symbol}</div>
                              <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                sig.direction === 'LONG' ? 'bg-emerald-50 text-emerald-700' :
                                sig.direction === 'SHORT' ? 'bg-rose-50 text-rose-700' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {sig.direction}
                              </div>
                              {/* ML Priority Badge */}
                              <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                                priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-300' :
                                priority === 'IMPORTANT' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                                'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}>
                                {priority === 'CRITICAL' ? '🔴' : priority === 'IMPORTANT' ? '🟡' : '⚪'} {priority}
                              </div>
                            </div>

                            {/* Rejection Reason */}
                            <div className="text-xs text-slate-600 mb-1.5 line-clamp-2">
                              {sig.rejection_reason}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{timeAgo(new Date(sig.created_at).getTime())}</span>
                              {sig.confidence_score !== undefined && sig.confidence_score !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Conf: {sig.confidence_score.toFixed(0)}%</span>
                                </>
                              )}
                              {sig.quality_score !== undefined && sig.quality_score !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Quality: {sig.quality_score.toFixed(0)}</span>
                                </>
                              )}
                              {sig.data_quality !== undefined && sig.data_quality !== null && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Data: {sig.data_quality.toFixed(0)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Alpha Rejects</div>
                <div className="text-lg font-semibold text-violet-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'ALPHA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Beta Rejects</div>
                <div className="text-lg font-semibold text-amber-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'BETA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Gamma Rejects</div>
                <div className="text-lg font-semibold text-rose-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'GAMMA').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Delta Rejects</div>
                <div className="text-lg font-semibold text-red-600">
                  {rejectedSignals.filter(s => s.rejection_stage === 'DELTA').length}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center pb-6">
          <p className="text-sm text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded">
              <Circle className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-700 font-semibold">
                Autonomous 24/7 Operation
              </span>
            </span>
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{fmt(metrics.totalSignals)}</span> Signals
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{formatUptime(metrics.uptime)}</span> Uptime
          </p>
        </div>
      </div>
    </div>
  );
}
