# Technology Stack

## Programming Languages
- **TypeScript 5.5.3**: Primary language for type-safe development
- **JavaScript (ES2015+)**: Build target for browser compatibility
- **SQL**: Database migrations and queries

## Frontend Framework & Libraries

### Core Framework
- **React 18.3.1**: UI library with functional components and hooks
- **React DOM 18.3.1**: React renderer for web
- **React Router DOM 6.26.2**: Client-side routing with protected routes

### Build Tools
- **Vite 5.4.1**: Fast build tool and dev server
- **@vitejs/plugin-react-swc 3.5.0**: React plugin with SWC compiler for faster builds
- **TypeScript 5.5.3**: Type checking and compilation

### UI Component Library
- **shadcn-ui**: Radix UI-based component system
  - @radix-ui/react-dialog, dropdown-menu, tabs, toast, select, etc.
  - Fully accessible, customizable components
- **Tailwind CSS 3.4.11**: Utility-first CSS framework
- **tailwindcss-animate 1.0.7**: Animation utilities
- **Lucide React 0.462.0**: Icon library

### State Management & Data Fetching
- **@tanstack/react-query 5.56.2**: Server state management with caching
- **@supabase/supabase-js 2.53.0**: Supabase client for backend communication
- **React Hook Form 7.53.0**: Form state management
- **Zod 3.23.8**: Schema validation

### Charts & Visualization
- **Recharts 2.12.7**: Composable charting library
- **Lightweight Charts 5.0.9**: TradingView-style financial charts
- **react-window 2.2.1**: Virtual scrolling for large lists

### UI Enhancement
- **next-themes 0.3.0**: Dark mode support
- **Sonner 1.5.0**: Toast notifications
- **date-fns 3.6.0**: Date manipulation
- **class-variance-authority 0.7.1**: Component variant management
- **clsx 2.1.1** & **tailwind-merge 2.5.2**: Conditional class merging

### PWA & Performance
- **vite-plugin-pwa 1.1.0**: Progressive Web App support
- **workbox-window 7.3.0**: Service worker management
- **vite-plugin-compression2 2.3.0**: Brotli and Gzip compression
- **web-vitals 5.1.0**: Performance monitoring
- **@vercel/analytics 1.5.0**: Analytics integration

## Backend Technologies

### Platform
- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database with Row Level Security
  - Edge Functions (Deno runtime)
  - Real-time subscriptions
  - Authentication & authorization

### Edge Functions Runtime
- **Deno**: Secure TypeScript/JavaScript runtime for serverless functions

### AI Integration
- **Claude AI (Anthropic)**:
  - Claude Haiku 4: Fast, cost-effective for simple tasks
  - Claude Sonnet 4.5: Advanced reasoning for complex analysis
  - Prompt caching for 90% cost savings on cache hits

## External APIs & Data Sources

### Cryptocurrency Data
- **CoinGecko API**: Primary crypto market data (prices, market cap, volume)
- **Binance API**: Real-time WebSocket price feeds, order book data
- **Hyperliquid API**: Perpetual futures data
- **Solana RPC**: On-chain Solana data

### Market Data
- **ETF Flow Data**: Institutional Bitcoin/Ethereum ETF tracking
- **Funding Rate APIs**: Perpetual futures funding rates

## Development Tools

### Code Quality
- **ESLint 9.9.0**: JavaScript/TypeScript linting
- **@eslint/js**: ESLint JavaScript rules
- **eslint-plugin-react-hooks**: React hooks linting
- **typescript-eslint 8.0.1**: TypeScript-specific linting

### Development Dependencies
- **@types/node 22.5.5**: Node.js type definitions
- **@types/react 18.3.3**: React type definitions
- **@types/react-dom 18.3.0**: React DOM type definitions
- **autoprefixer 10.4.20**: CSS vendor prefixing
- **postcss 8.4.47**: CSS transformation
- **lovable-tagger 1.1.7**: Development component tagging

### Package Management
- **npm**: Primary package manager
- **bun.lockb**: Bun lockfile present (alternative runtime support)

## Database

### PostgreSQL (via Supabase)
- **Tables**: portfolio_holdings, profit_guard_positions, crypto_reports, feedback_responses, intelligence_signals, rejected_signals, historical_trading_data
- **Indexes**: Performance indexes on user_id, coin_id, created_at, status columns
- **RLS Policies**: Row-level security for multi-tenant data isolation

## Deployment & Hosting

### Frontend Hosting
- **Netlify**: Primary hosting platform
  - Configured via netlify.toml
  - Custom redirects and headers
- **Vercel**: Alternative hosting (vercel.json present)

### Backend Hosting
- **Supabase Cloud**: Managed PostgreSQL and Edge Functions

### CDN & Performance
- **CloudFlare** (planned): CDN, caching, and DDoS protection

## Development Commands

### Local Development
```bash
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Supabase Functions
```bash
supabase functions deploy <function-name>  # Deploy edge function
supabase functions serve                   # Local function testing
```

## Build Configuration

### Vite Configuration
- **Code Splitting**: Manual chunks for react, query, ui, chart vendors
- **Compression**: Brotli and Gzip for production
- **Minification**: esbuild with console/debugger removal in production
- **Source Maps**: Disabled in production for smaller bundles
- **PWA**: Service worker with offline caching strategies

### TypeScript Configuration
- **Strict Mode**: Enabled for type safety
- **Target**: ES2015+ for modern browsers
- **Module**: ESNext with bundler resolution
- **Path Aliases**: @ mapped to ./src

### Tailwind Configuration
- **Plugins**: @tailwindcss/typography, tailwindcss-animate
- **Theme**: Custom color palette with CSS variables
- **Dark Mode**: Class-based dark mode support

## Performance Optimizations
- Virtual scrolling for large lists (90% DOM reduction)
- Request deduplication (eliminates duplicate API calls)
- Database indexes (3-10x query speedup)
- PWA caching (offline support, faster loads)
- Image optimization (WebP format, lazy loading)
- Code splitting (smaller initial bundle)
- Brotli/Gzip compression (70% bandwidth savings)
