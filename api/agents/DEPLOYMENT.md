# QuantumX — Phase 0 → 4 Deployment Guide

After applying this PR, the system has:

1. **Single canonical writer** for arena_* tables — the Vercel cron at
   `/api/agents/trade-tick` (every minute). The browser is read-only.
2. **Server-side signal generation** — new cron at `/api/agents/signal-tick`
   (every 5 minutes) writes to `intelligence_signals` so signals flow 24/7
   without an open browser tab.
3. **Supabase Realtime** subscriptions in the browser propagate cron writes
   to all open tabs in ~1 second.
4. **One trading codepath** — both the browser engine and the cron call into
   `src/core/tradeDecision.ts`, which uses the real 17-strategy matrix
   instead of the previous 5-signal stub.
5. **Shared autonomous brain** — the orchestrator's learned multipliers
   (position size, regime transition penalty, per-strategy bias) persist in
   `autonomous_state` (singleton row) and are read by both browser and cron
   on every cycle.
6. **Optimistic concurrency** on `autonomous_state` writes — concurrent tabs
   and the cron can write simultaneously without lost updates; conflicts
   trigger a one-shot retry.
7. **Dead code removed** — `arenaLiveTrading.ts` and `Arena.tsx` (the
   `/arena-classic` route) are gone.

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
  AND tablename IN ('arena_active_positions','arena_agent_sessions',
                    'arena_trade_history','autonomous_state');
-- Should return 4 rows.

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

Optional (only matter if/when you re-enable the OpenClaw agent):
- `AGENT_INGEST_SECRET` — already set per memory
- `OPENCLAW_WEBHOOK_SECRET` — already set per memory

After saving, redeploy (push to main or click Redeploy in Vercel).

---

## Step 3 — Verify the trade-tick cron

```bash
# Manual trigger (replace YOUR_CRON_SECRET):
curl -i https://quantumx.org.in/api/agents/trade-tick \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected output:
```json
{
  "ok": true,
  "elapsedMs": 1234,
  "regime": "RANGEBOUND",
  "closed": 0,
  "opened": 1,
  "skipReasons": { "COOLDOWN": 1, "NO_AVAILABLE_PAIR": 1 },
  "errors": [],
  "brain": { "posSize": 1, "freq": 1, "regimePenalty": 1, "biases": 0 }
}
```

Then in Supabase:
```sql
SELECT agent_id, symbol, direction, strategy, entry_price, entry_time
FROM arena_active_positions
ORDER BY entry_time DESC LIMIT 5;
```
You should see fresh rows. Note the `strategy` column will now show full
strategy names (e.g. `Momentum Surge V2`) instead of the old generic
`aggressive-multi-confirm` placeholders.

Vercel auto-triggers this every minute via the `crons` block in `vercel.json`.

---

## Step 4 — Verify the signal-tick cron

```bash
curl -i https://quantumx.org.in/api/agents/signal-tick \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected output:
```json
{
  "ok": true,
  "elapsedMs": 2100,
  "regime": "BULLISH_LOW_VOL",
  "fearGreed": 58,
  "generated": 4,
  "inserted": 3,
  "skippedDuplicate": 1,
  "expired": 0,
  "errors": []
}
```

In Supabase:
```sql
SELECT symbol, signal_type, confidence, regime, status,
       SUBSTRING(thesis FROM 1 FOR 60) AS thesis_preview
FROM intelligence_signals
WHERE created_at > now() - interval '15 minutes'
ORDER BY created_at DESC;
```
You should see fresh `LONG` / `SHORT` signals with thesis text and regime.

This cron runs every 5 minutes per `vercel.json`.

---

## Step 5 — Verify the browser is read-only & subscribed

1. Open https://quantumx.org.in/arena
2. Open DevTools console — you should see:
   ```
   📦 Arena Supabase Storage Service (BROWSER read-only)
   📡 Realtime subscribed to arena_* tables
   ```
3. Wait for the trade-tick cron (1 minute) — within ~1s of an
   OPEN/CLOSE log line in Vercel logs, the UI should update without a refresh.

To verify the server-signals hook works, in any component:
```tsx
import { useServerSignals } from '@/hooks/useServerSignals';

function MySignalsPanel() {
  const { signals, loading, realtimeConnected } = useServerSignals();
  // signals[] is auto-updated by Realtime when signal-tick writes new rows
  ...
}
```

---

## Step 6 — Verify the orchestrator brain is shared

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
`[trade-tick] regime=... brain.posSize=... biases=N` will reflect the same
multipliers and bias counts.

If you open multiple browser tabs at once, optimistic concurrency control
(Phase 4) will make them coordinate — concurrent writes that race will see
one succeed and the other reload + retry. Look for occasional
`[Orchestrator] Stale write rejected` lines in the console.

---

## What Phase 0 → 4 changed in the repo

### New files
- `supabase/migrations/20260508_arena_and_autonomous_state.sql` — schema
- `src/core/marketState.ts` — pure MarketState enum
- `src/core/tradeDecision.ts` — runtime-agnostic trade-decision core
- `src/core/signalPipeline.ts` — runtime-agnostic signal-generation pipeline
- `src/hooks/useServerSignals.ts` — Realtime subscription hook for intelligence_signals
- `api/agents/signal-tick.ts` — Vercel cron, every 5 min

### Modified files
- `vercel.json` — registered both crons
- `api/agents/trade-tick.ts` — rewritten to delegate to `src/core/tradeDecision.ts`
- `src/integrations/supabase/types.ts` — added arena_*, autonomous_state, intelligence_signals extension columns
- `src/services/arenaSupabaseStorage.ts` — read-only in browser; Realtime subscription
- `src/services/arenaQuantEngine.ts` — disabled trade-init paths; reconciles via Realtime
- `src/services/autonomousOrchestrator.ts` — Supabase persistence with version-based concurrency
- `src/services/strategyMatrix.ts` — imports MarketState from @/core (no cryptoDataService chain)
- `src/services/marketStateDetectionEngine.ts` — re-exports MarketState from @/core
- `src/hooks/useArenaAgents.ts` — uses arenaQuantEngine instead of arenaLiveTrading
- `src/App.tsx` — removed /arena-classic route

### Deleted files
- `src/services/arenaLiveTrading.ts` — replaced by arenaQuantEngine + Realtime
- `src/pages/Arena.tsx` — dead `/arena-classic` page

---

## Rollback

If something breaks, the migration is non-destructive. To roll back:

1. Set Vercel env var `CRON_DISABLED=1` (or remove `CRON_SECRET`) — both
   crons return 401 and stop writing.
2. The browser is still in read-only mode (no harm). Trades and signals
   simply stop accumulating until you redeploy a fix.
3. To restore the previous behaviour, `git revert` the Phase 0–4 commits.

The schema can stay; nothing depends on the new tables being absent.

---

## What's still optional (not in this PR)

- **Hub UI integration**: `IntelligenceHub.tsx` still uses the legacy
  browser-side `globalHubService`. Adopt `useServerSignals()` as the source
  of truth there to fully retire the browser pipeline.
- **Distributed trade-tick lock**: the trade-tick currently does not guard
  against two concurrent invocations (e.g. Vercel retrying a failed cron).
  In practice this is rare and `upsert(onConflict: 'agent_id')` makes the
  outcome idempotent for opens, but for true safety you could add a row-
  level advisory lock on `arena_market_state`.
- **OpenClaw agent**: Repurpose the `agents/market-intel/` agent as a
  daily Claude-narrative layer that enriches `intelligence_signals.thesis`
  with longer-form analysis (instead of being the primary signal source).
