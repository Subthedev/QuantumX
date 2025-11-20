import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { globalHubService } from '@/services/globalHubService';

interface SignalDropTimerProps {
  tier: 'FREE' | 'PRO' | 'MAX';
  onTimerExpire?: () => void;
}

/**
 * DEEPLY INTEGRATED SIGNAL DROP TIMER
 *
 * ✅ Reads directly from globalHubService state (no database queries!)
 * ✅ Perfect synchronization with rate limiter
 * ✅ Smooth 1-second updates
 * ✅ 24/7 autonomous operation
 * ✅ Shows buffer size for debugging
 */
export function SignalDropTimer({ tier, onTimerExpire }: SignalDropTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  const [intervalSeconds, setIntervalSeconds] = useState(0);

  useEffect(() => {
    console.log(`[SignalDropTimer] 🚀 Starting INTEGRATED timer for ${tier} tier`);
    console.log(`[SignalDropTimer] ✅ Reading directly from globalHubService - NO database queries!`);

    // Get interval from service
    const interval = Math.floor(globalHubService.getDropInterval(tier) / 1000); // Convert to seconds
    setIntervalSeconds(interval);

    // Track if we've already triggered force-check at 0
    let hasTriggeredAtZero = false;
    let lastRemaining = -1;

    // Update every second - read directly from globalHubService
    const updateTimer = () => {
      // Read time remaining directly from service
      const remaining = globalHubService.getTimeRemaining(tier);
      setTimeRemaining(remaining);

      // Read buffer size for debugging
      const bufSize = globalHubService.getBufferSize(tier);
      setBufferSize(bufSize);

      // Log every minute for debugging
      if (remaining % 60 === 0 && remaining > 0) {
        console.log(`[SignalDropTimer] ⏱️  [${tier}] ${remaining}s remaining, buffer: ${bufSize} signals`);
      }

      // Trigger callback when timer JUST hit 0 (not on subsequent ticks)
      if (remaining === 0 && lastRemaining > 0) {
        // Timer just transitioned to 0 - force-check buffer
        console.log(`[SignalDropTimer] ⚡ Timer hit 0 for ${tier} - triggering force-check`);
        globalHubService.forceCheckBuffer(tier);
        hasTriggeredAtZero = true;

        // Also trigger custom callback if provided
        if (onTimerExpire) {
          onTimerExpire();
        }
      } else if (remaining > 0) {
        // Timer reset - clear flag for next expiry
        hasTriggeredAtZero = false;
      }

      lastRemaining = remaining;
    };

    // Initial update
    updateTimer();

    // Update every second
    const tickInterval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(tickInterval);
      console.log(`[SignalDropTimer] 🛑 Stopped timer for ${tier} tier`);
    };
  }, [tier, onTimerExpire]);

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

  const percentage = intervalSeconds > 0
    ? ((intervalSeconds - timeRemaining) / intervalSeconds) * 100
    : 0;

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
        {bufferSize > 0 && (
          <span className="text-[10px] text-gray-500 font-medium">
            {bufferSize} in buffer
          </span>
        )}
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
