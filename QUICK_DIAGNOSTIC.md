# ⚡ QUICK DIAGNOSTIC - Run This Right Now

## 🎯 Goal
Find out why Arena numbers are static in under 2 minutes.

---

## Step 1: Open Supabase

Go to your Supabase project → SQL Editor

---

## Step 2: Run This ONE Query

Copy and paste this:

```sql
-- COMPLETE DIAGNOSTIC QUERY
SELECT
  'POSITIONS CHECK' as check_type,
  user_id,
  COUNT(*) as count,
  'Agent has ' || COUNT(*) || ' open positions' as status
FROM mock_trading_positions
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix')
  AND status = 'OPEN'
GROUP BY user_id

UNION ALL

SELECT
  'ACCOUNT CHECK' as check_type,
  user_id,
  balance as count,
  'Balance: $' || balance::text as status
FROM mock_trading_accounts
WHERE user_id IN ('agent-nexus-01', 'agent-quantum-x', 'agent-zeonix')

ORDER BY check_type, user_id;
```

---

## Step 3: Look at the Results

### ❌ BAD RESULT (No positions):
```
check_type       | user_id         | count | status
-----------------|-----------------|-------|---------------------------
ACCOUNT CHECK    | agent-nexus-01  | 10000 | Balance: $10000
ACCOUNT CHECK    | agent-quantum-x | 10000 | Balance: $10000
ACCOUNT CHECK    | agent-zeonix    | 10000 | Balance: $10000
```

**If you see only ACCOUNT CHECK rows and NO POSITIONS CHECK rows:**
→ **PROBLEM FOUND**: Agents have no open positions!
→ **SOLUTION**: Run the SQL in STEP 4 below

---

### ✅ GOOD RESULT (Has positions):
```
check_type       | user_id         | count | status
-----------------|-----------------|-------|---------------------------
ACCOUNT CHECK    | agent-nexus-01  | 10000 | Balance: $10000
ACCOUNT CHECK    | agent-quantum-x | 10000 | Balance: $10000
ACCOUNT CHECK    | agent-zeonix    | 10000 | Balance: $10000
POSITIONS CHECK  | agent-nexus-01  | 2     | Agent has 2 open positions
POSITIONS CHECK  | agent-quantum-x | 3     | Agent has 3 open positions
POSITIONS CHECK  | agent-zeonix    | 1     | Agent has 1 open positions
```

**If you see both ACCOUNT CHECK and POSITIONS CHECK rows:**
→ Positions exist! Problem is something else.
→ Tell me: "Positions exist" and I'll investigate further

---

## Step 4: Fix If No Positions (Only run if Step 3 was BAD)

If Step 3 showed NO positions, run this SQL:

```sql
-- Create 3 test positions (one for each agent)
INSERT INTO mock_trading_positions (
  user_id, symbol, side, quantity, entry_price, current_price,
  leverage, status, unrealized_pnl, unrealized_pnl_percent, opened_at
)
VALUES
  ('agent-quantum-x', 'BTC/USD', 'BUY', 0.1, 96000, 96000, 1, 'OPEN', 0, 0, NOW()),
  ('agent-nexus-01', 'ETH/USD', 'BUY', 1.0, 3500, 3500, 1, 'OPEN', 0, 0, NOW()),
  ('agent-zeonix', 'SOL/USD', 'BUY', 10.0, 180, 180, 1, 'OPEN', 0, 0, NOW());
```

**After running:**
1. Go to Arena: `http://localhost:8082/arena`
2. Press `Cmd+Shift+R` (force refresh)
3. Wait 20 seconds
4. Tell me: "Created positions, numbers are updating" or "Created positions, still static"

---

## 🚨 JUST TELL ME

After running Step 2 and looking at Step 3:

**Option A**: "No positions found" (then run Step 4)
**Option B**: "Positions exist" (then I'll dig deeper)

That's it! This will immediately identify the issue.
