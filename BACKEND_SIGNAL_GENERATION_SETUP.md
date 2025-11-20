# 🚀 Backend 24/7 Autonomous Signal Generation Setup

## ⚠️ CRITICAL UNDERSTANDING

**The Intelligence Hub frontend does NOT generate signals!**

- ✅ **Frontend (Intelligence Hub)**: PASSIVE receiver - only displays signals from database
- ✅ **Backend (Supabase Edge Function)**: ACTIVE generator - creates signals autonomously 24/7
- ✅ **Cron Job**: Triggers the Edge Function every 30-60 minutes per tier

## 🏗️ Current Architecture

```
Supabase Cron Job (pg_cron)
  ↓ Triggers every 48min/96min/8h (based on tier)
Supabase Edge Function (signal-generator)
  ↓ Scans top 50 crypto coins
  ↓ Runs 18+ trading strategies
  ↓ Applies quality filters
  ↓ Generates 1-3 signals
user_signals table (PostgreSQL)
  ↓ Real-time subscriptions + polling
Intelligence Hub Frontend
  ↓ Displays signals
User sees signals automatically
```

## 📋 Setup Instructions

### Step 1: Get Supabase Credentials

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
   - **Service Role Key**: `eyJhbG...` (⚠️ Keep this secret!)

### Step 2: Deploy the Edge Function

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the signal generator function
supabase functions deploy signal-generator
```

### Step 3: Set Up the Cron Job

1. Open Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Paste this SQL (⚠️ **Replace placeholders first!**):

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ⚠️ IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY below!

-- Schedule for MAX tier (every 48 minutes = 30 signals/24h)
SELECT cron.schedule(
  'signal-generator-max-tier',
  '*/48 * * * *',  -- Every 48 minutes
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "MAX"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule for PRO tier (every 96 minutes = 15 signals/24h)
SELECT cron.schedule(
  'signal-generator-pro-tier',
  '*/96 * * * *',  -- Every 96 minutes (1h 36m)
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "PRO"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule for FREE tier (every 8 hours = 3 signals/24h)
SELECT cron.schedule(
  'signal-generator-free-tier',
  '0 */8 * * *',  -- Every 8 hours
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"tier": "FREE"}'::jsonb
    ) as request_id;
  $$
);
```

4. Execute the query

### Step 4: Verify Cron Jobs Are Running

Run this SQL to check scheduled jobs:

```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- You should see 3 jobs:
-- 1. signal-generator-max-tier (every 48 minutes)
-- 2. signal-generator-pro-tier (every 96 minutes)
-- 3. signal-generator-free-tier (every 8 hours)
```

### Step 5: Monitor Execution

```sql
-- Check recent cron job executions
SELECT
  job.jobname,
  run.status,
  run.start_time,
  run.end_time,
  run.return_message
FROM cron.job_run_details run
JOIN cron.job ON job.jobid = run.jobid
WHERE job.jobname LIKE 'signal-generator%'
ORDER BY run.start_time DESC
LIMIT 20;
```

### Step 6: Verify Signals in Database

```sql
-- Check signals were created
SELECT
  COUNT(*) as total_signals,
  tier,
  MAX(created_at) as last_signal_time
FROM user_signals
GROUP BY tier;
```

## 🚨 Troubleshooting

### Problem: Cron jobs not showing up

**Solution**: Supabase free tier may not support `pg_cron`. Use alternatives:

#### **Alternative 1: Vercel Cron Jobs** (Recommended for Vercel deployments)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/signal-generator-max",
      "schedule": "*/48 * * * *"
    },
    {
      "path": "/api/signal-generator-pro",
      "schedule": "*/96 * * * *"
    },
    {
      "path": "/api/signal-generator-free",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

Then create API routes that call the Supabase Edge Function.

#### **Alternative 2: External Cron Service** (Free & Easy)

Use https://cron-job.org (free tier):

1. Sign up for free account
2. Create new cron job
3. Set URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator`
4. Set headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
5. Set schedule: Every 48 minutes for MAX, 96 minutes for PRO, 8 hours for FREE

#### **Alternative 3: GitHub Actions** (Free for public repos)

Create `.github/workflows/signal-generator.yml`:

```yaml
name: Signal Generator Cron
on:
  schedule:
    - cron: '*/48 * * * *'  # Every 48 minutes
jobs:
  generate-signals:
    runs-on: ubuntu-latest
    steps:
      - name: Call Signal Generator
        run: |
          curl -X POST \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"tier": "MAX"}'
```

### Problem: Signals not appearing in frontend

**Check these in order:**

1. **Are signals in database?**
   ```sql
   SELECT * FROM user_signals ORDER BY created_at DESC LIMIT 10;
   ```

2. **Do signals belong to logged-in user?**
   ```sql
   -- Get your user ID first
   SELECT id, email FROM auth.users;

   -- Check signals for your user
   SELECT * FROM user_signals WHERE user_id = 'YOUR_USER_ID';
   ```

3. **Are signals expired?**
   ```sql
   SELECT
     symbol,
     created_at,
     expires_at,
     CASE
       WHEN expires_at < NOW() THEN 'EXPIRED'
       ELSE 'ACTIVE'
     END as status
   FROM user_signals
   ORDER BY created_at DESC;
   ```

4. **Check browser console for errors**
   - Open DevTools (F12)
   - Look for `[Hub]` prefixed logs
   - Should see: `[Hub] ✅ Updated signal history with X database signals`
   - If X = 0, check user authentication

### Problem: getCurrentMonthStats error still showing

**Solution**: Hard refresh browser to clear Vercel CDN cache:
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

## ✅ Success Checklist

- [ ] Edge Function deployed to Supabase
- [ ] Cron jobs scheduled (or alternative set up)
- [ ] Cron jobs executing successfully (check `cron.job_run_details`)
- [ ] Signals appearing in `user_signals` table
- [ ] Frontend fetching signals (check console logs)
- [ ] Signals displaying in Intelligence Hub UI
- [ ] Timer countdown working correctly
- [ ] Real-time updates working (new signals appear automatically)

## 📊 Expected Behavior

Once properly configured:

1. **Backend** generates signals autonomously based on tier:
   - FREE: Every 8 hours (3 signals/day)
   - PRO: Every 96 minutes (15 signals/day)
   - MAX: Every 48 minutes (30 signals/day)

2. **Frontend** passively receives signals:
   - Timer shows countdown to next signal drop
   - New signals appear automatically via real-time subscription
   - Historical signals load from database on page load
   - No manual intervention needed

3. **Zero client-side computation**:
   - No strategies running in browser
   - No market data fetching (except for charts)
   - Pure display layer

## 🔧 Additional Configuration

### Adjust Signal Generation Frequency

Edit the cron schedule in Supabase SQL Editor:

```sql
-- Change MAX tier to every 30 minutes instead of 48
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'signal-generator-max-tier'),
  schedule := '*/30 * * * *'
);
```

### Manually Trigger Signal Generation

```bash
# Using curl
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tier": "MAX"}'
```

### View Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on `signal-generator`
3. Click **Logs** tab
4. View real-time execution logs

## 🎯 Next Steps

1. **Deploy Edge Function** (if not already done)
2. **Set up cron job** using one of the methods above
3. **Wait 48 minutes** (for MAX tier) or trigger manually
4. **Check database** for new signals
5. **Open Intelligence Hub** and verify signals appear
6. **Monitor for 24 hours** to ensure continuous operation

---

**Need help?** Check the console logs with these debug commands:

```javascript
// In browser console on Intelligence Hub page
window.debugSignals();  // Shows current signal state
window.globalHubService.getMetrics();  // Shows metrics
```
