# QuantumX — Autonomous 24/7 Engine

## Current state (verified live 2026-05-08)

| Component | Status |
|---|---|
| Supabase project (`abdjyaumafnewqjhsjlq`) | ✅ Live, tables migrated, autonomous_state at v4+ |
| Vercel deployment | ✅ Healthy on `main` |
| Vercel env vars (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) | ✅ Set |
| `/api/agents/trade-tick` | ✅ 200 OK; uses 17-strategy matrix + brain bias + portfolio heat + correlation gate + ATR stops + sentiment + cascade intel + Bybit/OKX fallback for AWS-blocked Binance Futures |
| `/api/agents/signal-tick` | ✅ 200 OK, **publishing 4 signals/tick** + outcome resolver (marks hit_target / hit_stop_loss / profit_loss_percent on real fills) |
| `/api/agents/ingest` | ✅ Live (OpenClaw ingest endpoint) |
| Browser engine | ✅ Read-only, subscribed to Supabase Realtime, no double-writes |
| IntelligenceHub UI | ✅ Uses `useServerSignals()` (server signals only, no browser pipeline) |
| **Cron trigger** | ⚠️ Pending — pick option A or B below |

## ⚡ The one remaining setup step

The system has TWO supported triggers. Either makes it fully 24/7. Pick whichever is faster for you.

### Option A (recommended) — Supabase pg_cron + pg_net (60 seconds, fully self-contained)

This is the bulletproof path: Supabase calls Vercel directly every minute, no GitHub Actions, no external service. Survives a paused GitHub repo, an OAuth-scope block, anything.

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/abdjyaumafnewqjhsjlq/sql/new).
2. Paste the contents of `supabase/migrations/20260508_pg_cron_autonomous.sql`.
3. **Before running**, replace the placeholder `'PASTE_YOUR_CRON_SECRET_HERE'` with the actual secret. Get it with:
   ```bash
   cat /tmp/quantumx_cron_secret.txt
   ```
4. Click **Run**.
5. Verify within ~2 minutes:
   ```sql
   SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'quantumx-%';
   --  3 jobs, all active
   SELECT endpoint, MAX(scheduled_at) AS last, COUNT(*) AS runs_24h
   FROM tick_runs WHERE scheduled_at > now() - interval '24 hours' GROUP BY endpoint;
   --  trade-tick should show ~60 runs/hour, signal-tick ~12/hour
   ```

### Option B — GitHub Actions (30 seconds, needs `workflow` OAuth scope)

The matrix workflow is committed locally on `main` (commit `2edb939`) but not pushed because the local `gh` token lacks `workflow` scope. To push:

```bash
gh auth refresh -s workflow -h github.com    # opens browser once
git push origin main
```

After push, GitHub auto-runs both ticks every 5 min. Trigger manually any time:
```bash
gh workflow run "24/7 Autonomous Engine" --repo Subthedev/QuantumX
```

You can also use both A and B simultaneously — the trade-tick and signal-tick endpoints are idempotent (cooldown gates + dedup window), so duplicate triggers are no-ops.

## How the autonomous loop works

```
                   every 1 min                    
┌──────────────────┐ ─────────▶ trade-tick (real engine, 17 strategies)
│ Supabase pg_cron │                                 │
│  + pg_net (A)    │                                 ▼
│   OR             │ ─────────▶ signal-tick    ┌──────────────────────┐
│ GitHub Actions   │ every 5 min               │ Supabase             │
│  matrix (B)      │                           │  arena_*             │
└──────────────────┘                           │  intelligence_signals│
                                               │  autonomous_state    │
                                               │  tick_runs           │
                                               └──────────┬───────────┘
                                                          │ Realtime
                                                          ▼
                                               ┌──────────────────────┐
                                               │ Browser viewers       │
                                               │ (read-only)           │
                                               └──────────────────────┘
```

The browser is a viewer, not a writer. No tab needs to be open for trading or signal generation to continue.

## Verified-live test commands

```bash
CRON=$(cat /tmp/quantumx_cron_secret.txt)
URL=https://quantumx.org.in   # or the latest *-subthedevs-projects.vercel.app

curl -sS -H "Authorization: Bearer $CRON" "$URL/api/agents/trade-tick"
# {"ok":true,"elapsedMs":1529,"closed":0,"opened":0,"errors":[],"regime":"...","intel":{"fearGreed":...,"fundingBTC":...,"longShortRatio":...,"cascadesActive":...},...}
# Note: fundingBTC/ETH and longShortRatio now non-zero thanks to Bybit/OKX fallback.

curl -sS -H "Authorization: Bearer $CRON" "$URL/api/agents/signal-tick"
# {"ok":true,"elapsedMs":1325,"generated":4,"published":4,"resolved":0,"expired":0,"errors":[],"regime":"..."}
```

## Resilience features (all live)

- **CoinPaprika fallback** for `fetchPrices()` when CoinGecko throttles AWS IPs.
- **Bybit fallback** for funding rates (BTC + ETH) when Binance Futures blocks AWS IPs.
- **OKX fallback** for the long/short crowd ratio.
- **Bybit fallback** for cascade-pulse klines.
- **Top-50 breadth-aware regime classifier** with BTC-only fallback.
- **ATR(14) stops** on 30-min OHLC, with regime-tilted multiplier.
- **Static correlation gate** (30-day Pearson) prevents AlphaX/BetaX/GammaX all going same direction on correlated pairs.
- **5% portfolio heat cap** ($1.5K of at-risk dollars across $30K bankroll).
- **Trailing stops** to break-even after profit ≥ original SL distance.
- **Per-(strategy, regime) brain bias EMA** (alpha=0.1) — winners get bigger trades, losers shrink.
- **Outcome resolver** in signal-tick: marks `hit_target` / `hit_stop_loss` / `profit_loss_percent` from CoinGecko OHLC after the fact.
- **Optimistic concurrency** on `autonomous_state` writes (version-gated UPDATE + retry).
- **30-day auto-prune** of `arena_trade_history` (sampled at 1%/tick, ~once per 8h average).

## Monitoring

- **Vercel logs**: https://vercel.com/subthedevs-projects/quantumx/logs?filter=function:%22api%2Fagents%22
- **GitHub Actions** (if Option B): https://github.com/Subthedev/QuantumX/actions
- **Supabase live data**:
  ```sql
  -- Most recent trades
  SELECT * FROM arena_trade_history ORDER BY timestamp DESC LIMIT 20;

  -- Open positions
  SELECT agent_id, symbol, direction, strategy, entry_price, current_price,
         take_profit_price, stop_loss_price
  FROM arena_active_positions ORDER BY entry_time DESC;

  -- Recent signals + outcomes
  SELECT symbol, signal_type, confidence, regime, status,
         hit_target, hit_stop_loss, profit_loss_percent,
         created_at, completed_at
  FROM intelligence_signals
  WHERE created_at > now() - interval '4 hours'
  ORDER BY created_at DESC;

  -- Brain state
  SELECT id, version, updated_at, jsonb_pretty(state) FROM autonomous_state;

  -- Cron health (only with Option A)
  SELECT endpoint, http_status, response->>'ok' AS ok,
         response->>'opened' AS opened, response->>'published' AS published,
         duration_ms, scheduled_at
  FROM tick_runs ORDER BY scheduled_at DESC LIMIT 30;
  ```

## Killing the engine (if needed)

- **Option A in use**: `UPDATE autonomous_state SET state = jsonb_set(state, '{killSwitch}', 'true') WHERE id='singleton';` then trade-tick exits early on every call.
- **Option B in use**: remove the `CRON_SECRET` GitHub repo secret — workflow exits on next run.
- **Both**: drop the cron jobs:
  ```sql
  SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'quantumx-%';
  ```
