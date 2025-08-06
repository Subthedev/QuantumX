import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ignitexLogo from '@/assets/ignitex-logo.png';

const Disclaimer = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={ignitexLogo} alt="IgniteX" className="h-8 w-8" />
            <span className="font-bold text-lg">IgniteX</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Disclaimer</h1>
        
        <Alert className="mb-8 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Important:</strong> This disclaimer contains crucial information about the risks associated with cryptocurrency investments. Please read carefully.
          </AlertDescription>
        </Alert>

        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Not Financial Advice</h2>
            <p className="font-semibold text-red-600">
              The information provided by our service is for informational purposes only and should not be considered as financial, 
              investment, or trading advice. All predictions and analyses are based on algorithmic models and historical data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. High Risk Investment Warning</h2>
            <p>
              Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. 
              The value of cryptocurrencies can fluctuate dramatically and you may lose your entire investment.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-red-600 font-medium">
              <li>Past performance does not guarantee future results</li>
              <li>Cryptocurrency markets are highly volatile and unpredictable</li>
              <li>You should never invest more than you can afford to lose</li>
              <li>Consider seeking advice from qualified financial professionals</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. AI Prediction Limitations</h2>
            <p>
              Our AI models analyze market data and patterns, but they cannot predict future market movements with certainty. 
              Market conditions can change rapidly due to various factors including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Regulatory changes and government policies</li>
              <li>Market sentiment and investor behavior</li>
              <li>Technical issues with blockchain networks</li>
              <li>Global economic events and news</li>
              <li>Unexpected market manipulation</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. No Guarantees</h2>
            <p>
              We make no representations or warranties regarding the accuracy, completeness, 
              or reliability of any predictions or information provided through our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. User Responsibility</h2>
            <p>
              By using our services, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are solely responsible for your investment decisions</li>
              <li>You understand the risks involved in cryptocurrency trading</li>
              <li>You will conduct your own research and due diligence</li>
              <li>You will not hold us liable for any losses incurred</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Regulatory Compliance</h2>
            <p>
              Cryptocurrency regulations vary by jurisdiction. It is your responsibility to ensure 
              that your use of our services complies with applicable laws in your location.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Contact Information</h2>
            <p>
              For questions regarding this disclaimer, please contact us at{' '}
              <a href="mailto:Contact@ignitexagency.com" className="text-primary hover:underline">
                Contact@ignitexagency.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;