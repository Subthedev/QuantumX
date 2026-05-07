-- Phase 4: RLS hardening + auth-triggered profile provisioning
-- Worker tables get permissive policies (anon writes, since the MCP
-- doesn't expose service_role for proper bypass; HTTP-layer auth via
-- CRON_SECRET is the actual gate).
-- User-data tables get auth.uid()-scoped policies.

-- ─── Worker tables ─────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'arena_agent_sessions','arena_active_positions','arena_trade_history','arena_market_state',
    'autonomous_state','intelligence_signals','signal_outcomes',
    'market_state_history','flux_market_states','flux_agent_metrics',
    'agent_activity_log','agent_performance',
    'funding_rate_history','order_book_history',
    'signals_pool','signal_selection_runs','rejected_signals'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I',  t, t);
    EXECUTE format(
      'CREATE POLICY %I_all ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- ─── Per-user RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self ON public.profiles;
CREATE POLICY profiles_self ON public.profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_self ON public.user_profiles;
CREATE POLICY user_profiles_self ON public.user_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS user_profiles_public_read ON public.user_profiles;
CREATE POLICY user_profiles_public_read ON public.user_profiles
  FOR SELECT TO anon USING (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_self ON public.user_roles;
CREATE POLICY user_roles_self ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.qx_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_balances_self ON public.qx_balances;
CREATE POLICY qx_balances_self ON public.qx_balances
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.qx_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_predictions_self ON public.qx_predictions;
CREATE POLICY qx_predictions_self ON public.qx_predictions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.qx_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_transactions_self ON public.qx_transactions;
CREATE POLICY qx_transactions_self ON public.qx_transactions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.qx_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_questions_read ON public.qx_questions;
CREATE POLICY qx_questions_read ON public.qx_questions
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.qx_question_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_question_templates_read ON public.qx_question_templates;
CREATE POLICY qx_question_templates_read ON public.qx_question_templates
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.qx_phase_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qx_phase_config_read ON public.qx_phase_config;
CREATE POLICY qx_phase_config_read ON public.qx_phase_config
  FOR SELECT TO anon, authenticated USING (true);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mock_trading_accounts','mock_trading_positions','mock_trading_history',
    'portfolio_holdings','profit_guard_positions',
    'crypto_reports','feedback_responses',
    'user_signals','user_signal_quotas','user_subscriptions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_self ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_self ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t, t
    );
  END LOOP;
END $$;

-- ─── Auth-triggered profile provisioning ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, credits)
  VALUES (NEW.id, NEW.email, 5) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.qx_balances (user_id, balance) VALUES (NEW.id, 1000) ON CONFLICT DO NOTHING;
  INSERT INTO public.mock_trading_accounts (user_id, balance, initial_balance)
  VALUES (NEW.id, 10000, 10000) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_user_id_unique') THEN
    ALTER TABLE public.profiles      ADD CONSTRAINT profiles_user_id_unique      UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profiles_user_id_unique') THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_roles_user_id_unique') THEN
    ALTER TABLE public.user_roles    ADD CONSTRAINT user_roles_user_id_unique    UNIQUE (user_id);
  END IF;
END $$;
