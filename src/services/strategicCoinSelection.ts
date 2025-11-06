/**
 * STRATEGIC COIN SELECTION FOR MAXIMUM PROFITABILITY
 *
 * Selection Criteria:
 * 1. HIGH LIQUIDITY - Essential for ORDER_FLOW_TSUNAMI, LIQUIDITY_HUNTER strategies
 * 2. VOLATILITY - Needed for BREAKOUT_MULTIPLIER, VOLATILITY_RIDER strategies
 * 3. TREND STRENGTH - Required for MOMENTUM_SURGE, GOLDEN_CROSS strategies
 * 4. SMART MONEY FLOW - Critical for WHALE_SHADOW, SMART_MONEY_DIVERGENCE
 * 5. MARKET CAP DIVERSITY - Mix of large, mid, small caps for different opportunities
 *
 * Categories:
 * - Blue Chips (10): BTC, ETH, BNB, SOL, XRP, ADA, AVAX, DOT, MATIC, LINK
 * - DeFi Leaders (8): UNI, AAVE, CRV, MKR, SNX, COMP, SUSHI, 1INCH
 * - Layer 2s (6): ARB, OP, IMX, MATIC, LRC, METIS
 * - Gaming/Metaverse (6): SAND, MANA, AXS, GALA, ENJ, FLOW
 * - AI/Computing (5): RNDR, FET, OCEAN, GRT, THETA
 * - High Volatility (8): APE, SHIB, DOGE, FTM, NEAR, ATOM, ALGO, XTZ
 * - Emerging Tech (7): APT, SUI, SEI, INJ, TIA, BLUR, PYTH
 *
 * Total: 50 coins optimized for our 10 trading strategies
 */

export const STRATEGIC_COIN_SELECTION = {
  // Top 50 coins by liquidity, volatility, and profit potential
  coinGeckoIds: [
    // === TIER 1: BLUE CHIPS (Highest Liquidity) ===
    'bitcoin',           // BTC - King of crypto, massive liquidity
    'ethereum',          // ETH - Smart contract leader
    'binancecoin',       // BNB - Exchange token, high volume
    'solana',            // SOL - Fast L1, high volatility
    'ripple',            // XRP - Banking crypto, news-driven
    'cardano',           // ADA - Academic blockchain
    'avalanche-2',       // AVAX - Fast finality L1
    'polkadot',          // DOT - Interoperability
    'matic-network',     // MATIC/POL - Polygon L2
    'chainlink',         // LINK - Oracle leader

    // === TIER 2: DEFI POWERHOUSES ===
    'uniswap',           // UNI - DEX leader
    'aave',              // AAVE - Lending protocol
    'curve-dao-token',   // CRV - Stablecoin DEX
    'maker',             // MKR - DAI governance
    'synthetix-network-token', // SNX - Derivatives
    'compound-governance-token', // COMP - Lending
    'sushi',             // SUSHI - DEX alternative
    '1inch',             // 1INCH - DEX aggregator

    // === TIER 3: LAYER 2 / SCALING ===
    'arbitrum',          // ARB - Optimistic rollup
    'optimism',          // OP - Optimistic rollup
    'immutable-x',       // IMX - Gaming L2
    'loopring',          // LRC - zkRollup DEX
    'metis-token',       // METIS - Optimistic rollup
    'starknet',          // STRK - ZK rollup

    // === TIER 4: GAMING & METAVERSE ===
    'the-sandbox',       // SAND - Metaverse
    'decentraland',      // MANA - Virtual world
    'axie-infinity',     // AXS - Play-to-earn
    'gala',              // GALA - Gaming platform
    'enjincoin',         // ENJ - Gaming NFTs
    'flow',              // FLOW - NFT blockchain

    // === TIER 5: AI & COMPUTE ===
    'render-token',      // RNDR - GPU rendering
    'fetch-ai',          // FET - AI agents
    'ocean-protocol',    // OCEAN - Data marketplace
    'the-graph',         // GRT - Indexing protocol
    'theta-network',     // THETA - Video streaming

    // === TIER 6: HIGH VOLATILITY PLAYS ===
    'apecoin',           // APE - BAYC ecosystem
    'shiba-inu',         // SHIB - Meme with utility
    'dogecoin',          // DOGE - Original meme
    'fantom',            // FTM - Fast L1
    'near',              // NEAR - Sharded L1
    'cosmos',            // ATOM - Internet of blockchains
    'algorand',          // ALGO - Pure PoS
    'tezos',             // XTZ - Self-amending

    // === TIER 7: EMERGING TECHNOLOGIES ===
    'aptos',             // APT - Move language L1
    'sui',               // SUI - Parallel processing
    'sei-network',       // SEI - Trading focused L1
    'injective-protocol', // INJ - DeFi L1
    'celestia',          // TIA - Modular blockchain
    'blur',              // BLUR - NFT marketplace
  ],

  // Strategy optimization notes for each coin type
  strategyOptimization: {
    blueChips: [
      'GOLDEN_CROSS_MOMENTUM - Strong trends with clear MA patterns',
      'WHALE_SHADOW - Highest smart money activity',
      'LIQUIDITY_HUNTER - Deep order books'
    ],
    defi: [
      'SMART_MONEY_DIVERGENCE - TVL flows visible',
      'ORDER_FLOW_TSUNAMI - High DEX volume',
      'FUNDING_SQUEEZE - Perpetual funding rates'
    ],
    gaming: [
      'BREAKOUT_MULTIPLIER - News-driven breakouts',
      'VOLATILITY_RIDER - High intraday swings',
      'MOMENTUM_SURGE - Strong directional moves'
    ],
    emerging: [
      'SPRING_TRAP - Accumulation patterns',
      'BREAKOUT_MULTIPLIER - Low float breakouts',
      'VOLATILITY_RIDER - Price discovery phase'
    ]
  },

  // Expected signal generation by category
  expectedSignals: {
    perHour: {
      minimum: 1,
      average: 3,
      maximum: 8
    },
    distribution: {
      blueChips: '30%',     // Reliable but fewer signals
      defi: '25%',          // Good smart money flow
      layer2: '15%',        // Technical breakouts
      gaming: '10%',        // News and hype driven
      ai: '10%',            // Emerging narratives
      volatile: '5%',       // Quick scalps
      emerging: '5%'        // High risk/reward
    }
  }
};

// Export function to get the coin list
export function getStrategicCoins(): string[] {
  return STRATEGIC_COIN_SELECTION.coinGeckoIds;
}

// Export function to get coin count
export function getCoinCount(): number {
  return STRATEGIC_COIN_SELECTION.coinGeckoIds.length;
}