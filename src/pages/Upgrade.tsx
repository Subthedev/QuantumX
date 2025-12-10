/**
 * UPGRADE PAGE
 *
 * Premium subscription upgrade flow with Stripe integration
 * Displays pricing, features, and handles checkout process
 */

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap, ArrowRight, Shield, Clock, Target, ExternalLink } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useAuth } from '@/hooks/useAuth';
import { nowPaymentsService, type PlanId } from '@/services/nowPaymentsService';

export default function Upgrade() {
  const { user } = useAuth();
  const { tier, subscription } = useUserSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'PRO' | 'MAX' | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'FREE',
      icon: <Zap className="w-6 h-6" />,
      price: { monthly: 0, yearly: 0 },
      gradient: 'from-gray-500 to-gray-600',
      description: 'Start your trading journey',
      features: [
        '2 AI signals per day',
        'Scheduled drops (9 AM, 6 PM UTC)',
        'Quality score 75+ only',
        'Basic signal information',
        'Access to Battle Arena',
        'Community support',
      ],
      limitations: [
        'No real-time signals',
        'No entry/exit prices',
        'No AI analysis',
      ],
    },
    {
      id: 'pro',
      name: 'PRO',
      icon: <Sparkles className="w-6 h-6" />,
      price: { monthly: 49, yearly: 470 }, // ~20% discount for yearly
      gradient: 'from-blue-500 to-cyan-500',
      popular: true,
      description: 'Perfect for serious traders',
      features: [
        '12-15 AI signals per day',
        'Real-time signal delivery',
        'Quality score 60+',
        'Full entry & exit prices',
        'Multiple take-profit levels',
        'AI market analysis',
        'Trading recommendations',
        'Priority support',
        'Advanced Battle Arena features',
      ],
      savings: billingCycle === 'yearly' ? '$118/year' : null,
    },
    {
      id: 'max',
      name: 'MAX',
      icon: <Crown className="w-6 h-6" />,
      price: { monthly: 99, yearly: 950 }, // ~20% discount for yearly
      gradient: 'from-purple-500 to-pink-500',
      description: 'Maximum edge for professionals',
      features: [
        '25-30 AI signals per day',
        'Real-time signal delivery',
        'Quality score 50+ (more signals)',
        'Full entry & exit prices',
        'Multiple take-profit levels',
        'AI market analysis',
        'Trading recommendations',
        '10-min early access',
        'VIP priority support',
        'Exclusive Battle Arena rewards',
        'Direct strategy insights',
      ],
      savings: billingCycle === 'yearly' ? '$238/year' : null,
    },
  ];

  const handleCheckout = async (planId: 'PRO' | 'MAX') => {
    if (!user) {
      alert('Please sign in to upgrade');
      return;
    }

    setLoading(true);
    setSelectedPlan(planId);

    try {
      // Build plan ID based on billing cycle
      const fullPlanId: PlanId = `${planId}_${billingCycle.toUpperCase()}` as PlanId;

      console.log('💳 Opening NOWPayments checkout:', fullPlanId);

      // Open NOWPayments payment page
      nowPaymentsService.openPaymentPage({
        planId: fullPlanId,
        userId: user.id,
        userEmail: user.email || '',
      });

      // Show instructions to user
      alert('🚀 Payment page opened in new tab!\n\nAfter completing payment, contact support to activate your subscription.\n\nSupport: support@ignitex.live');

    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to open payment page. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            Current Plan: {tier}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Unlock Your Trading Potential
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get real-time AI-powered trading signals with institutional-grade analysis
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrent = tier === plan.name;
            const isUpgrade = plan.id !== 'free' && !isCurrent;

            return (
              <Card
                key={plan.id}
                className={`relative p-8 ${
                  plan.popular
                    ? 'border-2 border-primary shadow-xl scale-105'
                    : 'border border-border'
                } ${isCurrent ? 'bg-primary/5' : ''} transition-all hover:shadow-lg`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 px-4 py-1">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrent && (
                  <div className="absolute -top-4 right-4">
                    <Badge variant="outline" className="bg-primary text-primary-foreground">
                      CURRENT PLAN
                    </Badge>
                  </div>
                )}

                {/* Icon and name */}
                <div
                  className={`inline-flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r ${plan.gradient} text-white mb-4`}
                >
                  {plan.icon}
                  <span className="text-xl font-bold">{plan.name}</span>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-4xl font-bold">
                    ${plan.price[billingCycle]}
                  </span>
                  {plan.price[billingCycle] > 0 && (
                    <span className="text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  )}
                </div>

                {plan.savings && billingCycle === 'yearly' && (
                  <p className="text-sm text-green-500 font-medium mb-4">
                    💰 Save {plan.savings}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                {/* CTA Button */}
                {plan.id === 'free' ? (
                  <Button variant="outline" className="w-full mb-6" disabled>
                    {isCurrent ? 'Current Plan' : 'Free Forever'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(plan.id as 'PRO' | 'MAX')}
                    disabled={loading || isCurrent}
                    className={`w-full mb-6 bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90 transition-opacity`}
                  >
                    {loading && selectedPlan === plan.id ? (
                      'Opening Payment...'
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      <>
                        Pay with Crypto
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limitations (for FREE) */}
                {plan.limitations && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Not included:</p>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                          <span>•</span>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Social proof / guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="font-semibold mb-2">30-Day Money Back</h3>
            <p className="text-sm text-muted-foreground">
              Not satisfied? Get a full refund within 30 days. No questions asked.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <h3 className="font-semibold mb-2">75%+ Win Rate</h3>
            <p className="text-sm text-muted-foreground">
              Our AI signals have maintained a 75%+ win rate over the past 6 months.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <h3 className="font-semibold mb-2">Cancel Anytime</h3>
            <p className="text-sm text-muted-foreground">
              No long-term commitment. Cancel your subscription anytime.
            </p>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">How do the signal drops work?</h3>
              <p className="text-sm text-muted-foreground">
                FREE users get 2 signals at scheduled times (9 AM & 6 PM UTC). PRO and MAX members
                receive signals in real-time as soon as our AI detects high-probability setups.
                MAX members get early access 10 minutes before PRO members.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's the difference between PRO and MAX?</h3>
              <p className="text-sm text-muted-foreground">
                PRO gives you 12-15 high-quality signals daily. MAX gives you 25-30 signals with
                a lower quality threshold (more opportunities), plus 10-minute early access to
                beat the market.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade immediately and the difference will be prorated. Downgrades
                take effect at the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards and debit cards via Stripe. Your payment
                information is secured with bank-level encryption.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
