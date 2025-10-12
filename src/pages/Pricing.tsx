import { Check, Zap, Shield, TrendingUp, ArrowRight, Sparkles, Star, ChartBar, Brain, Users, Lock, Activity, TrendingUp as TrendUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AIBrainIcon } from "@/components/ui/ai-brain-icon";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const monthlyPlans = [
  {
    name: "FREE",
    price: "$0",
    period: "/month",
    description: "Get started with basic features",
    originalPrice: undefined,
    features: [
      "3 AI analysis reports per month",
      "Basic technical analysis",
      "Market overview dashboard",
      "Community support"
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    disabled: false
  },
  {
    name: "PRO",
    price: "$19",
    period: "/month",
    badge: "MOST POPULAR",
    description: "Everything you need for serious trading",
    originalPrice: "$49",
    features: [
      "Access to Titan 10 exclusive picks",
      "Unlimited AI analysis reports",
      "Advanced analytics & insights",
      "Daily market direction signals",
      "Portfolio tracker",
      "Real-time price alerts",
      "Priority support"
    ],
    highlighted: true,
    buttonText: "Join Waitlist",
    buttonVariant: "default" as const,
    disabled: false
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    period: "",
    badge: "API ACCESS",
    description: "Built for institutions and developers",
    originalPrice: undefined,
    features: [
      "Everything in Pro",
      "Full API access",
      "Custom integrations",
      "Dedicated account manager",
      "Custom model training",
      "99.9% uptime SLA",
      "White-label options"
    ],
    highlighted: false,
    buttonText: "Contact Us",
    buttonVariant: "secondary" as const,
    disabled: false
  }
];

const yearlyPlans = [
  {
    name: "FREE",
    price: "$0",
    period: "/year",
    description: "Get started with basic features",
    features: [
      "3 AI analysis reports per month",
      "Basic technical analysis",
      "Market overview dashboard",
      "Community support"
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    disabled: false
  },
  {
    name: "PRO",
    price: "$199",
    period: "/year",
    badge: "SAVE 15%",
    description: "Everything you need for serious trading",
    originalPrice: "$228",
    features: [
      "Access to Titan 10 exclusive picks",
      "Unlimited AI analysis reports",
      "Advanced analytics & insights",
      "Daily market direction signals",
      "Portfolio tracker",
      "Real-time price alerts",
      "Priority support"
    ],
    highlighted: true,
    buttonText: "Join Waitlist",
    buttonVariant: "default" as const,
    disabled: false
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    period: "",
    badge: "API ACCESS",
    description: "Built for institutions and developers",
    features: [
      "Everything in Pro",
      "Full API access",
      "Custom integrations",
      "Dedicated account manager",
      "Custom model training",
      "99.9% uptime SLA",
      "White-label options"
    ],
    highlighted: false,
    buttonText: "Contact Us",
    buttonVariant: "secondary" as const,
    disabled: false
  }
];
export default function Pricing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Here you would normally submit to your waitlist API
    // For now, we'll simulate with a timeout
    setTimeout(() => {
      toast({
        title: "You're on the waitlist!",
        description: "We'll notify you when Pro access is available.",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  const handlePlanAction = (plan: typeof monthlyPlans[0]) => {
    if (plan.name === "FREE") {
      navigate("/dashboard");
    } else if (plan.name === "ENTERPRISE") {
      window.location.href = "mailto:contact@ignitexagency.com?subject=Enterprise API Access Inquiry";
    }
    // Pro plan uses the waitlist form
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/95">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <AIBrainIcon className="h-8 w-8" />
            <h1 className="text-xl font-bold text-foreground">
              IgniteX
            </h1>
          </div>
          
          <nav className="flex items-center gap-4">
            <Button size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 px-3 py-1 bg-gradient-to-r from-primary/20 to-orange-500/20 border-primary/50">
              <Activity className="h-3 w-3 mr-1" />
              EARLY ACCESS
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-orange-500 to-primary bg-clip-text text-transparent inline-block">
                Professional Crypto Intelligence
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get institutional-grade AI analytics, exclusive Titan 10 picks, and real-time market insights to stay ahead of the curve.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">AI-Powered Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendUp className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">85% Accuracy Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-20">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as "monthly" | "yearly")} className="w-auto">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">Save 15%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(billingPeriod === "monthly" ? monthlyPlans : yearlyPlans).map((plan) => (
            <Card
              key={plan.name}
              className={`relative overflow-hidden transition-all duration-300 ${
                plan.highlighted
                  ? 'border-2 border-primary shadow-xl scale-105'
                  : 'border border-border/50 hover:border-border'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg px-4 py-1.5 bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardContent className="p-8">
                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    {plan.originalPrice && (
                      <span className="text-lg line-through text-muted-foreground mr-2">{plan.originalPrice}</span>
                    )}
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.name === "PRO" ? (
                  <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      variant={plan.buttonVariant}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Joining..." : plan.buttonText}
                    </Button>
                  </form>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.buttonVariant}
                    onClick={() => handlePlanAction(plan)}
                  >
                    {plan.buttonText}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Benefits */}
        <div className="mt-20 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Why choose IgniteX Pro</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Exclusive Titan 10</h3>
              <p className="text-sm text-muted-foreground">
                Access our curated selection of high-potential crypto picks
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <ChartBar className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Institutional-grade AI models and technical indicators
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Insights</h3>
              <p className="text-sm text-muted-foreground">
                Daily market direction and portfolio tracking tools
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="font-semibold mb-2">What's included in the Pro plan?</h3>
              <p className="text-sm text-muted-foreground">
                Pro includes unlimited AI analysis reports, exclusive Titan 10 picks, advanced analytics, daily market insights, portfolio tracking, and priority support.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="font-semibold mb-2">When will Pro access be available?</h3>
              <p className="text-sm text-muted-foreground">
                We're currently in early access. Join the waitlist to be notified as soon as Pro subscriptions are available.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="font-semibold mb-2">How does the Enterprise API work?</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise customers get full API access to integrate our AI analytics and data into their own applications and trading systems.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-muted/20 border border-border/50">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, all subscriptions can be cancelled anytime. You'll retain access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}