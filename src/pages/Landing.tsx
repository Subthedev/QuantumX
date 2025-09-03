import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Brain, BarChart3, ArrowRight, Zap, Target, Activity, CheckCircle, Star, Twitter, Instagram, Mail } from 'lucide-react';
import { AIBrainIcon } from '@/components/ui/ai-brain-icon';
const Landing = () => {
  const {
    user
  } = useAuth();
  return <div className="min-h-screen bg-background">
      {/* Enhanced Navigation */}
      <nav className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <AIBrainIcon className="h-9 w-9" />
              <h1 className="text-2xl font-bold text-foreground">
                IgniteX
              </h1>
            </div>
            
            {/* Center Navigation Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
                Services
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
                About Us
              </Link>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button size="default" className="shadow-lg bg-primary hover:bg-primary-hover">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="hidden md:block">
                    <Button variant="ghost" size="default">Sign In</Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="default" className="shadow-lg bg-primary hover:bg-primary-hover">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
              AI-Powered • Real-Time • Professional Grade
            </Badge>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary-hover to-primary bg-clip-text text-transparent">
                Smart Crypto
              </span>
              <br />
              <span className="text-foreground">Predictions</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Get professional-grade AI analysis for Bitcoin and Ethereum. 
              Make informed decisions with <span className="text-primary font-semibold">confidence scores</span>, 
              <span className="text-primary font-semibold"> risk assessments</span>, and 
              <span className="text-primary font-semibold"> real-time insights</span>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                  Generate Your First Report
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Free • No Credit Card Required</span>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">85%</div>
                <div className="text-sm text-muted-foreground">Prediction Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Live Analysis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">2</div>
                <div className="text-sm text-muted-foreground">Major Cryptos</div>
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
              Professional Features
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">
              Enterprise-Grade AI Analysis
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Institutional-quality insights powered by advanced machine learning algorithms
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Multi-Factor Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Technical indicators, sentiment analysis, market trends, and on-chain data 
                  combined into actionable intelligence with transparent confidence scoring.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Real-Time Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Live market data processing with instant updates. Get alerts on trend changes, 
                  support/resistance breaks, and momentum shifts as they happen.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Risk Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Professional risk assessment with position sizing recommendations, 
                  stop-loss levels, and portfolio correlation analysis for safer trading.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Simple Process
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-foreground">Get Started in Minutes</h2>
            <p className="text-xl text-muted-foreground">
              Professional crypto analysis in three simple steps
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
                Choose Bitcoin or Ethereum and generate comprehensive AI-powered reports with technical and fundamental analysis.
              </p>
              {/* Connection Line */}
              <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Make Informed Decisions</h3>
              <p className="text-muted-foreground leading-relaxed">
                Use detailed reports with confidence scores, risk analysis, and actionable trading recommendations.
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
            Ready for Professional Crypto Analysis?
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join traders making data-driven decisions with AI-powered insights. 
            Start with your first free report today.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl">
              Generate Free Report Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm opacity-80">
            <CheckCircle className="h-4 w-4" />
            <span>Free • No hidden fees • Professional grade</span>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Logo and Description */}
            <div className="flex items-center gap-3">
              <AIBrainIcon size="lg" className="h-12 w-12" />
              <div>
                <h3 className="text-xl font-bold text-foreground">IgniteX</h3>
                <p className="text-sm text-muted-foreground">Professional crypto analysis</p>
              </div>
            </div>
            
            {/* Links and Social Media */}
            <div className="flex flex-col items-center gap-6">
              {/* Navigation Links */}
              <div className="flex items-center gap-6 text-sm">
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link to="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
                  Disclaimer
                </Link>
                <a href="mailto:contact@ignitexagency.com" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </a>
              </div>
              
              {/* Social Media Links */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground font-medium">Follow Us</p>
                <div className="flex items-center gap-6">
                  <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                    <Twitter className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Twitter</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                    <Instagram className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Instagram</span>
                  </a>
                  <a href="mailto:contact@ignitexagency.com" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group">
                    <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="text-sm text-muted-foreground">© 2023 IgniteX. Professional crypto analysis powered by artificial intelligence.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;