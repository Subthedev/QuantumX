import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignalDropTimerProps {
  tier: 'FREE' | 'PRO' | 'MAX';
  onTimerExpire?: () => void; // Deprecated - no longer used
}

/**
 * DATABASE-SYNCHRONIZED SIGNAL DROP TIMER
 *
 * This timer reads the LAST SIGNAL TIMESTAMP from the database
 * and calculates when the next signal will drop based on the backend interval.
 *
 * ✅ TRUE BACKEND SYNC - Reads actual signal generation timestamps
 * ✅ WORKS 24/7 - Even when browser was closed
 * ✅ NO FRONTEND SCHEDULER - Pure database-driven
 */
export function SignalDropTimer({ tier }: SignalDropTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dropIntervalSeconds, setDropIntervalSeconds] = useState(60); // Default to 1 minute

  // ✅ PRODUCTION TIERED INTERVALS - Database-synced timer
  // Matches production tiered signal distribution:
  // FREE: 3 signals per 24h → Every 8 hours
  // PRO: 15 signals per 24h → Every 96 minutes
  // MAX: 30 signals per 24h → Every 48 minutes
  const DROP_INTERVALS = {
    FREE: 8 * 60 * 60,   // 8 hours in seconds (3 signals/24h)
    PRO: 96 * 60,        // 96 minutes in seconds (15 signals/24h)
    MAX: 48 * 60         // 48 minutes in seconds (30 signals/24h)
  };

  // Main timer - reads LAST signal from database
  useEffect(() => {
    console.log(`[SignalDropTimer] 🚀 Starting DATABASE-SYNCED timer for ${tier} tier`);
    console.log(`[SignalDropTimer] ✅ Reading from database - NO frontend scheduler!`);

    const interval = DROP_INTERVALS[tier];
    setDropIntervalSeconds(interval);

    const tickInterval = setInterval(async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('[SignalDropTimer] ⚠️ No user logged in');
          setTimeRemaining(interval);
          return;
        }

        // ✅ Query database for the LAST signal generated for THIS USER and TIER
        const { data, error } = await supabase
          .from('user_signals')
          .select('created_at')
          .eq('user_id', user.id)
          .eq('tier', tier)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[SignalDropTimer] ❌ Database error:', error);
          return;
        }

        if (!data) {
          // No signals yet - show full interval
          setTimeRemaining(interval);
          return;
        }

        // Calculate next drop time based on last signal + interval
        const lastSignalTime = new Date(data.created_at).getTime();
        const nextDropTime = lastSignalTime + (interval * 1000);
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((nextDropTime - now) / 1000));

        setTimeRemaining(remaining);

        // ✅ DEBUG: Log every 30 seconds for cleaner output
        if (remaining % 30 === 0 && remaining > 0) {
          console.log(`[SignalDropTimer] ⏱️  ${tier} tier sync: ${remaining}s until next drop (last signal: ${new Date(data.created_at).toLocaleTimeString()})`);
        }
      } catch (error) {
        console.error('[SignalDropTimer] ❌ Error calculating next drop:', error);
      }
    }, 1000); // Update every second

    return () => {
      console.log(`[SignalDropTimer] 🛑 Stopping timer for ${tier} tier`);
      clearInterval(tickInterval);
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

  const percentage = ((DROP_INTERVALS[tier] - timeRemaining) / DROP_INTERVALS[tier]) * 100;

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
          Next Signal In
        </span>
        <span className={`text-lg font-bold ${
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
