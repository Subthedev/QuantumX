# QuantumX — Phase 0 + 1.C Deployment Guide

After applying this PR, the system has:

1. A **single canonical writer** for arena_* tables — the Vercel cron at
   `/api/agents/trade-tick`. The browser is **read-only**.
2. **Supabase Realtime** subscriptions in the browser so cron writes propagate
   to all open tabs in ~1 second.
3. A new **`autonomous_state`** singleton row that the cron now reads to apply
   the orchestrator brain's learned multipliers (position size, regime
   transition penalty, per-strategy bias).
4. The **dual-writer collision** is eliminated.

This guide is what you need to do to make it live.

---

## Step 1 — Apply the Supabase migration

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new),
paste the contents of:

```
supabase/migrations/20260508_arena_and_autonomous_state.sql
```

…and hit **Run**. The script is idempotent — safe to re-run.

**Verify** with:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('arena_active_positions','arena_agent_sessions',
                    'arena_trade_history','arena_market_state','autonomous_state')
ORDER BY tablename;

-- Should return all 5 rows.

SELECT * FROM autonomous_state WHERE id='singleton';
-- Should return one row with empty {} state and version=0.

SELECT pubname, tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime'
  AND tablename LIKE 'arena_%';
-- Should return 3 rows (positions, sessions, trade_history).

SELECT column_name FROM information_schema.columns
WHERE table_name='intelligence_signals'
  AND column_name IN ('regime','fear_greed_index','funding_rate','thesis','invalidation');
-- Should return 5 rows.
```

If any query returns fewer rows than expected, re-run the migration.

---

## Step 2 — Set Vercel environment variables

The cron will refuse to run without these. Set them at:
https://vercel.com/<your-team>/quantumx/settings/environment-variables

| Name | Value | Scope |
|---|---|---|
| `CRON_SECRET` | random hex (`openssl rand -hex 32`) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase dashboard → Settings → API → `service_role` | Production |

Optional (only matter if/when you add the agent ingest cron later):
| `AGENT_INGEST_SECRET` | already set per memory | Production + Preview |
| `OPENCLAW_WEBHOOK_SECRET` | already set per memory | Production |

After saving, redeploy (Vercel will auto-deploy on next push but cron secrets
require a restart).

---

## Step 3 — Verify the cron is running

```bash
# Manual trigger (replace YOUR_CRON_SECRET):
curl -i https://quantumx.org.in/api/agents/trade-tick \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected output:
```json
{"ok":true,"elapsedMs":1234,"closed":0,"opened":1,"skippedNoSignal":2,"skippedCooldown":0,"skippedHalted":0,"errors":[]}
```

Then in Supabase:
```sql
SELECT agent_id, symbol, direction, entry_price, entry_time
FROM arena_active_positions
ORDER BY entry_time DESC LIMIT 5;
```
You should see fresh rows from the cron.

Vercel will auto-trigger this every minute via the `crons:` block in
`vercel.json`. Watch the function logs at
https://vercel.com/<team>/quantumx/logs?filter=function:%22api%2Fagents%2Ftrade-tick%22

---

## Step 4 — Verify the browser is read-only

1. Open https://quantumx.org.in/arena
2. Open DevTools console — you should see:
   ```
   📦 Arena Supabase Storage Service (BROWSER read-only)
   📡 Realtime subscribed to arena_* tables
   ```
3. Wait for the cron to open or close a position. Within 1–2 seconds, the UI
   should update without a page refresh.
4. Check Supabase `arena_trade_history` — every closed trade should appear
   there. The browser **never** writes to this table.

---

## Step 5 — Verify the orchestrator brain is shared

The browser writes its learned state to `autonomous_state.singleton` every
~2 seconds (debounced). The cron reads it on every tick.

```sql
SELECT id, version, updated_at,
       state->>'autonomyLevel' as autonomy,
       state->>'positionSizeMultiplier' as pos_mult,
       state->>'totalAdaptations' as adaptations
FROM autonomous_state;
```

After ~10 minutes of browser activity, `version` should be > 1 and
`updated_at` should be recent. The cron's log line
`[trade-tick] brain: posSize=...` will reflect the same multipliers.

---

## What's still left (Phase 1.A+B and 2)

- **Phase 1.A+B** — extract `decideTrade()` from the 1935-line
  `arenaQuantEngine.ts` into a runtime-agnostic `src/core/tradeDecision.ts`
  that both the browser engine and the cron import. This replaces the cron's
  current 5-signal stub with the real 17-strategy matrix.
- **Phase 2** — add `/api/agents/signal-tick` (every 5 min) to generate
  intelligence signals server-side instead of browser-side.
- **Phase 3** — UI cleanup: delete `arenaLiveTrading.ts`, browser engine
  becomes pure viewer.
- **Phase 4** — RLS hardening, distributed locks, OpenClaw repurposed as
  daily-thesis layer.

After Phase 1.B the cron will become as smart as the browser engine.
For now, the cron uses its 5-signal stub but **applies the brain's
multipliers**, which is a major upgrade over no learning at all.

---

## Rollback

If something breaks, the migration is non-destructive. To roll back:

1. Set Vercel env var `CRON_DISABLED=1` (or remove `CRON_SECRET`) — cron
   returns 401 and stops writing.
2. The browser is still in read-only mode (no harm). Trades simply stop
   accumulating until you redeploy a fix.
3. To restore browser writes (NOT recommended): revert
   `src/services/arenaSupabaseStorage.ts` and `src/services/arenaQuantEngine.ts`.

The schema can stay; nothing depends on the new tables being absent.
