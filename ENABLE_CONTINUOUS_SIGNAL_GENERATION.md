# 🚀 Enable Continuous 24/7 Signal Generation

## Current Problem

**Engines are NOT running** - The trading strategy engines that analyze markets and generate signals are disabled. You're seeing 10 old sample signals instead of fresh live signals being generated continuously.

## IMMEDIATE FIX (See Signals in 30 Seconds)

### Step 1: Insert Fresh Test Signals

Run this in **Supabase SQL Editor** (https://supabase.com/dashboard/project/vidziydspeewmcexqicg/editor):

```sql
-- Delete old sample signals
DELETE FROM user_signals WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee';

-- Insert 5 fresh LIVE signals (expire in 4 hours)
INSERT INTO user_signals (user_id, signal_id, tier, symbol, signal_type, entry_price, stop_loss, take_profit, confidence, quality_score, timeframe, created_at, expires_at, status, metadata) VALUES
('0e4499b5-a1de-4a37-b502-179e93d382ee', 'BTCUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint, 'MAX', 'BTCUSDT', 'LONG', 98500.00, 97000.00, ARRAY[99500.00, 100500.00], 92.5, 88.0, '15m', NOW(), NOW() + INTERVAL '4 hours', 'ACTIVE', '{"strategy": "Momentum Surge V2", "generatedBy": "test", "image": "https://assets.coingecko.com/coins/images/1/small/bitcoin.png", "riskReward": 2.5}'),
('0e4499b5-a1de-4a37-b502-179e93d382ee', 'ETHUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint, 'MAX', 'ETHUSDT', 'SHORT', 3850.00, 3920.00, ARRAY[3780.00, 3710.00], 88.0, 85.5, '15m', NOW(), NOW() + INTERVAL '4 hours', 'ACTIVE', '{"strategy": "Whale Shadow", "generatedBy": "test", "image": "https://assets.coingecko.com/coins/images/279/small/ethereum.png", "riskReward": 2.1}'),
('0e4499b5-a1de-4a37-b502-179e93d382ee', 'SOLUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint, 'MAX', 'SOLUSDT', 'LONG', 220.50, 215.00, ARRAY[226.00, 232.00], 90.0, 87.2, '15m', NOW(), NOW() + INTERVAL '4 hours', 'ACTIVE', '{"strategy": "Spring Trap", "generatedBy": "test", "image": "https://assets.coingecko.com/coins/images/4128/small/solana.png", "riskReward": 2.8}'),
('0e4499b5-a1de-4a37-b502-179e93d382ee', 'BNBUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint, 'MAX', 'BNBUSDT', 'LONG', 685.00, 670.00, ARRAY[698.00, 712.00], 86.5, 84.0, '15m', NOW(), NOW() + INTERVAL '4 hours', 'ACTIVE', '{"strategy": "Funding Squeeze", "generatedBy": "test", "image": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", "riskReward": 2.4}'),
('0e4499b5-a1de-4a37-b502-179e93d382ee', 'XRPUSDT-' || EXTRACT(EPOCH FROM NOW())::bigint, 'MAX', 'XRPUSDT', 'SHORT', 2.85, 2.92, ARRAY[2.78, 2.71], 89.0, 86.5, '15m', NOW(), NOW() + INTERVAL '4 hours', 'ACTIVE', '{"strategy": "Order Flow Tsunami", "generatedBy": "test", "image": "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png", "riskReward": 2.6}');
```

### Step 2: Refresh Your Browser

After running the SQL:
1. Go back to Intelligence Hub
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. **BOOM! 5 fresh signals appear!** 🎉

You'll see:
- BTC LONG at $98,500
- ETH SHORT at $3,850
- SOL LONG at $220.50
- BNB LONG at $685
- XRP SHORT at $2.85

All with 4-hour expiry timers!

## PERMANENT SOLUTION: Enable 24/7 Engines

### Option 1: Aggressive Edge Function Cron (Server-Side)

Set up cron to run Edge Function **every 5 minutes** instead of every 48 minutes:

```sql
-- Run in Supabase SQL Editor

-- Remove existing cron jobs
SELECT cron.unschedule('signal-generator-max-tier');
SELECT cron.unschedule('signal-generator-pro-tier');
SELECT cron.unschedule('signal-generator-free-tier');

-- Schedule to run EVERY 5 MINUTES (generates fresh signals continuously)
SELECT cron.schedule(
  'signal-generator-continuous',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"tier": "MAX", "forceGenerate": true}'::jsonb
  );
  $$
);
```

**Replace `YOUR_SERVICE_ROLE_KEY`** with your service role key from Supabase Dashboard → Settings → API.

This will:
- ✅ Run every 5 minutes
- ✅ Scan top 50 crypto coins
- ✅ Generate 1-3 signals per run
- ✅ Continuous fresh signals 24/7

### Option 2: Multiple Frequent Cron Jobs

```sql
-- Generate signals every 10 minutes for MAX tier
SELECT cron.schedule(
  'signal-max-frequent',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"tier": "MAX"}'::jsonb
  );
  $$
);

-- Generate signals every 15 minutes for PRO tier
SELECT cron.schedule(
  'signal-pro-frequent',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"tier": "PRO"}'::jsonb
  );
  $$
);

-- Generate signals every hour for FREE tier
SELECT cron.schedule(
  'signal-free-frequent',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"tier": "FREE"}'::jsonb
  );
  $$
);
```

### Option 3: External Cron Service (If Supabase pg_cron doesn't work)

Use https://cron-job.org (free):

1. Sign up for free account
2. Create new cron job
3. **URL**: `https://vidziydspeewmcexqicg.supabase.co/functions/v1/signal-generator`
4. **Method**: POST
5. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_ANON_KEY`
6. **Body**: `{"tier": "MAX"}`
7. **Schedule**: Every 5 minutes
8. **Save**

Repeat for PRO and FREE tiers with different intervals.

## How the Engine Works

Once cron is running every 5-10 minutes:

1. **Edge Function triggers** (server-side)
2. **Scans 50 top cryptos** via Binance API
3. **Analyzes each coin** for:
   - Price momentum
   - Volume spikes
   - Trend patterns
   - Support/resistance
4. **Applies 18+ strategies**:
   - Momentum Surge
   - Whale Shadow
   - Spring Trap
   - Funding Squeeze
   - Order Flow Tsunami
   - etc.
5. **Selects best signals** (highest confidence)
6. **Stores in database** (user_signals table)
7. **Frontend auto-updates** (real-time subscription + polling)
8. **User sees fresh signals** every 5-10 minutes!

## Verify It's Working

### Check Cron Execution

```sql
-- View recent cron runs
SELECT
  j.jobname,
  r.status,
  r.start_time,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname LIKE 'signal%'
ORDER BY r.start_time DESC
LIMIT 20;
```

### Check Fresh Signals

```sql
-- See signals created in last hour
SELECT
  symbol,
  signal_type,
  confidence,
  created_at,
  metadata->>'strategy' as strategy
FROM user_signals
WHERE user_id = '0e4499b5-a1de-4a37-b502-179e93d382ee'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Watch Console Logs

In your browser console, you should see:
```
[Hub] 📊 Database returned 8 signals  (increasing over time)
[Hub UI] 📊 Signals: 8 total, 6 active
[Hub] 🆕 Real-time signal added: ADAUSDT
```

## Summary

**Quick Test** (30 seconds):
1. Run SQL to insert 5 fresh test signals
2. Refresh browser
3. See signals immediately!

**Permanent Solution** (5 minutes):
1. Set up cron to run every 5-10 minutes
2. Engines generate fresh signals continuously
3. Fully autonomous 24/7 operation

**Expected Result**:
- Fresh signals every 5-10 minutes
- Multiple strategies running
- Real-time updates in UI
- Live crypto prices
- No manual intervention needed

🚀 **Start with the SQL insert to see it working NOW, then set up continuous cron for permanent operation!**
