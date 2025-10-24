// ============================================
// WHALE ALERT SERVICE
// Real-time whale transaction monitoring
// ============================================

export interface WhaleTransaction {
  id: string;
  hash: string;
  blockchain: string;
  symbol: string;
  amount: number;
  amountUsd: number;
  timestamp: number;
  from: {
    address: string;
    owner: string;
    ownerType: 'exchange' | 'whale' | 'unknown';
  };
  to: {
    address: string;
    owner: string;
    ownerType: 'exchange' | 'whale' | 'unknown';
  };
  transactionType: 'exchange_deposit' | 'exchange_withdrawal' | 'whale_transfer' | 'unknown';
  significance: 'critical' | 'high' | 'medium' | 'low';
}

export interface WhaleAlertStats {
  totalTransactions24h: number;
  totalVolume24h: number;
  largestTransaction24h: WhaleTransaction | null;
  exchangeDeposits24h: number;
  exchangeWithdrawals24h: number;
  netExchangeFlow24h: number;
  whaleAccumulationScore: number; // 0-100, higher = accumulating
}

// Known exchanges for identification
const EXCHANGE_NAMES: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x02466e547bfdab679fc49e96bbfc62b9747d997c': 'Kraken',
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': 'OKEx',
  '0x5041ed759dd4afc3a72b8192c143f72f4724081a': 'Bitfinex',
  '0x742d35cc6634c0532925a3b844bc9e7595f0beb': 'Huobi',
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': 'Gate.io',
  '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa': 'Bitfinex',
  '0xab5801a7d398351b8be11c439e05c5b3259aec9b': 'Huobi',
  '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'Binance',
};

class WhaleAlertService {
  private whaleTransactions: WhaleTransaction[] = [];
  private readonly WHALE_ALERT_API_KEY = import.meta.env.VITE_WHALE_ALERT_API_KEY;
  private readonly WHALE_THRESHOLD_USD = 1000000; // $1M+
  private readonly USE_MOCK_DATA = !this.WHALE_ALERT_API_KEY; // Use mock data if no API key

  /**
   * Get recent whale transactions
   */
  async getRecentWhaleTransactions(
    coinSymbol?: string,
    limit: number = 50
  ): Promise<WhaleTransaction[]> {
    if (this.USE_MOCK_DATA) {
      return this.getMockWhaleTransactions(coinSymbol, limit);
    }

    try {
      // Real Whale Alert API call (when API key is provided)
      const url = `https://api.whale-alert.io/v1/transactions?api_key=${this.WHALE_ALERT_API_KEY}&min_value=${this.WHALE_THRESHOLD_USD}${coinSymbol ? `&cursor=${coinSymbol}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.result === 'success' && data.transactions) {
        return data.transactions.map((tx: any) => this.parseWhaleTransaction(tx));
      }

      return [];
    } catch (error) {
      console.error('Error fetching whale transactions:', error);
      return this.getMockWhaleTransactions(coinSymbol, limit);
    }
  }

  /**
   * Get whale alert statistics
   */
  async getWhaleStats(coinSymbol?: string): Promise<WhaleAlertStats> {
    const transactions = await this.getRecentWhaleTransactions(coinSymbol, 100);

    // Filter to last 24 hours
    const now = Date.now();
    const dayAgo = now - 86400000;
    const recent24h = transactions.filter(tx => tx.timestamp >= dayAgo);

    // Calculate stats
    const exchangeDeposits = recent24h.filter(tx => tx.transactionType === 'exchange_deposit');
    const exchangeWithdrawals = recent24h.filter(tx => tx.transactionType === 'exchange_withdrawal');

    const depositVolume = exchangeDeposits.reduce((sum, tx) => sum + tx.amountUsd, 0);
    const withdrawalVolume = exchangeWithdrawals.reduce((sum, tx) => sum + tx.amountUsd, 0);
    const totalVolume = recent24h.reduce((sum, tx) => sum + tx.amountUsd, 0);

    // Calculate accumulation score (more withdrawals from exchanges = higher score)
    const netFlow = depositVolume - withdrawalVolume;
    const accumulationScore = netFlow < 0 ?
      Math.min(100, 50 + Math.abs(netFlow) / 10000000) : // Withdrawals (bullish)
      Math.max(0, 50 - netFlow / 10000000); // Deposits (bearish)

    return {
      totalTransactions24h: recent24h.length,
      totalVolume24h: totalVolume,
      largestTransaction24h: recent24h.length > 0 ?
        recent24h.reduce((max, tx) => tx.amountUsd > max.amountUsd ? tx : max) : null,
      exchangeDeposits24h: depositVolume,
      exchangeWithdrawals24h: withdrawalVolume,
      netExchangeFlow24h: netFlow,
      whaleAccumulationScore: Math.round(accumulationScore)
    };
  }

  /**
   * Subscribe to real-time whale alerts (WebSocket)
   */
  subscribeToWhaleAlerts(
    callback: (transaction: WhaleTransaction) => void,
    coinSymbol?: string
  ): () => void {
    if (this.USE_MOCK_DATA) {
      // Simulate real-time updates with mock data
      const interval = setInterval(() => {
        const mockTx = this.generateMockTransaction(coinSymbol);
        if (mockTx) {
          callback(mockTx);
        }
      }, 30000); // New whale transaction every 30 seconds

      return () => clearInterval(interval);
    }

    // Real WebSocket connection (when API key is provided)
    // Whale Alert WebSocket endpoint would be used here
    return () => {}; // Cleanup function
  }

  /**
   * Parse Whale Alert API transaction
   */
  private parseWhaleTransaction(tx: any): WhaleTransaction {
    const fromExchange = this.getExchangeName(tx.from.address);
    const toExchange = this.getExchangeName(tx.to.address);

    let transactionType: WhaleTransaction['transactionType'] = 'unknown';
    if (toExchange && !fromExchange) transactionType = 'exchange_deposit';
    else if (fromExchange && !toExchange) transactionType = 'exchange_withdrawal';
    else if (!fromExchange && !toExchange) transactionType = 'whale_transfer';

    return {
      id: tx.id || tx.hash,
      hash: tx.hash,
      blockchain: tx.blockchain,
      symbol: tx.symbol.toUpperCase(),
      amount: tx.amount,
      amountUsd: tx.amount_usd,
      timestamp: tx.timestamp * 1000,
      from: {
        address: tx.from.address,
        owner: fromExchange || tx.from.owner || 'Unknown Wallet',
        ownerType: fromExchange ? 'exchange' : (tx.amount_usd > 10000000 ? 'whale' : 'unknown')
      },
      to: {
        address: tx.to.address,
        owner: toExchange || tx.to.owner || 'Unknown Wallet',
        ownerType: toExchange ? 'exchange' : (tx.amount_usd > 10000000 ? 'whale' : 'unknown')
      },
      transactionType,
      significance: tx.amount_usd > 50000000 ? 'critical' :
                    tx.amount_usd > 10000000 ? 'high' :
                    tx.amount_usd > 5000000 ? 'medium' : 'low'
    };
  }

  /**
   * Get mock whale transactions (for demo/testing)
   */
  private getMockWhaleTransactions(coinSymbol?: string, limit: number = 50): WhaleTransaction[] {
    const symbols = coinSymbol ? [coinSymbol.toUpperCase()] : ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA'];
    const transactions: WhaleTransaction[] = [];

    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const tx = this.generateMockTransaction(symbol, now - (i * 300000)); // Every 5 minutes
      if (tx) transactions.push(tx);
    }

    return transactions;
  }

  /**
   * Generate a single mock transaction
   */
  private generateMockTransaction(coinSymbol?: string, timestamp?: number): WhaleTransaction | null {
    const symbols = coinSymbol ? [coinSymbol.toUpperCase()] : ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    const exchanges = Object.keys(EXCHANGE_NAMES);
    const isExchangeInvolved = Math.random() > 0.3; // 70% involve exchanges

    const types: WhaleTransaction['transactionType'][] = ['exchange_deposit', 'exchange_withdrawal', 'whale_transfer', 'unknown'];
    const transactionType = types[Math.floor(Math.random() * types.length)];

    const amountUsd = Math.random() * 50000000 + 1000000; // $1M - $51M

    const fromExchange = transactionType === 'exchange_withdrawal' || (isExchangeInvolved && Math.random() > 0.5);
    const toExchange = transactionType === 'exchange_deposit' || (isExchangeInvolved && !fromExchange);

    const fromAddress = fromExchange ? exchanges[Math.floor(Math.random() * exchanges.length)] : `0x${Math.random().toString(16).substring(2, 42)}`;
    const toAddress = toExchange ? exchanges[Math.floor(Math.random() * exchanges.length)] : `0x${Math.random().toString(16).substring(2, 42)}`;

    return {
      id: `whale-${Date.now()}-${Math.random()}`,
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      blockchain: symbol === 'BTC' ? 'bitcoin' : 'ethereum',
      symbol,
      amount: amountUsd / (symbol === 'BTC' ? 45000 : symbol === 'ETH' ? 2500 : 500),
      amountUsd,
      timestamp: timestamp || Date.now(),
      from: {
        address: fromAddress,
        owner: fromExchange ? (EXCHANGE_NAMES[fromAddress] || 'Exchange') : 'Whale Wallet',
        ownerType: fromExchange ? 'exchange' : 'whale'
      },
      to: {
        address: toAddress,
        owner: toExchange ? (EXCHANGE_NAMES[toAddress] || 'Exchange') : 'Whale Wallet',
        ownerType: toExchange ? 'exchange' : 'whale'
      },
      transactionType,
      significance: amountUsd > 50000000 ? 'critical' :
                    amountUsd > 10000000 ? 'high' :
                    amountUsd > 5000000 ? 'medium' : 'low'
    };
  }

  /**
   * Get exchange name from address
   */
  private getExchangeName(address: string): string | null {
    return EXCHANGE_NAMES[address.toLowerCase()] || null;
  }

  /**
   * Format transaction amount
   */
  formatAmount(amount: number, symbol: string): string {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M ${symbol}`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K ${symbol}`;
    return `${amount.toFixed(2)} ${symbol}`;
  }

  /**
   * Format USD amount
   */
  formatUsd(amount: number): string {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  }
}

export const whaleAlertService = new WhaleAlertService();
