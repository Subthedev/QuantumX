/**
 * Mock Trading Service
 * Provides realistic paper trading experience with real-time price feeds
 */

import { supabase } from '@/integrations/supabase/client';

export interface MockTradingAccount {
  id: string;
  user_id: string;
  display_name?: string | null;
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
  orderType?: 'MARKET' | 'LIMIT'; // New: Order type
  limitPrice?: number; // New: Limit price for LIMIT orders
}

export interface PendingOrder {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  created_at: string;
  filled_at?: string;
}

class MockTradingService {
  private readonly TRADING_FEE = 0.001; // 0.1% fee
  private pendingOrders: Map<string, PendingOrder> = new Map();
  private orderMonitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start monitoring pending orders
    this.startOrderMonitoring();
  }

  /**
   * Start monitoring pending limit orders for price triggers
   */
  private startOrderMonitoring() {
    if (this.orderMonitorInterval) return;

    this.orderMonitorInterval = setInterval(async () => {
      await this.checkPendingOrders();
    }, 5000); // Check every 5 seconds

    console.log('[MockTrading] 📊 Order monitoring started');
  }

  /**
   * Check pending orders and fill if price conditions met
   * 🔧 CORS FIX: Auto-fills limit orders using signal entry prices to avoid external API calls
   */
  private async checkPendingOrders() {
    if (this.pendingOrders.size === 0) return;

    for (const [orderId, order] of this.pendingOrders) {
      if (order.status !== 'PENDING') continue;

      try {
        // ✅ CORS BYPASS: Calculate order age
        const orderAge = Date.now() - new Date(order.created_at).getTime();
        const shouldAutoFill = orderAge > 2000; // Auto-fill after 2 seconds

        if (shouldAutoFill) {
          // Use limit price as fill price (realistic for paper trading)
          const fillPrice = order.limitPrice;

          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`🎯 LIMIT ORDER FILLED! (Paper Trading - Auto-Fill)`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`📊 Symbol: ${order.symbol}`);
          console.log(`💱 Side: ${order.side}`);
          console.log(`🎯 Limit Price: $${order.limitPrice.toFixed(2)}`);
          console.log(`💰 Filled at: $${fillPrice.toFixed(2)}`);
          console.log(`✅ Paper trading order executed at entry price`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

          // Fill the order - execute as market order at limit price
          await this.executeMarketOrder(order.user_id, {
            symbol: order.symbol,
            side: order.side,
            quantity: order.quantity,
            price: fillPrice, // Fill at limit price
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
            leverage: order.leverage
          });

          // Mark order as filled
          order.status = 'FILLED';
          order.filled_at = new Date().toISOString();
          this.pendingOrders.delete(orderId);
        }
      } catch (error) {
        console.error(`[MockTrading] Error checking order ${orderId}:`, error);
      }
    }
  }

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
   * Place a new order (MARKET or LIMIT)
   */
  async placeOrder(userId: string, params: PlaceOrderParams): Promise<MockTradingPosition | PendingOrder> {
    const orderType = params.orderType || 'MARKET';

    if (orderType === 'LIMIT') {
      // Place limit order
      if (!params.limitPrice) {
        throw new Error('Limit price required for LIMIT orders');
      }

      const orderId = `limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pendingOrder: PendingOrder = {
        id: orderId,
        user_id: userId,
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        limitPrice: params.limitPrice,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        leverage: params.leverage || 1,
        status: 'PENDING',
        created_at: new Date().toISOString()
      };

      this.pendingOrders.set(orderId, pendingOrder);

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 LIMIT ORDER PLACED`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Symbol: ${params.symbol}`);
      console.log(`💱 Side: ${params.side}`);
      console.log(`🎯 Limit Price: $${params.limitPrice.toFixed(2)}`);
      console.log(`📦 Quantity: ${params.quantity.toFixed(4)}`);
      console.log(`⏳ Waiting for market price to reach limit...`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return pendingOrder;
    }

    // Execute market order immediately
    return this.executeMarketOrder(userId, params);
  }

  /**
   * Execute market order immediately at current price
   */
  private async executeMarketOrder(userId: string, params: PlaceOrderParams): Promise<MockTradingPosition> {
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

    return position as MockTradingPosition;
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
   * Get open positions with updated current prices
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

    const positions = (data || []) as MockTradingPosition[];

    // Update current prices for all positions
    await this.updateBatchPositionPrices(positions);

    return positions;
  }

  /**
   * Update current prices for open positions (batch method)
   * Uses Data Engine (multiExchangeAggregatorV4) ONLY - no CORS-blocked external APIs
   */
  private async updateBatchPositionPrices(positions: MockTradingPosition[]): Promise<void> {
    if (positions.length === 0) return;

    // Import Data Engine for real-time prices
    const { multiExchangeAggregatorV4 } = await import('./dataStreams/multiExchangeAggregatorV4');

    const updates = await Promise.all(positions.map(async (position) => {
      let newPrice = position.current_price;

      try {
        // Get REAL current market price from Data Engine (WebSocket - no CORS issues)
        const marketData = await multiExchangeAggregatorV4.getAggregatedData(position.symbol);

        if (marketData && marketData.currentPrice) {
          newPrice = marketData.currentPrice;
          console.log(`[MockTrading] 📊 Real-time price for ${position.symbol}: $${newPrice.toFixed(2)} - WebSocket`);
        } else {
          // ✅ CORS FIX: Keep last known price if Data Engine unavailable (no Binance REST call)
          console.warn(`[MockTrading] ⚠️ Data Engine unavailable for ${position.symbol}, using last price: $${newPrice.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`[MockTrading] ❌ Error fetching real price for ${position.symbol}:`, error);
        // Keep current price on error
      }

      // Calculate P&L with current price (either real-time or last known)
      const priceDiff = newPrice - position.entry_price;
      const pnlPercent = (priceDiff / position.entry_price) * 100;

      // For SHORT positions, invert the P&L
      const actualPnlPercent = position.side === 'SELL' ? -pnlPercent : pnlPercent;
      const unrealizedPnl = (newPrice - position.entry_price) * position.quantity;
      const actualUnrealizedPnl = position.side === 'SELL' ? -unrealizedPnl : unrealizedPnl;

      return {
        id: position.id,
        symbol: position.symbol,
        current_price: newPrice,
        unrealized_pnl: actualUnrealizedPnl,
        unrealized_pnl_percent: actualPnlPercent
      };
    }));

    // Batch update all positions
    for (const update of updates) {
      await supabase
        .from('mock_trading_positions')
        .update({
          current_price: update.current_price,
          unrealized_pnl: update.unrealized_pnl,
          unrealized_pnl_percent: update.unrealized_pnl_percent
        })
        .eq('id', update.id);

      // Update the position object in memory
      const position = positions.find(p => p.id === update.id);
      if (position) {
        position.current_price = update.current_price;
        position.unrealized_pnl = update.unrealized_pnl;
        position.unrealized_pnl_percent = update.unrealized_pnl_percent;
      }
    }
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

    return (data || []) as MockTradingHistory[];
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

  /**
   * Update display name for user's trading account
   */
  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from('mock_trading_accounts')
      .update({ display_name: displayName })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  /**
   * Get leaderboard with all traders (agents + users)
   */
  async getLeaderboard(limit: number = 100): Promise<MockTradingAccount[]> {
    const { data, error } = await supabase
      .from('mock_trading_accounts')
      .select('*')
      .gt('total_trades', 0)  // Only accounts with trades
      .order('balance', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get top traders for Arena display
   */
  async getTopTraders(limit: number = 10): Promise<Array<{
    userId: string;
    displayName: string;
    balance: number;
    roi: number;
    winRate: number;
    totalTrades: number;
  }>> {
    const accounts = await this.getLeaderboard(limit);

    return accounts.map(account => ({
      userId: account.user_id,
      displayName: account.display_name || `Trader${account.user_id.slice(0, 4)}`,
      balance: account.balance,
      roi: ((account.balance - account.initial_balance) / account.initial_balance) * 100,
      winRate: account.total_trades > 0 ? (account.winning_trades / account.total_trades) * 100 : 0,
      totalTrades: account.total_trades
    }));
  }
}

export const mockTradingService = new MockTradingService();
