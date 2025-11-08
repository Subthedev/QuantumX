/**
 * Mock Trading Service
 * Provides realistic paper trading experience with real-time price feeds
 */

import { supabase } from '@/integrations/supabase/client';

export interface MockTradingAccount {
  id: string;
  user_id: string;
  balance: number;
  initial_balance: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_profit_loss: number;
  created_at: string;
  updated_at: string;
}

export interface MockTradingPosition {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  quantity: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  stop_loss?: number;
  take_profit?: number;
  leverage: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
}

export interface MockTradingHistory {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number;
  quantity: number;
  profit_loss: number;
  profit_loss_percent: number;
  fees: number;
  leverage: number;
  duration_minutes?: number;
  opened_at: string;
  closed_at: string;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}

class MockTradingService {
  private readonly TRADING_FEE = 0.001; // 0.1% fee

  /**
   * Get or create trading account for user
   */
  async getOrCreateAccount(userId: string): Promise<MockTradingAccount> {
    // Try to get existing account
    const { data: existing, error: fetchError } = await supabase
      .from('mock_trading_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new account with $10,000 starting balance
    const { data: newAccount, error: createError } = await supabase
      .from('mock_trading_accounts')
      .insert({
        user_id: userId,
        balance: 10000,
        initial_balance: 10000
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return newAccount;
  }

  /**
   * Place a new order
   */
  async placeOrder(userId: string, params: PlaceOrderParams): Promise<MockTradingPosition> {
    const account = await this.getOrCreateAccount(userId);
    
    // Calculate order cost
    const orderValue = params.quantity * params.price;
    const fees = orderValue * this.TRADING_FEE;
    const totalCost = orderValue + fees;

    // Check if user has enough balance
    if (totalCost > account.balance) {
      throw new Error(`Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${account.balance.toFixed(2)}`);
    }

    // Create position
    const { data: position, error: positionError } = await supabase
      .from('mock_trading_positions')
      .insert({
        user_id: userId,
        symbol: params.symbol,
        side: params.side,
        entry_price: params.price,
        quantity: params.quantity,
        current_price: params.price,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
        stop_loss: params.stopLoss,
        take_profit: params.takeProfit,
        leverage: params.leverage || 1,
        status: 'OPEN'
      })
      .select()
      .single();

    if (positionError) {
      throw positionError;
    }

    // Update account balance
    await supabase
      .from('mock_trading_accounts')
      .update({
        balance: account.balance - totalCost,
        total_trades: account.total_trades + 1
      })
      .eq('user_id', userId);

    return position;
  }

  /**
   * Close a position
   */
  async closePosition(userId: string, positionId: string, exitPrice: number): Promise<void> {
    // Get position
    const { data: position, error: fetchError } = await supabase
      .from('mock_trading_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !position) {
      throw new Error('Position not found');
    }

    if (position.status === 'CLOSED') {
      throw new Error('Position already closed');
    }

    // Calculate P&L
    const orderValue = position.quantity * position.entry_price;
    const exitValue = position.quantity * exitPrice;
    const fees = (orderValue + exitValue) * this.TRADING_FEE;
    
    let profitLoss: number;
    if (position.side === 'BUY') {
      profitLoss = (exitPrice - position.entry_price) * position.quantity - fees;
    } else {
      profitLoss = (position.entry_price - exitPrice) * position.quantity - fees;
    }
    
    const profitLossPercent = (profitLoss / orderValue) * 100;

    // Get account
    const account = await this.getOrCreateAccount(userId);

    // Calculate duration
    const openedAt = new Date(position.opened_at);
    const closedAt = new Date();
    const durationMinutes = Math.floor((closedAt.getTime() - openedAt.getTime()) / 60000);

    // Close position
    await supabase
      .from('mock_trading_positions')
      .update({
        status: 'CLOSED',
        current_price: exitPrice,
        unrealized_pnl: profitLoss,
        unrealized_pnl_percent: profitLossPercent,
        closed_at: closedAt.toISOString()
      })
      .eq('id', positionId);

    // Add to history
    await supabase
      .from('mock_trading_history')
      .insert({
        user_id: userId,
        symbol: position.symbol,
        side: position.side,
        entry_price: position.entry_price,
        exit_price: exitPrice,
        quantity: position.quantity,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent,
        fees,
        leverage: position.leverage,
        duration_minutes: durationMinutes,
        opened_at: position.opened_at,
        closed_at: closedAt.toISOString()
      });

    // Return funds + profit to account
    const returnAmount = orderValue + profitLoss;
    const newBalance = account.balance + returnAmount;
    
    const isWinning = profitLoss > 0;
    
    await supabase
      .from('mock_trading_accounts')
      .update({
        balance: newBalance,
        total_profit_loss: account.total_profit_loss + profitLoss,
        winning_trades: account.winning_trades + (isWinning ? 1 : 0),
        losing_trades: account.losing_trades + (isWinning ? 0 : 1)
      })
      .eq('user_id', userId);
  }

  /**
   * Update position prices (called periodically with real-time prices)
   */
  async updatePositionPrices(userId: string, symbol: string, currentPrice: number): Promise<void> {
    const { data: positions, error } = await supabase
      .from('mock_trading_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('status', 'OPEN');

    if (error || !positions || positions.length === 0) {
      return;
    }

    for (const position of positions) {
      const orderValue = position.quantity * position.entry_price;
      let unrealizedPnl: number;
      
      if (position.side === 'BUY') {
        unrealizedPnl = (currentPrice - position.entry_price) * position.quantity;
      } else {
        unrealizedPnl = (position.entry_price - currentPrice) * position.quantity;
      }
      
      const unrealizedPnlPercent = (unrealizedPnl / orderValue) * 100;

      await supabase
        .from('mock_trading_positions')
        .update({
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
          unrealized_pnl_percent: unrealizedPnlPercent
        })
        .eq('id', position.id);

      // Check stop loss / take profit
      if (position.stop_loss && 
          ((position.side === 'BUY' && currentPrice <= position.stop_loss) ||
           (position.side === 'SELL' && currentPrice >= position.stop_loss))) {
        await this.closePosition(userId, position.id, currentPrice);
      }

      if (position.take_profit && 
          ((position.side === 'BUY' && currentPrice >= position.take_profit) ||
           (position.side === 'SELL' && currentPrice <= position.take_profit))) {
        await this.closePosition(userId, position.id, currentPrice);
      }
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions(userId: string): Promise<MockTradingPosition[]> {
    const { data, error } = await supabase
      .from('mock_trading_positions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get trading history
   */
  async getTradingHistory(userId: string, limit: number = 50): Promise<MockTradingHistory[]> {
    const { data, error } = await supabase
      .from('mock_trading_history')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Reset account (for testing)
   */
  async resetAccount(userId: string): Promise<void> {
    // Delete all positions
    await supabase
      .from('mock_trading_positions')
      .delete()
      .eq('user_id', userId);

    // Delete all history
    await supabase
      .from('mock_trading_history')
      .delete()
      .eq('user_id', userId);

    // Reset account
    await supabase
      .from('mock_trading_accounts')
      .update({
        balance: 10000,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_profit_loss: 0
      })
      .eq('user_id', userId);
  }
}

export const mockTradingService = new MockTradingService();
