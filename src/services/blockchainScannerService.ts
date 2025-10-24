// ============================================
// BLOCKCHAIN SCANNER SERVICE
// Multi-chain blockchain data via Etherscan V2 API
// ============================================

import { coinPlatformMappingService } from './coinPlatformMappingService';

export interface TokenHolderInfo {
  address: string;
  balance: number;
  balancePercentage: number;
  rank: number;
  isExchange: boolean;
  label?: string;
}

export interface WalletTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: number;
  valueUsd: number;
  type: 'send' | 'receive' | 'contract' | 'exchange_deposit' | 'exchange_withdrawal';
  gasUsed?: number;
  gasPrice?: number;
}

export interface TokenInfo {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  holders: number;
}

// Known exchange addresses for flow tracking
const KNOWN_EXCHANGES: Record<string, string[]> = {
  ethereum: [
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 15
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance 16
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', // Binance 17
    '0x9696f59e4d72e237be84ffd425dcad154bf96976', // Binance 18
    '0x4976a4a02f38326660d17bf34b431dc6e2eb2327', // Binance Charity
    '0xd551234ae421e3bcba99a0da6d736074f22192ff', // Binance 1
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', // Binance 2
    '0xab5c66752a9e8167967685f1450532fb96d5d24f', // Binance 10
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', // Coinbase 1
    '0x503828976d22510aad0201ac7ec88293211d23da', // Coinbase 2
    '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740', // Coinbase 3
    '0x3cd751e6b0078be393132286c442345e5dc49699', // Coinbase 4
    '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511', // Coinbase 5
    '0xeb2629a2734e272bcc07bda959863f316f4bd4cf', // Coinbase 6
    '0xd688aea8f7d450909ade10c47faa95707b0682d9', // Coinbase 7
    '0x02466e547bfdab679fc49e96bbfc62b9747d997c', // Kraken 1
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13', // Kraken 2
    '0xe853c56864a2ebe4576a807d26fdc4a0ada51919', // Kraken 3
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', // Kraken 4
    '0xfa52274dd61e1643d2205169732f29114bc240b3', // Kraken 5
    '0x53d284357ec70ce289d6d64134dfac8e511c8a3d', // Kraken 6
    '0x89e51fa8ca5d66cd220baed62ed01e8951aa7c40', // Kraken 7
    '0xae2d4617c862309a3d75a0ffb358c7a5009c673f', // Kraken 8
    '0x43984d578803891dfa9706bdeee6078d80cfc79e', // Kraken 9
    '0x66f820a414680b5bcda5eeca5dea238543f42054', // Kraken 10
    '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', // OKEx 1
    '0x236f9f97e0e62388479bf9e5ba4889e46b0273c3', // OKEx 2
    '0xa7efae728d2936e78bda97dc267687568dd593f3', // OKEx 3
    '0x5041ed759dd4afc3a72b8192c143f72f4724081a', // Bitfinex 1
    '0x1151314c646ce4e0efd76d1af4760ae66a9fe218', // Bitfinex 2
    '0x7727e5113d1d161373623e5f49fd568b4f543a9e', // Bitfinex 3
    '0x4fdd5eb2fb260149a3903859043e962ab89d8ed4', // Bitfinex 4
    '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa', // Bitfinex 5
    '0x742d35cc6634c0532925a3b844bc9e7595f0beb', // Huobi 1
    '0xdc76cd25977e0a5ae17155770273ad58648900d3', // Huobi 2
    '0xab5801a7d398351b8be11c439e05c5b3259aec9b', // Huobi 3
    '0x6748f50f686bfbca6fe8ad62b22228b87f31ff2b', // Huobi 4
    '0xfdb16996831753d5331ff813c29a93c76834a0ad', // Huobi 5
    '0xeee28d484628d41a82d01e21d12e2e78d69920da', // Huobi 6
    '0x5c985e89dde482efe97ea9f1950ad149eb73829b', // Huobi 7
    '0x18916e1a2933cb349145a280473a5de8eb6630cb', // Huobi 8
  ],
  'binance-smart-chain': [
    '0x8894e0a0c962cb723c1976a4421c95949be2d4e3', // Binance BSC
    '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance Hot Wallet
    '0x0d0707963952f2fba59dd06f2b425ace40b492fe', // Gate.io BSC
    '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', // OKX BSC
  ],
  'polygon-pos': [
    '0x0d0707963952f2fba59dd06f2b425ace40b492fe', // Gate.io Polygon
    '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', // OKX Polygon
  ]
};

class BlockchainScannerService {
  private readonly ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken';
  private readonly BASE_URL = 'https://api.etherscan.io/v2/api';
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 120000; // 2 minutes for real-time data
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 4 requests per second (Etherscan free tier: 5/sec)

  /**
   * Get token holder distribution
   */
  async getTokenHolders(
    contractAddress: string,
    chainId: string,
    limit: number = 100
  ): Promise<TokenHolderInfo[]> {
    const cacheKey = `holders-${chainId}-${contractAddress}-${limit}`;

    // Check cache
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    await this.rateLimit();

    try {
      // For Etherscan V2, we need to use the token holder endpoint
      // Note: This might require Pro API for some chains
      const response = await fetch(
        `${this.BASE_URL}?chainid=${this.getChainNumericId(chainId)}&module=token&action=tokenholderlist&contractaddress=${contractAddress}&page=1&offset=${limit}&apikey=${this.ETHERSCAN_API_KEY}`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        const holders: TokenHolderInfo[] = data.result.map((holder: any, index: number) => ({
          address: holder.TokenHolderAddress,
          balance: parseFloat(holder.TokenHolderQuantity),
          balancePercentage: 0, // Will be calculated after getting total supply
          rank: index + 1,
          isExchange: this.isExchangeAddress(holder.TokenHolderAddress, chainId),
          label: this.getAddressLabel(holder.TokenHolderAddress, chainId)
        }));

        this.requestCache.set(cacheKey, { data: holders, timestamp: Date.now() });
        return holders;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching token holders for ${contractAddress}:`, error);
      return [];
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(contractAddress: string, chainId: string): Promise<TokenInfo | null> {
    const cacheKey = `tokeninfo-${chainId}-${contractAddress}`;

    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.BASE_URL}?chainid=${this.getChainNumericId(chainId)}&module=token&action=tokeninfo&contractaddress=${contractAddress}&apikey=${this.ETHERSCAN_API_KEY}`
      );

      const data = await response.json();

      if (data.status === '1' && data.result && data.result.length > 0) {
        const info: TokenInfo = {
          contractAddress,
          name: data.result[0].tokenName,
          symbol: data.result[0].symbol,
          decimals: parseInt(data.result[0].divisor),
          totalSupply: parseFloat(data.result[0].totalSupply),
          holders: 0 // Not always available
        };

        this.requestCache.set(cacheKey, { data: info, timestamp: Date.now() });
        return info;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching token info for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    address: string,
    chainId: string,
    startBlock: number = 0,
    endBlock: number = 99999999,
    page: number = 1,
    offset: number = 100
  ): Promise<WalletTransaction[]> {
    const cacheKey = `tx-${chainId}-${address}-${page}`;

    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.BASE_URL}?chainid=${this.getChainNumericId(chainId)}&module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        const transactions: WalletTransaction[] = data.result.map((tx: any) => ({
          hash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          timestamp: parseInt(tx.timeStamp) * 1000,
          from: tx.from,
          to: tx.to,
          value: parseFloat(tx.value) / 1e18, // Convert from wei
          valueUsd: 0, // Would need price data
          type: this.categorizeTransaction(tx, address, chainId),
          gasUsed: parseInt(tx.gasUsed),
          gasPrice: parseFloat(tx.gasPrice)
        }));

        this.requestCache.set(cacheKey, { data: transactions, timestamp: Date.now() });
        return transactions;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching transactions for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, chainId: string): Promise<number> {
    await this.rateLimit();

    try {
      const response = await fetch(
        `${this.BASE_URL}?chainid=${this.getChainNumericId(chainId)}&module=account&action=balance&address=${address}&tag=latest&apikey=${this.ETHERSCAN_API_KEY}`
      );

      const data = await response.json();

      if (data.status === '1' && data.result) {
        return parseFloat(data.result) / 1e18; // Convert from wei
      }

      return 0;
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Calculate exchange flows for a token
   */
  async calculateExchangeFlows(
    contractAddress: string,
    chainId: string,
    timeframe: '24h' | '7d' = '24h'
  ): Promise<{ inflow: number; outflow: number; netFlow: number }> {
    const exchangeAddresses = KNOWN_EXCHANGES[chainId] || [];
    let totalInflow = 0;
    let totalOutflow = 0;

    // Calculate cutoff timestamp
    const now = Date.now();
    const cutoff = timeframe === '24h' ? now - 86400000 : now - 604800000;

    for (const exchange of exchangeAddresses.slice(0, 5)) { // Limit to top 5 to avoid rate limits
      const transactions = await this.getWalletTransactions(exchange, chainId, 0, 99999999, 1, 100);

      for (const tx of transactions) {
        if (tx.timestamp < cutoff) continue;

        if (tx.to.toLowerCase() === exchange.toLowerCase()) {
          totalInflow += tx.valueUsd;
        } else if (tx.from.toLowerCase() === exchange.toLowerCase()) {
          totalOutflow += tx.valueUsd;
        }
      }
    }

    return {
      inflow: totalInflow,
      outflow: totalOutflow,
      netFlow: totalInflow - totalOutflow
    };
  }

  /**
   * Helper: Get numeric chain ID for Etherscan V2 API
   */
  private getChainNumericId(chainId: string): number {
    const mapping: Record<string, number> = {
      'ethereum': 1,
      'binance-smart-chain': 56,
      'polygon-pos': 137,
      'avalanche': 43114,
      'arbitrum-one': 42161,
      'optimism': 10,
      'base': 8453
    };
    return mapping[chainId] || 1;
  }

  /**
   * Helper: Check if address is a known exchange
   */
  private isExchangeAddress(address: string, chainId: string): boolean {
    const exchanges = KNOWN_EXCHANGES[chainId] || [];
    return exchanges.some(ex => ex.toLowerCase() === address.toLowerCase());
  }

  /**
   * Helper: Get address label
   */
  private getAddressLabel(address: string, chainId: string): string | undefined {
    const lowerAddress = address.toLowerCase();

    if (lowerAddress.includes('binance') || this.isExchangeAddress(address, chainId)) {
      if (lowerAddress.startsWith('0x28c6c06298d514db089934071355e5743bf21d60')) return 'Binance 14';
      if (lowerAddress.startsWith('0x71660c4005ba85c37ccec55d0c4493e66fe775d3')) return 'Coinbase 1';
      if (lowerAddress.startsWith('0x02466e547bfdab679fc49e96bbfc62b9747d997c')) return 'Kraken 1';
      if (lowerAddress.startsWith('0x6cc5f688a315f3dc28a7781717a9a798a59fda7b')) return 'OKEx 1';
      return 'Exchange Wallet';
    }

    return undefined;
  }

  /**
   * Helper: Categorize transaction type
   */
  private categorizeTransaction(tx: any, address: string, chainId: string): WalletTransaction['type'] {
    const isFromExchange = this.isExchangeAddress(tx.from, chainId);
    const isToExchange = this.isExchangeAddress(tx.to, chainId);

    if (tx.from.toLowerCase() === address.toLowerCase()) {
      if (isToExchange) return 'exchange_deposit';
      if (tx.to === '') return 'contract';
      return 'send';
    } else {
      if (isFromExchange) return 'exchange_withdrawal';
      return 'receive';
    }
  }

  /**
   * Rate limiting
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

export const blockchainScannerService = new BlockchainScannerService();
