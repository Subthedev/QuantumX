/**
 * USE USER SUBSCRIPTION HOOK
 *
 * Manages user subscription tier and status
 * Integrates with Supabase user_subscriptions table
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type UserTier = 'FREE' | 'PRO' | 'MAX';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: UserTier;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no subscription exists, create a FREE one
        if (fetchError.code === 'PGRST116') {
          const { data: newSub, error: createError } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user.id,
              tier: 'FREE',
              status: 'active',
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating subscription:', createError);
            setError(createError.message);
          } else {
            setSubscription(newSub);
            setError(null);
          }
        } else {
          console.error('Error fetching subscription:', fetchError);
          setError(fetchError.message);
        }
        return;
      }

      setSubscription(data);
      setError(null);
    } catch (err) {
      console.error('Error in fetchSubscription:', err);
      setError('Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to subscription changes
  useEffect(() => {
    if (!user) return;

    fetchSubscription();

    // Set up real-time subscription
    const channel = supabase
      .channel('user-subscription')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📊 Subscription updated:', payload);
          if (payload.eventType === 'DELETE') {
            setSubscription(null);
          } else {
            setSubscription(payload.new as UserSubscription);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const tier = subscription?.tier || 'FREE';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPro = tier === 'PRO' && isActive;
  const isMax = tier === 'MAX' && isActive;
  const isFree = tier === 'FREE' || !isActive;

  return {
    subscription,
    tier,
    isActive,
    isPro,
    isMax,
    isFree,
    loading,
    error,
    refresh: fetchSubscription,
  };
}
