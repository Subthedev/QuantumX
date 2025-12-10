// ============================================
// COIN PLATFORM MAPPING SERVICE
// Maps coin IDs to contract addresses across blockchains
// ============================================

export interface CoinPlatform {
  coinId: string;
  symbol: string;
  name: string;
  platforms: {
    ethereum?: string;
    'binance-smart-chain'?: string;
    'polygon-pos'?: string;
    avalanche?: string;
    'arbitrum-one'?: string;
    optimism?: string;
    base?: string;
    solana?: string;
  };
  hasOnChainData: boolean;
  primaryChain: string; // The main chain this token exists on
}

export interface BlockchainSupport {
  id: string;
  name: string;
  nativeCoin: string;
  scannerApi: 'etherscan' | 'bscscan' | 'polygonscan' | 'blockchain.com' | 'solscan' | 'other';
  apiKeyRequired: boolean;
  freeApiAvailable: boolean;
}

class CoinPlatformMappingService {
  private cache: Map<string, CoinPlatform> = new Map();
  private readonly CACHE_DURATION = 86400000; // 24 hours - contract addresses don't change
  private cacheTimestamps: Map<string, number> = new Map();

  // Supported blockchains with their scanner APIs
  private readonly SUPPORTED_BLOCKCHAINS: BlockchainSupport[] = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      nativeCoin: 'bitcoin',
      scannerApi: 'blockchain.com',
      apiKeyRequired: false,
      freeApiAvailable: true
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      nativeCoin: 'ethereum',
      scannerApi: 'etherscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'binance-smart-chain',
      name: 'BNB Smart Chain',
      nativeCoin: 'binancecoin',
      scannerApi: 'bscscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'polygon-pos',
      name: 'Polygon',
      nativeCoin: 'matic-network',
      scannerApi: 'polygonscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      nativeCoin: 'avalanche-2',
      scannerApi: 'etherscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'arbitrum-one',
      name: 'Arbitrum',
      nativeCoin: 'ethereum',
      scannerApi: 'etherscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'optimism',
      name: 'Optimism',
      nativeCoin: 'ethereum',
      scannerApi: 'etherscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'base',
      name: 'Base',
      nativeCoin: 'ethereum',
      scannerApi: 'etherscan',
      apiKeyRequired: true,
      freeApiAvailable: true
    },
    {
      id: 'solana',
      name: 'Solana',
      nativeCoin: 'solana',
      scannerApi: 'solscan',
      apiKeyRequired: false,
      freeApiAvailable: true
    }
  ];

  /**
   * Get platform data for a coin
   */
  async getCoinPlatforms(coinId: string): Promise<CoinPlatform> {
    // Check cache
    const cached = this.cache.get(coinId);
    const timestamp = this.cacheTimestamps.get(coinId);

    if (cached && timestamp && Date.now() - timestamp < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Fetch from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
      );

      if (!response.ok) {
        console.warn(`Failed to fetch platform data for ${coinId}`);
        return this.getDefaultPlatform(coinId);
      }

      const data = await response.json();

      const platform: CoinPlatform = {
        coinId: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        platforms: data.platforms || {},
        hasOnChainData: this.hasOnChainDataAvailable(data.id, data.platforms || {}),
        primaryChain: this.determinePrimaryChain(data.id, data.platforms || {})
      };

      // Cache the result
      this.cache.set(coinId, platform);
      this.cacheTimestamps.set(coinId, Date.now());

      return platform;
    } catch (error) {
      console.error(`Error fetching platform data for ${coinId}:`, error);
      return this.getDefaultPlatform(coinId);
    }
  }

  /**
   * Check if a coin has on-chain data available
   */
  private hasOnChainDataAvailable(coinId: string, platforms: any): boolean {
    // Native blockchain coins
    const nativeCoins = ['bitcoin', 'ethereum', 'binancecoin', 'matic-network', 'avalanche-2', 'solana'];
    if (nativeCoins.includes(coinId)) return true;

    // Check if token exists on supported chains
    const supportedChains = ['ethereum', 'binance-smart-chain', 'polygon-pos', 'avalanche', 'arbitrum-one', 'optimism', 'base'];

    for (const chain of supportedChains) {
      if (platforms[chain] && platforms[chain] !== '') {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine the primary blockchain for a coin
   */
  private determinePrimaryChain(coinId: string, platforms: any): string {
    // Native coins
    const nativeMapping: Record<string, string> = {
      'bitcoin': 'bitcoin',
      'ethereum': 'ethereum',
      'binancecoin': 'binance-smart-chain',
      'matic-network': 'polygon-pos',
      'avalanche-2': 'avalanche',
      'solana': 'solana'
    };

    if (nativeMapping[coinId]) {
      return nativeMapping[coinId];
    }

    // For tokens, check which chain they're primarily on
    // Priority: Ethereum > BSC > Polygon > Others
    const chainPriority = ['ethereum', 'binance-smart-chain', 'polygon-pos', 'avalanche', 'arbitrum-one', 'optimism', 'base'];

    for (const chain of chainPriority) {
      if (platforms[chain] && platforms[chain] !== '') {
        return chain;
      }
    }

    return 'unknown';
  }

  /**
   * Get contract address for a specific chain
   */
  async getContractAddress(coinId: string, chain: string): Promise<string | null> {
    const platform = await this.getCoinPlatforms(coinId);
    return platform.platforms[chain as keyof typeof platform.platforms] || null;
  }

  /**
   * Get all coins that have on-chain data available
   */
  async filterCoinsWithOnChainData(coinIds: string[]): Promise<string[]> {
    const results = await Promise.all(
      coinIds.map(async (coinId) => {
        const platform = await this.getCoinPlatforms(coinId);
        return platform.hasOnChainData ? coinId : null;
      })
    );

    return results.filter((id): id is string => id !== null);
  }

  /**
   * Get blockchain scanner info for a chain
   */
  getBlockchainScanner(chainId: string): BlockchainSupport | undefined {
    return this.SUPPORTED_BLOCKCHAINS.find(b => b.id === chainId);
  }

  /**
   * Get all supported blockchains
   */
  getSupportedBlockchains(): BlockchainSupport[] {
    return this.SUPPORTED_BLOCKCHAINS;
  }

  /**
   * Batch fetch platform data for multiple coins
   */
  async batchGetCoinPlatforms(coinIds: string[]): Promise<Map<string, CoinPlatform>> {
    const results = new Map<string, CoinPlatform>();

    // Process in chunks of 10 to avoid rate limiting
    const chunkSize = 10;
    for (let i = 0; i < coinIds.length; i += chunkSize) {
      const chunk = coinIds.slice(i, i + chunkSize);

      const chunkResults = await Promise.allSettled(
        chunk.map(coinId => this.getCoinPlatforms(coinId))
      );

      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.set(chunk[index], result.value);
        }
      });

      // Rate limiting: wait 1 second between chunks
      if (i + chunkSize < coinIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Default platform for coins without data
   */
  private getDefaultPlatform(coinId: string): CoinPlatform {
    return {
      coinId,
      symbol: coinId.toUpperCase(),
      name: coinId,
      platforms: {},
      hasOnChainData: false,
      primaryChain: 'unknown'
    };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    const timestamps = Array.from(this.cacheTimestamps.values());
    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null
    };
  }
}

export const coinPlatformMappingService = new CoinPlatformMappingService();
