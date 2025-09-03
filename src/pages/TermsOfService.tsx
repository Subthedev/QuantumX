import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ignitexLogo from '@/assets/ignitex-new-logo.png';

const TermsOfService = () => {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using our services, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p>
              We provide AI-powered cryptocurrency prediction services for Bitcoin and Ethereum. 
              Our predictions are based on algorithmic analysis and should not be considered as financial advice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Investment Disclaimer</h2>
            <p className="font-semibold text-orange-600">
              IMPORTANT: All predictions provided by our service are for informational purposes only. 
              Cryptocurrency investments carry high risk and you should never invest more than you can afford to lose.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Payments and Refund Policy</h2>
            <p className="font-semibold text-orange-600">
              IMPORTANT: All credit purchases are final and non-refundable. Once credits are purchased, 
              they cannot be refunded, exchanged, or transferred. Please ensure you understand our service 
              before making a purchase.
            </p>
            <p>
              Credits purchased will be immediately available in your account and do not expire. 
              We encourage you to review our service offerings carefully before completing any purchase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to use the service only for lawful purposes</li>
              <li>You understand that all investment decisions are made at your own risk</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Limitation of Liability</h2>
            <p>
              We shall not be liable for any direct, indirect, incidental, special, 
              consequential or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the service immediately, 
              without prior notice, for conduct that we believe violates these Terms of Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Contact Information</h2>
            <p>
              Questions about the Terms of Service should be sent to us at{' '}
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

export default TermsOfService;