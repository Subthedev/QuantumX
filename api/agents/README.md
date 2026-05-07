# QuantumX Agent API

Server-side endpoints powering the autonomous trading platform.

## Endpoints

### `POST /api/agents/ingest`
Receives validated signal payloads from the OpenClaw market-intel agent and writes them to `intelligence_signals`. Authenticated with `x-agent-secret` header (`AGENT_INGEST_SECRET`).

### `GET /api/agents/trade-tick`
**24/7 autonomous trading worker.** Runs every minute via Vercel Cron. One execution = one trading tick:

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

## Deploying the 24/7 trader

### 1. Add `CRON_SECRET` to Vercel

```bash
# Generate a strong secret
openssl rand -base64 32
# → e.g. "k05FijKGeRUx+banAIyLpVO8hcbHckmk6Jo8envStik="

# Add to Production
printf 'YOUR_SECRET_HERE' | vercel env add CRON_SECRET production
# Add to Preview if you want to test in preview deployments too
printf 'YOUR_SECRET_HERE' | vercel env add CRON_SECRET preview
```

### 2. Deploy

```bash
vercel --prod
```

Vercel will pick up the `crons` block in `vercel.json` and start firing `/api/agents/trade-tick` every minute.

### 3. Verify

```bash
# Manual trigger to confirm it works
curl -H "Authorization: Bearer YOUR_SECRET_HERE" https://quantumx.org.in/api/agents/trade-tick

# Expected response shape:
# { "ok": true, "elapsedMs": 1240, "closed": 0, "opened": 1, "skippedNoSignal": 2, ... }
```

Then check the Supabase tables — `arena_active_positions` and `arena_trade_history` should start filling up over the next few hours.

### 4. Monitor

- Vercel dashboard → Project → Logs → filter `[trade-tick]`
- Supabase → SQL editor → `SELECT * FROM arena_trade_history ORDER BY timestamp DESC LIMIT 20;`
- Cron status: Vercel dashboard → Project → Settings → Cron Jobs

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
