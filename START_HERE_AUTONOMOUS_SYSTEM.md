# ⚡ START HERE: FIX YOUR AUTONOMOUS SYSTEM

## 🚨 YOUR ISSUE

After 12 hours:
- ❌ Same signal still showing
- ❌ Timer stopped
- ❌ No new signals generated
- ❌ System "frozen"

## ✅ THE ROOT CAUSE

**Missing**: Supabase Cron Job
**Result**: System only runs when browser is open
**Fix**: Set up true backend 24/7 cron job

---

## 🚀 3-STEP FIX (Takes 5 Minutes)

### Step 1: Get Your Supabase Info

Go to **Supabase Dashboard** → Your Project → **Settings** → **API**

**Copy These**:
1. **Project URL**: `https://abcdefghijklmnop.supabase.co`
   → Your Project Ref = `abcdefghijklmnop` (the part before .supabase.co)

2. **Service Role Key**: Click "Reveal" → Copy the secret key (starts with `eyJ...`)

---

### Step 2: Create the Cron Job

1. Go to **Supabase Dashboard** → **SQL Editor**

2. **Copy this SQL** and replace the placeholders:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old cron jobs
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname LIKE '%signal%';

-- ⚠️ REPLACE THESE BEFORE RUNNING:
-- YOUR_PROJECT_REF = your project reference (e.g., "abcdefghijklmnop")
-- YOUR_SERVICE_ROLE_KEY = your service role key (the long eyJ... key)

-- Create 24/7 cron job (runs every 30 seconds)
SELECT cron.schedule(
  'autonomous-signal-generator-30s',
  '*/30 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

3. **Click "Run"**

---

### Step 3: Verify It's Working

**Run this SQL**:
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'autonomous-signal-generator-30s';
```

**Expected**: 1 row showing `active = true`

**Then wait 2 minutes and run**:
```sql
SELECT COUNT(*) as executions
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
  AND start_time > NOW() - INTERVAL '2 minutes';
```

**Expected**: ~4 executions (runs every 30 seconds)

---

## ✅ WHAT HAPPENS NOW

### Automatic 24/7 Operation

**Every 30 seconds** (in the background, even when browser closed):
1. Cron calls edge function
2. Edge function checks tier intervals:
   - FREE: Generate if ≥8 hours passed
   - PRO: Generate if ≥96 minutes passed
   - MAX: Generate if ≥48 minutes passed
3. If interval met → Generate signal with **adaptive expiry** (6-24h)
4. If not met → Return immediately (efficient, fast)

**Signals automatically**:
- ✅ Drop at correct tier intervals
- ✅ Have adaptive expiry (not fixed 24h)
- ✅ Move to history when outcome determined OR expired
- ✅ Track real-time price and hit TP/SL
- ✅ Feed Zeta Learning Engine

---

## 🎯 HOW TO MONITOR

### Check Edge Function Logs
```bash
supabase functions logs signal-generator --tail
```

**You'll see**:
```
[Signal Generator] ⏳ FREE: Only 120 min, need 360 more - Skipping
[Signal Generator] ⏳ PRO: Only 45 min, need 51 more - Skipping
[Signal Generator] ✅ MAX: 48 min passed - Will generate
[Signal Generator] 📤 Distributing to 3 MAX users
```

### Check Signals in Database
```sql
SELECT
  tier,
  COUNT(*) as signals_last_hour
FROM user_signals
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND metadata->>'generatedBy' = 'edge-function'
GROUP BY tier;
```

### Check in Intelligence Hub
- Open Intelligence Hub
- **Active Tab**: Should show signals without outcomes
- **History Tab**: Should show completed signals
- **Timer**: Should count down and reset when signals drop

---

## 📊 EXPECTED BEHAVIOR

### First Hour
- FREE: No signal yet (needs 8 hours)
- PRO: Maybe 1 signal (if 96 min passed)
- MAX: 1 signal (after 48 min)

### After 24 Hours
- FREE: ~3 signals total
- PRO: ~15 signals total
- MAX: ~30 signals total

### Adaptive Expiry
Signals will have **varying expiry times** (6-24h):
- Fast movers (BTC pumping): 6-12 hours
- Medium movers: 12-18 hours
- Slow movers: 18-24 hours

**Check**:
```sql
SELECT
  symbol,
  metadata->'adaptiveExpiry'->>'expiryHours' as expiry_hours,
  metadata->'adaptiveExpiry'->>'explanation' as reason
FROM user_signals
ORDER BY created_at DESC
LIMIT 5;
```

Should see variety like: 8.5h, 12.0h, 18.3h, 23.0h - **NOT all 24h**

---

## 🚨 TROUBLESHOOTING

### No signals after 1 hour

**Check cron is running**:
```sql
SELECT * FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s';
```

**If no results**: Cron not created
- Go back to Step 2
- Make sure you replaced YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
- Run the SQL again

**If active = false**: Cron disabled
- Delete it: `SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s';`
- Re-run Step 2

### Signals not moving to history

**Check if expired**:
```sql
SELECT
  symbol,
  expires_at,
  NOW() > expires_at as is_expired,
  metadata->>'mlOutcome' as outcome
FROM user_signals
ORDER BY created_at DESC;
```

**If expired but still showing**: Clear browser cache, hard refresh

### Timer not working

**Frontend issue**: Redeploy frontend
```bash
npm run build
# Then deploy
```

**Verify timer code matches**: Check `SignalDropTimer.tsx` has correct intervals (8h/96min/48min)

---

## 📚 DOCUMENTATION FILES

1. **SETUP_CRON_JOB.sql** - Full SQL with comments
2. **TRUE_AUTONOMOUS_24_7_SYSTEM.md** - Complete technical guide
3. **FINAL_PRODUCTION_DEPLOYMENT.md** - Deployment checklist
4. **THIS FILE** - Quick start guide

---

## ✅ SUCCESS CHECKLIST

Your system is working when:

- [x] Cron job exists and is active
- [x] Executions appear every 30 seconds
- [x] Edge function logs show tier checking
- [x] Signals appear based on tier intervals
- [x] Adaptive expiry varies (not all 24h)
- [x] Active tab shows only active signals
- [x] History tab shows completed signals
- [x] Timer counts down correctly
- [x] System works with browser closed

---

## 🎉 AFTER SETUP

**You can close your browser** and the system will:
- ✅ Keep generating signals every 8h/96min/48min
- ✅ Monitor prices in real-time
- ✅ Set outcomes when TP/SL hit
- ✅ Auto-move signals to history
- ✅ Track performance
- ✅ Feed Zeta Learning Engine

**True 24/7 autonomous operation!** 🚀

---

**Next**: Run Step 1-3 above (takes 5 minutes)
