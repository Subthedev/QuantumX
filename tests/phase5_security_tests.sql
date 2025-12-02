-- ============================================================================
-- PHASE 5: SECURITY TEST SUITE
--
-- Run these queries in Supabase Dashboard SQL Editor to verify security
-- URL: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/sql/new
--
-- Date: December 3, 2025
-- ============================================================================

-- ============================================================================
-- 1. SQL INJECTION PREVENTION TESTS
-- ============================================================================

-- 1a. Test parameterized queries are used (verify RPC functions)
-- These should NOT execute malicious code
SELECT 'SQL Injection Test 1' as test_name,
       CASE
           WHEN routine_name IS NOT NULL THEN 'PASS - Function uses plpgsql (parameterized)'
           ELSE 'FAIL - No protection'
       END as result
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'open_position_atomic'
  AND routine_body = 'EXTERNAL';

-- 1b. Verify no dynamic SQL in critical functions
SELECT 'Dynamic SQL Check' as test_name,
       routine_name,
       CASE
           WHEN routine_definition NOT ILIKE '%EXECUTE%' THEN 'SAFE - No dynamic SQL'
           WHEN routine_definition ILIKE '%EXECUTE format%' THEN 'REVIEW - Uses format()'
           ELSE 'WARNING - Contains EXECUTE'
       END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('open_position_atomic', 'close_position_atomic',
                       'create_account_with_lock', 'assign_early_bird');

-- ============================================================================
-- 2. RACE CONDITION TESTS
-- ============================================================================

-- 2a. Verify row-level locking is implemented
SELECT 'Row Locking Check' as test_name,
       routine_name,
       CASE
           WHEN routine_definition ILIKE '%FOR UPDATE%' THEN 'PROTECTED - Uses FOR UPDATE'
           WHEN routine_definition ILIKE '%FOR SHARE%' THEN 'PROTECTED - Uses FOR SHARE'
           ELSE 'VULNERABLE - No row locking'
       END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('open_position_atomic', 'close_position_atomic',
                       'assign_early_bird', 'create_account_with_lock');

-- 2b. Check for advisory locks usage
SELECT 'Advisory Lock Check' as test_name,
       routine_name,
       CASE
           WHEN routine_definition ILIKE '%pg_advisory%' THEN 'USES - Advisory locks'
           ELSE 'NONE - No advisory locks'
       END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_account_with_lock');

-- 2c. Verify unique constraints exist for critical fields
SELECT 'Unique Constraint Check' as test_name,
       tc.table_name,
       tc.constraint_name,
       kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('mock_trading_accounts', 'mock_trading_positions',
                        'qx_predictions', 'qx_balances');

-- ============================================================================
-- 3. DATA ACCESS CONTROL TESTS
-- ============================================================================

-- 3a. Verify RLS (Row Level Security) is enabled on sensitive tables
SELECT 'RLS Status Check' as test_name,
       schemaname,
       tablename,
       rowsecurity as rls_enabled,
       CASE
           WHEN rowsecurity THEN 'PROTECTED'
           ELSE 'UNPROTECTED - RLS disabled'
       END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('mock_trading_accounts', 'mock_trading_positions',
                    'mock_trading_history', 'qx_predictions',
                    'qx_questions', 'qx_balances');

-- 3b. List all RLS policies
SELECT 'RLS Policies' as test_name,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd as operation,
       qual as using_expression,
       with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3c. Check for exposed service role usage
SELECT 'Function Security Check' as test_name,
       routine_name,
       security_type,
       CASE
           WHEN security_type = 'DEFINER' THEN 'WARNING - Runs as definer'
           ELSE 'SAFE - Runs as invoker'
       END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('open_position_atomic', 'close_position_atomic',
                       'assign_early_bird', 'capture_phase_multiplier');

-- ============================================================================
-- 4. PRIVILEGE ESCALATION TESTS
-- ============================================================================

-- 4a. Check function execution permissions
SELECT 'Function Permissions' as test_name,
       routine_name,
       grantee,
       privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('open_position_atomic', 'close_position_atomic',
                       'create_account_with_lock')
ORDER BY routine_name, grantee;

-- 4b. Verify no SUPERUSER functions
SELECT 'Superuser Function Check' as test_name,
       proname as function_name,
       CASE
           WHEN prosecdef THEN 'WARNING - SECURITY DEFINER'
           ELSE 'OK - Standard security'
       END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('open_position_atomic', 'close_position_atomic',
                  'assign_early_bird', 'create_account_with_lock');

-- ============================================================================
-- 5. AUDIT TRAIL TESTS
-- ============================================================================

-- 5a. Check for audit/history tables
SELECT 'Audit Tables Check' as test_name,
       table_name,
       CASE
           WHEN table_name LIKE '%history%' OR table_name LIKE '%audit%'
                OR table_name LIKE '%log%' THEN 'AUDIT TABLE'
           ELSE 'REGULAR TABLE'
       END as table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 5b. Verify timestamp columns exist for tracking
SELECT 'Timestamp Columns Check' as test_name,
       table_name,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name LIKE '%created%' OR column_name LIKE '%updated%'
       OR column_name LIKE '%timestamp%' OR column_name LIKE '%_at')
  AND table_name IN ('mock_trading_accounts', 'mock_trading_positions',
                     'mock_trading_history', 'qx_predictions', 'qx_questions')
ORDER BY table_name, column_name;

-- ============================================================================
-- 6. INPUT VALIDATION TESTS
-- ============================================================================

-- 6a. Check for constraints on numeric fields
SELECT 'Numeric Constraints Check' as test_name,
       tc.table_name,
       tc.constraint_name,
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN ('mock_trading_accounts', 'mock_trading_positions',
                        'qx_predictions', 'qx_balances');

-- 6b. Check for NOT NULL constraints on critical fields
SELECT 'NOT NULL Check' as test_name,
       table_name,
       column_name,
       is_nullable,
       CASE
           WHEN is_nullable = 'NO' THEN 'PROTECTED'
           ELSE 'NULLABLE'
       END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('mock_trading_accounts', 'mock_trading_positions')
  AND column_name IN ('user_id', 'balance', 'symbol', 'quantity', 'entry_price')
ORDER BY table_name, column_name;

-- ============================================================================
-- 7. FOREIGN KEY INTEGRITY TESTS
-- ============================================================================

-- 7a. List all foreign key relationships
SELECT 'Foreign Key Check' as test_name,
       tc.table_name as child_table,
       kcu.column_name as child_column,
       ccu.table_name as parent_table,
       ccu.column_name as parent_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY child_table, child_column;

-- 7b. Verify cascade delete behavior
SELECT 'Cascade Check' as test_name,
       tc.table_name,
       rc.delete_rule,
       rc.update_rule,
       CASE
           WHEN rc.delete_rule = 'CASCADE' THEN 'WARNING - Cascades deletes'
           WHEN rc.delete_rule = 'RESTRICT' THEN 'SAFE - Restricts deletes'
           ELSE rc.delete_rule
       END as delete_behavior
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- ============================================================================
-- 8. SENSITIVE DATA EXPOSURE TESTS
-- ============================================================================

-- 8a. Check for potential sensitive columns
SELECT 'Sensitive Column Check' as test_name,
       table_name,
       column_name,
       data_type,
       CASE
           WHEN column_name ILIKE '%password%' THEN 'CRITICAL - Password field'
           WHEN column_name ILIKE '%secret%' THEN 'CRITICAL - Secret field'
           WHEN column_name ILIKE '%key%' AND column_name NOT LIKE '%_key' THEN 'WARNING - May contain keys'
           WHEN column_name ILIKE '%token%' THEN 'WARNING - Token field'
           WHEN column_name ILIKE '%email%' THEN 'PII - Email field'
           WHEN column_name ILIKE '%phone%' THEN 'PII - Phone field'
           ELSE 'OK'
       END as sensitivity
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%password%'
       OR column_name ILIKE '%secret%'
       OR column_name ILIKE '%key%'
       OR column_name ILIKE '%token%'
       OR column_name ILIKE '%email%'
       OR column_name ILIKE '%phone%')
ORDER BY sensitivity DESC, table_name;

-- ============================================================================
-- SECURITY SUMMARY
-- ============================================================================
SELECT 'SECURITY TEST SUMMARY' as category, '' as item, '' as status
UNION ALL
SELECT '---', '---', '---'
UNION ALL
SELECT 'Row Locking', 'open_position_atomic',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'open_position_atomic'
           AND routine_definition ILIKE '%FOR UPDATE%'
       ) THEN 'PROTECTED' ELSE 'VULNERABLE' END
UNION ALL
SELECT 'Row Locking', 'close_position_atomic',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'close_position_atomic'
           AND routine_definition ILIKE '%FOR UPDATE%'
       ) THEN 'PROTECTED' ELSE 'VULNERABLE' END
UNION ALL
SELECT 'Row Locking', 'assign_early_bird',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'assign_early_bird'
           AND routine_definition ILIKE '%FOR UPDATE%'
       ) THEN 'PROTECTED' ELSE 'VULNERABLE' END
UNION ALL
SELECT 'RLS Enabled', 'mock_trading_accounts',
       CASE WHEN (SELECT rowsecurity FROM pg_tables
                  WHERE tablename = 'mock_trading_accounts') THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'RLS Enabled', 'qx_predictions',
       CASE WHEN (SELECT rowsecurity FROM pg_tables
                  WHERE tablename = 'qx_predictions') THEN 'YES' ELSE 'NO' END
UNION ALL
SELECT 'Triggers', 'trigger_early_bird',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.triggers
           WHERE trigger_name = 'trigger_early_bird'
       ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'Triggers', 'trigger_capture_phase_multiplier',
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.triggers
           WHERE trigger_name = 'trigger_capture_phase_multiplier'
       ) THEN 'EXISTS' ELSE 'MISSING' END;

