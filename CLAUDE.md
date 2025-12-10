# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuantumX Oracle Challenge is an AI-powered crypto prediction market where users make predictions across 48 daily questions, earn QX tokens, and compete on leaderboards. The application features three prediction tiers (AGENTIC, MARKET, AGENTS_VS_MARKET) with progressive difficulty levels.

**Live Site:** https://quantumx.org.in

## Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server on port 8080
npm run preview      # Preview production build locally
```

### Building
```bash
npm run build        # Production build (minified, optimized)
npm run build:dev    # Development build (with source maps)
```

### Linting
```bash
npm run lint         # Run ESLint on all files
```

## Architecture Overview

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI Framework:** Tailwind CSS + shadcn/ui (Radix UI primitives)
- **State Management:** TanStack React Query
- **Backend:** Supabase (Auth, Database, Real-time)
- **Charts:** Recharts, lightweight-charts
- **Build Optimization:** vite-plugin-compression2, manual chunking

### Core Architecture Layers

#### 1. Services Layer (`src/services/`)
Business logic and data operations, independent of React:

- **oracleQuestionEngine.ts** - Question generation engine with 48-slot progressive difficulty system
- **qxQuestionService.ts** - Question lifecycle management, slot timing, daily generation
- **qxPredictionService.ts** - Prediction submission, validation, odds calculation
- **qxBalanceService.ts** - QX token balance, leaderboard, global stats

#### 2. Hooks Layer (`src/hooks/`)
React integration for services:

- **useAuth.tsx** - Supabase authentication wrapper with AuthProvider
- **useQXOracle.ts** - Main hook exposing Oracle state and actions
  - Manages real-time data synchronization
  - Provides `makePrediction()`, `refreshBalance()`, `refreshQuestions()`
  - Auto-refreshes questions every 30 seconds
  - Tracks countdowns, slots, leaderboard

#### 3. Pages Layer (`src/pages/`)
- **QXOracle.tsx** - Main prediction market interface (single-page app)

#### 4. Components Layer (`src/components/`)
Organized by feature domains:
- `analysis/` - Technical, fundamental, sentiment analysis cards
- `arena/` - Agent cards, competition leaderboard, prediction panels
- `charts/` - Trading charts, sparklines, depth charts
- `hub/` - Premium signals, quota management
- `portfolio/` - Holdings management, insights
- `trading/` - Order books, arbitrage, risk management
- `ui/` - shadcn/ui components (button, card, dialog, etc.)

### Key Data Flow

1. **Question Generation:** `oracleQuestionEngine` generates 48 daily questions across 3 tiers
2. **Lifecycle Management:** `qxQuestionService` handles slot-based timing (30-min intervals)
3. **User Actions:** `useQXOracle` hook → `qxPredictionService` → Supabase
4. **Real-time Updates:** React Query + 30s polling for questions, 10s for live odds

### Database Schema (Supabase)

Key tables in `src/integrations/supabase/types.ts`:
- **qx_balances** - User QX token balances
- **qx_predictions** - User prediction records
- **qx_questions** - Daily prediction questions
- **qx_leaderboard** - Competition rankings
- **qx_phases** - Challenge phases and reward pools

### Path Aliases

TypeScript path mapping configured in `tsconfig.json`:
```typescript
"@/*" → "./src/*"
```

Use `@/components/...`, `@/services/...`, etc. in imports.

### Build Configuration

The build is heavily optimized for production in `vite.config.ts`:
- **Manual Chunking:** Splits vendors (react, query, ui, charts) for caching
- **Compression:** Brotli + Gzip compression in production
- **Console Logs:** Preserved in production (required for system status visibility)
- **PWA:** Currently disabled for Vercel compatibility (see comments in vite.config.ts)

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** Hardcoded values exist in `src/integrations/supabase/client.ts` for development.

## Important Patterns

### Oracle Question System

The prediction system operates on a **48-slot progressive difficulty model**:

**Tiers:**
- **AGENTIC (Slots 1-16):** Agent trading fundamentals - beginner-friendly
- **MARKET (Slots 17-32):** Market analysis concepts - intermediate
- **AGENTS_VS_MARKET (Slots 33-48):** Advanced comparative analysis - expert

**Slot Timing:**
- Questions open every 30 minutes
- Each slot has specific open/close/resolve times
- Auto-generated daily by `qxQuestionService.generateDailyQuestions()`

**Live Hints:**
- 2 static hints (boxes 1-2)
- 2 live-updating metrics (boxes 3-4, refresh every second)
- Live hints use `_tick` counter to force React re-renders

### Prediction Rewards

Rewards calculated in `qxPredictionService`:
- **Base Reward:** Varies by difficulty (EASY: 10-50, MEDIUM: 50-100, HARD: 100-200)
- **Streak Multiplier:** Up to 5x for 10+ prediction streaks
- **Early Bird Bonus:** Up to 50% extra for first 10 predictions
- **Total Potential:** `baseReward × streakMultiplier + earlyBirdBonus`

### TypeScript Configuration

Relaxed TypeScript settings for rapid development:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`

When refactoring, be mindful these are intentionally relaxed.

## Component Patterns

### shadcn/ui Usage

Components in `src/components/ui/` are from shadcn/ui library. To add new components:
```bash
npx shadcn@latest add [component-name]
```

Customize via Tailwind CSS variables in `src/index.css`.

### State Management with React Query

Query client configured in `App.tsx`:
- **Stale Time:** 1 minute
- **GC Time:** 5 minutes
- **Retry:** 1 attempt
- **Refetch on Window Focus:** Disabled

Services use plain async functions; hooks wrap them with React Query where needed.

## Deployment

**Target Platform:** Vercel

Build command: `npm run build`

Notes:
- PWA plugin currently disabled in `vite.config.ts` to avoid Vercel build issues
- Build artifacts output to `dist/`
- Production builds drop debugger statements but keep console.log for monitoring

## Recent Changes

From git history:
- PWA plugin disabled for Vercel compatibility
- Added `tsconfig.app.json` to fix build errors
- Initial Oracle prediction system implemented
