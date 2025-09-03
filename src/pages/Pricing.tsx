import { Check, Zap, Shield, TrendingUp, ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const pricingPlans = [
  {
    name: "PRO",
    price: "$9",
    credits: 30,
    badge: null,
    description: "Perfect for active traders",
    paymentLink: "https://nowpayments.io/payment/?iid=4356497370",
    features: [
      "30 AI-powered predictions",
      "Real-time market analysis",
      "Technical indicators",
      "24-hour support"
    ],
    highlighted: false,
    perCredit: "$0.30"
  },
  {
    name: "ELITE",
    price: "$25",
    credits: 100,
    badge: "MOST POPULAR",
    description: "Best value for serious investors",
    paymentLink: "https://nowpayments.io/payment/?iid=6122943694",
    features: [
      "100 AI-powered predictions",
      "Advanced pattern recognition",
      "Priority support",
      "Portfolio optimization"
    ],
    highlighted: true,
    perCredit: "$0.25",
    savings: "17% OFF"
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    credits: "Unlimited",
    badge: null,
    description: "Tailored for institutions",
    paymentLink: null,
    features: [
      "Unlimited predictions",
      "API access",
      "Dedicated account manager",
      "Custom AI models"
    ],
    highlighted: false,
    perCredit: null
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePurchase = (link: string | null) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (link) {
      window.open(link, "_blank");
    } else {
      // Contact for enterprise
      window.location.href = "mailto:support@ignitex.ai?subject=Enterprise Pricing Inquiry";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <img 
              src="/lovable-uploads/5f2b01e7-38a6-4a5c-bb03-94c3c178b575.png" 
              alt="IgniteX" 
              className="h-8 w-auto"
            />
            <span className="font-bold text-xl">IgniteX</span>
          </div>
          
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 px-4 py-1.5 bg-accent text-accent-foreground border-accent">
              <Sparkles className="h-3 w-3 mr-1" />
              LIMITED TIME OFFER
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Unlock AI-Powered Crypto Intelligence
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get instant access to advanced predictions that help you make smarter trading decisions. 
              Pay with crypto, get instant credits.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">Secure Crypto Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Instant Activation</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">85% Accuracy Rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden transition-all duration-300 ${
                plan.highlighted 
                  ? 'border-2 border-primary shadow-xl scale-105 lg:scale-110' 
                  : 'border border-border/50 hover:border-border hover:shadow-lg'
              }`}
            >
              {/* Popular Badge */}
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-semibold">
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className={`p-6 ${plan.badge ? 'pt-12' : ''}`}>
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "Custom" && (
                        <span className="text-muted-foreground text-sm">/one-time</span>
                      )}
                    </div>
                    
                    {/* Credits Display */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="h-4 w-4 fill-primary" />
                        <span className="font-semibold text-xl">{plan.credits}</span>
                        <span className="text-sm text-muted-foreground">
                          {typeof plan.credits === 'number' ? 'Credits' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Per Credit Price */}
                    {plan.perCredit && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {plan.perCredit} per credit
                      </div>
                    )}

                    {/* Savings Badge */}
                    {plan.savings && (
                      <Badge className="mt-3 bg-accent/20 text-accent border-0">
                        {plan.savings}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full ${
                    plan.highlighted 
                      ? 'bg-primary hover:bg-primary/90' 
                      : plan.name === "ENTERPRISE"
                      ? ''
                      : ''
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handlePurchase(plan.paymentLink)}
                >
                  {plan.name === "ENTERPRISE" ? (
                    <>Get Custom Quote</>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Additional Benefits */}
        <div className="mt-20 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Why traders choose IgniteX</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Data-Driven Insights</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes millions of data points to predict market movements
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Risk Management</h3>
              <p className="text-sm text-muted-foreground">
                Built-in risk assessment to protect your portfolio
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Signals</h3>
              <p className="text-sm text-muted-foreground">
                Get instant alerts when opportunities arise
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2">How do credits work?</h3>
              <p className="text-sm text-muted-foreground">
                Each credit allows you to generate one AI-powered crypto prediction report. Credits never expire.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2">What cryptocurrencies do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major cryptocurrencies including Bitcoin, Ethereum, USDT, and 100+ more through NowPayments.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-2">How fast do I receive my credits?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are added to your account instantly after payment confirmation, typically within 1-2 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}