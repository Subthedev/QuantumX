/**
 * Hook for automatic signal validation
 * Checks all active signals every 5 minutes
 * Signals are system-wide, not user-specific
 */

import { useEffect } from 'react';
import { signalValidationService } from '@/services/signalValidation';
import { useQueryClient } from '@tanstack/react-query';

export function useSignalValidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Validate all system signals
    const validateSignals = async () => {
      try {
        await signalValidationService.validateAllSignals();
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['signal-history'] });
        queryClient.invalidateQueries({ queryKey: ['current-signal'] });
      } catch (error) {
        console.error('Error validating signals:', error);
      }
    };

    // Run immediately
    validateSignals();

    // Then run every 5 minutes
    const interval = setInterval(validateSignals, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);
}
