import { useState, useEffect, useRef } from 'react';
import { Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignalDropTimerProps {
  tier: 'FREE' | 'PRO' | 'MAX';
  onTimerExpire?: () => void; // Deprecated - no longer used
}

/**
 * OPTIMIZED DATABASE-SYNCHRONIZED SIGNAL DROP TIMER
 *
 * ✅ SMOOTH COUNTDOWN - Local state updates every second for lag-free UI
 * ✅ DATABASE SYNC - Queries database every 30 seconds to detect new signals
 * ✅ TIER-SYNCHRONIZED - Matches backend rate limiting perfectly
 * ✅ WORKS 24/7 - Even when browser was closed
 */
export function SignalDropTimer({ tier }: SignalDropTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dropIntervalSeconds, setDropIntervalSeconds] = useState(60);
  const lastSignalTimeRef = useRef<number | null>(null); // Cached last signal timestamp
  const mountTimeRef = useRef<number>(Date.now());

  // ✅ PRODUCTION TIERED INTERVALS - Matches backend rate limiting
  // FREE: 3 signals per 24h → Every 8 hours
  // PRO: 15 signals per 24h → Every 96 minutes
  // MAX: 30 signals per 24h → Every 48 minutes
  const DROP_INTERVALS = {
    FREE: 8 * 60 * 60,   // 8 hours in seconds
    PRO: 96 * 60,        // 96 minutes in seconds
    MAX: 48 * 60         // 48 minutes in seconds
  };

  // Database sync - runs once on mount and every 30 seconds
  useEffect(() => {
    console.log(`[SignalDropTimer] 🚀 Starting OPTIMIZED timer for ${tier} tier`);
    console.log(`[SignalDropTimer] ✅ Smooth 1-second countdown with 30-second database sync`);

    const interval = DROP_INTERVALS[tier];
    setDropIntervalSeconds(interval);

    // Query database to get last signal timestamp
    const syncWithDatabase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // No user - count from mount time
          if (lastSignalTimeRef.current === null) {
            lastSignalTimeRef.current = mountTimeRef.current;
            console.log(`[SignalDropTimer] ⏰ [${tier}] No user - counting from mount time`);
          }
          return;
        }

        // Query database for last signal (tier-specific)
        const { data, error } = await supabase
          .from('user_signals')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('tier', tier)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(`[SignalDropTimer] [${tier}] ❌ Database error:`, error);
          return;
        }

        if (!data) {
          // No signals yet - count from mount time
          if (lastSignalTimeRef.current === null) {
            lastSignalTimeRef.current = mountTimeRef.current;
            console.log(`[SignalDropTimer] ⏰ [${tier}] No signals yet - counting from mount time`);
          }
          return;
        }

        // Found signal - update cached timestamp
        const signalTime = new Date(data.created_at).getTime();
        if (lastSignalTimeRef.current !== signalTime) {
          lastSignalTimeRef.current = signalTime;
          console.log(`[SignalDropTimer] 🔄 [${tier}] Updated from database: Last signal at ${new Date(signalTime).toLocaleTimeString()}`);
        }
      } catch (error) {
        console.error(`[SignalDropTimer] [${tier}] ❌ Sync error:`, error);
      }
    };

    // Initial sync
    syncWithDatabase();

    // Periodic database sync every 30 seconds (not every second!)
    const syncInterval = setInterval(syncWithDatabase, 30000);

    // Smooth local countdown every second (no database queries)
    const tickInterval = setInterval(() => {
      if (lastSignalTimeRef.current === null) {
        // Fallback - count from mount time
        lastSignalTimeRef.current = mountTimeRef.current;
      }

      const now = Date.now();
      const nextDropTime = lastSignalTimeRef.current + (interval * 1000);
      const remaining = Math.max(0, Math.floor((nextDropTime - now) / 1000));

      setTimeRemaining(remaining);

      // Log every minute for debugging
      if (remaining % 60 === 0 && remaining > 0) {
        console.log(`[SignalDropTimer] ⏱️  [${tier}] ${remaining}s remaining`);
      }
    }, 1000); // Smooth 1-second updates

    return () => {
      clearInterval(syncInterval);
      clearInterval(tickInterval);
      console.log(`[SignalDropTimer] 🛑 Stopped timer for ${tier} tier`);
    };
  }, [tier]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Show hours for FREE tier (8h intervals)
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = ((dropIntervalSeconds - timeRemaining) / dropIntervalSeconds) * 100;

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
      tier === 'MAX' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300' :
      tier === 'PRO' ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300' :
      'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
    }`}>
      <div className="relative">
        <Clock className={`w-5 h-5 ${
          tier === 'MAX' ? 'text-purple-600' :
          tier === 'PRO' ? 'text-blue-600' :
          'text-gray-600'
        }`} />
        {timeRemaining <= 5 && timeRemaining > 0 && (
          <Zap className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 animate-pulse" />
        )}
      </div>

      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${
          tier === 'MAX' ? 'text-purple-900' :
          tier === 'PRO' ? 'text-blue-900' :
          'text-gray-900'
        }`}>
          Next {tier} Signal
        </span>
        <span className={`text-lg font-bold tabular-nums ${
          timeRemaining <= 5 ? 'animate-pulse text-red-600' :
          tier === 'MAX' ? 'text-purple-700' :
          tier === 'PRO' ? 'text-blue-700' :
          'text-gray-700'
        }`}>
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            tier === 'MAX' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
            tier === 'PRO' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            'bg-gray-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
