# QuantumX Oracle Challenge

**AI-Powered Crypto Prediction Market**

Make accurate predictions, earn QX tokens, and compete on the leaderboard!

## Features

- **48 Daily Questions** across 3 tiers:
  - AGENTIC: AI Agent predictions
  - MARKET: Market movements and trends
  - AGENTS_VS_MARKET: AI vs Human predictions

- **Live Hint System**:
  - 2 static hints per question
  - 2 live-updating metrics that refresh every second

- **Earn QX Tokens**:
  - Correct predictions earn base rewards
  - Streak multipliers (up to 5x for 10+ streak)
  - Early bird bonuses (up to 50% for first 10 predictions)

- **Leaderboard Competition**:
  - Global rankings
  - Track accuracy and total earnings
  - See recent wins

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database)
- **State**: TanStack React Query

## Deployment

```bash
npm install
npm run build
```

## Environment Variables

Required variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Live Site

Visit: [quantumx.org.in](https://quantumx.org.in)
