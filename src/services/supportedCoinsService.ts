// ============================================
// SUPPORTED COINS SERVICE
// Only show coins with real, validated on-chain data
// ============================================

export interface SupportedCoin {
  id: string;
  symbol: string;
  name: string;
  chain: 'bitcoin' | 'ethereum' | 'binance-smart-chain' | 'polygon-pos' | 'solana' | 'hyperliquid';
  contractAddress?: string;
  dataQuality: 'excellent' | 'good';
  hasRealTimeData: boolean;
}

class SupportedCoinsService {
  // Curated list of coins with REAL on-chain data available
  private readonly SUPPORTED_COINS: SupportedCoin[] = [
    // Bitcoin - Native blockchain with Blockchain.com API
    {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      chain: 'bitcoin',
      dataQuality: 'excellent',
      hasRealTimeData: true
    },
    // Ethereum - Native blockchain with Etherscan API
    {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      chain: 'ethereum',
      dataQuality: 'excellent',
      hasRealTimeData: true
    },
    // Solana - Native blockchain with Solscan API
    {
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      chain: 'solana',
      dataQuality: 'excellent',
      hasRealTimeData: true
    },
    // BNB - Native BSC with BSCScan API
    {
      id: 'binancecoin',
      symbol: 'BNB',
      name: 'BNB',
      chain: 'binance-smart-chain',
      dataQuality: 'excellent',
      hasRealTimeData: true
    },
    // Major ERC-20 tokens with Etherscan API
    {
      id: 'chainlink',
      symbol: 'LINK',
      name: 'Chainlink',
      chain: 'ethereum',
      contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'uniswap',
      symbol: 'UNI',
      name: 'Uniswap',
      chain: 'ethereum',
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'aave',
      symbol: 'AAVE',
      name: 'Aave',
      chain: 'ethereum',
      contractAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'maker',
      symbol: 'MKR',
      name: 'Maker',
      chain: 'ethereum',
      contractAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'the-graph',
      symbol: 'GRT',
      name: 'The Graph',
      chain: 'ethereum',
      contractAddress: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'compound-governance-token',
      symbol: 'COMP',
      name: 'Compound',
      chain: 'ethereum',
      contractAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'curve-dao-token',
      symbol: 'CRV',
      name: 'Curve DAO',
      chain: 'ethereum',
      contractAddress: '0xd533a949740bb3306d119cc777fa900ba034cd52',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    {
      id: 'synthetix-network-token',
      symbol: 'SNX',
      name: 'Synthetix',
      chain: 'ethereum',
      contractAddress: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    // Polygon - Native MATIC
    {
      id: 'matic-network',
      symbol: 'MATIC',
      name: 'Polygon',
      chain: 'polygon-pos',
      dataQuality: 'good',
      hasRealTimeData: true
    },
    // Hyperliquid - Native L1 blockchain
    {
      id: 'hyperliquid',
      symbol: 'HYPE',
      name: 'Hyperliquid',
      chain: 'hyperliquid',
      dataQuality: 'excellent',
      hasRealTimeData: true
    }
  ];

  /**
   * Get all supported coins
   */
  getSupportedCoins(): SupportedCoin[] {
    return this.SUPPORTED_COINS;
  }

  /**
   * Check if a coin is supported
   */
  isCoinSupported(coinId: string): boolean {
    return this.SUPPORTED_COINS.some(coin => coin.id === coinId);
  }

  /**
   * Get supported coin by ID
   */
  getSupportedCoin(coinId: string): SupportedCoin | undefined {
    return this.SUPPORTED_COINS.find(coin => coin.id === coinId);
  }

  /**
   * Get supported coin IDs
   */
  getSupportedCoinIds(): string[] {
    return this.SUPPORTED_COINS.map(coin => coin.id);
  }

  /**
   * Filter crypto list to only supported coins
   */
  filterSupportedCoins<T extends { id: string }>(cryptos: T[]): T[] {
    const supportedIds = new Set(this.getSupportedCoinIds());
    return cryptos.filter(crypto => supportedIds.has(crypto.id));
  }

  /**
   * Get chain-specific supported coins
   */
  getCoinsByChain(chain: SupportedCoin['chain']): SupportedCoin[] {
    return this.SUPPORTED_COINS.filter(coin => coin.chain === chain);
  }

  /**
   * Get data quality badge color
   */
  getQualityColor(quality: SupportedCoin['dataQuality']): string {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30';
      case 'good':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30';
    }
  }
}

export const supportedCoinsService = new SupportedCoinsService();
