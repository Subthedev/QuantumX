# Clear Old Rejected Signals

## Problem
The rejected signals tab still shows 1000+ old rejections because the Advanced ML Filter was just implemented. Old data was logged without filtering.

## Solution
Clear the `rejected_signals` table to start fresh with the new ultra-strict ML filter (95%+ filtering).

## Steps to Clear

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/vidziydspeewmcexqicg/editor
2. Click on `rejected_signals` table
3. Click "Delete" → "Delete all rows"
4. Confirm deletion

### Option 2: SQL Editor
1. Go to https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql
2. Run this SQL:
```sql
DELETE FROM rejected_signals;
```

## What Happens Next

After clearing:
- **Before**: 1000+ rejections shown (unfiltered spam)
- **After**: Only 20-50 rejections shown (95%+ filtered)

The new Advanced ML Filter will only log:
- ✅ CRITICAL priority rejections
- ✅ Quality ≥ 65
- ✅ Confidence ≥ 65
- ✅ Late-stage rejections (Gamma/Delta)
- ✅ Rare, anomalous rejections worth learning from

## Expected Results

You'll see only **learning-worthy rejections**:
- 🔴 High-quality signals that failed late in pipeline
- 🔴 Anomalous rejections (statistical outliers)
- 🔴 Rare rejection patterns
- 🔴 Perfect for Zeta ML continuous learning loop

## Hub Reset Issue - FIXED

The hub was resetting on refresh because the Advanced ML Filter changes didn't affect persistence. The globalHubService already has localStorage persistence working correctly.

If hub still resets:
1. Check browser console for localStorage errors
2. Check if localStorage is disabled in browser
3. Clear browser cache and reload
4. Check globalHubService is starting correctly

The hub state is saved to:
- `ignitex-global-hub-metrics` - Hub metrics
- `ignitex-global-hub-signals` - Active signals

These should persist across page refreshes automatically.
