import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load all pages for better performance with error handling
const Landing = lazy(() => import("./pages/Landing").catch(err => {
  console.error('Failed to load Landing page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Dashboard = lazy(() => import("./pages/Dashboard").catch(err => {
  console.error('Failed to load Dashboard page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const About = lazy(() => import("./pages/About").catch(err => {
  console.error('Failed to load About page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Auth = lazy(() => import("./pages/Auth").catch(err => {
  console.error('Failed to load Auth page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const NotFound = lazy(() => import("./pages/NotFound").catch(err => {
  console.error('Failed to load NotFound page:', err);
  return { default: () => <div>Page not found</div> };
}));

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").catch(err => {
  console.error('Failed to load PrivacyPolicy page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const TermsOfService = lazy(() => import("./pages/TermsOfService").catch(err => {
  console.error('Failed to load TermsOfService page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const CookiePolicy = lazy(() => import("./pages/CookiePolicy").catch(err => {
  console.error('Failed to load CookiePolicy page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Disclaimer = lazy(() => import("./pages/Disclaimer").catch(err => {
  console.error('Failed to load Disclaimer page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Pricing = lazy(() => import("./pages/Pricing").catch(err => {
  console.error('Failed to load Pricing page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Titan10 = lazy(() => import("./pages/Titan10").catch(err => {
  console.error('Failed to load Titan10 page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Portfolio = lazy(() => import("./pages/Portfolio").catch(err => {
  console.error('Failed to load Portfolio page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const AIAnalysis = lazy(() => import("./pages/AIAnalysis").catch(err => {
  console.error('Failed to load AIAnalysis page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const ProfitGuard = lazy(() => import("./pages/ProfitGuard").catch(err => {
  console.error('Failed to load ProfitGuard page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const Calculator = lazy(() => import("./pages/Calculator").catch(err => {
  console.error('Failed to load Calculator page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

const MarketSentiment = lazy(() => import("./pages/MarketSentiment").catch(err => {
  console.error('Failed to load MarketSentiment page:', err);
  return { default: () => <div>Error loading page. Please refresh.</div> };
}));

// Create QueryClient with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
      useErrorBoundary: false, // Handle errors gracefully instead of throwing
    },
  },
});

// Enhanced loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 text-center">
      <div className="relative">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <Skeleton className="h-4 w-32 mx-auto" />
      <p className="text-sm text-muted-foreground">Loading IgniteX...</p>
    </div>
  </div>
);

const App = () => {
  // Log app initialization
  useEffect(() => {
    console.log('IgniteX App initialized successfully');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/titan10" element={<Titan10 />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/ai-analysis" element={<AIAnalysis />} />
                  <Route path="/profit-guard" element={<ProfitGuard />} />
                  <Route path="/calculator" element={<Calculator />} />
                  <Route path="/market-sentiment" element={<MarketSentiment />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
