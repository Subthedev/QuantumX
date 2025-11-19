/**
 * TIER COMPARISON CARD COMPONENT
 *
 * Shows feature comparison across FREE/PRO/MAX tiers
 * Drives conversions with clear value proposition
 */

import { Check, X, Sparkles, Crown, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TierComparisonCardProps {
  currentTier: 'FREE' | 'PRO' | 'MAX';
  onUpgradeClick: (tier: 'PRO' | 'MAX') => void;
}

export function TierComparisonCard({ currentTier, onUpgradeClick }: TierComparisonCardProps) {
  const tiers = [
    {
      name: 'FREE',
      icon: <Zap className="w-5 h-5" />,
      price: '$0',
      period: 'forever',
      gradient: 'from-gray-500 to-gray-600',
      features: [
        { text: '2 signals per day', included: true },
        { text: 'Scheduled drops (9 AM, 6 PM UTC)', included: true },
        { text: 'Quality score 75+ only', included: true },
        { text: 'Basic signal info', included: true },
        { text: 'Entry price & targets', included: false },
        { text: 'Real-time signals', included: false },
        { text: 'AI analysis', included: false },
        { text: 'Early access', included: false },
      ],
      cta: null,
      current: currentTier === 'FREE',
    },
    {
      name: 'PRO',
      icon: <Sparkles className="w-5 h-5" />,
      price: '$49',
      period: '/month',
      gradient: 'from-blue-500 to-cyan-500',
      popular: true,
      features: [
        { text: '12-15 signals per day', included: true },
        { text: 'Real-time signal delivery', included: true },
        { text: 'Quality score 60+', included: true },
        { text: 'Full entry & exit prices', included: true },
        { text: 'Multiple take-profit levels', included: true },
        { text: 'AI market analysis', included: true },
        { text: 'Trading recommendations', included: true },
        { text: 'Early access', included: false },
      ],
      cta: 'Upgrade to PRO',
      current: currentTier === 'PRO',
    },
    {
      name: 'MAX',
      icon: <Crown className="w-5 h-5" />,
      price: '$99',
      period: '/month',
      gradient: 'from-purple-500 to-pink-500',
      features: [
        { text: '25-30 signals per day', included: true },
        { text: 'Real-time signal delivery', included: true },
        { text: 'Quality score 50+ (more signals)', included: true },
        { text: 'Full entry & exit prices', included: true },
        { text: 'Multiple take-profit levels', included: true },
        { text: 'AI market analysis', included: true },
        { text: 'Trading recommendations', included: true },
        { text: '10-min early access vs PRO', included: true },
      ],
      cta: 'Upgrade to MAX',
      current: currentTier === 'MAX',
    },
  ];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Choose Your Plan</h3>
        <p className="text-sm text-muted-foreground">
          Get more signals, better quality, and real-time delivery
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-lg border-2 p-5 transition-all ${
              tier.current
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {/* Popular badge */}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                  Most Popular
                </Badge>
              </div>
            )}

            {/* Current tier badge */}
            {tier.current && (
              <div className="absolute -top-3 right-4">
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  Current Plan
                </Badge>
              </div>
            )}

            {/* Header */}
            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r ${tier.gradient} text-white mb-3`}
              >
                {tier.icon}
                <span className="font-semibold">{tier.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2 mb-6">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div
                    className={`mt-0.5 ${
                      feature.included ? 'text-green-500' : 'text-muted-foreground/30'
                    }`}
                  >
                    {feature.included ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            {tier.cta && !tier.current && (
              <Button
                onClick={() => onUpgradeClick(tier.name as 'PRO' | 'MAX')}
                className={`w-full bg-gradient-to-r ${tier.gradient} text-white hover:opacity-90 transition-opacity`}
              >
                {tier.cta}
              </Button>
            )}

            {tier.current && (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            )}

            {tier.name === 'FREE' && !tier.current && (
              <Button variant="ghost" className="w-full" disabled>
                Downgrade
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Value proposition footer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-center">
          <span className="font-semibold">🎯 Money-back guarantee:</span> If you don't see value
          in 30 days, get a full refund. No questions asked.
        </p>
      </div>
    </Card>
  );
}
