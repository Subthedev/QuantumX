import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ignitexLogo from '@/assets/ignitex-orange-brain-logo.png';

const CookiePolicy = () => {
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
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground text-lg">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit our website. 
              They help us provide you with a better experience by remembering your preferences and improving our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
              <li><strong>Authentication Cookies:</strong> To keep you logged in to your account</li>
              <li><strong>Analytics Cookies:</strong> To understand how you use our website and improve our services</li>
              <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Session Cookies</h3>
                <p>These are temporary cookies that expire when you close your browser.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Persistent Cookies</h3>
                <p>These remain on your device for a specified period or until you delete them.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Managing Cookies</h2>
            <p>
              You can control and manage cookies in various ways. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>View what cookies are stored on your device</li>
              <li>Delete cookies individually or all at once</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies from being set</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Third-Party Cookies</h2>
            <p>
              We may use third-party services that place cookies on your device. 
              These services have their own privacy policies and cookie practices.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at{' '}
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

export default CookiePolicy;