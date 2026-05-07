# QuantumX Agent API

Server-side endpoints powering the autonomous trading platform.

## Endpoints

### `POST /api/agents/ingest`
Receives validated signal payloads from the OpenClaw market-intel agent and writes them to `intelligence_signals`. Authenticated with `x-agent-secret` header (`AGENT_INGEST_SECRET`).

### `GET /api/agents/trade-tick`
**24/7 autonomous trading worker.** Runs every 5 minutes via GitHub Actions cron (free; Vercel Hobby restricts cron to once/day, so we trigger from outside). One execution = one trading tick:

1. Fetch live Binance prices for 6 trading pairs.
2. Manage open positions (TP / SL / 60-min timeout) — close any that hit.
3. For each agent without an open position: try to open one using the multi-confirmation signal generator.
4. Persist all state changes to `arena_agent_sessions`, `arena_active_positions`, `arena_trade_history`.

**Authentication:** `Authorization: Bearer ${CRON_SECRET}` header. Vercel Cron sets this automatically; manual triggers must include it.

**Browser engine vs server worker:** the browser `arenaQuantEngine` keeps running for the live UI when a tab is open (faster polling, richer ML stack). The server worker keeps the trading alive 24/7 even when no tab is open. Both write to the same Supabase tables, and the browser engine reads from those tables on startup so its state stays consistent with what the cron has been doing while you were away.

## Required environment variables

| Var | Where | Status |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Production + Preview | ✅ Already set |
| `AGENT_INGEST_SECRET` | Vercel Production + Preview | ✅ Already set |
| `CRON_SECRET` | Vercel Production | ❌ **Add this** |

## Deployment architecture (free tier)

```
┌──────────────────────┐   every 5min    ┌──────────────────────┐
│ GitHub Actions       │ ──────────────▶ │ Vercel Function       │
│ .github/workflows/   │ Bearer token    │ api/agents/           │
│   trade-tick.yml     │                 │   trade-tick.ts       │
└──────────────────────┘                 └──────────┬───────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │ Supabase             │
                                         │  arena_*  tables     │
                                         └──────────────────────┘
```

The browser engine (`arenaQuantEngine`) keeps running for the live UI when a tab is open, sharing the same Supabase tables.

## Required secrets

| Secret | Where | Status |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (Prod + Preview) | ✅ Set |
| `AGENT_INGEST_SECRET` | Vercel env (Prod + Preview) | ✅ Set |
| `CRON_SECRET` | Vercel env (Prod + Preview) | ✅ Set |
| `CRON_SECRET` | GitHub Actions repo secret | ✅ Set |

To rotate `CRON_SECRET`, update both Vercel and GitHub:

```bash
NEW_SECRET=$(openssl rand -base64 32 | tr -d '\n')
printf '%s' "$NEW_SECRET" | vercel env rm CRON_SECRET production -y
printf '%s' "$NEW_SECRET" | vercel env add CRON_SECRET production
echo "$NEW_SECRET" | gh secret set CRON_SECRET --repo Subthedev/QuantumX
vercel --prod # re-deploy so the function reads the new secret
```

## Verification

```bash
# Manual trigger
curl -H "Authorization: Bearer $(cat /tmp/quantumx_cron_secret.txt)" \
  https://quantumx.org.in/api/agents/trade-tick

# Expected response shape:
# { "ok": true, "elapsedMs": 1240, "closed": 0, "opened": 1, "skippedNoSignal": 2, ... }

# Trigger workflow manually
gh workflow run trade-tick.yml --repo Subthedev/QuantumX
gh run list --workflow trade-tick.yml --repo Subthedev/QuantumX --limit 5
```

## Monitoring

- **Vercel logs:** dashboard → quantumx → Logs → filter `[trade-tick]`
- **GitHub Actions:** repo → Actions tab → "24/7 Trading Worker"
- **Supabase:** SQL editor → `SELECT * FROM arena_trade_history ORDER BY timestamp DESC LIMIT 20;`
- **Live agent state:** SQL editor → `SELECT * FROM arena_agent_sessions;`

## Risk parameters (server worker)

These match the post-fix browser engine. Edit in `trade-tick.ts`:

| Param | Value | Reason |
|---|---|---|
| `INITIAL_BALANCE` | $10,000 / agent | $30K total across 3 agents |
| `MAX_POSITION_USD` | $2,500 | Max 25% of balance per trade |
| `MIN_POSITION_USD` | $200 | Don't take trivial trades |
| `MAX_HOLD_MS` | 60 min | Long enough for TPs to materialize |
| `TP_CAP_PERCENT` | 10% | Max realized win per trade |
| `SL_CAP_PERCENT` | 4% | Max loss per trade |
| `MIN_RR` | 1.8:1 | After fees/slippage |
| Cooldowns | 4–6 min | Per-agent, between trades |

Circuit breaker (server side, in `closeTrade`): 3 consecutive losses → caution; 5 → halt for 1 hour; balance drops below $5K → emergency halt for 24 hours.

## Local testing

```bash
# Run a single tick locally against production Supabase
SUPABASE_SERVICE_ROLE_KEY=... CRON_SECRET=test \
  npx vercel dev
# In another terminal:
curl -H "Authorization: Bearer test" http://localhost:3000/api/agents/trade-tick
```
