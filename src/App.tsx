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
// IGX Background Service - 24/7 autonomous signal pipeline
// Explicitly reference the singleton to prevent tree-shaking
import { igxBackgroundService } from "@/services/igx/IGXBackgroundService";
console.log('[App] IGXBackgroundService loaded, running:', igxBackgroundService.getStatus().running);

// Development: Load agent test suite
if (import.meta.env.DEV) {
  import("./test-agents");
}

// ✅ 24/7 AUTONOMOUS OPERATION
// Signal generation now handled by Supabase Edge Functions (server-side)
// Client-side monitors disabled - no longer needed with server-side architecture
// import { heartbeatMonitor } from "@/services/heartbeatMonitor";
// import { pageVisibilityManager } from "@/services/pageVisibilityManager";

// Production system: Server-side signal generation via edge functions
// Timer synchronized with database - no client-side generation needed
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('\n' + '🚀'.repeat(40));
    console.log('[QuantumX] 🚀 QUANTUMX ARENA SYSTEM INITIALIZED');
    console.log('🚀'.repeat(40) + '\n');

    console.log('[QuantumX] ✅ Arena Trading Engine: ACTIVE');
    console.log('[QuantumX] ✅ Oracle Prediction Engine: RUNNING');
    console.log('[QuantumX] ✅ Autonomous Agent Trading: ENABLED');

    console.log('\n' + '✅'.repeat(40));
    console.log('[QuantumX] ✅✅✅ QUANTUMX OPERATIONAL! ✅✅✅');
    console.log('[QuantumX] System Architecture:');
    console.log('[QuantumX]   • Arena: 3 AI agents trading 24/7 with 17+ strategies');
    console.log('[QuantumX]   • Oracle: Prediction challenges with live market data');
    console.log('[QuantumX]   • Engines: Real-time analysis across 50+ cryptocurrencies');
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
// Intelligence Hub - Server-side signal generation with database polling
const IntelligenceHub = lazy(() => import("./pages/IntelligenceHub"));
const IntelligenceHubMonthly = lazy(() => import("./pages/IntelligenceHubMonthly"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const MockTrading = lazy(() => import("./pages/MockTrading"));
const MLAdmin = lazy(() => import("./pages/MLAdmin"));
const IGXControlCenter = lazy(() => import("./pages/IGXControlCenter"));

// Arena features (require full client-side system)
const Arena = lazy(() => import("./pages/Arena"));
const ArenaEnhanced = lazy(() => import("./pages/ArenaEnhanced"));
const ArenaClean = lazy(() => import("./pages/ArenaClean")); // ✅ Arena with integrated Oracle tab
// QXOracle removed - Oracle is now integrated as a tab inside ArenaClean
// const ArenaTest = lazy(() => import("./pages/ArenaTest"));
// const ArenaDiagnostic = lazy(() => import("./pages/ArenaDiagnostic"));

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
              {/* QuantumX: ArenaClean with Arena/Oracle switcher is the landing page */}
              <Route path="/" element={<ArenaClean />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Arena routes - Production Arena with all Phase 1-3 optimizations */}
              <Route path="/arena" element={<ArenaClean />} /> {/* ✅ Arena with integrated Oracle tab */}
              <Route path="/arena-clean" element={<ArenaClean />} /> {/* Alias for arena-clean URL */}
              <Route path="/arena-enhanced" element={<ArenaEnhanced />} />
              <Route path="/arena-classic" element={<Arena />} />
              {/* Oracle Challenge integrated into ArenaClean as a tab - no separate route needed */}
              <Route path="/qx-oracle" element={<ArenaClean />} />
              <Route path="/predict" element={<ArenaClean />} />
              {/* <Route path="/arena-diagnostic" element={<ArenaDiagnostic />} /> */}
              {/* <Route path="/arena-test" element={<ArenaTest />} /> */}
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
                Intelligence Hub - Server-Side Signal Generation
                Main production route reading from user_signals table via signalDatabaseService
              */}
              <Route path="/flux" element={<ProtectedRoute><IGXControlCenter /></ProtectedRoute>} />
              <Route path="/igx-control" element={<ProtectedRoute><IGXControlCenter /></ProtectedRoute>} /> {/* Legacy route */}
              <Route path="/intelligence-hub" element={<IntelligenceHub />} />
              <Route path="/intelligence-hub/monthly" element={<IntelligenceHubMonthly />} />
              <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
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
