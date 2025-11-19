import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
// Analytics removed to fix loading issues
// V2 Real-Time Engine removed - now using V3 Adaptive System in IntelligenceHubAuto page

// Import IGX background service for 24/7 autonomous operation
// Service auto-starts on import and runs independently of page navigation
// ENABLED - PHASE 1-4 PIPELINE AUTO-STARTS
import "@/services/igx/IGXBackgroundService";

// ✅ 24/7 AUTONOMOUS OPERATION MONITORS
// These services ensure continuous, uninterrupted operation with zero manual intervention
import { heartbeatMonitor } from "@/services/heartbeatMonitor";
import { pageVisibilityManager } from "@/services/pageVisibilityManager";

// Auto-start monitors for production-grade 24/7 operation
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('\n' + '🚀'.repeat(40));
    console.log('[App] 🚀 INITIALIZING 24/7 AUTONOMOUS OPERATION MONITORS...');
    console.log('🚀'.repeat(40) + '\n');

    // Start heartbeat monitor for auto-restart
    heartbeatMonitor.start();
    console.log('[App] ✅ Heartbeat Monitor: ACTIVE');

    // Start page visibility manager to prevent throttling
    pageVisibilityManager.start();
    console.log('[App] ✅ Page Visibility Manager: ACTIVE');

    console.log('\n' + '✅'.repeat(40));
    console.log('[App] ✅✅✅ ALL MONITORS OPERATIONAL! ✅✅✅');
    console.log('[App] System Status:');
    console.log('[App]   • Auto-restart: ENABLED (every 5s check)');
    console.log('[App]   • Timer protection: ENABLED (prevents throttling)');
    console.log('[App]   • Supabase reconnection: READY (will activate on first subscription)');
    console.log('[App] 🔧 Debug commands:');
    console.log('[App]   • heartbeatMonitor.getStats()');
    console.log('[App]   • pageVisibilityManager.getStats()');
    console.log('[App]   • supabaseReconnectionManager.getAllStats()');
    console.log('✅'.repeat(40) + '\n');
  }, 500); // Short delay to ensure DOM is ready
}

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const EmailVerified = lazy(() => import("./pages/EmailVerified"));
const Titan10 = lazy(() => import("./pages/Titan10"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const AIAnalysis = lazy(() => import("./pages/AIAnalysis"));
const ProfitGuard = lazy(() => import("./pages/ProfitGuard"));
const Calculator = lazy(() => import("./pages/Calculator"));
const MarketSentiment = lazy(() => import("./pages/MarketSentiment"));
const ETFFlows = lazy(() => import("./pages/ETFFlows"));
const OnChainAnalysis = lazy(() => import("./pages/OnChainAnalysis"));
const FundingRates = lazy(() => import("./pages/FundingRates"));
const OrderBook = lazy(() => import("./pages/OrderBook"));
const IntelligenceHub = lazy(() => import("./pages/IntelligenceHub"));
const IntelligenceHubV3 = lazy(() => import("./pages/IntelligenceHubV3"));
const IntelligenceHubAuto = lazy(() => import("./pages/IntelligenceHubAuto"));
const IntelligenceHubMonthly = lazy(() => import("./pages/IntelligenceHubMonthly"));
const IntelligenceHubTiered = lazy(() => import("./pages/IntelligenceHubTiered"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const PipelineMonitor = lazy(() => import("./pages/PipelineMonitor"));
const IGXTestRunner = lazy(() => import("./pages/IGXTestRunner"));
const BetaV5Test = lazy(() => import("./pages/BetaV5Test"));
const MockTrading = lazy(() => import("./pages/MockTrading"));
const MLAdmin = lazy(() => import("./pages/MLAdmin"));
const Arena = lazy(() => import("./pages/Arena"));
const ArenaEnhanced = lazy(() => import("./pages/ArenaEnhanced"));
const ArenaTest = lazy(() => import("./pages/ArenaTest"));
const ArenaDiagnostic = lazy(() => import("./pages/ArenaDiagnostic"));
const IGXControlCenter = lazy(() => import("./pages/IGXControlCenter"));

// Production-grade React Query configuration with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh longer
      gcTime: 60 * 60 * 1000, // 1 hour - cache persists in memory
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      refetchOnReconnect: true, // Refetch on reconnect
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 text-center">
      <Skeleton className="h-12 w-12 rounded-full mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  </div>
);

const App = () => {
  // V2 Real-Time Engine initialization removed
  // V3 Adaptive Monitoring System now starts automatically in IntelligenceHubAuto page
  // This prevents dual-system conflicts and ensures clean production operation

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/arena" element={<ArenaEnhanced />} />
              <Route path="/arena-diagnostic" element={<ArenaDiagnostic />} />
              <Route path="/arena-test" element={<ArenaTest />} />
              <Route path="/arena-classic" element={<Arena />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/email-verified" element={<EmailVerified />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/pricing" element={<Pricing />} />

              {/* Protected routes - require authentication */}
              <Route path="/titan10" element={<ProtectedRoute><Titan10 /></ProtectedRoute>} />
              <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
              <Route path="/ai-analysis" element={<ProtectedRoute><AIAnalysis /></ProtectedRoute>} />
              <Route path="/profit-guard" element={<ProtectedRoute><ProfitGuard /></ProtectedRoute>} />
              <Route path="/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
              <Route path="/market-sentiment" element={<ProtectedRoute><MarketSentiment /></ProtectedRoute>} />
              <Route path="/etf-flows" element={<ProtectedRoute><ETFFlows /></ProtectedRoute>} />
              <Route path="/onchain-analysis" element={<ProtectedRoute><OnChainAnalysis /></ProtectedRoute>} />
              <Route path="/funding-rates" element={<ProtectedRoute><FundingRates /></ProtectedRoute>} />
              <Route path="/orderbook" element={<ProtectedRoute><OrderBook /></ProtectedRoute>} />

              {/*
                Intelligence Hub Routes - DEV CONTROL CENTER
                These routes are accessible via direct URL for development/monitoring
                Not advertised publicly - Arena shows real-time metrics from Intelligence Hub
                Access via: /intelligence-hub, /intelligence-hub-v3, /intelligence-hub-auto
              */}
              <Route path="/igx-control" element={<ProtectedRoute><IGXControlCenter /></ProtectedRoute>} />
              <Route path="/intelligence-hub/monthly" element={<ProtectedRoute><IntelligenceHubMonthly /></ProtectedRoute>} />
              <Route path="/intelligence-hub" element={<ProtectedRoute><IntelligenceHub /></ProtectedRoute>} />
              <Route path="/intelligence-hub-v3" element={<ProtectedRoute><IntelligenceHubV3 /></ProtectedRoute>} />
              <Route path="/intelligence-hub-auto" element={<ProtectedRoute><IntelligenceHubAuto /></ProtectedRoute>} />
              <Route path="/intelligence-hub-tiered" element={<ProtectedRoute><IntelligenceHubTiered /></ProtectedRoute>} />
              <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
              <Route path="/pipeline-monitor" element={<ProtectedRoute><PipelineMonitor /></ProtectedRoute>} />
              <Route path="/igx-test-runner" element={<IGXTestRunner />} />
              <Route path="/beta-v5-test" element={<BetaV5Test />} />
              <Route path="/mock-trading" element={<ProtectedRoute><MockTrading /></ProtectedRoute>} />
              <Route path="/ml-admin" element={<ProtectedRoute><MLAdmin /></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
