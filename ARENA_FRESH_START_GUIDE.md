# Arena Fresh Start Guide

## Problem: Stale Agent Data
- NEXUS has old P&L (~$7,280)
- Agents not updating in real-time
- Old data persisting across refreshes

## Solution: Complete Reset in 3 Steps

### Step 1: Clear Database (Supabase)
1. Go to Supabase SQL Editor
2. Paste and run: `CLEAR_STALE_ARENA_DATA.sql`
3. This will:
   - Delete all agent positions
   - Delete all agent trade history
   - Reset agent balances to $10,000
   - Set all metrics to 0

### Step 2: Clear Browser Caches
1. Open browser console (F12)
2. Navigate to `http://localhost:8080/arena`
3. Paste and run: `CLEAR_BROWSER_CACHE.js`
4. This will:
   - Clear localStorage cache
   - Clear React Query cache
   - Clear sessionStorage

### Step 3: Hard Refresh
1. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. This clears browser cache and reloads

## What's Fixed:

### Ultra-Fast Loading:
- ✅ **React Query caching** - Instant display from cache
- ✅ **localStorage persistence** - Agents load WITH the page
- ✅ **Parallel initialization** - Hub + Arena start simultaneously
- ✅ **Skeleton loading** - No more blank screens
- ✅ **Smart loading state** - Only shows loading if NO agents

### Real-Time Updates (Every Second):
- ✅ **P&L %** - Updates from `unrealized_pnl_percent`
- ✅ **Profit/Loss $** - Updates from `unrealized_pnl`
- ✅ **Current Price** - Fresh Binance prices every second
- ✅ **Total P&L** - Calculated from balance + unrealized
- ✅ **Win Rate** - From trading history
- ✅ **Total Trades** - From account stats
- ✅ **Portfolio Value** - balance + all unrealized P&L

### Data Persistence:
- ✅ **Supabase storage** - All data in database
- ✅ **localStorage cache** - Fast page loads
- ✅ **No resets on refresh** - Data persists

## Performance Specs:

- **Initial Load**: < 100ms (from cache)
- **Backend Sync**: < 500ms (parallel init)
- **Update Frequency**: 500ms (UI) / 1s (Backend)
- **Price Updates**: Real-time from Binance
- **Cache Validity**: 60 seconds

## How to Verify Fresh Start:

After following steps 1-3:

1. All agents should show:
   - Balance: $10,000.00
   - Total P&L: 0.0%
   - Trades: 0
   - Win Rate: 0%
   - No active positions

2. Metrics should update every second

3. Page loads instantly (< 100ms)

## Next Steps:

1. Start Intelligence Hub to generate signals
2. Agents will automatically trade top 3 signals
3. Watch metrics update in real-time
4. All data persists across refreshes

---

**Note**: Run these cleanup steps whenever you see stale data or old metrics.
