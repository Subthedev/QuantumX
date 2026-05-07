-- Browser-compatibility schemas (Phase 3)
-- Adds the user-facing tables (Oracle / mock trading / portfolio / profiles)
-- so the React app doesn't crash on missing tables when pointed at the new
-- Supabase project. RLS is hardened in the next migration.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  email               text,
  credits             integer NOT NULL DEFAULT 0,
  feedback_count      integer NOT NULL DEFAULT 0,
  last_feedback_shown timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  username            text,
  total_pnl_percent   numeric DEFAULT 0,
  total_trades        integer DEFAULT 0,
  win_rate            numeric DEFAULT 0,
  level               integer DEFAULT 1,
  xp                  integer DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role    text NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS public.qx_balances (
  user_id    uuid PRIMARY KEY,
  balance    numeric NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qx_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number    integer NOT NULL,
  tier           text NOT NULL,
  difficulty     text,
  question_text  text,
  options        jsonb,
  correct_answer text,
  open_at        timestamptz,
  close_at       timestamptz,
  resolve_at     timestamptz,
  status         text DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qx_predictions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  question_id uuid NOT NULL,
  answer      text,
  is_correct  boolean,
  reward      numeric DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qx_question_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier          text NOT NULL,
  template_data jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qx_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  amount      numeric NOT NULL,
  type        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qx_phase_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_number integer NOT NULL,
  phase_data   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mock_trading_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,
  balance           numeric NOT NULL DEFAULT 10000,
  initial_balance   numeric NOT NULL DEFAULT 10000,
  total_profit_loss numeric NOT NULL DEFAULT 0,
  total_trades      integer NOT NULL DEFAULT 0,
  winning_trades    integer NOT NULL DEFAULT 0,
  losing_trades     integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mock_trading_positions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL,
  symbol                 text NOT NULL,
  side                   text NOT NULL,
  entry_price            numeric NOT NULL,
  current_price          numeric NOT NULL,
  quantity               numeric NOT NULL,
  leverage               numeric NOT NULL DEFAULT 1,
  status                 text NOT NULL DEFAULT 'open',
  stop_loss              numeric,
  take_profit            numeric,
  unrealized_pnl         numeric NOT NULL DEFAULT 0,
  unrealized_pnl_percent numeric NOT NULL DEFAULT 0,
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mock_trading_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  symbol              text NOT NULL,
  side                text NOT NULL,
  entry_price         numeric NOT NULL,
  exit_price          numeric NOT NULL,
  quantity            numeric NOT NULL,
  leverage            numeric NOT NULL DEFAULT 1,
  fees                numeric NOT NULL DEFAULT 0,
  profit_loss         numeric NOT NULL,
  profit_loss_percent numeric NOT NULL,
  duration_minutes    integer,
  opened_at           timestamptz NOT NULL,
  closed_at           timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  coin_id         text NOT NULL,
  coin_name       text NOT NULL,
  coin_symbol     text NOT NULL,
  coin_image      text,
  purchase_price  numeric NOT NULL,
  quantity        numeric NOT NULL,
  notes           text,
  purchase_date   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profit_guard_positions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL,
  coin_id               text NOT NULL,
  coin_name             text NOT NULL,
  coin_symbol           text NOT NULL,
  coin_image            text,
  entry_price           numeric NOT NULL,
  current_price         numeric NOT NULL,
  quantity              numeric NOT NULL,
  investment_period     integer DEFAULT 0,
  timeframe             text DEFAULT '1d',
  profit_levels         jsonb DEFAULT '[]'::jsonb,
  status                text DEFAULT 'active',
  ai_analysis           text,
  last_notification_at  timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crypto_reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  coin_symbol        text NOT NULL,
  confidence_score   numeric NOT NULL,
  prediction_summary text,
  report_data        jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  question_1  text,
  question_2  text,
  question_3  text,
  question_4  text,
  question_5  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rejected_signals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol             text,
  signal_type        text,
  rejection_reason   text,
  confidence_score   numeric,
  data_quality       numeric,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signals_pool (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      text,
  signal_type text,
  confidence  numeric,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signal_selection_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  signal_id   uuid,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_signal_quotas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE,
  daily_used  integer DEFAULT 0,
  daily_limit integer DEFAULT 5,
  reset_at    timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE,
  tier       text DEFAULT 'free',
  status     text DEFAULT 'active',
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_state_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state       text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flux_market_states (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state       text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flux_agent_metrics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text,
  activity_type text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_performance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.funding_rate_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      text,
  rate        numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_book_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
