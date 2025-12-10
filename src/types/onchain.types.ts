// ============================================
// ON-CHAIN ANALYSIS TYPE DEFINITIONS
// ============================================

export interface NetworkHealthMetrics {
  activeAddresses24h: number;
  activeAddressesChange7d: number;
  activeAddressesChange30d: number;
  transactionCount24h: number;
  transactionCountChange7d: number;
  transactionVolume24h: number;
  transactionVolumeChange7d: number;
  averageFee: number;
  averageFeeChange7d: number;
  hashRate?: number; // PoW chains only
  hashRateChange7d?: number;
  difficulty?: number; // PoW chains only
  difficultyChange7d?: number;
  blockTime?: number; // Average block time in seconds
  mempoolSize?: number; // Pending transactions
}

export interface WhaleMetrics {
  largeTransactions24h: number;
  largeTransactionThreshold: number; // USD value defining "whale"
  topHoldersPercentage: number; // % held by top 100 addresses
  top10HoldersPercentage: number; // % held by top 10
  whaleAccumulationScore: number; // 0-100, higher = accumulating
  whaleDistributionScore: number; // 0-100, higher = distributing
  recentLargeTransactions: Array<{
    hash: string;
    value: number;
    valueUsd: number;
    timestamp: number;
    from: string;
    to: string;
    type: 'exchange_deposit' | 'exchange_withdrawal' | 'wallet_transfer' | 'unknown';
  }>;
}

export interface ExchangeFlowMetrics {
  netFlow24h: number; // positive = inflow (bearish), negative = outflow (bullish)
  netFlow7d: number;
  inflow24h: number;
  inflow7d: number;
  outflow24h: number;
  outflow7d: number;
  exchangeBalance: number; // Total on exchanges
  exchangeBalanceChange7d: number;
  exchangeBalancePercentage: number; // % of circulating supply
  flowInterpretation: 'strong_accumulation' | 'accumulation' | 'neutral' | 'distribution' | 'strong_distribution';
  majorExchanges: Array<{
    name: string;
    balance: number;
    change24h: number;
  }>;
}

export interface SupplyMetrics {
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  supplyOnExchanges: number;
  supplyOnExchangesPercentage: number;
  supplyInContracts?: number; // For smart contract platforms
  supplyInContractsPercentage?: number;
  liquidSupply: number; // Recently moved supply
  illiquidSupply: number; // Long-term holder supply
  holderDistribution: {
    whales: number; // > $1M
    whalesPercentage: number;
    investors: number; // $10K - $1M
    investorsPercentage: number;
    retail: number; // < $10K
    retailPercentage: number;
  };
  totalHolders: number;
  holdersChange7d: number;
  concentrationScore: number; // 0-100, higher = more concentrated (risky)
  concentrationIndex?: number; // Deprecated, use concentrationScore instead
  giniCoefficient?: number; // 0-1, wealth distribution inequality
}

export interface TransactionMetrics {
  avgTransactionValue: number;
  avgTransactionValueChange7d: number;
  medianTransactionValue: number;
  totalTransactions24h: number;
  totalTransactions7d: number;
  transactionVelocity: number; // Transactions per second
  activeAddressesRatio: number; // Active/Total addresses
}

export interface DeveloperMetrics {
  githubCommits30d?: number;
  githubCommitsChange?: number;
  githubContributors?: number;
  githubStars?: number;
  codeUpdatesFrequency?: 'high' | 'medium' | 'low' | 'inactive';
  lastCommitDate?: number;
}

export interface StakingMetrics {
  totalStaked?: number;
  totalStakedPercentage?: number;
  stakingYield?: number;
  stakersCount?: number;
  stakingRatio?: number; // Staked/Circulating
}

export interface OnChainData {
  coin: string;
  coinSymbol: string;
  coinName: string;
  type: 'bitcoin' | 'ethereum' | 'erc20' | 'bep20' | 'solana' | 'hyperliquid' | 'other';
  contractAddress?: string;
  timestamp: number;
  networkHealth: NetworkHealthMetrics;
  whaleActivity: WhaleMetrics;
  exchangeFlows: ExchangeFlowMetrics;
  supplyDistribution: SupplyMetrics;
  transactions: TransactionMetrics;
  developer?: DeveloperMetrics;
  staking?: StakingMetrics;
  dataQuality: DataQualityScore;
  sources: DataSource[];
}

export interface DataQualityScore {
  overall: number; // 0-100
  metrics: {
    networkHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
    whaleActivity: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
    exchangeFlows: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
    supplyDistribution: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
  };
  dataFreshness: number; // Minutes since last update
  missingMetrics: string[];
}

export interface DataSource {
  name: string;
  type: 'blockchain_api' | 'exchange_api' | 'aggregator' | 'on_chain_parser' | 'dex_api';
  metrics: string[];
  lastUpdate: number;
}

export interface OnChainHistoricalPoint {
  timestamp: number;
  activeAddresses?: number;
  transactionCount?: number;
  transactionVolume?: number;
  exchangeNetflow?: number;
  exchangeBalance?: number;
  largeTransactions?: number;
  averageFee?: number;
  hashRate?: number;
}

export interface OnChainHistory {
  coin: string;
  timeframe: '7d' | '30d' | '90d' | '1y';
  dataPoints: OnChainHistoricalPoint[];
  metrics: string[];
}

export interface OnChainAlert {
  id: string;
  type: 'whale_movement' | 'exchange_flow' | 'network_congestion' | 'hash_rate_drop';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: number;
  data: any;
}

// API Response Types
export interface BlockchainComStats {
  market_price_usd: number;
  hash_rate: number;
  difficulty: number;
  minutes_between_blocks: number;
  n_tx: number;
  total_fees_btc: number;
  n_btc_mined: number;
  totalbc: number;
  trade_volume_btc: number;
  trade_volume_usd: number;
  timestamp: number;
}

export interface EtherscanAccountBalance {
  status: string;
  message: string;
  result: string;
}

export interface EtherscanTokenHolders {
  status: string;
  message: string;
  result: Array<{
    TokenHolderAddress: string;
    TokenHolderQuantity: string;
  }>;
}

export interface CoinMetricsAssetMetrics {
  asset: string;
  time: string;
  AdrActCnt?: string;
  TxCnt?: string;
  TxTfrValAdjUSD?: string;
  FeeTotUSD?: string;
  HashRate?: string;
  SplyCur?: string;
}
