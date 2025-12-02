# QuantumX Deployment Runbook

**Version**: 1.0
**Date**: December 3, 2025
**Status**: Ready for Production

---

## Pre-Deployment Checklist

### 1. Security Verification

- [ ] **API Keys Rotated**
  - [ ] Supabase anon key rotated
  - [ ] Supabase service role key rotated
  - [ ] MARKETING_API_KEY regenerated (256-bit random)
  - [ ] Old keys invalidated
  - [ ] `.env` file NOT committed to repository

- [ ] **Rate Limiting Active**
  - [ ] Marketing API: 20 requests/minute/IP
  - [ ] Global limit: 100 requests/minute

- [ ] **RLS Policies Verified**
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND tablename IN (
    'mock_trading_accounts', 'mock_trading_positions',
    'qx_predictions', 'qx_balances'
  );
  ```

### 2. Database Migrations

- [ ] **Run migrations in Supabase Dashboard**
  - URL: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new
  - File: `APPLY_MIGRATIONS.sql`

- [ ] **Verify migrations applied**
  ```sql
  -- Check functions
  SELECT routine_name FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name IN (
    'assign_early_bird', 'capture_phase_multiplier',
    'open_position_atomic', 'close_position_atomic',
    'create_account_with_lock'
  );

  -- Check triggers
  SELECT trigger_name FROM information_schema.triggers
  WHERE trigger_schema = 'public' AND trigger_name IN (
    'trigger_early_bird', 'trigger_capture_phase_multiplier'
  );

  -- Check index
  SELECT indexname FROM pg_indexes
  WHERE indexname = 'idx_qx_predictions_early_bird';
  ```

### 3. Edge Functions Deployed

- [ ] **Deploy marketing-stats**
  ```bash
  supabase functions deploy marketing-stats --no-verify-jwt
  ```

- [ ] **Verify deployment**
  ```bash
  supabase functions list
  ```

### 4. Frontend Build

- [ ] **Build passes without errors**
  ```bash
  npm run build
  ```

- [ ] **No TypeScript errors**
  ```bash
  npm run lint
  ```

---

## Deployment Steps

### Step 1: Backup Current State

```bash
# Export current database state (optional but recommended)
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Apply Database Migrations

1. Open Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new

2. Copy contents of `APPLY_MIGRATIONS.sql`

3. Execute and verify no errors

4. Run verification queries from `tests/phase5_data_integrity.sql`

### Step 3: Deploy Edge Functions

```bash
# Deploy marketing-stats function
supabase functions deploy marketing-stats --no-verify-jwt

# Verify deployment
supabase functions list
```

### Step 4: Deploy Frontend

```bash
# Build production bundle
npm run build

# Deploy via Lovable
# Go to https://lovable.dev/projects/57d6bca7-49bd-403e-926e-e0201d02729c
# Click Share → Publish
```

### Step 5: Verify Deployment

1. **Check marketing API**:
   ```bash
   curl -X GET "https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=arena" \
     -H "x-api-key: YOUR_API_KEY"
   ```

2. **Check frontend loads**: https://ignitex.live

3. **Check Arena agents are trading** (browser console):
   ```javascript
   monitoringService.getMetrics()
   monitoringService.printDashboard()
   ```

---

## Rollback Procedures

### Rollback Database Migrations

**WARNING**: Only use if critical issues discovered

```sql
-- Revert triggers
DROP TRIGGER IF EXISTS trigger_early_bird ON qx_predictions;
DROP TRIGGER IF EXISTS trigger_capture_phase_multiplier ON qx_questions;

-- Revert functions
DROP FUNCTION IF EXISTS assign_early_bird();
DROP FUNCTION IF EXISTS capture_phase_multiplier();
DROP FUNCTION IF EXISTS open_position_atomic;
DROP FUNCTION IF EXISTS close_position_atomic;
DROP FUNCTION IF EXISTS create_account_with_lock;

-- Restore from backup if needed
-- psql -f backup_YYYYMMDD_HHMMSS.sql
```

### Rollback Edge Functions

```bash
# Deploy previous version
# (Keep backup of previous index.ts before deploying)
supabase functions deploy marketing-stats --no-verify-jwt
```

### Rollback Frontend

1. Revert commit in git
2. Rebuild: `npm run build`
3. Redeploy via Lovable

---

## Post-Deployment Monitoring

### First Hour

1. **Check error logs**:
   ```bash
   supabase functions logs marketing-stats --limit 100
   ```

2. **Monitor Arena trades** (browser console):
   ```javascript
   // Print monitoring dashboard every 5 minutes
   setInterval(() => monitoringService.printDashboard(), 5 * 60 * 1000);
   ```

3. **Check for P&L discrepancies**:
   ```sql
   SELECT * FROM tests/phase5_data_integrity.sql
   -- Run "P&L Discrepancy Check" query
   ```

### First Day

1. **Run full data integrity check**:
   - Execute all queries in `tests/phase5_data_integrity.sql`

2. **Review alert thresholds**:
   - P&L discrepancy > $1
   - API error rate > 5%
   - Stale positions > 24h

3. **Verify no stuck questions**:
   ```sql
   SELECT * FROM qx_questions
   WHERE (status = 'SCHEDULED' AND opens_at < NOW() - INTERVAL '1 hour')
      OR (status = 'OPEN' AND closes_at < NOW() - INTERVAL '1 hour');
   ```

### First Week

1. Run security tests daily: `tests/phase5_security_tests.sql`
2. Review monitoring metrics
3. Check for performance degradation
4. Verify no new P&L discrepancies accumulated

---

## Emergency Contacts

| Role | Action |
|------|--------|
| Database Issues | Check Supabase Dashboard → Database → Logs |
| Edge Function Errors | `supabase functions logs <function-name>` |
| Frontend Issues | Check browser DevTools → Console |
| API Rate Limiting | Review rate limiter settings in code |

---

## Health Check Endpoints

| Endpoint | Expected Response |
|----------|-------------------|
| Marketing Stats (Arena) | `curl "...?type=arena"` → JSON with agent data |
| Marketing Stats (Oracle) | `curl "...?type=oracle"` → JSON with prediction data |
| Frontend | https://ignitex.live → Page loads without errors |

---

## Monitoring Commands

### Browser Console

```javascript
// Get current metrics
monitoringService.getMetrics()

// Print dashboard
monitoringService.printDashboard()

// Export Prometheus metrics
console.log(monitoringService.exportPrometheusMetrics())

// Check Arena status
arenaService.getAgents()

// Check signal generator status
arenaSignalGenerator.getStatus()

// Enable/disable production mode
arenaSignalGenerator.enableProductionMode()
arenaSignalGenerator.enableDemoMode()
```

### Database Queries

```sql
-- Quick health check
SELECT 'Arena Accounts' as metric, COUNT(*) FROM mock_trading_accounts
UNION ALL SELECT 'Open Positions', COUNT(*) FROM mock_trading_positions WHERE status = 'OPEN'
UNION ALL SELECT 'Trades Today', COUNT(*) FROM mock_trading_history WHERE closed_at >= CURRENT_DATE
UNION ALL SELECT 'Oracle Questions', COUNT(*) FROM qx_questions
UNION ALL SELECT 'Oracle Predictions', COUNT(*) FROM qx_predictions;
```

---

## Appendix: File Locations

| Component | File Path |
|-----------|-----------|
| Monitoring Service | `src/services/monitoringService.ts` |
| Arena Service | `src/services/arenaService.ts` |
| Signal Generator | `src/services/arenaSignalGenerator.ts` |
| Marketing Stats | `supabase/functions/marketing-stats/index.ts` |
| Database Migrations | `APPLY_MIGRATIONS.sql` |
| Stress Tests | `tests/phase5_stress_tests.sh` |
| Data Integrity Tests | `tests/phase5_data_integrity.sql` |
| Security Tests | `tests/phase5_security_tests.sql` |
| Monitoring Queries | `tests/phase5_monitoring_dashboard.sql` |
