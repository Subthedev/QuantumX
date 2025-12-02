-- ============================================================================
-- Migration: Atomic Position Operations
-- Purpose: Fix race conditions and ensure data integrity for position operations
-- Date: December 3, 2025
-- Part of: Phase 2 - Critical Bug Fixes
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS open_position_atomic;
DROP FUNCTION IF EXISTS close_position_atomic;

-- ============================================================================
-- FUNCTION: open_position_atomic
-- Purpose: Atomically open a position with proper balance checking and updates
-- Benefits:
--   1. Uses SELECT FOR UPDATE to lock the account row
--   2. Validates balance before creating position
--   3. All operations happen in single transaction
--   4. Prevents phantom reads and lost updates
-- ============================================================================
CREATE OR REPLACE FUNCTION open_position_atomic(
  p_user_id TEXT,
  p_symbol TEXT,
  p_side TEXT,
  p_quantity DECIMAL,
  p_entry_price DECIMAL,
  p_leverage INTEGER DEFAULT 1,
  p_strategy TEXT DEFAULT 'Manual',
  p_agent_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_account RECORD;
  v_position_cost DECIMAL;
  v_position_id UUID;
  v_trading_fee DECIMAL := 0.001; -- 0.1% fee
  v_total_cost DECIMAL;
BEGIN
  -- Lock account row for update (prevents race conditions)
  SELECT * INTO v_account
  FROM mock_trading_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if account exists
  IF v_account IS NULL THEN
    -- Create account with default balance
    INSERT INTO mock_trading_accounts (user_id, balance, initial_balance, total_trades, winning_trades, total_profit_loss)
    VALUES (p_user_id, 10000, 10000, 0, 0, 0)
    RETURNING * INTO v_account;
  END IF;

  -- Calculate position cost
  v_position_cost := p_quantity * p_entry_price / p_leverage;
  v_total_cost := v_position_cost * (1 + v_trading_fee);

  -- Check sufficient balance
  IF v_account.balance < v_total_cost THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'required', v_total_cost,
      'available', v_account.balance
    );
  END IF;

  -- Generate position ID
  v_position_id := gen_random_uuid();

  -- Insert position
  INSERT INTO mock_trading_positions (
    id,
    user_id,
    symbol,
    side,
    quantity,
    entry_price,
    current_price,
    leverage,
    status,
    unrealized_pnl,
    unrealized_pnl_percent,
    opened_at,
    strategy,
    agent_id
  ) VALUES (
    v_position_id,
    p_user_id,
    p_symbol,
    p_side,
    p_quantity,
    p_entry_price,
    p_entry_price,
    p_leverage,
    'OPEN',
    0,
    0,
    NOW(),
    p_strategy,
    p_agent_id
  );

  -- Deduct cost from balance
  UPDATE mock_trading_accounts
  SET
    balance = balance - v_total_cost,
    total_trades = total_trades + 1
  WHERE user_id = p_user_id;

  -- Return success with position details
  RETURN json_build_object(
    'success', true,
    'position_id', v_position_id,
    'cost', v_total_cost,
    'remaining_balance', v_account.balance - v_total_cost
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will automatically rollback
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: close_position_atomic
-- Purpose: Atomically close a position with proper P&L calculation and balance update
-- Benefits:
--   1. Ensures position exists and is OPEN before closing
--   2. Calculates P&L atomically
--   3. Updates balance and history in single transaction
--   4. Prevents double-close race conditions
-- ============================================================================
CREATE OR REPLACE FUNCTION close_position_atomic(
  p_user_id TEXT,
  p_position_id UUID,
  p_exit_price DECIMAL
) RETURNS JSON AS $$
DECLARE
  v_position RECORD;
  v_account RECORD;
  v_profit_loss DECIMAL;
  v_profit_loss_percent DECIMAL;
  v_order_value DECIMAL;
  v_exit_value DECIMAL;
  v_fees DECIMAL;
  v_trading_fee DECIMAL := 0.001; -- 0.1% fee
  v_is_win BOOLEAN;
  v_duration_minutes INTEGER;
BEGIN
  -- Lock position row for update
  SELECT * INTO v_position
  FROM mock_trading_positions
  WHERE id = p_position_id AND user_id = p_user_id
  FOR UPDATE;

  -- Check position exists
  IF v_position IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Position not found'
    );
  END IF;

  -- Check position is still open
  IF v_position.status = 'CLOSED' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Position already closed'
    );
  END IF;

  -- Lock account row
  SELECT * INTO v_account
  FROM mock_trading_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Calculate values
  v_order_value := v_position.quantity * v_position.entry_price;
  v_exit_value := v_position.quantity * p_exit_price;
  v_fees := (v_order_value + v_exit_value) * v_trading_fee;

  -- Calculate P&L based on position side
  IF v_position.side = 'BUY' THEN
    -- LONG: Profit when price goes UP
    v_profit_loss := (p_exit_price - v_position.entry_price) * v_position.quantity - v_fees;
  ELSE
    -- SHORT: Profit when price goes DOWN
    v_profit_loss := (v_position.entry_price - p_exit_price) * v_position.quantity - v_fees;
  END IF;

  v_profit_loss_percent := (v_profit_loss / v_order_value) * 100;
  v_is_win := v_profit_loss > 0;
  v_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_position.opened_at)) / 60;

  -- Update position to CLOSED
  UPDATE mock_trading_positions
  SET
    status = 'CLOSED',
    current_price = p_exit_price,
    unrealized_pnl = v_profit_loss,
    unrealized_pnl_percent = v_profit_loss_percent,
    closed_at = NOW()
  WHERE id = p_position_id;

  -- Update account balance with realized P&L
  UPDATE mock_trading_accounts
  SET
    balance = balance + v_order_value + v_profit_loss, -- Return original cost + P&L
    total_profit_loss = total_profit_loss + v_profit_loss,
    winning_trades = winning_trades + CASE WHEN v_is_win THEN 1 ELSE 0 END
  WHERE user_id = p_user_id;

  -- Insert into history
  INSERT INTO mock_trading_history (
    user_id,
    symbol,
    side,
    quantity,
    entry_price,
    exit_price,
    profit_loss,
    profit_loss_percent,
    duration_minutes,
    leverage,
    strategy,
    agent_id,
    closed_at
  ) VALUES (
    p_user_id,
    v_position.symbol,
    v_position.side,
    v_position.quantity,
    v_position.entry_price,
    p_exit_price,
    v_profit_loss,
    v_profit_loss_percent,
    v_duration_minutes,
    v_position.leverage,
    v_position.strategy,
    v_position.agent_id,
    NOW()
  );

  -- Return success with P&L details
  RETURN json_build_object(
    'success', true,
    'position_id', p_position_id,
    'profit_loss', v_profit_loss,
    'profit_loss_percent', v_profit_loss_percent,
    'is_win', v_is_win,
    'new_balance', v_account.balance + v_order_value + v_profit_loss
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will automatically rollback
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: create_account_with_lock
-- Purpose: Atomically create account if not exists (prevents duplicate accounts)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_account_with_lock(
  p_user_id TEXT,
  p_initial_balance DECIMAL DEFAULT 10000
) RETURNS JSON AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Try to get existing account with lock
  SELECT * INTO v_account
  FROM mock_trading_accounts
  WHERE user_id = p_user_id
  FOR UPDATE SKIP LOCKED;

  -- If account exists, return it
  IF v_account IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'created', false,
      'account', row_to_json(v_account)
    );
  END IF;

  -- Create new account
  INSERT INTO mock_trading_accounts (user_id, balance, initial_balance, total_trades, winning_trades, total_profit_loss)
  VALUES (p_user_id, p_initial_balance, p_initial_balance, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_account;

  -- Check if we created it or someone else did
  IF v_account IS NULL THEN
    -- Someone else created it, fetch the existing one
    SELECT * INTO v_account
    FROM mock_trading_accounts
    WHERE user_id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'created', true,
    'account', row_to_json(v_account)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant execute permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION open_position_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION close_position_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_with_lock TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION open_position_atomic IS 'Atomically opens a trading position with balance validation and account locking';
COMMENT ON FUNCTION close_position_atomic IS 'Atomically closes a trading position with P&L calculation and balance update';
COMMENT ON FUNCTION create_account_with_lock IS 'Creates trading account if not exists with race condition prevention';
