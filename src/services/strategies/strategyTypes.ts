/**
 * IGX STRATEGY TYPES
 * 17 specialized trading strategies for different market conditions
 */

export type StrategyName =
  | 'WHALE_SHADOW'
  | 'SPRING_TRAP'
  | 'MOMENTUM_SURGE'
  | 'MOMENTUM_SURGE_V2'
  | 'MOMENTUM_RECOVERY'
  | 'FUNDING_SQUEEZE'
  | 'ORDER_FLOW_TSUNAMI'
  | 'FEAR_GREED_CONTRARIAN'
  | 'GOLDEN_CROSS_MOMENTUM'
  | 'MARKET_PHASE_SNIPER'
  | 'LIQUIDITY_HUNTER'
  | 'VOLATILITY_BREAKOUT'
  | 'STATISTICAL_ARBITRAGE'
  | 'ORDER_BOOK_MICROSTRUCTURE'
  | 'LIQUIDATION_CASCADE_PREDICTION'
  | 'CORRELATION_BREAKDOWN_DETECTOR'
  | 'BOLLINGER_MEAN_REVERSION';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StrategyMetadata {
  name: StrategyName;
  displayName: string;
  description: string;
  riskLevel: RiskLevel;
  minTimeframe: string; // e.g., "1 day"
  maxTimeframe: string; // e.g., "7 days"
  bestFor: string;
  requiredDataSources: string[];
  minConfidenceThreshold: number; // Minimum confidence to generate signal
}

export interface StrategySignal {
  strategyName: StrategyName;
  symbol: string;
  type: 'BUY' | 'SELL' | null;
  confidence: number; // 0-100
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  reasoning: string[];
  entryMin: number;
  entryMax: number;
  targets: {
    target1: number;
    target2: number;
    target3: number;
  };
  stopLoss: number;
  riskRewardRatio: number;
  timeframe: string;
  indicators: {
    [key: string]: any;
  };
  rejected: boolean;
  rejectionReason?: string;
}

export interface StrategyPerformance {
  strategyName: StrategyName;
  totalSignals: number;
  successfulSignals: number;
  failedSignals: number;
  successRate: number; // Percentage
  averageProfit: number; // Percentage
  averageLoss: number; // Percentage
  profitFactor: number; // Total profit / Total loss
  sharpeRatio: number; // Risk-adjusted returns
  maxDrawdown: number; // Maximum drawdown percentage
  winStreak: number;
  lossStreak: number;
  lastUpdated: Date;
}

export const STRATEGY_METADATA: Record<StrategyName, StrategyMetadata> = {
  WHALE_SHADOW: {
    name: 'WHALE_SHADOW',
    displayName: 'Whale Shadow',
    description: 'Detects smart money divergence - when whales accumulate during fear or distribute during greed',
    riskLevel: 'MEDIUM',
    minTimeframe: '1 day',
    maxTimeframe: '7 days',
    bestFor: 'Catching major market reversals',
    requiredDataSources: ['onChain', 'sentiment', 'marketPhase'],
    minConfidenceThreshold: 60  // Lowered from 68 for crypto noise
  },

  SPRING_TRAP: {
    name: 'SPRING_TRAP',
    displayName: 'Spring Trap',
    description: 'Wyckoff accumulation pattern - identifies Spring patterns that trap sellers before major upside',
    riskLevel: 'LOW',
    minTimeframe: '2 days',
    maxTimeframe: '14 days',
    bestFor: 'High-confidence reversal entries',
    requiredDataSources: ['ohlc', 'volume', 'orderBook'],
    minConfidenceThreshold: 58  // Lowered from 70 for crypto volatility
  },

  MOMENTUM_SURGE: {
    name: 'MOMENTUM_SURGE',
    displayName: 'Momentum Surge (Legacy)',
    description: '[DEPRECATED] Combines bullish volume divergence with technical breakouts for trend continuation',
    riskLevel: 'MEDIUM',
    minTimeframe: '1 day',
    maxTimeframe: '5 days',
    bestFor: 'Trend continuation trades',
    requiredDataSources: ['ohlc', 'volume', 'technical'],
    minConfidenceThreshold: 55  // Lowered from 66 for crypto momentum
  },

  MOMENTUM_SURGE_V2: {
    name: 'MOMENTUM_SURGE_V2',
    displayName: 'Momentum Surge V2',
    description: 'TRUE momentum continuation - RSI 60-75 + volume surge 2x+ + price breakout (institutional-grade)',
    riskLevel: 'MEDIUM',
    minTimeframe: '2 days',
    maxTimeframe: '7 days',
    bestFor: 'Pure momentum continuation trades',
    requiredDataSources: ['ohlc', 'volume', 'technical'],
    minConfidenceThreshold: 60  // Higher threshold for momentum purity
  },

  MOMENTUM_RECOVERY: {
    name: 'MOMENTUM_RECOVERY',
    displayName: 'Momentum Recovery',
    description: 'Mean reversion pattern - RSI 40-60 recovery zone + bullish volume divergence + oversold bounce',
    riskLevel: 'MEDIUM',
    minTimeframe: '1 day',
    maxTimeframe: '4 days',
    bestFor: 'Counter-trend recovery and mean reversion trades',
    requiredDataSources: ['ohlc', 'volume', 'technical'],
    minConfidenceThreshold: 58  // Mean reversion requires high conviction
  },

  FUNDING_SQUEEZE: {
    name: 'FUNDING_SQUEEZE',
    displayName: 'Funding Squeeze V2',
    description: 'Targets extreme funding rates with OI validation + multi-exchange consensus + liquidation clustering',
    riskLevel: 'HIGH',
    minTimeframe: '4 hours',
    maxTimeframe: '48 hours',
    bestFor: 'Quick scalps during overleveraged markets (institutional-grade)',
    requiredDataSources: ['fundingRates', 'openInterest', 'orderBook', 'volume'],
    minConfidenceThreshold: 62  // Raised from 58 due to OI validation and multi-exchange filters
  },

  ORDER_FLOW_TSUNAMI: {
    name: 'ORDER_FLOW_TSUNAMI',
    displayName: 'Order Flow Tsunami V2',
    description: 'Detects massive order book imbalances (>70%) with SPOOFING DETECTION - filters fake walls',
    riskLevel: 'MEDIUM',
    minTimeframe: '1 day',
    maxTimeframe: '3 days',
    bestFor: 'Imminent price explosions (anti-manipulation)',
    requiredDataSources: ['orderBook', 'volume', 'technical'],
    minConfidenceThreshold: 62  // Raised from 59 due to spoofing filter protection
  },

  FEAR_GREED_CONTRARIAN: {
    name: 'FEAR_GREED_CONTRARIAN',
    displayName: 'Fear & Greed Contrarian',
    description: 'Pure contrarian strategy at extreme fear (<20) or greed (>80) levels',
    riskLevel: 'HIGH',
    minTimeframe: '7 days',
    maxTimeframe: '30 days',
    bestFor: 'Market cycle turning points',
    requiredDataSources: ['sentiment', 'technical', 'onChain'],
    minConfidenceThreshold: 60  // Lowered from 64 for sentiment noise
  },

  GOLDEN_CROSS_MOMENTUM: {
    name: 'GOLDEN_CROSS_MOMENTUM',
    displayName: 'Golden Cross Momentum',
    description: 'Golden cross (50/200 EMA) + RSI momentum + volume confirmation for strong trends',
    riskLevel: 'LOW',
    minTimeframe: '5 days',
    maxTimeframe: '21 days',
    bestFor: 'Strong trending markets',
    requiredDataSources: ['ohlc', 'technical', 'volume'],
    minConfidenceThreshold: 56  // Lowered from 69 for clean technical signals
  },

  MARKET_PHASE_SNIPER: {
    name: 'MARKET_PHASE_SNIPER',
    displayName: 'Market Phase Sniper',
    description: 'Adaptive strategy that changes tactics based on market phase (Accumulation/Distribution/Markup/Markdown)',
    riskLevel: 'MEDIUM',
    minTimeframe: '3 days',
    maxTimeframe: '14 days',
    bestFor: 'All market conditions',
    requiredDataSources: ['marketPhase', 'onChain', 'technical', 'orderBook'],
    minConfidenceThreshold: 60  // Lowered from 68 for crypto noise
  },

  LIQUIDITY_HUNTER: {
    name: 'LIQUIDITY_HUNTER',
    displayName: 'Liquidity Hunter',
    description: 'Targets large exchange outflows + volume spikes to capture smart money moves early',
    riskLevel: 'MEDIUM',
    minTimeframe: '2 days',
    maxTimeframe: '10 days',
    bestFor: 'Capturing smart money moves early',
    requiredDataSources: ['onChain', 'volume', 'orderBook'],
    minConfidenceThreshold: 59  // Lowered from 67 for on-chain lag
  },

  VOLATILITY_BREAKOUT: {
    name: 'VOLATILITY_BREAKOUT',
    displayName: 'Volatility Breakout',
    description: 'Bollinger squeeze + ATR expansion + directional confirmation for range breakouts',
    riskLevel: 'HIGH',
    minTimeframe: '1 day',
    maxTimeframe: '7 days',
    bestFor: 'Range breakouts and volatility expansions',
    requiredDataSources: ['ohlc', 'technical', 'volume'],
    minConfidenceThreshold: 55  // Lowered from 66 for crypto momentum
  },

  STATISTICAL_ARBITRAGE: {
    name: 'STATISTICAL_ARBITRAGE',
    displayName: 'Statistical Arbitrage',
    description: 'Pairs trading strategy - exploits mean-reverting spreads between cointegrated assets (Jump Trading/Jane Street approach)',
    riskLevel: 'MEDIUM',
    minTimeframe: '3 days',
    maxTimeframe: '14 days',
    bestFor: 'Market-neutral mean reversion trades',
    requiredDataSources: ['ohlc', 'volume', 'pairs'],
    minConfidenceThreshold: 65  // High threshold due to cointegration requirement
  },

  ORDER_BOOK_MICROSTRUCTURE: {
    name: 'ORDER_BOOK_MICROSTRUCTURE',
    displayName: 'Order Book Microstructure',
    description: 'Analyzes order flow imbalance (OFI), aggressor ratios, and depth asymmetry for micro-moves (Renaissance/Citadel approach)',
    riskLevel: 'MEDIUM',
    minTimeframe: '1 hour',
    maxTimeframe: '6 hours',
    bestFor: 'Short-term scalping based on institutional order flow',
    requiredDataSources: ['orderBook', 'volume', 'tradeTape'],
    minConfidenceThreshold: 68  // High threshold for microstructure signals
  },

  LIQUIDATION_CASCADE_PREDICTION: {
    name: 'LIQUIDATION_CASCADE_PREDICTION',
    displayName: 'Liquidation Cascade Prediction',
    description: 'Tracks OI clustering across leverage tiers to predict liquidation cascades before they happen (Alameda approach)',
    riskLevel: 'HIGH',
    minTimeframe: '6 hours',
    maxTimeframe: '48 hours',
    bestFor: 'Front-running massive liquidation events',
    requiredDataSources: ['openInterest', 'fundingRates', 'liquidations'],
    minConfidenceThreshold: 72  // Very high threshold due to cascade complexity
  },

  CORRELATION_BREAKDOWN_DETECTOR: {
    name: 'CORRELATION_BREAKDOWN_DETECTOR',
    displayName: 'Correlation Breakdown Detector',
    description: 'Detects when altcoins break BTC correlation and move independently - alpha opportunities (quant fund approach)',
    riskLevel: 'MEDIUM',
    minTimeframe: '3 days',
    maxTimeframe: '7 days',
    bestFor: 'Finding coins that will outperform BTC',
    requiredDataSources: ['ohlc', 'volume', 'btcCorrelation'],
    minConfidenceThreshold: 70  // High threshold for correlation signals
  },

  BOLLINGER_MEAN_REVERSION: {
    name: 'BOLLINGER_MEAN_REVERSION',
    displayName: 'Bollinger Mean Reversion',
    description: 'Trades bounces from Bollinger Bands back to mean - complements Volatility Breakout for ranging markets',
    riskLevel: 'MEDIUM',
    minTimeframe: '2 days',
    maxTimeframe: '5 days',
    bestFor: 'Mean reversion trades in ranging markets',
    requiredDataSources: ['ohlc', 'technical', 'volume'],
    minConfidenceThreshold: 68  // Statistical confidence threshold
  }
};
