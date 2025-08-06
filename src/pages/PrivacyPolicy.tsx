import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ignitexLogo from '@/assets/ignitex-orange-brain-logo.png';

const PrivacyPolicy = () => {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, 
              use our services, or contact us for support. This may include your name, email address, and usage data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our AI-powered cryptocurrency prediction services</li>
              <li>Send you updates and communications about our services</li>
              <li>Respond to your questions and provide customer support</li>
              <li>Analyze usage patterns to enhance user experience</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
              except as described in this Privacy Policy or as required by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information. 
              You may also opt out of certain communications from us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
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

export default PrivacyPolicy;