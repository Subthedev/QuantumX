/**
 * Claude API Optimizer
 * Provides smart model routing, prompt caching, and cost optimization
 */

export interface OptimizationConfig {
  analysisType: string;
  complexity?: 'simple' | 'complex';
  enableCaching?: boolean;
  maxTokens?: number;
}

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  useCache: boolean;
}

/**
 * Smart model selection based on analysis complexity
 * - Haiku 4: 87% cheaper, 3-5x faster for simple tasks
 * - Sonnet 4.5: Complex multi-factor analysis
 */
export function selectOptimalModel(config: OptimizationConfig): ModelConfig {
  const { analysisType, complexity = 'simple', enableCaching = true } = config;

  // Use Haiku 4 for simple single-dimension analysis
  const isSimpleAnalysis = complexity === 'simple' ||
    ['technical', 'sentiment'].includes(analysisType);

  if (isSimpleAnalysis) {
    return {
      model: 'claude-haiku-4-20250528',
      maxTokens: config.maxTokens || 1200,
      temperature: 0.7,
      useCache: enableCaching
    };
  }

  // Use Sonnet 4.5 for complex multi-factor analysis
  return {
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: config.maxTokens || (analysisType === 'etf' ? 1000 : 1500),
    temperature: 0.7,
    useCache: enableCaching
  };
}

/**
 * Compress system prompt - removes fluff while maintaining quality
 */
export function getCompressedSystemPrompt(analysisType: string): string {
  const basePrompt = `You are an elite cryptocurrency analyst powered by IgniteX AI with 10+ years of market experience. Today: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

MISSION: Transform market data into ACTION PLANS. Answer:
- Should I buy/hold/sell NOW?
- Exact entry/exit prices?
- Risk and capital protection?
- Key catalysts or invalidation events?

PRINCIPLES:
✓ Brutally honest - state uncertainty clearly
✓ Specific dollar amounts, not vague ranges
✓ Explain WHY behind recommendations
✓ Highlight risks (what could go wrong)
✓ Support claims with real-time data
✓ Focus on EDGE - what gives traders advantage

STYLE: Direct, confident, no fluff. Use exact prices/percentages/timeframes.`;

  return basePrompt;
}

/**
 * Get optimized max tokens based on analysis type
 */
export function getOptimalMaxTokens(analysisType: string): number {
  const tokenLimits: Record<string, number> = {
    'technical': 1200,
    'sentiment': 1000,
    'fundamental': 1500,
    'onchain': 1400,
    'etf': 1000
  };

  return tokenLimits[analysisType] || 1200;
}

/**
 * Build cache-optimized request with prompt caching headers
 * Cache system prompts and schemas for 90% cost reduction on repeated content
 */
export function buildCachedRequest(
  modelConfig: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  tools?: any[],
  toolChoice?: any
) {
  const messages: any[] = [{ role: 'user', content: userPrompt }];

  // Add cache control to system prompt for prompt caching
  const systemMessage = modelConfig.useCache
    ? {
        role: 'system' as const,
        content: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
          }
        ]
      }
    : systemPrompt;

  const requestBody: any = {
    model: modelConfig.model,
    max_tokens: modelConfig.maxTokens,
    temperature: modelConfig.temperature,
    system: systemMessage,
    messages
  };

  // Add tools with caching if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools.map((tool, index) => {
      // Cache the last tool (largest schema) for prompt caching
      if (modelConfig.useCache && index === tools.length - 1) {
        return {
          ...tool,
          cache_control: { type: 'ephemeral' }
        };
      }
      return tool;
    });

    if (toolChoice) {
      requestBody.tool_choice = toolChoice;
    }
  }

  return requestBody;
}

/**
 * Estimate cost savings from optimization
 */
export function estimateCostSavings(analysisType: string, usesCache: boolean): {
  model: string;
  estimatedSavings: number;
  responseTime: string;
} {
  const config = selectOptimalModel({ analysisType });
  const isHaiku = config.model.includes('haiku');

  return {
    model: isHaiku ? 'Haiku 4' : 'Sonnet 4.5',
    estimatedSavings: isHaiku ? 87 : (usesCache ? 60 : 0),
    responseTime: isHaiku ? '1-2s' : '3-5s'
  };
}

/**
 * Compressed analysis-specific prompts
 */
export function getCompressedUserPrompt(
  analysisType: string,
  coinData: any,
  marketContext: any
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  switch (analysisType) {
    case 'technical':
      return buildTechnicalPrompt(coinData, marketContext, currentDate);
    case 'fundamental':
      return buildFundamentalPrompt(coinData, marketContext, currentDate);
    case 'sentiment':
      return buildSentimentPrompt(coinData, marketContext, currentDate);
    case 'onchain':
      return buildOnchainPrompt(coinData, marketContext, currentDate);
    case 'etf':
      return buildETFPrompt(coinData, marketContext, currentDate);
    default:
      return buildTechnicalPrompt(coinData, marketContext, currentDate);
  }
}

function buildTechnicalPrompt(coin: any, context: any, date: string): string {
  const volatility24h = ((coin.high_24h - coin.low_24h) / coin.current_price * 100).toFixed(1);
  const volumeToMcap = (coin.total_volume / coin.market_cap * 100).toFixed(2);
  const athDrawdown = ((1 - coin.current_price / coin.ath) * 100).toFixed(1);

  return `TECHNICAL ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${date}

MARKET DATA:
Price: $${coin.current_price.toLocaleString()} | 24h Range: $${coin.low_24h.toLocaleString()}-$${coin.high_24h.toLocaleString()} (${volatility24h}% volatility)
24h: ${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}% | 7d: ${coin.price_change_percentage_7d_in_currency > 0 ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
Volume: $${(coin.total_volume / 1e9).toFixed(2)}B (${volumeToMcap}% of mcap) | MCap: $${(coin.market_cap / 1e9).toFixed(2)}B (#${coin.market_cap_rank})
ATH: $${coin.ath.toLocaleString()} (${athDrawdown}% below)

PROVIDE:
1. Trend: Current trend, momentum (Accelerating/Stable/Decelerating), strength 0-100
2. Price Levels: Immediate/Strong resistance and support (exact $)
3. Volume: Rising/Falling/Stable, quality (Strong/Average/Weak), accumulation/distribution
4. Chart Patterns: Identified patterns
5. Trade Setup: Entry zones (2-3 exact prices), stop loss, take profit targets (2-3 with %), R:R ratio
6. Timeframe Outlook: Short-term (1-7d) and medium-term (1-4w) with specific predictions
7. Key Insights: 5-7 bullets of EDGE

Be precise. Traders will execute based on your analysis.`;
}

function buildFundamentalPrompt(coin: any, context: any, date: string): string {
  const fdvMultiple = coin.fully_diluted_valuation ? (coin.fully_diluted_valuation / coin.market_cap).toFixed(2) : 'N/A';
  const supplyIssued = coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) : 'N/A';
  const liquidityGrade = coin.total_volume > coin.market_cap * 0.1 ? 'Excellent' :
                         coin.total_volume > coin.market_cap * 0.05 ? 'Good' : 'Poor';

  return `FUNDAMENTAL ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${date}

DATA:
MCap: $${(coin.market_cap / 1e9).toFixed(2)}B (#${coin.market_cap_rank}) | FDV: ${fdvMultiple}x mcap | Volume: $${(coin.total_volume / 1e9).toFixed(2)}B (${liquidityGrade})
Supply: ${supplyIssued}% issued | Circulating: ${coin.circulating_supply ? (coin.circulating_supply / 1e9).toFixed(2) + 'B' : 'N/A'}
Max: ${coin.max_supply ? (coin.max_supply / 1e9).toFixed(2) + 'B' : 'Unlimited'}

PROVIDE:
1. Tokenomics: Supply model (Deflationary/Inflationary/Fixed/Elastic), inflation rate, token utility, health score
2. Valuation: MCap/FDV analysis, volume/liquidity score, relative valuation vs competitors
3. Market Position: Category rank, competitive advantages, market share trend
4. Ecosystem: Developer activity (High/Medium/Low), partnerships, adoption metrics
5. Investment Thesis: Bull case (3-5 reasons), bear case (3-5 risks), catalyst events
6. Price Targets: Conservative/Base/Optimistic (6mo, exact $ and %)
7. Recommendation: Rating (Strong Accumulate/Accumulate/Hold/Reduce/Avoid), score 0-100

Focus on asymmetric risk/reward opportunities.`;
}

function buildSentimentPrompt(coin: any, context: any, date: string): string {
  const atlGain = ((coin.current_price / coin.atl - 1) * 100).toFixed(0);
  const athDrawdown = ((1 - coin.current_price / coin.ath) * 100).toFixed(1);

  return `SENTIMENT ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${date}

PERFORMANCE:
24h: ${coin.price_change_percentage_24h > 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}% | 7d: ${coin.price_change_percentage_7d_in_currency > 0 ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
From ATH: -${athDrawdown}% | From ATL: +${atlGain}%
Volume: $${(coin.total_volume / 1e9).toFixed(2)}B (${coin.total_volume / coin.market_cap > 0.1 ? 'HIGH conviction' : coin.total_volume / coin.market_cap > 0.05 ? 'MEDIUM' : 'LOW conviction'})

PROVIDE:
1. Sentiment Score: 0-100 (0=Extreme Fear, 100=Extreme Greed), label, trend (Improving/Stable/Deteriorating)
2. Psychology: Fear vs Greed, crowd emotion, contrarian opportunity?
3. Momentum: Price/volume momentum, divergences
4. Positioning: Retail (Heavy Long/Long/Neutral/Short/Heavy Short), smart money signals
5. Drivers: 3-5 specific events driving sentiment
6. Contrarian Signals: Opportunities against the herd
7. Outlook: Next 7 days, key price levels, change triggers
8. Stance: Aggressive Accumulation/Moderate Accumulation/Hold & Monitor/Reduce/Defensive

Be contrarian when you have edge. When greedy, be fearful. When fearful, be greedy.`;
}

function buildOnchainPrompt(coin: any, context: any, date: string): string {
  const supplyRemaining = coin.max_supply ? (((coin.max_supply - coin.circulating_supply) / coin.max_supply) * 100).toFixed(1) : 'N/A';
  const supplyIssued = coin.max_supply ? ((coin.circulating_supply / coin.max_supply) * 100).toFixed(1) : 'N/A';
  const volumeMcapRatio = ((coin.total_volume / coin.market_cap) * 100).toFixed(2);

  return `ON-CHAIN ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${date}

DATA:
Supply: ${supplyIssued}% issued, ${supplyRemaining}% remaining | Circulating: ${coin.circulating_supply ? (coin.circulating_supply / 1e9).toFixed(2) + 'B' : 'N/A'}
Volume/MCap: ${volumeMcapRatio}% ${parseFloat(volumeMcapRatio) < 5 ? '(Low liquidity)' : parseFloat(volumeMcapRatio) > 10 ? '(High liquidity)' : '(Normal)'}
Rank: #${coin.market_cap_rank}

PROVIDE:
1. Network Health: Activity trend (Growing/Stable/Declining), usage, congestion
2. Supply Dynamics: Circulating %, concentration, inflation pressure
3. Whale Activity: Large holder trend (Accumulating/Distributing/Holding), signals
4. Exchange Flows: Net flow (Strong Inflows/Inflows/Neutral/Outflows/Strong Outflows), interpretation
5. Holder Behavior: Holding time, long-term holder trend, speculation level
6. Smart Money: 3-5 signals indicating institutional/smart money activity
7. Accumulation Phase: Current phase (Accumulation/Markup/Distribution/Markdown), confidence, analysis
8. Outlook: Bullish signals (3-5), bearish signals (3-5), key metrics to monitor

Focus on actionable signals giving informational edge.`;
}

function buildETFPrompt(coin: any, context: any, date: string): string {
  const marketDominance = ((coin.market_cap / 2500000000000) * 100).toFixed(2);
  const liquidityScore = coin.total_volume / coin.market_cap > 0.1 ? 'Excellent' : coin.total_volume / coin.market_cap > 0.05 ? 'Good' : 'Fair';

  return `ETF & INSTITUTIONAL ANALYSIS: ${coin.name} (${coin.symbol.toUpperCase()}) - ${date}

METRICS:
MCap: $${(coin.market_cap / 1e9).toFixed(2)}B (#${coin.market_cap_rank}) | Dominance: ${marketDominance}%
Volume: $${(coin.total_volume / 1e9).toFixed(2)}B | Liquidity: ${liquidityScore}
ETF Products: ${coin.market_cap_rank <= 5 ? 'Likely available' : 'Limited/None'}

PROVIDE:
1. ETF Landscape: Spot ETF status, futures products, AUM estimate, approval probability
2. Institutional Flows: Direction (Strong Inflows/Moderate Inflows/Neutral/Moderate Outflows/Strong Outflows), sustainability
3. Spot vs Derivatives: Futures OI, spot volume, basis analysis, institutional preference
4. Premium/Discount: Current premium, trend (Expanding/Stable/Contracting), arbitrage opportunities
5. Sentiment: Very Bullish/Bullish/Neutral/Bearish/Very Bearish, positioning, risk appetite
6. TradFi Integration: Custody solutions, banking partnerships, payment integrations
7. Regulatory: Clarity (High/Medium/Low), recent developments, impact
8. Outlook: 30d/90d predictions, catalysts, risks

Trading strategy: Should retail front-run or follow institutions? Price levels indicating accumulation? Timeline?

Institutions move slowly but with size. Identify footprints early.`;
}
