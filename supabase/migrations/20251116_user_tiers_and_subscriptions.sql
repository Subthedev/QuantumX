-- User Tier and Subscription Management Schema
-- Enables tiered signal distribution (FREE/PRO/MAX)

-- Create enum for user tiers
CREATE TYPE user_tier AS ENUM ('FREE', 'PRO', 'MAX');

-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier user_tier NOT NULL DEFAULT 'FREE',
  status subscription_status NOT NULL DEFAULT 'active',

  -- Stripe integration fields
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Subscription period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active subscription per user
  CONSTRAINT one_subscription_per_user UNIQUE (user_id)
);

-- Daily signal quota tracking
CREATE TABLE IF NOT EXISTS user_signal_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Quota tracking
  signals_received INTEGER DEFAULT 0,
  signals_clicked INTEGER DEFAULT 0,

  -- Reset daily at midnight UTC
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One quota record per user per day
  CONSTRAINT one_quota_per_user_per_day UNIQUE (user_id, date)
);

-- User-specific signals (tier-based distribution)
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL, -- Reference to original signal
  tier user_tier NOT NULL,

  -- Signal data
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('LONG', 'SHORT')),
  confidence NUMERIC NOT NULL,
  quality_score NUMERIC NOT NULL,

  -- Trading data (NULL for FREE tier - locked)
  entry_price NUMERIC,
  take_profit JSONB, -- Array of TP levels
  stop_loss NUMERIC,

  -- Metadata
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  full_details BOOLEAN DEFAULT false,

  -- User interaction
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user doesn't get duplicate signals
  CONSTRAINT unique_user_signal UNIQUE (user_id, signal_id)
);

-- Stripe webhook events log (for debugging and audit)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_signal_quotas_user_date ON user_signal_quotas(user_id, date);
CREATE INDEX idx_user_signals_user_id ON user_signals(user_id);
CREATE INDEX idx_user_signals_signal_id ON user_signals(signal_id);
CREATE INDEX idx_user_signals_expires_at ON user_signals(expires_at);
CREATE INDEX idx_user_signals_tier ON user_signals(tier);
CREATE INDEX idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signal_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own quota
CREATE POLICY "Users can view own quota"
  ON user_signal_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view and update their own signals
CREATE POLICY "Users can view own signals"
  ON user_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own signals"
  ON user_signals FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role full access to subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can manage all quotas
CREATE POLICY "Service role full access to quotas"
  ON user_signal_quotas FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can manage all user signals
CREATE POLICY "Service role full access to signals"
  ON user_signals FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can manage webhook events
CREATE POLICY "Service role full access to webhooks"
  ON stripe_webhook_events FOR ALL
  USING (auth.role() = 'service_role');

-- Function to get user tier (returns FREE if no subscription)
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS user_tier AS $$
DECLARE
  v_tier user_tier;
BEGIN
  SELECT tier INTO v_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW());

  RETURN COALESCE(v_tier, 'FREE'::user_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily signal limit for user
CREATE OR REPLACE FUNCTION get_signal_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tier user_tier;
BEGIN
  v_tier := get_user_tier(p_user_id);

  RETURN CASE v_tier
    WHEN 'FREE' THEN 2
    WHEN 'PRO' THEN 15
    WHEN 'MAX' THEN 30
    ELSE 2
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can receive more signals today
CREATE OR REPLACE FUNCTION can_receive_signal(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_signals_received INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get today's signal count
  SELECT COALESCE(signals_received, 0) INTO v_signals_received
  FROM user_signal_quotas
  WHERE user_id = p_user_id
    AND date = CURRENT_DATE;

  -- Get user's limit
  v_limit := get_signal_limit(p_user_id);

  RETURN v_signals_received < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment signal quota
CREATE OR REPLACE FUNCTION increment_signal_quota(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_signal_quotas (user_id, date, signals_received, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    signals_received = user_signal_quotas.signals_received + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize FREE tier for existing users
INSERT INTO user_subscriptions (user_id, tier, status)
SELECT id, 'FREE'::user_tier, 'active'::subscription_status
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_signal_quotas_updated_at
  BEFORE UPDATE ON user_signal_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_signals_updated_at
  BEFORE UPDATE ON user_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_subscriptions IS 'Manages user subscription tiers (FREE/PRO/MAX) and Stripe integration';
COMMENT ON TABLE user_signal_quotas IS 'Tracks daily signal quota usage per user';
COMMENT ON TABLE user_signals IS 'Stores tier-based signals for individual users with locked/unlocked details';
COMMENT ON TABLE stripe_webhook_events IS 'Logs Stripe webhook events for debugging and audit';
COMMENT ON FUNCTION get_user_tier IS 'Returns user tier (FREE/PRO/MAX), defaults to FREE';
COMMENT ON FUNCTION get_signal_limit IS 'Returns daily signal limit based on user tier';
COMMENT ON FUNCTION can_receive_signal IS 'Checks if user can receive more signals today';
COMMENT ON FUNCTION increment_signal_quota IS 'Increments user signal quota for today';
