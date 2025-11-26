-- =====================================================
-- QX ORACLE CHALLENGE - PREDICTION MARKET TABLES
-- QuantumX Token Distribution via Crypto Predictions
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. QX USER BALANCES
-- Tracks each user's QX token balance and stats
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 NOT NULL,
  total_earned INTEGER DEFAULT 0 NOT NULL,
  total_predictions INTEGER DEFAULT 0 NOT NULL,
  correct_predictions INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  max_streak INTEGER DEFAULT 0 NOT NULL,
  accuracy_percent DECIMAL(5,2) DEFAULT 0 NOT NULL,
  rank INTEGER,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  referral_earnings INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Index for leaderboard queries
CREATE INDEX idx_qx_balances_rank ON qx_balances(balance DESC, correct_predictions DESC);
CREATE INDEX idx_qx_balances_user ON qx_balances(user_id);
CREATE INDEX idx_qx_balances_referral ON qx_balances(referral_code);

-- =====================================================
-- 2. QX QUESTIONS
-- Prediction questions with auto-resolution
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Question metadata
  category TEXT NOT NULL CHECK (category IN ('AGENT', 'PRICE', 'MARKET', 'STRATEGY', 'SPECIAL')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'JACKPOT')),
  title TEXT NOT NULL,
  question_text TEXT NOT NULL,

  -- Options (JSON array of possible answers)
  options JSONB NOT NULL,
  -- Example: [{"id": "A", "text": "AlphaX", "odds": 2.5}, {"id": "B", "text": "BetaX", "odds": 1.8}]

  -- Correct answer (filled when resolved)
  correct_answer TEXT,
  resolution_data JSONB, -- Additional data about resolution (prices, agent stats, etc.)

  -- Rewards
  base_reward INTEGER NOT NULL DEFAULT 200,
  prize_pool INTEGER DEFAULT 0 NOT NULL, -- Total QX to distribute

  -- Timing
  scheduled_slot INTEGER NOT NULL CHECK (scheduled_slot >= 0 AND scheduled_slot < 12), -- 0-11 for 12 slots per day
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  resolves_at TIMESTAMPTZ NOT NULL,

  -- Resolution source for auto-resolution
  resolution_type TEXT NOT NULL CHECK (resolution_type IN (
    'AGENT_WINNER',      -- Which agent performs best
    'AGENT_COMPARISON',  -- Compare two agents
    'PRICE_DIRECTION',   -- BTC/ETH up or down
    'PRICE_THRESHOLD',   -- Will price hit X?
    'PRICE_RANGE',       -- Exact price range
    'MARKET_STATE',      -- Market regime prediction
    'VOLATILITY',        -- High/Low volatility
    'STRATEGY_WINNER',   -- Which strategy wins
    'MANUAL'             -- Manual resolution for special questions
  )),
  resolution_params JSONB, -- Parameters for auto-resolution
  -- Example: {"symbol": "BTC", "timeframe": "1h", "baseline_price": 95000}

  -- Stats
  total_predictions INTEGER DEFAULT 0 NOT NULL,
  prediction_distribution JSONB DEFAULT '{}', -- {"A": 150, "B": 230, "C": 120}

  -- Status
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'CANCELLED')),
  is_featured BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_qx_questions_status ON qx_questions(status);
CREATE INDEX idx_qx_questions_opens_at ON qx_questions(opens_at);
CREATE INDEX idx_qx_questions_closes_at ON qx_questions(closes_at);
CREATE INDEX idx_qx_questions_category ON qx_questions(category);
CREATE INDEX idx_qx_questions_slot ON qx_questions(scheduled_slot, opens_at DESC);

-- =====================================================
-- 3. QX PREDICTIONS
-- User predictions on questions
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES qx_questions(id) ON DELETE CASCADE,

  -- Prediction details
  selected_option TEXT NOT NULL, -- The option ID user selected
  confidence INTEGER DEFAULT 100, -- Optional: user's confidence 1-100

  -- Timing
  predicted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_early_bird BOOLEAN DEFAULT FALSE, -- First 100 predictors
  early_bird_rank INTEGER, -- Position in early bird queue

  -- Result (filled after resolution)
  is_correct BOOLEAN,
  base_reward INTEGER DEFAULT 0,
  streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
  early_bird_bonus INTEGER DEFAULT 0,
  total_reward INTEGER DEFAULT 0, -- base_reward * streak_multiplier + early_bird_bonus

  -- Streak tracking at time of prediction
  streak_at_prediction INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One prediction per user per question
  UNIQUE(user_id, question_id)
);

-- Indexes
CREATE INDEX idx_qx_predictions_user ON qx_predictions(user_id);
CREATE INDEX idx_qx_predictions_question ON qx_predictions(question_id);
CREATE INDEX idx_qx_predictions_result ON qx_predictions(is_correct);
CREATE INDEX idx_qx_predictions_timing ON qx_predictions(predicted_at);

-- =====================================================
-- 4. QX TRANSACTIONS
-- Token movement history
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN (
    'PREDICTION_WIN',    -- Won a prediction
    'EARLY_BIRD_BONUS',  -- Early bird bonus
    'STREAK_BONUS',      -- Streak multiplier bonus
    'REFERRAL_BONUS',    -- Referred user earned QX
    'DAILY_BONUS',       -- Daily login bonus
    'ACHIEVEMENT',       -- Achievement unlock
    'ADMIN_GRANT',       -- Admin granted tokens
    'ADMIN_DEDUCT'       -- Admin deducted tokens
  )),

  amount INTEGER NOT NULL, -- Positive for credits, negative for debits
  balance_after INTEGER NOT NULL, -- Balance after transaction

  -- Reference
  reference_id UUID, -- Link to prediction, achievement, etc.
  reference_type TEXT, -- 'prediction', 'achievement', 'referral'
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_qx_transactions_user ON qx_transactions(user_id);
CREATE INDEX idx_qx_transactions_type ON qx_transactions(type);
CREATE INDEX idx_qx_transactions_created ON qx_transactions(created_at DESC);

-- =====================================================
-- 5. QX LEADERBOARD SNAPSHOTS
-- Daily snapshots for historical leaderboards
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME')),

  -- Top 100 rankings
  rankings JSONB NOT NULL,
  -- Example: [{"rank": 1, "user_id": "...", "username": "...", "balance": 5000, "accuracy": 72.5}]

  -- Aggregate stats
  total_users INTEGER DEFAULT 0,
  total_qx_distributed INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  avg_accuracy DECIMAL(5,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(snapshot_date, snapshot_type)
);

CREATE INDEX idx_qx_snapshots_date ON qx_leaderboard_snapshots(snapshot_date DESC);

-- =====================================================
-- 6. QX STREAKS HISTORY
-- Track streak records for achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_streak_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  streak_length INTEGER NOT NULL,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('WIN', 'LOSS')),

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Questions in this streak
  question_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_qx_streaks_user ON qx_streak_history(user_id);
CREATE INDEX idx_qx_streaks_length ON qx_streak_history(streak_length DESC);

-- =====================================================
-- 7. QUESTION TEMPLATES
-- Reusable question templates for each slot
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_question_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  slot INTEGER NOT NULL CHECK (slot >= 0 AND slot < 12),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,

  -- Template with placeholders
  title_template TEXT NOT NULL,
  question_template TEXT NOT NULL,
  options_template JSONB NOT NULL,

  resolution_type TEXT NOT NULL,
  resolution_params_template JSONB,

  base_reward INTEGER NOT NULL DEFAULT 200,

  is_active BOOLEAN DEFAULT TRUE,
  rotation_weight INTEGER DEFAULT 1, -- Higher = more likely to be selected

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_qx_templates_slot ON qx_question_templates(slot);
CREATE INDEX idx_qx_templates_active ON qx_question_templates(is_active);

-- =====================================================
-- 8. PHASE CONFIGURATION
-- Track prediction market phases
-- =====================================================
CREATE TABLE IF NOT EXISTS qx_phase_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  phase INTEGER NOT NULL UNIQUE, -- 1 = accumulation, 2 = listing
  name TEXT NOT NULL,
  description TEXT,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,

  daily_pool INTEGER DEFAULT 10000, -- QX distributed per day
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Global bonus multiplier

  is_active BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update user stats after prediction resolution
CREATE OR REPLACE FUNCTION update_qx_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when prediction is resolved (is_correct becomes not null)
  IF NEW.is_correct IS NOT NULL AND OLD.is_correct IS NULL THEN
    UPDATE qx_balances
    SET
      balance = balance + COALESCE(NEW.total_reward, 0),
      total_earned = total_earned + COALESCE(NEW.total_reward, 0),
      total_predictions = total_predictions + 1,
      correct_predictions = correct_predictions + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
      current_streak = CASE
        WHEN NEW.is_correct THEN current_streak + 1
        ELSE 0
      END,
      max_streak = GREATEST(max_streak, CASE WHEN NEW.is_correct THEN current_streak + 1 ELSE current_streak END),
      accuracy_percent = CASE
        WHEN (total_predictions + 1) > 0
        THEN ((correct_predictions + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)::DECIMAL / (total_predictions + 1)) * 100
        ELSE 0
      END,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Create transaction record if there's a reward
    IF NEW.total_reward > 0 THEN
      INSERT INTO qx_transactions (user_id, type, amount, balance_after, reference_id, reference_type, description)
      SELECT
        NEW.user_id,
        'PREDICTION_WIN',
        NEW.total_reward,
        balance,
        NEW.id,
        'prediction',
        'Won prediction: ' || COALESCE(NEW.total_reward::TEXT, '0') || ' QX'
      FROM qx_balances WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating stats
DROP TRIGGER IF EXISTS trigger_update_qx_stats ON qx_predictions;
CREATE TRIGGER trigger_update_qx_stats
  AFTER UPDATE ON qx_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_qx_user_stats();

-- Function to update question stats when prediction is made
CREATE OR REPLACE FUNCTION update_qx_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qx_questions
  SET
    total_predictions = total_predictions + 1,
    prediction_distribution = jsonb_set(
      COALESCE(prediction_distribution, '{}'),
      ARRAY[NEW.selected_option],
      to_jsonb(COALESCE((prediction_distribution->NEW.selected_option)::INTEGER, 0) + 1)
    ),
    updated_at = NOW()
  WHERE id = NEW.question_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for question stats
DROP TRIGGER IF EXISTS trigger_update_question_stats ON qx_predictions;
CREATE TRIGGER trigger_update_question_stats
  AFTER INSERT ON qx_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_qx_question_stats();

-- Function to assign early bird status
CREATE OR REPLACE FUNCTION assign_early_bird()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM qx_predictions
  WHERE question_id = NEW.question_id;

  IF current_count <= 100 THEN
    NEW.is_early_bird := TRUE;
    NEW.early_bird_rank := current_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for early bird
DROP TRIGGER IF EXISTS trigger_early_bird ON qx_predictions;
CREATE TRIGGER trigger_early_bird
  BEFORE INSERT ON qx_predictions
  FOR EACH ROW
  EXECUTE FUNCTION assign_early_bird();

-- Function to auto-create user balance record
CREATE OR REPLACE FUNCTION create_qx_balance_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO qx_balances (user_id, referral_code)
  VALUES (NEW.id, encode(gen_random_bytes(4), 'hex'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE qx_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_streak_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qx_phase_config ENABLE ROW LEVEL SECURITY;

-- Balances: Users can read all, but only update their own
CREATE POLICY "Anyone can read balances" ON qx_balances FOR SELECT USING (true);
CREATE POLICY "Users can update own balance" ON qx_balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert balances" ON qx_balances FOR INSERT WITH CHECK (true);

-- Questions: Anyone can read
CREATE POLICY "Anyone can read questions" ON qx_questions FOR SELECT USING (true);

-- Predictions: Users can read all, insert their own
CREATE POLICY "Anyone can read predictions" ON qx_predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert own predictions" ON qx_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: Users can only read their own
CREATE POLICY "Users can read own transactions" ON qx_transactions FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard snapshots: Anyone can read
CREATE POLICY "Anyone can read leaderboard" ON qx_leaderboard_snapshots FOR SELECT USING (true);

-- Streak history: Users can read own
CREATE POLICY "Users can read own streaks" ON qx_streak_history FOR SELECT USING (auth.uid() = user_id);

-- Templates: Anyone can read
CREATE POLICY "Anyone can read templates" ON qx_question_templates FOR SELECT USING (true);

-- Phase config: Anyone can read
CREATE POLICY "Anyone can read phase config" ON qx_phase_config FOR SELECT USING (true);

-- =====================================================
-- SEED DATA: Question Templates for 12 Daily Slots
-- =====================================================

INSERT INTO qx_question_templates (slot, name, category, difficulty, title_template, question_template, options_template, resolution_type, resolution_params_template, base_reward) VALUES
-- Slot 0: 00:00 - Midnight Oracle (Price)
(0, 'Midnight Oracle', 'PRICE', 'MEDIUM',
 'Midnight Oracle: BTC Direction',
 'Which direction will BTC move in the next 4 hours?',
 '[{"id": "UP", "text": "Rise 0.5%+"}, {"id": "FLAT", "text": "Stay flat (±0.5%)"}, {"id": "DOWN", "text": "Drop 0.5%+"}]',
 'PRICE_DIRECTION', '{"symbol": "BTC", "timeframe_hours": 4, "threshold_percent": 0.5}', 500),

-- Slot 1: 02:00 - Agent Duel (Agent)
(1, 'Agent Duel', 'AGENT', 'MEDIUM',
 'Agent Duel: AlphaX vs BetaX',
 'Which agent will have higher P&L in the next 2 hours?',
 '[{"id": "ALPHAX", "text": "AlphaX (The Trend Hunter)"}, {"id": "BETAX", "text": "BetaX (The Reversion Master)"}, {"id": "TIE", "text": "Tie (within 0.1%)"}]',
 'AGENT_COMPARISON', '{"agent1": "alphax", "agent2": "betax", "timeframe_hours": 2}', 500),

-- Slot 2: 04:00 - Volatility Vision (Market)
(2, 'Volatility Vision', 'MARKET', 'HARD',
 'Volatility Vision',
 'Will the next 4 hours be HIGH or LOW volatility?',
 '[{"id": "HIGH", "text": "High Volatility (>2% swings)"}, {"id": "LOW", "text": "Low Volatility (<2% swings)"}]',
 'VOLATILITY', '{"timeframe_hours": 4, "threshold_percent": 2}', 800),

-- Slot 3: 06:00 - Sunrise Prediction (Price)
(3, 'Sunrise Prediction', 'PRICE', 'EASY',
 'Sunrise Prediction: ETH',
 'Will ETH be higher or lower in 2 hours?',
 '[{"id": "HIGHER", "text": "Higher"}, {"id": "LOWER", "text": "Lower"}]',
 'PRICE_DIRECTION', '{"symbol": "ETH", "timeframe_hours": 2, "threshold_percent": 0}', 200),

-- Slot 4: 08:00 - Market Mood (Market)
(4, 'Market Mood', 'MARKET', 'MEDIUM',
 'Market Mood Check',
 'What will the market state be in 2 hours?',
 '[{"id": "BULLISH_HIGH_VOL", "text": "Bullish High Vol"}, {"id": "BULLISH_LOW_VOL", "text": "Bullish Low Vol"}, {"id": "BEARISH_HIGH_VOL", "text": "Bearish High Vol"}, {"id": "BEARISH_LOW_VOL", "text": "Bearish Low Vol"}, {"id": "RANGEBOUND", "text": "Rangebound"}]',
 'MARKET_STATE', '{"timeframe_hours": 2}', 500),

-- Slot 5: 10:00 - Agent Showdown (Agent)
(5, 'Agent Showdown', 'AGENT', 'HARD',
 'Agent Showdown: Best Performer',
 'Which agent will have the best performance in the next 2 hours?',
 '[{"id": "ALPHAX", "text": "AlphaX ⚡"}, {"id": "BETAX", "text": "BetaX 🔷"}, {"id": "GAMMAX", "text": "GammaX 🛡️"}]',
 'AGENT_WINNER', '{"timeframe_hours": 2}', 800),

-- Slot 6: 12:00 - Noon Challenge (Price)
(6, 'Noon Challenge', 'PRICE', 'HARD',
 'Noon Challenge: Price Level',
 'Will BTC break above {{resistance}} or below {{support}} first?',
 '[{"id": "ABOVE", "text": "Break Above {{resistance}}"}, {"id": "BELOW", "text": "Break Below {{support}}"}, {"id": "NEITHER", "text": "Neither (range-bound)"}]',
 'PRICE_THRESHOLD', '{"symbol": "BTC", "timeframe_hours": 4}', 1000),

-- Slot 7: 14:00 - Strategy Pick (Strategy)
(7, 'Strategy Pick', 'STRATEGY', 'MEDIUM',
 'Strategy Pick',
 'Which strategy type will be most profitable today?',
 '[{"id": "MOMENTUM", "text": "Momentum/Trend"}, {"id": "REVERSION", "text": "Mean Reversion"}, {"id": "BREAKOUT", "text": "Breakout/Volatility"}]',
 'STRATEGY_WINNER', '{"timeframe_hours": 8}', 500),

-- Slot 8: 16:00 - Alt Season (Price)
(8, 'Alt Season', 'PRICE', 'MEDIUM',
 'Alt Season: SOL vs ETH',
 'Which will outperform in the next 4 hours?',
 '[{"id": "SOL", "text": "SOL outperforms"}, {"id": "ETH", "text": "ETH outperforms"}, {"id": "TIE", "text": "Tie (within 0.5%)"}]',
 'PRICE_DIRECTION', '{"symbol1": "SOL", "symbol2": "ETH", "timeframe_hours": 4}', 500),

-- Slot 9: 18:00 - Evening Oracle (Price)
(9, 'Evening Oracle', 'PRICE', 'EASY',
 'Evening Oracle: 6-Hour Forecast',
 'Overall market direction for the next 6 hours?',
 '[{"id": "BULLISH", "text": "Bullish (+1%+)"}, {"id": "NEUTRAL", "text": "Neutral (±1%)"}, {"id": "BEARISH", "text": "Bearish (-1%+)"}]',
 'PRICE_DIRECTION', '{"symbol": "BTC", "timeframe_hours": 6, "threshold_percent": 1}', 200),

-- Slot 10: 20:00 - Agent Finale (Agent)
(10, 'Agent Finale', 'AGENT', 'JACKPOT',
 'Agent Finale: Daily Winner',
 'Predict the final daily rankings of all 3 agents!',
 '[{"id": "ABG", "text": "1.AlphaX 2.BetaX 3.GammaX"}, {"id": "AGB", "text": "1.AlphaX 2.GammaX 3.BetaX"}, {"id": "BAG", "text": "1.BetaX 2.AlphaX 3.GammaX"}, {"id": "BGA", "text": "1.BetaX 2.GammaX 3.AlphaX"}, {"id": "GAB", "text": "1.GammaX 2.AlphaX 3.BetaX"}, {"id": "GBA", "text": "1.GammaX 2.BetaX 3.AlphaX"}]',
 'AGENT_WINNER', '{"timeframe_hours": 4, "rank_all": true}', 2000),

-- Slot 11: 22:00 - Night Owl (Price)
(11, 'Night Owl', 'PRICE', 'MEDIUM',
 'Night Owl: Overnight Prediction',
 'BTC overnight direction (next 8 hours)?',
 '[{"id": "PUMP", "text": "Pump (+2%+)"}, {"id": "SLIGHT_UP", "text": "Slight Up (+0.5% to +2%)"}, {"id": "FLAT", "text": "Flat (±0.5%)"}, {"id": "SLIGHT_DOWN", "text": "Slight Down (-0.5% to -2%)"}, {"id": "DUMP", "text": "Dump (-2%+)"}]',
 'PRICE_DIRECTION', '{"symbol": "BTC", "timeframe_hours": 8}', 500);

-- Initialize Phase 1: Accumulation Phase
INSERT INTO qx_phase_config (phase, name, description, starts_at, ends_at, daily_pool, bonus_multiplier, is_active) VALUES
(1, 'Accumulation Phase', 'Earn QX tokens before listing. 10,000 QX distributed daily across 12 predictions.',
 NOW(), NOW() + INTERVAL '60 days', 10000, 1.0, TRUE);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON qx_balances TO authenticated;
GRANT SELECT ON qx_questions TO authenticated;
GRANT SELECT, INSERT ON qx_predictions TO authenticated;
GRANT SELECT ON qx_transactions TO authenticated;
GRANT SELECT ON qx_leaderboard_snapshots TO authenticated;
GRANT SELECT ON qx_streak_history TO authenticated;
GRANT SELECT ON qx_question_templates TO authenticated;
GRANT SELECT ON qx_phase_config TO authenticated;

-- Allow service role full access for auto-resolution
GRANT ALL ON qx_balances TO service_role;
GRANT ALL ON qx_questions TO service_role;
GRANT ALL ON qx_predictions TO service_role;
GRANT ALL ON qx_transactions TO service_role;
GRANT ALL ON qx_leaderboard_snapshots TO service_role;
GRANT ALL ON qx_streak_history TO service_role;
GRANT ALL ON qx_question_templates TO service_role;
GRANT ALL ON qx_phase_config TO service_role;
