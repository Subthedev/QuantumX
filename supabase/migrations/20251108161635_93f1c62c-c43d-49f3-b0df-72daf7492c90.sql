-- Create mock trading tables for realistic paper trading experience

-- Mock trading account balance and stats
CREATE TABLE IF NOT EXISTS public.mock_trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 10000.00,
  initial_balance NUMERIC NOT NULL DEFAULT 10000.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  total_profit_loss NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Mock trading positions (open trades)
CREATE TABLE IF NOT EXISTS public.mock_trading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  unrealized_pnl NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl_percent NUMERIC NOT NULL DEFAULT 0,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  leverage INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mock trading history (closed trades)
CREATE TABLE IF NOT EXISTS public.mock_trading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  profit_loss NUMERIC NOT NULL,
  profit_loss_percent NUMERIC NOT NULL,
  fees NUMERIC NOT NULL DEFAULT 0,
  leverage INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mock_trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trading_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trading_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_trading_accounts
CREATE POLICY "Users can view their own trading account"
  ON public.mock_trading_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading account"
  ON public.mock_trading_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading account"
  ON public.mock_trading_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for mock_trading_positions
CREATE POLICY "Users can view their own positions"
  ON public.mock_trading_positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own positions"
  ON public.mock_trading_positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions"
  ON public.mock_trading_positions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own positions"
  ON public.mock_trading_positions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mock_trading_history
CREATE POLICY "Users can view their own trading history"
  ON public.mock_trading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading history"
  ON public.mock_trading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_mock_trading_accounts_user_id ON public.mock_trading_accounts(user_id);
CREATE INDEX idx_mock_trading_positions_user_id ON public.mock_trading_positions(user_id);
CREATE INDEX idx_mock_trading_positions_status ON public.mock_trading_positions(status);
CREATE INDEX idx_mock_trading_history_user_id ON public.mock_trading_history(user_id);
CREATE INDEX idx_mock_trading_history_created_at ON public.mock_trading_history(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_mock_trading_accounts_updated_at
  BEFORE UPDATE ON public.mock_trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_trading_positions_updated_at
  BEFORE UPDATE ON public.mock_trading_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();