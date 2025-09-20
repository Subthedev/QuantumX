import { Link } from 'react-router-dom';
import { useState, memo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Brain, BarChart3, ArrowRight, Zap, Target, Activity, CheckCircle, Star, Twitter, Instagram, Mail } from 'lucide-react';
import { IgniteXLogo } from '@/components/ui/ignitex-logo';
import { AppHeader } from '@/components/AppHeader';
import { toast } from '@/hooks/use-toast';
const Landing = () => {
  const {
    user
  } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const handleSubscribe = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to subscribe.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }
    setIsSubscribing(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter. You'll receive weekly crypto insights."
      });
      setEmail('');
      setIsSubscribing(false);
    }, 1000);
  }, [email]);
  return <div className="min-h-screen bg-background">
      {/* Use the new professional header */}
      <AppHeader />

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Status Badge */}
            <Badge className="mb-8 bg-primary/10 text-primary border-primary/20 shadow-lg">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered Analytics • Real-Time Data • Professional Grade
            </Badge>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary-hover to-primary bg-clip-text text-transparent">
                Intelligent Crypto
              </span>
              <br />
              <span className="text-foreground">Analytics Platform</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Professional-grade AI analysis for cryptocurrency markets. 
              Access <span className="text-primary font-semibold">comprehensive analytics</span>, 
              <span className="text-primary font-semibold"> market insights</span>, and 
              <span className="text-primary font-semibold"> technical indicators</span> in real-time.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                  Start Your Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Free Trial • No Credit Card Required</span>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">10+</div>
                <div className="text-sm text-muted-foreground">Cryptocurrencies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Live Analytics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">Real-Time</div>
                <div className="text-sm text-muted-foreground">Market Data</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Professional Analytics
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Comprehensive Market Intelligence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced analytics powered by machine learning and real-time market data
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Comprehensive technical analysis with multiple indicators, market trends, 
                  and AI-powered insights combined into actionable intelligence.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Real-Time Data</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Live market data processing with instant updates. Monitor price movements, 
                  volume changes, and market sentiment as they happen.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Professional risk metrics with volatility analysis, position sizing guidance, 
                  and portfolio correlation insights for informed decision-making.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Simple Process
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">Get Started in Minutes</h2>
            <p className="text-xl text-muted-foreground">
              Professional crypto analytics in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center relative">
              <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Create Account</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sign up instantly with your email. No lengthy verification process or credit card required to start.
              </p>
              {/* Connection Line */}
              <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
            </div>

            <div className="text-center relative">
              <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Select Cryptocurrency</h3>
              <p className="text-muted-foreground leading-relaxed">
                Choose from 10+ major cryptocurrencies and generate comprehensive AI-powered analytics reports.
              </p>
              {/* Connection Line */}
              <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Analyze & Act</h3>
              <p className="text-muted-foreground leading-relaxed">
                Access detailed analytics with technical indicators, market insights, and risk assessments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-primary-hover to-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready for Professional Crypto Analytics?
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join traders using advanced analytics and AI-powered insights. 
            Start with your free analysis today.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl">
              Start Free Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm opacity-80">
            <CheckCircle className="h-4 w-4" />
            <span>Free Trial • No hidden fees • Professional grade</span>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-muted/5 border-t border-border">
        <div className="container mx-auto px-4 py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <IgniteXLogo size="md" showText={true} />
              </div>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Professional-grade AI crypto analytics platform providing institutional-quality insights 
                for cryptocurrency traders and investors worldwide.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://x.com/IgniteXagency" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                  <Twitter className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
                
                
                <a href="mailto:contact@ignitexagency.com" className="w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors group">
                  <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Analytics Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Pricing
                  </Link>
                </li>
                <li>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-1">
                    API Access
                    <Badge className="text-xs py-0 px-1 ml-1" variant="secondary">Soon</Badge>
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    About Us
                  </Link>
                </li>
                <li>
                  <a href="mailto:contact@ignitexagency.com" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Legal & Support */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal & Support</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Risk Disclaimer
                  </Link>
                </li>
                <li>
                  <Link to="/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Newsletter Section */}
          <div className="border-t border-border pt-8 pb-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Stay Updated</h4>
                <p className="text-sm text-muted-foreground">
                  Get weekly crypto insights and market analysis delivered to your inbox.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" disabled={isSubscribing} />
                <Button type="submit" className="px-6" disabled={isSubscribing}>
                  {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              <p className="text-sm text-muted-foreground text-center">
                © 2023 IgniteX. All rights reserved. Professional crypto analysis powered by AI.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;