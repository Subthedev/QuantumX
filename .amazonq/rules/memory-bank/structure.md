# Project Structure

## Directory Organization

### `/src` - Frontend Application
Main React application source code with TypeScript.

#### `/src/components` - React Components
- **`/analysis`**: AI analysis and technical analysis components
- **`/charts`**: Chart visualization components (TradingView-style charts)
- **`/onchain`**: On-chain data visualization components
- **`/portfolio`**: Portfolio management UI components
- **`/profit-guard`**: Profit guard position tracking components
- **`/trading`**: Trading signals and order book components
- **`/ui`**: Reusable shadcn-ui components (buttons, dialogs, cards, etc.)
- Root-level components: CryptoTable, VirtualCryptoTable, AppHeader, ErrorBoundary

#### `/src/pages` - Route Pages
Main application pages including Dashboard, Portfolio, AIAnalysis, IntelligenceHub, ProfitGuard, ETFFlows, FundingRates, OnChainAnalysis, OrderBook, Auth, and legal pages.

#### `/src/services` - Business Logic
Core services for data fetching, processing, and analysis:
- **`/adaptive`**: Adaptive market matching and scanning strategies
- **`/cache`**: Caching mechanisms for performance
- **`/dataStreams`**: Real-time data stream management
- **`/exchanges`**: Exchange-specific integrations (Binance, Hyperliquid)
- **`/igx`**: IGX (IgniteX) data engine versions (V3, V4, V4Enhanced)
- **`/patterns`**: Pattern detection algorithms
- **`/quality`**: Signal quality filtering and validation
- **`/regime`**: Market regime detection
- **`/strategies`**: Trading strategy implementations (Alpha, Beta, Gamma, Delta, Zeta)
- Root services: cryptoDataService, etfDataService, fundingRateService, globalHubService, intelligenceHub, orderBookService, technicalAnalysis, etc.

#### `/src/hooks` - Custom React Hooks
Reusable hooks: useAuth, useBinancePrices, useAIAnalysis, useOrderBook, useRealtimePortfolio, usePlatformMetrics, useSignalValidation, etc.

#### `/src/integrations` - External Integrations
- **`/supabase`**: Supabase client configuration and type definitions

#### `/src/types` - TypeScript Types
Type definitions for crypto data, charts, on-chain data, and IGX enhanced types.

#### `/src/utils` - Utility Functions
Helper functions for performance monitoring, data flow diagnostics, pipeline verification, and web vitals.

#### `/src/lib` - Shared Libraries
Utility libraries for authentication errors, password validation, and general utilities.

#### `/src/schemas` - Validation Schemas
Zod schemas for data validation (analysis schemas).

### `/supabase` - Backend Services

#### `/supabase/functions` - Edge Functions
Serverless functions deployed to Supabase:
- **`/_shared`**: Shared utilities (claude-optimizer for AI cost optimization)
- **`/ai-analysis`**: AI-powered market analysis endpoint
- **`/binance-orderbook`**: Binance order book data fetching
- **`/binance-websocket`**: Real-time price updates via WebSocket
- **`/crypto-ohlc`**: OHLC (candlestick) data endpoint
- **`/crypto-proxy`**: Proxy for crypto API calls
- **`/generate-crypto-report`**: Automated report generation
- **`/market-indices`**: Market indices data
- **`/profit-guard-analysis`**: Profit guard position analysis
- **`/test-api-key`**: API key validation

#### `/supabase/migrations` - Database Migrations
SQL migration files for database schema changes including intelligence signals, signal logging, rejected signals, historical trading data, and performance indexes.

### `/public` - Static Assets
- **`/images`**: Image assets including member photos
- **`/lovable-uploads`**: User-uploaded content
- Static files: favicon, manifest.json, robots.txt, sitemap.xml, .htaccess, _redirects

### `/dev-dist` - Development Build
Service worker and Workbox files for PWA functionality.

## Core Components and Relationships

### Data Flow Architecture
```
External APIs (CoinGecko, Binance, etc.)
    ↓
Supabase Edge Functions (binance-websocket, crypto-proxy)
    ↓
Frontend Services (cryptoDataService, globalHubService)
    ↓
React Hooks (useBinancePrices, useAIAnalysis)
    ↓
React Components (CryptoTable, AIAnalysisDashboard)
    ↓
User Interface
```

### IGX Data Engine Pipeline
```
Raw Market Data
    ↓
IGXDataEngineV4Enhanced (data aggregation)
    ↓
Strategy Engines (Alpha, Beta, Gamma, Delta, Zeta)
    ↓
Delta V2 Quality Engine (signal validation)
    ↓
Signal Persistence (database storage)
    ↓
Intelligence Hub (UI display)
```

### Real-time Data Flow
```
Binance WebSocket → Edge Function → useBinancePrices Hook → CryptoTable Component
CoinGecko API → cryptoDataService (with caching) → React Query → UI Components
```

## Architectural Patterns

### Frontend Architecture
- **Component-Based**: React functional components with hooks
- **State Management**: React Query for server state, React Context for auth
- **Routing**: React Router v6 with protected routes
- **Styling**: Tailwind CSS with shadcn-ui component library
- **Type Safety**: TypeScript with strict mode enabled

### Backend Architecture
- **Serverless**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL via Supabase with RLS (Row Level Security)
- **Real-time**: WebSocket connections for live data
- **Caching**: Multi-layer caching (in-memory, React Query, service worker)

### Performance Patterns
- **Virtual Scrolling**: react-window for large lists (VirtualCryptoTable)
- **Request Deduplication**: Prevent concurrent duplicate API calls
- **Code Splitting**: Manual chunks for vendor libraries
- **PWA Caching**: Service worker with Workbox for offline support
- **Image Optimization**: WebP format with lazy loading

### Data Patterns
- **Service Layer**: Centralized data fetching and business logic
- **Hook Abstraction**: Custom hooks for component-service communication
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Error boundaries and graceful degradation

### AI Integration Pattern
- **Smart Routing**: Haiku 4 for simple tasks, Sonnet 4.5 for complex analysis
- **Prompt Optimization**: 70% prompt compression with caching
- **Cost Management**: 83% cost reduction through optimization
