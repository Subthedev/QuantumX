# 🔧 Fix for "timeframe column does not exist" Error

## 🚨 Problem

The SQL error occurred because the `user_signals` table was missing two columns:
- `timeframe` (e.g., '15m', '1h', '4h', '1d')
- `status` (e.g., 'ACTIVE', 'EXPIRED', 'TRIGGERED')

These columns are referenced in various SQL scripts and will be needed by the signal generator edge function, but they weren't included in the original table schema migration.

## ✅ Solution

I've created two files to fix this:

1. **[FIX_USER_SIGNALS_SCHEMA.sql](FIX_USER_SIGNALS_SCHEMA.sql)** - Run this NOW in Supabase SQL Editor
2. **[supabase/migrations/20251120_add_timeframe_status_to_user_signals.sql](supabase/migrations/20251120_add_timeframe_status_to_user_signals.sql)** - Migration file for version control

## 📋 Step-by-Step Fix

### Step 1: Run the Fix SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy and paste the contents of [FIX_USER_SIGNALS_SCHEMA.sql](FIX_USER_SIGNALS_SCHEMA.sql)
4. Click **Run**
5. You should see: "user_signals table schema updated successfully"

### Step 2: Verify the Fix

Run this query to confirm the columns exist:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_signals'
  AND column_name IN ('timeframe', 'status')
ORDER BY column_name;
```

You should see both `timeframe` and `status` columns listed.

### Step 3: Update TypeScript Types (Optional but Recommended)

The Supabase types file needs to be regenerated to include the new columns. Run this in your terminal:

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Generate types
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

**Note:** If you don't have Supabase CLI set up, you can skip this step for now. The database will work fine, but you may see TypeScript warnings.

### Step 4: Re-run Your Signal Generator Setup

Now that the schema is fixed, you can:

1. Re-run [SETUP_SIGNAL_GENERATOR_CRON.sql](SETUP_SIGNAL_GENERATOR_CRON.sql) to set up cron jobs
2. Or run any other SQL scripts that were failing before

## 🎯 What the Fix Does

1. **Adds `timeframe` column** - Stores the trading timeframe for each signal
2. **Adds `status` column** - Tracks signal status (ACTIVE, EXPIRED, TRIGGERED, CANCELLED)
3. **Creates indexes** - For better query performance on status and timeframe
4. **Updates existing data** - Migrates existing signals to have default values:
   - `timeframe`: Extracted from metadata JSON or defaults to '15m'
   - `status`: Set to 'EXPIRED' if past expiry time, otherwise 'ACTIVE'
5. **Adds constraints** - Ensures status can only be valid values

## 🔍 Affected Files

The following SQL scripts in your codebase reference these columns:
- `ENABLE_CONTINUOUS_SIGNAL_GENERATION.md` (lines 18-23)
- `INSERT_FRESH_TEST_SIGNALS.sql`
- Any other scripts that insert into `user_signals` with these columns

## ✨ After the Fix

Once you run the fix SQL, you'll be able to:

✅ Insert signals with `timeframe` and `status` columns
✅ Run the signal generator cron setup without errors
✅ Execute all the test signal insertion scripts
✅ Filter signals by status (e.g., show only ACTIVE signals)
✅ Query signals by timeframe (e.g., find all 15m signals)

## 🚀 Next Steps

1. **Run [FIX_USER_SIGNALS_SCHEMA.sql](FIX_USER_SIGNALS_SCHEMA.sql)** ← Do this first!
2. **Set up signal generator cron jobs** using [SETUP_SIGNAL_GENERATOR_CRON.sql](SETUP_SIGNAL_GENERATOR_CRON.sql)
3. **Deploy the signal-generator edge function**:
   ```bash
   supabase functions deploy signal-generator
   ```
4. **Test signal generation** by manually triggering or waiting for cron

## 📞 Troubleshooting

### If you still see the error after running the fix:

1. **Verify the columns were added:**
   ```sql
   \d user_signals
   ```

2. **Check if the migration ran successfully:**
   ```sql
   SELECT * FROM user_signals LIMIT 1;
   ```

   You should see `timeframe` and `status` columns in the output.

3. **Clear Supabase cache:**
   - Sometimes Supabase caches schema information
   - Try refreshing your dashboard or waiting a minute

### If TypeScript shows errors:

- The types file needs to be regenerated (see Step 3 above)
- Or you can temporarily ignore the errors until types are regenerated

---

**Ready?** Start with Step 1 above! 🚀
