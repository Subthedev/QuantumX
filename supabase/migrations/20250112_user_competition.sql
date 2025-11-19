-- USER COMPETITION TABLES
-- Migration for user profiles, achievements, and competition periods

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Competition stats
  balance NUMERIC DEFAULT 10000,
  initial_balance NUMERIC DEFAULT 10000,
  total_pnl NUMERIC DEFAULT 0,
  total_pnl_percent NUMERIC DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,

  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  achievements TEXT[] DEFAULT '{}',
  win_streak INTEGER DEFAULT 0,
  max_win_streak INTEGER DEFAULT 0,

  -- Metadata
  last_trade_at TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,

  -- Indexes
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20)
);

-- Create competition_periods table
CREATE TABLE IF NOT EXISTS competition_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  prize_amount NUMERIC NOT NULL DEFAULT 0,
  prize_currency TEXT NOT NULL DEFAULT 'USD',
  sponsor TEXT,
  winner_user_id UUID REFERENCES user_profiles(id),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_achievements table (for tracking unlocked achievements)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, achievement_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_pnl ON user_profiles(total_pnl_percent DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_xp ON user_profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_competition_periods_status ON competition_periods(status);
CREATE INDEX IF NOT EXISTS idx_competition_periods_dates ON competition_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
-- Users can read all profiles (for leaderboard)
CREATE POLICY "Users can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for competition_periods
-- Everyone can read competition periods
CREATE POLICY "Anyone can read competitions"
  ON competition_periods FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_achievements
-- Users can read their own achievements
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own achievements (via service)
CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update user stats automatically
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile stats when a position is closed
  IF NEW.status = 'CLOSED' AND OLD.status = 'OPEN' THEN
    UPDATE user_profiles
    SET
      total_trades = total_trades + 1,
      wins = CASE WHEN NEW.profit_loss > 0 THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.profit_loss < 0 THEN losses + 1 ELSE losses END,
      win_rate = (
        CASE WHEN total_trades + 1 > 0
        THEN ((wins + CASE WHEN NEW.profit_loss > 0 THEN 1 ELSE 0 END)::numeric / (total_trades + 1)) * 100
        ELSE 0
        END
      ),
      total_pnl = total_pnl + NEW.profit_loss,
      total_pnl_percent = (
        CASE WHEN initial_balance > 0
        THEN ((balance + NEW.profit_loss - initial_balance) / initial_balance) * 100
        ELSE 0
        END
      ),
      balance = balance + NEW.profit_loss,
      last_trade_at = NEW.closed_at,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user stats
DROP TRIGGER IF EXISTS update_user_stats_trigger ON mock_trading_positions;
CREATE TRIGGER update_user_stats_trigger
  AFTER UPDATE ON mock_trading_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Insert initial demo competition
INSERT INTO competition_periods (name, type, start_date, end_date, prize_amount, status)
VALUES (
  'Demo Week #1',
  'weekly',
  now(),
  now() + interval '7 days',
  0,
  'active'
)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE user_profiles IS 'User profiles for Arena competition with gamification';
COMMENT ON TABLE competition_periods IS 'Weekly/monthly competition periods with prizes';
COMMENT ON TABLE user_achievements IS 'Tracking of unlocked achievements per user';
COMMENT ON COLUMN user_profiles.xp IS 'Experience points for gamification';
COMMENT ON COLUMN user_profiles.level IS 'User level (calculated from XP)';
COMMENT ON COLUMN user_profiles.achievements IS 'Array of unlocked achievement IDs';
COMMENT ON COLUMN user_profiles.win_streak IS 'Current consecutive wins';
COMMENT ON COLUMN user_profiles.is_banned IS 'Flag for anti-gaming enforcement';
