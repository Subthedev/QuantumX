# ⚡ QUICK SETUP - 2 STEPS ONLY

## Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard**
2. Click **Project Settings** (gear icon)
3. Click **API** in sidebar
4. Scroll to "**service_role**" key
5. Click "**Reveal**"
6. **Copy** the entire key (starts with `eyJ...`)

---

## Step 2: Run the SQL

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: **SETUP_CRON_FINAL.sql**
3. Find **line 35**: `'Bearer YOUR_SERVICE_ROLE_KEY'`
4. **Replace** `YOUR_SERVICE_ROLE_KEY` with your actual key from Step 1
5. Click "**Run**"

**Example**:
```sql
-- Before:
'Bearer YOUR_SERVICE_ROLE_KEY',

-- After:
'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
```

---

## Step 3: Verify (2 Minutes Later)

Run this SQL to check if it's working:

```sql
SELECT
  COUNT(*) as executions_last_2min
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'autonomous-signal-generator-30s')
  AND start_time > NOW() - INTERVAL '2 minutes';
```

**Expected**: ~4 executions

---

## ✅ Done!

Your system is now running 24/7. You can:
- Close your browser
- Turn off your computer
- Come back later

Signals will keep generating automatically!

---

## Check Signals Are Dropping

**After 48 minutes** (for MAX tier):
```sql
SELECT
  symbol,
  tier,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM user_signals
WHERE metadata->>'generatedBy' = 'edge-function'
ORDER BY created_at DESC
LIMIT 5;
```

**After 96 minutes** (for PRO tier):
Should see PRO signals too

**After 8 hours** (for FREE tier):
Should see FREE signals too

---

## View Logs in Terminal

```bash
supabase functions logs signal-generator --tail
```

You'll see:
```
[Signal Generator] ⏳ FREE: Only 120 min, need 360 more - Skipping
[Signal Generator] ⏳ PRO: Only 45 min, need 51 more - Skipping
[Signal Generator] ✅ MAX: 48 min passed - Will generate
```

---

**That's it! System is autonomous now.** 🚀
