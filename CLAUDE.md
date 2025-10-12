# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IgniteX is a cryptocurrency analysis platform built with React, TypeScript, Vite, and Supabase. The application provides AI-powered crypto trading signals, portfolio management, profit guard features, and comprehensive market analysis tools.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- UI: shadcn/ui (Radix UI components) + Tailwind CSS
- State Management: TanStack React Query
- Backend: Supabase (Auth, Database, Edge Functions)
- Charts: Recharts, Lightweight Charts
- Routing: React Router v6

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://[::]:8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Application Structure

**Entry Point & Routing:**
- [main.tsx](src/main.tsx) - React root render
- [App.tsx](src/App.tsx) - Main app component with:
  - React Query client configuration (1min staleTime, 5min gcTime)
  - All routes configured with lazy loading for performance
  - Global providers: QueryClientProvider, TooltipProvider, AuthProvider, BrowserRouter

**Route Patterns:**
- All pages in [src/pages/](src/pages/) are lazy-loaded via `React.lazy()`
- **CRITICAL:** New routes must be added to [App.tsx](src/App.tsx) ABOVE the catch-all `*` route
- PageLoader skeleton component provides loading states
- Protected routes use `<ProtectedRoute>` wrapper component

### Authentication Flow

- Implemented via [useAuth.tsx](src/hooks/useAuth.tsx) hook and AuthContext
- Supabase auth with implicit flow, session persistence in localStorage
- AuthProvider wraps entire app in [App.tsx](src/App.tsx)
- Auth state: `user`, `session`, `loading`, `signUp()`, `signIn()`, `signOut()`, `resetPassword()`, `updatePassword()`, `resendVerificationEmail()`
- **Email Verification:** All email redirects use production URL `https://ignitexagency.com` to ensure mobile compatibility
- Supabase client: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)

### Data Services Layer

**CryptoDataService** ([src/services/cryptoDataService.ts](src/services/cryptoDataService.ts)):
- Fetches crypto data from CoinGecko API (free tier, no API key required)
- Built-in caching (60s duration) with Map-based cache
- **Automatically filters out stablecoins** (USDT, USDC, DAI, BUSD, TUSD, USDP, GUSD, FRAX, USDD, PAXG, XAUT)
- Methods: `getTopCryptos(limit)`, `getCryptoDetails(coinId)`
- Utility methods: `formatNumber()`, `formatPercentage()`

**EnhancedCryptoDataService** ([src/services/enhancedCryptoDataService.ts](src/services/enhancedCryptoDataService.ts)):
- Extended crypto data with advanced analytics

**MarketIndicesService** ([src/services/marketIndicesService.ts](src/services/marketIndicesService.ts)):
- Provides market sentiment indices and data

**OHLCDataService** ([src/services/ohlcDataService.ts](src/services/ohlcDataService.ts)):
- Provides OHLC (Open, High, Low, Close) candlestick data for charts

### Supabase Integration

**Database Tables** (from [types.ts](src/integrations/supabase/types.ts)):
- `crypto_reports` - AI-generated crypto analysis reports
- `feedback_responses` - User feedback collection
- `portfolio_holdings` - Portfolio cryptocurrency holdings
- `profit_guard_positions` - Profit guard tracking positions
- All tables have user_id foreign keys for multi-tenancy

**Edge Functions** ([supabase/functions/](supabase/functions/)):
- `ai-analysis` - AI-powered crypto analysis
- `generate-crypto-report` - Generate crypto reports
- `profit-guard-analysis` - Profit guard recommendations
- `market-indices` - Market sentiment data
- `crypto-ohlc` - OHLC candlestick data

**Database Access Pattern:**
- Import supabase client: `import { supabase } from '@/integrations/supabase/client'`
- Use TypeScript types: `import type { Database } from '@/integrations/supabase/types'`
- Always filter by `user_id` for user-specific data

### Key Features & Pages

**Dashboard** ([src/pages/Dashboard.tsx](src/pages/Dashboard.tsx)):
- Main crypto signals dashboard
- Fetches and displays crypto_reports from Supabase
- Shows CryptoTable and Titan10Section components
- SEO optimized with dynamic meta tags

**Titan10** ([src/pages/Titan10.tsx](src/pages/Titan10.tsx)):
- Premium crypto picks feature
- Displays top 10 cryptocurrency recommendations
- Integrates with cryptoDataService for live prices

**Portfolio** ([src/pages/Portfolio.tsx](src/pages/Portfolio.tsx)):
- User portfolio management
- CRUD operations on portfolio_holdings table
- Real-time price updates via cryptoDataService
- Profit/loss calculations and visualizations
- Integrates ProfitGuard recommendations

**Profit Guard** ([src/pages/ProfitGuard.tsx](src/pages/ProfitGuard.tsx)):
- Risk management tool for taking profits
- Tracks profit levels and triggers
- AI-powered profit-taking recommendations
- Uses profit_guard_positions table

**AI Analysis** ([src/pages/AIAnalysis.tsx](src/pages/AIAnalysis.tsx)):
- Comprehensive AI-powered crypto analysis
- Technical, fundamental, sentiment, on-chain, and ETF analysis sections
- Uses [supabase/functions/ai-analysis/](supabase/functions/ai-analysis/)

**Market Sentiment** ([src/pages/MarketSentiment.tsx](src/pages/MarketSentiment.tsx)):
- Market-wide sentiment indicators and indices

### Component Organization

**UI Components** ([src/components/ui/](src/components/ui/)):
- shadcn/ui components with Tailwind styling
- Custom crypto logos: btc-logo.tsx, eth-logo.tsx, sol-logo.tsx, etc.
- Use `@/components/ui/*` imports (path alias configured)

**Feature Components** ([src/components/](src/components/)):
- CryptoTable.tsx - Main crypto data table
- CryptoDetailsModal.tsx - Detailed crypto modal
- CryptoReport.tsx - Individual crypto report display
- Titan10Section.tsx - Titan picks section
- Analysis components in [src/components/analysis/](src/components/analysis/)
- Chart components in [src/components/charts/](src/components/charts/)
- Portfolio components in [src/components/portfolio/](src/components/portfolio/)
- Profit guard components in [src/components/profit-guard/](src/components/profit-guard/)

### Performance Optimizations

**Build Configuration** ([vite.config.ts](vite.config.ts)):
- Manual code splitting: react-vendor, query-vendor, ui-vendor, chart-vendor, utils chunks
- Source maps: hidden in production, enabled in dev
- Component tagger (lovable-tagger) enabled in development only
- Development server on port 8080 with IPv6 support (`::`)
- esbuild for faster minification
- optimizeDeps includes frequently used packages

**React Query Optimization:**
- staleTime: 60s (reduce refetches)
- gcTime: 5 minutes (cache cleanup)
- refetchOnWindowFocus: false
- retry: 1 (fail faster)

**Image Optimization:**
- LazyImage and OptimizedImage components available in [src/components/](src/components/)
- Use for crypto logos and graphics

**Route-Level Code Splitting:**
- All pages lazy loaded
- Suspense boundaries with skeleton loaders (PageLoader)

### Styling System

**Tailwind Configuration** ([tailwind.config.ts](tailwind.config.ts)):
- Dark mode: class-based
- Custom theme extensions:
  - Primary colors with hover, light, glow variants
  - Sidebar color system
  - Custom border radius variables
  - Accordion animations

**Global Styles:**
- CSS variables for theming in [src/index.css](src/index.css)
- Use HSL color format: `hsl(var(--primary))`

### TypeScript Configuration

- Base path alias: `@/*` → `./src/*`
- Relaxed strict mode (noImplicitAny: false, strictNullChecks: false, noUnusedLocals: false, noUnusedParameters: false)
- Allows JS files for gradual migration
- skipLibCheck: true

## Important Patterns

### Adding New Routes
1. Create page component in [src/pages/](src/pages/)
2. Add lazy import in [App.tsx](src/App.tsx): `const NewPage = lazy(() => import("./pages/NewPage"))`
3. Add route BEFORE the `*` catch-all route:
   - For public routes: `<Route path="/new-page" element={<NewPage />} />`
   - For protected routes: `<Route path="/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />`

### Fetching Crypto Data
```typescript
import { cryptoDataService } from '@/services/cryptoDataService';

// Get top cryptos (automatically filters stablecoins)
const cryptos = await cryptoDataService.getTopCryptos(100);

// Get specific crypto details
const details = await cryptoDataService.getCryptoDetails('bitcoin');
```

### Database Queries
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const { user } = useAuth();

// Fetch with auth context - always filter by user_id
const { data, error } = await supabase
  .from('portfolio_holdings')
  .select('*')
  .eq('user_id', user.id);
```

### Using React Query
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['crypto-data'],
  queryFn: () => cryptoDataService.getTopCryptos(100),
});
```

### Authentication Guards
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, loading, signOut } = useAuth();

// Redirect if not authenticated
useEffect(() => {
  if (!loading && !user) {
    navigate('/auth');
  }
}, [user, loading]);
```

## File Naming Conventions

- React components: PascalCase (e.g., CryptoTable.tsx)
- Hooks: camelCase with 'use' prefix (e.g., useAuth.tsx)
- Services: camelCase with 'Service' suffix (e.g., cryptoDataService.ts)
- Utilities: camelCase (e.g., utils.ts)
- Pages: PascalCase matching route name

## Deployment

This project is deployed via Lovable platform:
- Project URL: https://lovable.dev/projects/57d6bca7-49bd-403e-926e-e0201d02729c
- Changes via Lovable are auto-committed to this repo
- Manual pushes to this repo reflect in Lovable
- Deploy via Lovable: Share → Publish
- Production URL: https://ignitexagency.com

## External APIs

**CoinGecko API:**
- Base URL: `https://api.coingecko.com/api/v3`
- No API key required (free tier)
- Rate limits apply - cryptoDataService has built-in caching
- Primary endpoints: `/coins/markets`, `/coins/{id}`
