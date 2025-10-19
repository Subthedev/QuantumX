import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Award, 
  Users, 
  Target, 
  TrendingUp, 
  Heart, 
  CheckCircle, 
  ArrowRight,
  Brain,
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { IgniteXLogo } from '@/components/ui/ignitex-logo';
import { useEffect } from 'react';

const About = () => {
  useEffect(() => {
    document.title = 'About Us - IgniteX | Trusted AI Crypto Analytics';
    const metaDesc = 'Learn about IgniteX - your trusted partner in AI-powered cryptocurrency analytics. Transparent, reliable, and built for traders who demand excellence.';
    let descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.name = 'description';
      document.head.appendChild(descTag);
    }
    descTag.content = metaDesc;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero Section with Mission Statement */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Shield className="w-3 h-3 mr-1" />
              Trusted by Thousands of Traders
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-primary-hover to-primary bg-clip-text text-transparent">
                Built on Trust,
              </span>
              <br />
              <span className="text-foreground">Powered by Intelligence</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              At IgniteX, we believe every trader deserves institutional-grade analysis without the institutional price tag. 
              Our mission is to democratize crypto intelligence through transparent, accurate, and accessible AI technology.
            </p>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">78%</div>
                <div className="text-sm text-muted-foreground">Prediction Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime Guarantee</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Data Transparency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Trust Us Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Traders Trust IgniteX</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're not just another prediction tool. We're your partner in making informed decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>Bank-Level Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Your data is encrypted with AES-256 encryption. We never share your information 
                  with third parties. Your privacy is our priority.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Brain className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>Transparent AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Every prediction shows its confidence score and data sources. No black boxes. 
                  You see exactly how our AI reaches its conclusions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>Proven Track Record</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  87% average confidence score maintained across thousands of predictions. 
                  Our accuracy is backed by real market performance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>Community First</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Built by traders, for traders. We actively incorporate user feedback 
                  and continuously improve based on your needs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>No Hidden Agenda</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  We don't trade against you. Our only revenue comes from subscriptions. 
                  Your success is literally our business model.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/20 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="h-7 w-7 text-primary" />
                </div>
                <CardTitle>Ethical AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  We never manipulate predictions or create artificial urgency. 
                  Our AI is designed to inform, not to influence.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Our Story</h2>
              <p className="text-xl text-muted-foreground">
                From frustrated traders to solution builders
              </p>
            </div>

            <div className="prose prose-lg mx-auto text-muted-foreground leading-relaxed">
              <p className="mb-6">
                IgniteX was born from a simple frustration: why should institutional-grade crypto analysis 
                be reserved only for hedge funds and whales? In 2023, our founding team of data scientists 
                and veteran traders came together with a vision to level the playing field.
              </p>
              
              <p className="mb-6">
                We spent months analyzing what makes professional traders successful. The answer was clear: 
                <span className="text-foreground font-semibold"> access to better information</span>. Not more information, 
                but better, cleaner, more actionable insights.
              </p>

              <p className="mb-6">
                Today, IgniteX serves thousands of traders worldwide, from beginners taking their first steps 
                to seasoned professionals managing significant portfolios. Every prediction we generate, 
                every feature we build, is guided by one principle: 
                <span className="text-primary font-semibold"> empower traders with truth, not hype</span>.
              </p>

              <div className="bg-primary/5 border-l-4 border-primary p-6 my-8 rounded-r-lg">
                <p className="text-foreground font-semibold text-lg mb-2">Our Promise to You:</p>
                <p className="text-muted-foreground">
                  "We will never compromise on accuracy for profit. We will never hide our methodology. 
                  We will always put your trading success above our growth metrics. This is our commitment 
                  to every single user who trusts us with their trading decisions."
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  - The IgniteX Team
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Verified & Validated</h2>
            <p className="text-lg text-muted-foreground">
              Our commitment to excellence is recognized industry-wide
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <Globe className="h-12 w-12 text-primary mb-3" />
              <span className="text-sm font-semibold">Global Coverage</span>
              <span className="text-xs text-muted-foreground">15+ Countries</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="h-12 w-12 text-primary mb-3" />
              <span className="text-sm font-semibold">Lightning Fast</span>
              <span className="text-xs text-muted-foreground">&lt;100ms Response</span>
            </div>
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-primary mb-3" />
              <span className="text-sm font-semibold">SOC 2 Compliant</span>
              <span className="text-xs text-muted-foreground">Enterprise Security</span>
            </div>
            <div className="flex flex-col items-center">
              <Award className="h-12 w-12 text-primary mb-3" />
              <span className="text-sm font-semibold">Industry Leader</span>
              <span className="text-xs text-muted-foreground">Since 2023</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-primary-hover to-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience the Difference?
          </h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Join thousands of traders who've made the switch to transparent, 
            reliable AI-powered analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-xl">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <CheckCircle className="h-4 w-4" />
              <span>No credit card required • Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <IgniteXLogo size="sm" showText={true} />
                </Link>
              </div>
            </div>
            
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
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 IgniteX. Building trust in crypto intelligence, one prediction at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;