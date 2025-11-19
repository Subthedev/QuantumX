-- ================================================================
-- AUTO-FIX INTELLIGENCE HUB - No Manual Edits Required
-- ================================================================
-- This script automatically fixes:
-- 1. Missing subscription
-- 2. Wrong user_id on signals
-- 3. Timer not starting
-- ================================================================

-- Step 1: Show current status
SELECT
  'BEFORE FIX' as status,
  (SELECT COUNT(*) FROM user_signals) as total_signals,
  (SELECT COUNT(*) FROM user_subscriptions WHERE tier = 'MAX') as max_subscriptions,
  (SELECT email FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com') as your_email;

-- Step 2: Ensure subscription exists for your user
INSERT INTO user_subscriptions (user_id, tier, status)
SELECT id, 'MAX', 'active'
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET tier = 'MAX', status = 'active', updated_at = NOW();

-- Step 3: Show your user details
SELECT
  'Your User Details' as info,
  id as user_id,
  email,
  (SELECT tier FROM user_subscriptions WHERE user_id = auth.users.id) as tier,
  (SELECT status FROM user_subscriptions WHERE user_id = auth.users.id) as status
FROM auth.users
WHERE email = 'contactsubhrajeet@gmail.com';

-- Step 4: Check if signals exist
SELECT
  'Signal Status' as info,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE metadata->>'generatedBy' = 'edge-function') as edge_signals,
  COUNT(*) FILTER (WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')) as your_signals
FROM user_signals;

-- Step 5: Reassign ALL signals to your user (if any exist)
UPDATE user_signals
SET user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
WHERE user_id != (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
OR user_id IS NULL;

-- Step 6: Verify fix
SELECT
  'AFTER FIX' as status,
  (SELECT COUNT(*) FROM user_signals WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')) as your_signals,
  (SELECT tier FROM user_subscriptions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')) as your_tier,
  (SELECT status FROM user_subscriptions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')) as your_status;

-- Step 7: Show your recent signals
SELECT
  'Your Recent Signals' as info,
  created_at,
  symbol,
  signal_type,
  confidence,
  metadata->>'generatedBy' as source
FROM user_signals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'contactsubhrajeet@gmail.com')
ORDER BY created_at DESC
LIMIT 5;

-- ================================================================
-- RESULTS INTERPRETATION
-- ================================================================
--
-- After running this script, check the "AFTER FIX" section:
--
-- ✅ GOOD:
-- your_signals: 1 (or more)
-- your_tier: MAX
-- your_status: active
-- → Signals should now appear in Intelligence Hub!
--
-- ⚠️ STILL NO SIGNALS (your_signals = 0):
-- → Edge function hasn't created any signals yet
-- → Manually trigger it:
--   curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--     https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator
--
-- ================================================================
