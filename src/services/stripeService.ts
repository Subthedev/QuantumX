/**
 * STRIPE SERVICE
 *
 * Handles Stripe checkout and subscription management
 * Integrates with Supabase for subscription state
 */

import { supabase } from '@/integrations/supabase/client';

export type PlanId = 'PRO_MONTHLY' | 'PRO_YEARLY' | 'MAX_MONTHLY' | 'MAX_YEARLY';

interface CheckoutParams {
  planId: PlanId;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

interface StripeConfig {
  publishableKey: string;
  priceIds: Record<PlanId, string>;
}

// TODO: Replace with actual Stripe publishable key from environment
const STRIPE_CONFIG: StripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...',
  priceIds: {
    // TODO: Replace with actual Stripe Price IDs after creating products in Stripe Dashboard
    PRO_MONTHLY: 'price_pro_monthly',
    PRO_YEARLY: 'price_pro_yearly',
    MAX_MONTHLY: 'price_max_monthly',
    MAX_YEARLY: 'price_max_yearly',
  },
};

class StripeService {
  private static instance: StripeService;

  private constructor() {
    console.log('💳 Stripe Service initialized');
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(params: CheckoutParams): Promise<{ url: string }> {
    try {
      console.log('💳 Creating Stripe checkout session:', params);

      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          planId: params.planId,
          userId: params.userId,
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
        },
      });

      if (error) {
        console.error('❌ Checkout session error:', error);
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      console.log('✅ Checkout session created:', data.url);
      return { url: data.url };
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session (for subscription management)
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      console.log('💳 Creating customer portal session');

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: {
          customerId,
          returnUrl,
        },
      });

      if (error) {
        console.error('❌ Portal session error:', error);
        throw new Error(`Failed to create portal session: ${error.message}`);
      }

      if (!data?.url) {
        throw new Error('No portal URL returned');
      }

      console.log('✅ Portal session created');
      return { url: data.url };
    } catch (error) {
      console.error('❌ Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Get customer's active subscription
   */
  async getActiveSubscription(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching subscription:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log('💳 Canceling subscription:', subscriptionId);

      const { error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: { subscriptionId },
      });

      if (error) {
        console.error('❌ Cancel subscription error:', error);
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      console.log('✅ Subscription canceled');
    } catch (error) {
      console.error('❌ Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Resume subscription (un-cancel)
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log('💳 Resuming subscription:', subscriptionId);

      const { error } = await supabase.functions.invoke('stripe-resume-subscription', {
        body: { subscriptionId },
      });

      if (error) {
        console.error('❌ Resume subscription error:', error);
        throw new Error(`Failed to resume subscription: ${error.message}`);
      }

      console.log('✅ Subscription resumed');
    } catch (error) {
      console.error('❌ Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * Get Stripe config (for frontend)
   */
  getConfig(): StripeConfig {
    return STRIPE_CONFIG;
  }

  /**
   * Get plan details
   */
  getPlanDetails(planId: PlanId) {
    const plans = {
      PRO_MONTHLY: {
        name: 'PRO',
        price: 49,
        interval: 'month',
        features: 15,
      },
      PRO_YEARLY: {
        name: 'PRO',
        price: 470,
        interval: 'year',
        features: 15,
      },
      MAX_MONTHLY: {
        name: 'MAX',
        price: 99,
        interval: 'month',
        features: 30,
      },
      MAX_YEARLY: {
        name: 'MAX',
        price: 950,
        interval: 'year',
        features: 30,
      },
    };

    return plans[planId];
  }
}

// Export singleton instance
export const stripeService = StripeService.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).stripeService = stripeService;
}
