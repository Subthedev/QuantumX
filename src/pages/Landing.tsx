import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Bitcoin, TrendingUp, Shield, Brain, Clock, BarChart3, Users, Star, CheckCircle, ArrowRight } from 'lucide-react';
const Landing = () => {
  const {
    user
  } = useAuth();
  return <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/5f2b01e7-38a6-4a5c-bb03-94c3c178b575.png" alt="Logo" className="h-24 w-24" />
            
          </div>
          <div className="flex items-center gap-4">
            {user ? <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link> : <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>}
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
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Us?</h2>
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
      <footer className="bg-background border-t border-border py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src="/lovable-uploads/5f2b01e7-38a6-4a5c-bb03-94c3c178b575.png" alt="Logo" className="h-24 w-24" />
                
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                AI-powered cryptocurrency predictions for smarter investment decisions. 
                Get intelligent insights for Bitcoin and Ethereum.
              </p>
              <div className="flex space-x-4">
                <a href="https://x.com/IgniteXagency" target="_blank" rel="noopener noreferrer" 
                   className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" 
                   className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="mailto:contact@ignitexagency.com"
                   className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link to="/auth" className="hover:text-primary transition-colors">Get Started</Link></li>
                <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
                <li><span className="text-muted-foreground/60">Bitcoin Predictions</span></li>
                <li><span className="text-muted-foreground/60">Ethereum Predictions</span></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><a href="mailto:contact@ignitexagency.com" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="mailto:contact@ignitexagency.com" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><span className="text-muted-foreground/60">FAQ</span></li>
                <li><span className="text-muted-foreground/60">Documentation</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
                <li><Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                &copy; 2024. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>Made with AI-powered predictions</span>
                <div className="flex items-center gap-2">
                  <span>Contact:</span>
                  <a href="mailto:contact@ignitexagency.com" className="hover:text-primary transition-colors">
                    contact@ignitexagency.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;