# Quick Edge Function Deployment via Supabase Dashboard

Since CLI deployment is hanging, deploy manually via the dashboard:

## Step 1: Copy the Function Code

The updated function is in: `supabase/functions/signal-generator/index.ts`

## Step 2: Deploy via Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your IgniteX project
3. Click **Edge Functions** in the left sidebar
4. Click on **`signal-generator`** function
5. Click **"Edit"** or **code editor icon**
6. Copy the ENTIRE content from `supabase/functions/signal-generator/index.ts`
7. Paste into the editor
8. Click **"Deploy"** button

## Step 3: Test

Run in terminal:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator
```

Expected: `"signalsGenerated": 1` (not 0!)

## Step 4: Verify

SQL query:
```sql
SELECT
  created_at,
  symbol,
  signal_type,
  metadata->>'generatedBy' as generated_by
FROM user_signals
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

Expected: `generated_by = 'edge-function'` ✅
