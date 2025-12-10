/**
 * Whale Alert Service
 * Real-time whale transaction monitoring with WebSocket support
 * Simulates live whale alerts until we integrate paid APIs (Whale Alert, Nansen)
 */

export interface WhaleTransaction {
  id: string;
  timestamp: number;
  blockchain: string;
  symbol: string;
  amount: number;
  amountUSD: number;
  from: string;
  to: string;
  fromOwner?: string;
  toOwner?: string;
  transactionType: 'exchange_deposit' | 'exchange_withdrawal' | 'whale_transfer' | 'unknown';
  hash: string;
  isSignificant: boolean;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface WhaleAlertSubscription {
  unsubscribe: () => void;
}

export interface WhaleAlertStats {
  coinSymbol: string;
  totalTransactions24h: number;
  totalVolume24h: number;
  whaleAccumulationScore: number;
  whaleDistributionScore: number;
  largestTransaction24h: number;
  averageTransactionSize: number;
  exchangeDeposits: number;
  exchangeWithdrawals: number;
}

type WhaleAlertCallback = (transaction: WhaleTransaction) => void;

class WhaleAlertService {
  private subscribers: Set<WhaleAlertCallback> = new Set();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private transactionCounter = 0;

  // Known exchange addresses for identification
  private readonly EXCHANGES = {
    binance: { name: 'Binance', addresses: ['binance1', 'binance_cold', 'binance_hot'] },
    coinbase: { name: 'Coinbase', addresses: ['coinbase1', 'coinbase_custody'] },
    kraken: { name: 'Kraken', addresses: ['kraken1', 'kraken_cold'] },
    bybit: { name: 'Bybit', addresses: ['bybit1', 'bybit_hot'] },
    okx: { name: 'OKX', addresses: ['okx1', 'okx_hot'] }
  };

  // Supported coins for whale monitoring
  private readonly MONITORED_COINS = [
    { symbol: 'BTC', name: 'Bitcoin', chain: 'Bitcoin', price: 45000, threshold: 50 },
    { symbol: 'ETH', name: 'Ethereum', chain: 'Ethereum', price: 2500, threshold: 200 },
    { symbol: 'SOL', name: 'Solana', chain: 'Solana', price: 100, threshold: 5000 },
    { symbol: 'HYPE', name: 'Hyperliquid', chain: 'Hyperliquid', price: 10, threshold: 50000 },
    { symbol: 'BNB', name: 'BNB', chain: 'BSC', price: 310, threshold: 500 },
    { symbol: 'LINK', name: 'Chainlink', chain: 'Ethereum', price: 15, threshold: 10000 },
    { symbol: 'UNI', name: 'Uniswap', chain: 'Ethereum', price: 8, threshold: 20000 }
  ];

  /**
   * Subscribe to real-time whale alerts
   */
  subscribe(callback: WhaleAlertCallback): WhaleAlertSubscription {
    this.subscribers.add(callback);

    // Start monitoring if not already running
    if (!this.isMonitoring) {
      this.startMonitoring();
    }

    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);

        // Stop monitoring if no subscribers
        if (this.subscribers.size === 0) {
          this.stopMonitoring();
        }
      }
    };
  }

  /**
   * Start monitoring for whale transactions
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    console.log('[Whale Alert] Starting real-time monitoring...');
    this.isMonitoring = true;

    // Simulate whale transactions every 5-15 seconds
    const generateAlert = () => {
      const transaction = this.generateWhaleTransaction();
      this.notifySubscribers(transaction);

      // Schedule next alert with random interval (5-15 seconds)
      const nextInterval = 5000 + Math.random() * 10000;
      this.monitoringInterval = setTimeout(generateAlert, nextInterval);
    };

    // Start generating alerts
    generateAlert();
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('[Whale Alert] Stopping monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearTimeout(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Generate a realistic whale transaction
   */
  private generateWhaleTransaction(): WhaleTransaction {
    // Select random coin
    const coin = this.MONITORED_COINS[Math.floor(Math.random() * this.MONITORED_COINS.length)];

    // Generate transaction amount (above threshold)
    const multiplier = 1 + Math.random() * 10; // 1x - 11x threshold
    const amount = coin.threshold * multiplier;
    const amountUSD = amount * coin.price;

    // Determine transaction type
    const types: WhaleTransaction['transactionType'][] = [
      'exchange_deposit',
      'exchange_withdrawal',
      'whale_transfer',
      'whale_transfer'
    ];
    const transactionType = types[Math.floor(Math.random() * types.length)];

    // Generate addresses based on type
    let from, to, fromOwner, toOwner;

    if (transactionType === 'exchange_deposit') {
      from = this.generateWhaleAddress();
      to = this.generateExchangeAddress();
      fromOwner = 'Unknown Whale';
      toOwner = this.getExchangeOwner(to);
    } else if (transactionType === 'exchange_withdrawal') {
      from = this.generateExchangeAddress();
      to = this.generateWhaleAddress();
      fromOwner = this.getExchangeOwner(from);
      toOwner = 'Unknown Whale';
    } else {
      from = this.generateWhaleAddress();
      to = this.generateWhaleAddress();
      fromOwner = 'Unknown Whale';
      toOwner = 'Unknown Whale';
    }

    // Determine significance
    const significance = this.calculateSignificance(amountUSD);

    this.transactionCounter++;

    return {
      id: `whale_${Date.now()}_${this.transactionCounter}`,
      timestamp: Date.now(),
      blockchain: coin.chain,
      symbol: coin.symbol,
      amount: Math.round(amount * 100) / 100,
      amountUSD: Math.round(amountUSD),
      from,
      to,
      fromOwner,
      toOwner,
      transactionType,
      hash: this.generateTxHash(),
      isSignificant: significance !== 'low',
      significance
    };
  }

  /**
   * Calculate transaction significance
   */
  private calculateSignificance(amountUSD: number): WhaleTransaction['significance'] {
    if (amountUSD >= 10000000) return 'critical'; // $10M+
    if (amountUSD >= 5000000) return 'high'; // $5M+
    if (amountUSD >= 1000000) return 'medium'; // $1M+
    return 'low';
  }

  /**
   * Generate realistic whale address
   */
  private generateWhaleAddress(): string {
    const chars = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Generate exchange address
   */
  private generateExchangeAddress(): string {
    const exchanges = Object.keys(this.EXCHANGES);
    const exchange = exchanges[Math.floor(Math.random() * exchanges.length)] as keyof typeof this.EXCHANGES;
    const addresses = this.EXCHANGES[exchange].addresses;
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  /**
   * Get exchange owner name from address
   */
  private getExchangeOwner(address: string): string {
    for (const [key, value] of Object.entries(this.EXCHANGES)) {
      if (value.addresses.some(addr => address.includes(addr))) {
        return value.name;
      }
    }
    return 'Unknown Exchange';
  }

  /**
   * Generate transaction hash
   */
  private generateTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  /**
   * Notify all subscribers of new transaction
   */
  private notifySubscribers(transaction: WhaleTransaction): void {
    this.subscribers.forEach(callback => {
      try {
        callback(transaction);
      } catch (error) {
        console.error('[Whale Alert] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Get current monitoring status
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Manually trigger a whale alert (for testing)
   */
  triggerTestAlert(): void {
    const transaction = this.generateWhaleTransaction();
    this.notifySubscribers(transaction);
  }

  /**
   * Get recent whale transactions for a specific coin with proper timeframe distribution
   */
  async getRecentWhaleTransactions(coinSymbol?: string, limit: number = 100): Promise<WhaleTransaction[]> {
    const transactions: WhaleTransaction[] = [];

    // Find the coin if specified
    const targetCoin = coinSymbol
      ? this.MONITORED_COINS.find(c => c.symbol.toUpperCase() === coinSymbol.toUpperCase())
      : null;

    // Generate more transactions across a longer time period (7 days) for better timeframe filtering
    const SEVEN_DAYS_MS = 604800000;
    const now = Date.now();

    // Generate transactions with realistic distribution over time
    for (let i = 0; i < limit; i++) {
      // Use target coin if specified, otherwise random
      const coin = targetCoin || this.MONITORED_COINS[Math.floor(Math.random() * this.MONITORED_COINS.length)];

      // Generate transaction amount with more variance
      const multiplier = 0.8 + Math.random() * 15; // More realistic range
      const amount = coin.threshold * multiplier;
      const amountUSD = amount * coin.price;

      // Determine transaction type with realistic distribution
      // More exchange withdrawals (bullish) vs deposits (bearish)
      const rand = Math.random();
      let transactionType: WhaleTransaction['transactionType'];
      if (rand < 0.35) {
        transactionType = 'exchange_withdrawal'; // 35% - bullish
      } else if (rand < 0.55) {
        transactionType = 'exchange_deposit'; // 20% - bearish
      } else {
        transactionType = 'whale_transfer'; // 45% - neutral
      }

      // Generate addresses
      let from, to, fromOwner, toOwner;
      if (transactionType === 'exchange_deposit') {
        from = this.generateWhaleAddress();
        to = this.generateExchangeAddress();
        fromOwner = 'Unknown Whale';
        toOwner = this.getExchangeOwner(to);
      } else if (transactionType === 'exchange_withdrawal') {
        from = this.generateExchangeAddress();
        to = this.generateWhaleAddress();
        fromOwner = this.getExchangeOwner(from);
        toOwner = 'Unknown Whale';
      } else {
        from = this.generateWhaleAddress();
        to = this.generateWhaleAddress();
        fromOwner = 'Unknown Whale';
        toOwner = 'Unknown Whale';
      }

      const significance = this.calculateSignificance(amountUSD);

      // Distribute timestamps realistically across 7 days
      // More recent transactions are more frequent
      const ageWeight = Math.pow(Math.random(), 2); // Skew towards recent
      const maxAge = SEVEN_DAYS_MS;
      const age = maxAge * ageWeight;
      const timestamp = now - age;

      transactions.push({
        id: `whale_${timestamp}_${i}`,
        timestamp,
        blockchain: coin.chain,
        symbol: coin.symbol,
        amount: Math.round(amount * 100) / 100,
        amountUSD: Math.round(amountUSD),
        from,
        to,
        fromOwner,
        toOwner,
        transactionType,
        hash: this.generateTxHash(),
        isSignificant: significance !== 'low',
        significance
      });
    }

    // Sort by timestamp descending (newest first)
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Format amount with symbol
   */
  formatAmount(amount: number, symbol: string): string {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M ${symbol}`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K ${symbol}`;
    return `${amount.toFixed(2)} ${symbol}`;
  }

  /**
   * Format USD amount with proper handling of negative values
   */
  formatUsd(amount: number): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';

    if (absAmount >= 1000000000) return `${sign}$${(absAmount / 1000000000).toFixed(2)}B`;
    if (absAmount >= 1000000) return `${sign}$${(absAmount / 1000000).toFixed(2)}M`;
    if (absAmount >= 1000) return `${sign}$${(absAmount / 1000).toFixed(2)}K`;
    return `${sign}$${absAmount.toFixed(2)}`;
  }

  /**
   * Get aggregated whale statistics for a specific coin
   */
  async getWhaleStats(coinSymbol: string): Promise<WhaleAlertStats> {
    // Find the coin in our monitored list
    const coin = this.MONITORED_COINS.find(c => c.symbol.toUpperCase() === coinSymbol.toUpperCase());

    if (!coin) {
      // Return default stats if coin not found
      return {
        coinSymbol: coinSymbol.toUpperCase(),
        totalTransactions24h: 25 + Math.floor(Math.random() * 40),
        totalVolume24h: 50000000 + Math.random() * 150000000,
        whaleAccumulationScore: 45 + Math.random() * 20,
        whaleDistributionScore: 45 + Math.random() * 20,
        largestTransaction24h: 10000000 + Math.random() * 40000000,
        averageTransactionSize: 2000000 + Math.random() * 8000000,
        exchangeDeposits: 10 + Math.floor(Math.random() * 15),
        exchangeWithdrawals: 12 + Math.floor(Math.random() * 18)
      };
    }

    // Generate realistic stats based on coin
    const transactionCount = 20 + Math.floor(Math.random() * 50);
    const avgTxSize = coin.threshold * coin.price * (1.5 + Math.random() * 3);
    const totalVolume = avgTxSize * transactionCount;

    // Calculate accumulation/distribution bias
    const withdrawals = Math.floor(transactionCount * (0.45 + Math.random() * 0.15));
    const deposits = transactionCount - withdrawals;
    const accumulationScore = Math.round((withdrawals / transactionCount) * 100);

    return {
      coinSymbol: coin.symbol,
      totalTransactions24h: transactionCount,
      totalVolume24h: totalVolume,
      whaleAccumulationScore: accumulationScore,
      whaleDistributionScore: 100 - accumulationScore,
      largestTransaction24h: avgTxSize * (2 + Math.random() * 3),
      averageTransactionSize: avgTxSize,
      exchangeDeposits: deposits,
      exchangeWithdrawals: withdrawals
    };
  }
}

export const whaleAlertService = new WhaleAlertService();
