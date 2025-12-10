/**
 * NOWPAYMENTS SERVICE
 *
 * Simple payment link generation for cryptocurrency payments
 * Much simpler than Stripe - no webhooks, no complex integration
 * Just generate payment links with preset amounts
 */

export type PlanId = 'PRO_MONTHLY' | 'PRO_YEARLY' | 'MAX_MONTHLY' | 'MAX_YEARLY';

interface PaymentLinkParams {
  planId: PlanId;
  userId: string;
  userEmail: string;
}

interface PlanDetails {
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: number;
  description: string;
}

// Plan configuration
const PLANS: Record<PlanId, PlanDetails> = {
  PRO_MONTHLY: {
    name: 'PRO',
    price: 49,
    currency: 'USD',
    interval: 'month',
    features: 15,
    description: '15 signals/day with real-time delivery',
  },
  PRO_YEARLY: {
    name: 'PRO',
    price: 470,
    currency: 'USD',
    interval: 'year',
    features: 15,
    description: '15 signals/day (save $118/year)',
  },
  MAX_MONTHLY: {
    name: 'MAX',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: 30,
    description: '30 signals/day with early access',
  },
  MAX_YEARLY: {
    name: 'MAX',
    price: 950,
    currency: 'USD',
    interval: 'year',
    features: 30,
    description: '30 signals/day (save $238/year)',
  },
};

class NOWPaymentsService {
  private static instance: NOWPaymentsService;

  // TODO: Replace with your NOWPayments API key from https://nowpayments.io
  private readonly API_KEY = import.meta.env.VITE_NOWPAYMENTS_API_KEY || '';

  // TODO: Replace with your actual payment page URLs after creating them in NOWPayments dashboard
  private readonly PAYMENT_LINKS = {
    PRO_MONTHLY: import.meta.env.VITE_NOWPAYMENTS_PRO_MONTHLY_LINK || 'https://nowpayments.io/payment/?iid=YOUR_PRO_MONTHLY_ID',
    PRO_YEARLY: import.meta.env.VITE_NOWPAYMENTS_PRO_YEARLY_LINK || 'https://nowpayments.io/payment/?iid=YOUR_PRO_YEARLY_ID',
    MAX_MONTHLY: import.meta.env.VITE_NOWPAYMENTS_MAX_MONTHLY_LINK || 'https://nowpayments.io/payment/?iid=YOUR_MAX_MONTHLY_ID',
    MAX_YEARLY: import.meta.env.VITE_NOWPAYMENTS_MAX_YEARLY_LINK || 'https://nowpayments.io/payment/?iid=YOUR_MAX_YEARLY_ID',
  };

  private constructor() {
    console.log('💳 NOWPayments Service initialized');
  }

  static getInstance(): NOWPaymentsService {
    if (!NOWPaymentsService.instance) {
      NOWPaymentsService.instance = new NOWPaymentsService();
    }
    return NOWPaymentsService.instance;
  }

  /**
   * Get payment link for plan
   * NOWPayments preset payment pages - simplest approach
   */
  getPaymentLink(params: PaymentLinkParams): string {
    const { planId, userId, userEmail } = params;

    // Get base payment link
    const baseLink = this.PAYMENT_LINKS[planId];

    // Add metadata as URL params for tracking
    const url = new URL(baseLink);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('email', userEmail);
    url.searchParams.set('plan', planId);

    console.log(`💳 Generated NOWPayments link for ${planId}`);

    return url.toString();
  }

  /**
   * Open payment page in new window
   */
  openPaymentPage(params: PaymentLinkParams): void {
    const link = this.getPaymentLink(params);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  /**
   * Get plan details
   */
  getPlanDetails(planId: PlanId): PlanDetails {
    return PLANS[planId];
  }

  /**
   * Get all plans
   */
  getAllPlans(): Record<PlanId, PlanDetails> {
    return PLANS;
  }

  /**
   * Format price for display
   */
  formatPrice(planId: PlanId): string {
    const plan = PLANS[planId];
    return `$${plan.price}/${plan.interval}`;
  }

  /**
   * Calculate savings for yearly plans
   */
  getYearlySavings(tier: 'PRO' | 'MAX'): number {
    const monthly = PLANS[`${tier}_MONTHLY` as PlanId].price * 12;
    const yearly = PLANS[`${tier}_YEARLY` as PlanId].price;
    return monthly - yearly;
  }
}

// Export singleton instance
export const nowPaymentsService = NOWPaymentsService.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).nowPaymentsService = nowPaymentsService;
}
