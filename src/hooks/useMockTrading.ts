/**
 * Mock Trading Hook
 * Real-time hook for paper trading with live price updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockTradingService, PlaceOrderParams } from '@/services/mockTradingService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/utils/soundNotifications';
import { hapticManager } from '@/utils/hapticFeedback';

export function useMockTrading(symbol?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get account
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['mock-trading-account', user?.id],
    queryFn: () => user ? mockTradingService.getOrCreateAccount(user.id) : null,
    enabled: !!user,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Get open positions
  const { data: openPositions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['mock-trading-positions', user?.id],
    queryFn: () => user ? mockTradingService.getOpenPositions(user.id) : [],
    enabled: !!user,
    refetchInterval: 3000 // Refresh every 3 seconds for real-time updates
  });

  // Get trading history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['mock-trading-history', user?.id],
    queryFn: () => user ? mockTradingService.getTradingHistory(user.id) : [],
    enabled: !!user
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (params: PlaceOrderParams) => {
      if (!user) throw new Error('User not authenticated');
      return mockTradingService.placeOrder(user.id, params);
    },
    onSuccess: (data) => {
      // Play sound based on order side
      if (data.side === 'BUY') {
        soundManager.play('order_buy');
      } else {
        soundManager.play('order_sell');
      }

      // Trigger haptic feedback
      hapticManager.orderPlaced(data.side);

      toast({
        title: 'Order Placed',
        description: `${data.side} ${data.quantity} ${data.symbol} at $${data.entry_price.toFixed(2)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-account'] });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-positions'] });
    },
    onError: (error: Error) => {
      // Play error sound and haptic
      soundManager.play('error');
      hapticManager.orderFailed();

      toast({
        title: 'Order Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Close position mutation
  const closePositionMutation = useMutation({
    mutationFn: async ({ positionId, exitPrice }: { positionId: string; exitPrice: number }) => {
      if (!user) throw new Error('User not authenticated');

      // Get position before closing to calculate profit
      const position = openPositions.find(p => p.id === positionId);
      const profit = position?.unrealized_pnl || 0;

      const result = await mockTradingService.closePosition(user.id, positionId, exitPrice);
      return { result, profit };
    },
    onSuccess: (data) => {
      // Play sound for order filled
      soundManager.play('order_filled');

      // Trigger haptic based on profit/loss
      hapticManager.positionClosed(data.profit);

      toast({
        title: 'Position Closed',
        description: 'Your position has been closed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-account'] });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-positions'] });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-history'] });
    },
    onError: (error: Error) => {
      // Play error sound and haptic
      soundManager.play('error');
      hapticManager.orderFailed();

      toast({
        title: 'Close Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reset account mutation
  const resetAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      return mockTradingService.resetAccount(user.id);
    },
    onSuccess: () => {
      toast({
        title: 'Account Reset',
        description: 'Your trading account has been reset to $10,000',
      });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-account'] });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-positions'] });
      queryClient.invalidateQueries({ queryKey: ['mock-trading-history'] });
    }
  });

  // Update position prices (call this with real-time price data)
  const updatePrices = async (symbol: string, price: number) => {
    if (!user) return;
    await mockTradingService.updatePositionPrices(user.id, symbol, price);
    queryClient.invalidateQueries({ queryKey: ['mock-trading-positions'] });
    queryClient.invalidateQueries({ queryKey: ['mock-trading-account'] });
  };

  return {
    account,
    openPositions,
    history,
    isLoading: accountLoading || positionsLoading || historyLoading,
    placeOrder: placeOrderMutation.mutate,
    closePosition: closePositionMutation.mutate,
    resetAccount: resetAccountMutation.mutate,
    updatePrices,
    isPlacingOrder: placeOrderMutation.isPending,
    isClosingPosition: closePositionMutation.isPending
  };
}
