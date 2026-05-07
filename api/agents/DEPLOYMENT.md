# QuantumX — Autonomous 24/7 Engine: Live Status

## Current state (after commit 5d54339 + local commit 3d01ab3)

| Component | Status | Notes |
|---|---|---|
| Supabase project | ✅ Live | `abdjyaumafnewqjhsjlq` (the older `vidziydspeewmcexqicg` is paused) |
| Vercel deployment | ✅ Healthy | Latest production deploy from `main` |
| `arena_*` + `autonomous_state` tables | ✅ Exist | Migrated already by the prior session |
| Vercel env vars (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) | ✅ Set | Verified via `vercel env ls` |
| `/api/agents/trade-tick` | ✅ 200 | Real engine: 17-strategy matrix + brain bias + portfolio heat + correlation gate + ATR stops + sentiment + cascade intel |
| `/api/agents/signal-tick` | ✅ 200, **publishing signals** | Was crashing with `FUNCTION_INVOCATION_FAILED` before; now publishes to `intelligence_signals` every call |
| `/api/agents/ingest` | ✅ Live | OpenClaw-agent ingest endpoint, gated by `AGENT_INGEST_SECRET` |
| GitHub Actions workflow (`24/7 Autonomous Engine`) | ⚠️ **Local commit only — not pushed** | OAuth token lacks `workflow` scope. See "One thing left" below. |
| GitHub `CRON_SECRET` repo secret | ✅ Set | Verified via `gh secret list` |
| Browser engine | ✅ Read-only | Subscribes to Supabase Realtime; no double-writes |

## How the autonomous loop works

```
┌──────────────────────┐  every 5 min   ┌──────────────────────┐
│ GitHub Actions       │ ─────────────▶ │ Vercel Function       │ ──▶ trade-tick
│ "24/7 Autonomous     │                │ (matrix:              │
│  Engine" workflow    │ ─────────────▶ │  trade-tick +         │ ──▶ signal-tick
└──────────────────────┘                │  signal-tick)         │
                                        └──────────┬───────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────────┐
                                        │ Supabase             │
                                        │  arena_*             │
                                        │  intelligence_signals│
                                        │  autonomous_state    │
                                        └──────────┬───────────┘
                                                   │ Realtime
                                                   ▼
                                        ┌──────────────────────┐
                                        │ Browser viewers       │
                                        │ (read-only)           │
                                        └──────────────────────┘
```

The browser is a viewer, not a writer. No tab needs to be open for trading
or signal generation to continue.

## Verified live (test commands)

```bash
# Both endpoints return 200, signal-tick publishes to intelligence_signals
CRON=$(cat /tmp/quantumx_cron_secret.txt)
URL=https://quantumx.org.in   # or the latest *-subthedevs-projects.vercel.app URL

curl -sS -H "Authorization: Bearer $CRON" "$URL/api/agents/trade-tick"
# {"ok":true,"elapsedMs":1529,"closed":0,"opened":0,"skipReasons":{},"errors":[],"regime":"RANGEBOUND",...}

curl -sS -H "Authorization: Bearer $CRON" "$URL/api/agents/signal-tick"
# {"ok":true,"elapsedMs":1325,"generated":4,"published":4,"skippedDuplicate":0,"expired":0,"errors":[],"regime":"RANGEBOUND"}
```

## ⚠️ One thing left: push the workflow file

The workflow `.github/workflows/trade-tick.yml` is **committed locally** (commit
`3d01ab3`) but cannot be pushed because the local `gh` OAuth token lacks the
`workflow` scope. Pick one of:

### Option A — refresh `gh` scope and push (~30 seconds)

```bash
gh auth refresh -s workflow -h github.com   # interactive — opens browser once
git push origin main                         # workflow now uploads cleanly
```

### Option B — paste it into GitHub web UI

1. Go to https://github.com/Subthedev/QuantumX/new/main/.github/workflows
2. Filename: `trade-tick.yml`
3. Paste the contents of the local file at `.github/workflows/trade-tick.yml`
4. Commit directly to `main`

### Option C — push from a workstation already authed with `workflow` scope

Any environment where `gh auth status` shows `workflow` in scopes can run
`git push origin main` and the file ships.

After the workflow lands on `main`, GitHub's scheduler picks it up
automatically. First run within ~5 min of push. Trigger manually any time:

```bash
gh workflow run "24/7 Autonomous Engine" --repo Subthedev/QuantumX
gh run list --workflow "24/7 Autonomous Engine" --repo Subthedev/QuantumX --limit 5
```

## Known soft failures (non-blocking)

These don't break the engine but cost some intel quality. Worth fixing later
but not urgent — the system trades fine without them.

| Issue | Symptom | Why | Fix |
|---|---|---|---|
| Binance Futures blocked from AWS IPs | `cascadesActive: 0`, `fundingBTC: 0`, `longShortRatio: 1` in trade-tick output | Vercel's outbound IPs are blocked by Binance. The cascade detector and funding-rate intel return zeroes. | Use a Binance proxy (paid CoinGecko futures endpoint, or a tiny edge proxy on a non-AWS provider) |
| CoinGecko occasional throttles | Rare empty response from primary CoinGecko endpoint | Free-tier rate limit | Already mitigated: CoinPaprika fallback fills any pair the CoinGecko call missed (commit 5d54339) |
| Brain still empty (`biasCells: 0`) | `brain.biasCells: 0` in trade-tick output | New project — no closed trades yet to learn from | Self-resolving: every closed trade (TP/SL/timeout) feeds the EMA |

## Monitoring

- **Vercel logs**: https://vercel.com/subthedevs-projects/quantumx/logs?filter=function:%22api%2Fagents%22
- **GitHub Actions** (after Option A/B/C above): https://github.com/Subthedev/QuantumX/actions
- **Supabase**:
  ```sql
  SELECT * FROM arena_active_positions ORDER BY entry_time DESC;
  SELECT * FROM arena_trade_history    ORDER BY timestamp  DESC LIMIT 20;
  SELECT * FROM intelligence_signals
   WHERE created_at > now() - interval '1 hour'
   ORDER BY created_at DESC;
  SELECT id, version, updated_at, jsonb_pretty(state)
    FROM autonomous_state;
  ```

## Rollback (if needed)

1. Disable both crons by removing the `CRON_SECRET` GitHub repo secret —
   the workflow then exits early on every run.
2. Or revert commit `5d54339` to restore the previous behavior. The schema
   is non-destructive; you don't need to roll back any tables.
