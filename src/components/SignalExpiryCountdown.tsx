import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface SignalExpiryCountdownProps {
  expiresAt: string | number; // ISO string or timestamp
  compact?: boolean; // Compact display for smaller spaces
  className?: string;
}

/**
 * Real-time countdown timer showing time until signal expires
 * Updates every second for smooth, accurate display
 */
export function SignalExpiryCountdown({
  expiresAt,
  compact = false,
  className = ''
}: SignalExpiryCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Calculate initial time remaining
    const calculateRemaining = () => {
      const now = Date.now();
      const expiryTime = typeof expiresAt === 'string'
        ? new Date(expiresAt).getTime()
        : expiresAt;

      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));

      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);

      return remaining;
    };

    // Initial calculation
    calculateRemaining();

    // Update every second for smooth countdown
    const interval = setInterval(() => {
      const remaining = calculateRemaining();

      // Stop updating if expired
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (compact) {
      // Compact format: "23h 45m" or "45m" or "12s"
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      } else if (mins > 0) {
        return `${mins}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    } else {
      // Full format: "23:45:12"
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Color coding based on time remaining
  const getColorClass = () => {
    if (isExpired) return 'text-red-600 dark:text-red-400';
    if (timeRemaining < 300) return 'text-orange-600 dark:text-orange-400'; // < 5 min
    if (timeRemaining < 3600) return 'text-yellow-600 dark:text-yellow-400'; // < 1 hour
    return 'text-green-600 dark:text-green-400';
  };

  const getIconClass = () => {
    if (isExpired) return 'text-red-500 animate-pulse';
    if (timeRemaining < 300) return 'text-orange-500 animate-pulse';
    if (timeRemaining < 3600) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {isExpired ? (
          <AlertCircle className={`w-4 h-4 ${getIconClass()}`} />
        ) : (
          <Clock className={`w-4 h-4 ${getIconClass()}`} />
        )}
        <span className={`text-sm font-medium tabular-nums ${getColorClass()}`}>
          {isExpired ? 'Expired' : formatTime(timeRemaining)}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isExpired ? (
        <AlertCircle className={`w-5 h-5 ${getIconClass()}`} />
      ) : (
        <Clock className={`w-5 h-5 ${getIconClass()}`} />
      )}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isExpired ? 'Signal Status' : 'Expires In'}
        </span>
        <span className={`text-base font-bold tabular-nums ${getColorClass()}`}>
          {isExpired ? 'EXPIRED' : formatTime(timeRemaining)}
        </span>
      </div>
    </div>
  );
}
