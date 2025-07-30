import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Bitcoin, 
  TrendingUp, 
  Shield, 
  Brain, 
  Clock, 
  BarChart3, 
  Users,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">IgniteX</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-light to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            🚀 AI-Powered Crypto Intelligence
          </Badge>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
            Predict. Profit. Pioneer.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Harness the power of advanced AI to get intelligent cryptocurrency predictions. 
            Make informed investment decisions with our cutting-edge market analysis for Bitcoin and Ethereum.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Predicting Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose IgniteX?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced AI technology meets cryptocurrency expertise to deliver unparalleled market insights.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Advanced AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our machine learning algorithms analyze thousands of data points including market trends, 
                  news sentiment, and technical indicators to generate accurate predictions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Real-Time Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Get up-to-the-minute market analysis with live data feeds and instant predictions 
                  for Bitcoin and Ethereum based on current market conditions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Confidence Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Every prediction comes with a confidence score, helping you understand 
                  the reliability of each forecast and make informed investment decisions.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started with AI-powered crypto predictions in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. Create Your Account</h3>
              <p className="text-muted-foreground">
                Sign up for free and get instant access to our AI prediction platform. 
                No credit card required to start.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bitcoin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. Choose Your Crypto</h3>
              <p className="text-muted-foreground">
                Select Bitcoin or Ethereum and generate detailed AI-powered prediction reports 
                with confidence scores and key insights.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">3. Make Informed Decisions</h3>
              <p className="text-muted-foreground">
                Use our detailed reports with market analysis, trend predictions, 
                and risk assessments to guide your investment strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Start free and upgrade as you grow your crypto portfolio
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Free Tier</CardTitle>
                <div className="text-4xl font-bold text-primary">$0</div>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>1 report per coin every 24 hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Bitcoin & Ethereum predictions</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Basic market insights</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Confidence scoring</span>
                </div>
                <Link to="/auth" className="block">
                  <Button className="w-full mt-6">Get Started Free</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro Tier</CardTitle>
                <div className="text-4xl font-bold text-primary">$29</div>
                <CardDescription>For serious crypto investors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Unlimited reports</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>All cryptocurrencies</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Advanced market analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Real-time alerts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Priority support</span>
                </div>
                <Button className="w-full mt-6" variant="outline">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-hover text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Predicting?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of crypto investors making smarter decisions with AI-powered insights.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Get Started Now - It's Free!
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-primary">IgniteX</span>
              </div>
              <p className="text-muted-foreground">
                AI-powered cryptocurrency predictions for smarter investment decisions.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-primary">Features</Link></li>
                <li><Link to="#" className="hover:text-primary">Pricing</Link></li>
                <li><Link to="#" className="hover:text-primary">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-primary">About</Link></li>
                <li><Link to="#" className="hover:text-primary">Blog</Link></li>
                <li><Link to="#" className="hover:text-primary">Careers</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-primary">Help Center</Link></li>
                <li><Link to="#" className="hover:text-primary">Contact</Link></li>
                <li><Link to="#" className="hover:text-primary">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 IgniteX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;