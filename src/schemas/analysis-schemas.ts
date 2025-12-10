import { z } from 'zod';

// ============================================
// TECHNICAL ANALYSIS SCHEMA
// ============================================

export const TechnicalAnalysisSchema = z.object({
  trend_analysis: z.object({
    current_trend: z.enum(['Strong Uptrend', 'Uptrend', 'Sideways', 'Downtrend', 'Strong Downtrend']),
    momentum: z.enum(['Accelerating', 'Stable', 'Decelerating']),
    strength_score: z.number().min(0).max(100)
  }),
  price_levels: z.object({
    immediate_support: z.string(),
    strong_support: z.string(),
    immediate_resistance: z.string(),
    strong_resistance: z.string()
  }),
  volume_analysis: z.object({
    volume_trend: z.enum(['Rising', 'Falling', 'Stable']),
    volume_quality: z.enum(['Strong', 'Average', 'Weak']),
    accumulation_distribution: z.enum(['Accumulation', 'Distribution', 'Neutral'])
  }),
  chart_patterns: z.array(z.string()).optional(),
  indicators: z.object({
    rsi_level: z.string().optional(),
    macd_signal: z.string().optional(),
    moving_averages: z.string().optional()
  }).optional(),
  trading_zones: z.object({
    optimal_entry: z.array(z.string()),
    take_profit_levels: z.array(z.string()),
    stop_loss: z.string()
  }),
  timeframe_outlook: z.object({
    short_term: z.string(),
    medium_term: z.string()
  }),
  key_insights: z.array(z.string()).optional(),
  risk_reward: z.object({
    ratio: z.string(),
    risk_level: z.enum(['Low', 'Medium', 'High'])
  })
});

export type TechnicalAnalysis = z.infer<typeof TechnicalAnalysisSchema>;

// ============================================
// FUNDAMENTAL ANALYSIS SCHEMA
// ============================================

export const FundamentalAnalysisSchema = z.object({
  tokenomics: z.object({
    supply_model: z.enum(['Deflationary', 'Inflationary', 'Fixed Supply', 'Elastic']),
    inflation_rate: z.string().optional(),
    token_utility: z.array(z.string()),
    supply_health: z.enum(['Excellent', 'Good', 'Fair', 'Poor'])
  }),
  valuation_metrics: z.object({
    mcap_fdv_ratio: z.string(),
    volume_liquidity_score: z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
    relative_valuation: z.enum(['Undervalued', 'Fair Value', 'Overvalued']),
    price_to_sales: z.string().optional()
  }),
  market_position: z.object({
    category_rank: z.string(),
    competitive_advantages: z.array(z.string()),
    market_share: z.string().optional()
  }),
  ecosystem_health: z.object({
    developer_activity: z.enum(['High', 'Medium', 'Low']),
    partnerships: z.array(z.string()).optional(),
    adoption_metrics: z.string()
  }),
  investment_thesis: z.object({
    bull_case: z.array(z.string()),
    bear_case: z.array(z.string()),
    catalyst_events: z.array(z.string()).optional()
  }),
  price_targets: z.object({
    conservative: z.string(),
    base_case: z.string(),
    optimistic: z.string(),
    timeframe: z.string()
  }),
  overall_rating: z.object({
    score: z.number().min(0).max(100),
    recommendation: z.enum(['Strong Accumulate', 'Accumulate', 'Hold', 'Reduce', 'Avoid'])
  })
});

export type FundamentalAnalysis = z.infer<typeof FundamentalAnalysisSchema>;

// ============================================
// SENTIMENT ANALYSIS SCHEMA
// ============================================

export const SentimentAnalysisSchema = z.object({
  sentiment_score: z.object({
    overall_score: z.number().min(0).max(100),
    sentiment_label: z.enum(['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed']),
    trend: z.enum(['Improving', 'Stable', 'Deteriorating'])
  }),
  market_psychology: z.object({
    fear_greed_analysis: z.string(),
    crowd_emotion: z.string(),
    contrarian_opportunity: z.boolean()
  }),
  momentum_indicators: z.object({
    price_momentum: z.enum(['Strong Positive', 'Positive', 'Neutral', 'Negative', 'Strong Negative']),
    volume_momentum: z.enum(['Increasing', 'Stable', 'Decreasing']),
    momentum_divergence: z.string().optional()
  }),
  positioning: z.object({
    retail_positioning: z.enum(['Heavy Long', 'Long', 'Neutral', 'Short', 'Heavy Short']),
    smart_money_signals: z.string(),
    crowd_consensus: z.string().optional()
  }),
  sentiment_drivers: z.array(z.string()).optional(),
  contrarian_signals: z.array(z.string()).optional(),
  sentiment_outlook: z.object({
    next_7_days: z.string(),
    key_levels_to_watch: z.array(z.string()).optional(),
    sentiment_change_triggers: z.array(z.string()).optional()
  }),
  recommended_stance: z.enum([
    'Aggressive Accumulation',
    'Moderate Accumulation',
    'Hold & Monitor',
    'Reduce Exposure',
    'Defensive'
  ])
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

// ============================================
// ON-CHAIN ANALYSIS SCHEMA
// ============================================

export const OnChainAnalysisSchema = z.object({
  network_health: z.object({
    activity_trend: z.enum(['Growing', 'Stable', 'Declining']),
    network_usage: z.string(),
    congestion_level: z.enum(['High', 'Medium', 'Low']).optional()
  }),
  supply_dynamics: z.object({
    circulating_percentage: z.string(),
    supply_concentration: z.enum(['Highly Concentrated', 'Moderately Concentrated', 'Well Distributed']),
    inflation_pressure: z.string().optional()
  }),
  whale_activity: z.object({
    large_holder_trend: z.enum(['Accumulating', 'Distributing', 'Holding']),
    whale_transaction_analysis: z.string(),
    top_holder_concentration: z.string().optional()
  }),
  exchange_flows: z.object({
    net_flow: z.enum(['Strong Inflows', 'Inflows', 'Neutral', 'Outflows', 'Strong Outflows']),
    flow_interpretation: z.string(),
    exchange_balance_trend: z.string().optional()
  }),
  holder_behavior: z.object({
    holding_time_analysis: z.string(),
    long_term_holder_trend: z.enum(['Increasing', 'Stable', 'Decreasing']),
    short_term_speculation: z.string().optional()
  }),
  smart_money_signals: z.array(z.string()),
  accumulation_phase: z.object({
    current_phase: z.enum(['Accumulation', 'Markup', 'Distribution', 'Markdown']),
    phase_confidence: z.enum(['High', 'Medium', 'Low']),
    phase_analysis: z.string()
  }),
  onchain_outlook: z.object({
    bullish_signals: z.array(z.string()),
    bearish_signals: z.array(z.string()),
    key_metrics_to_monitor: z.array(z.string()).optional()
  })
});

export type OnChainAnalysis = z.infer<typeof OnChainAnalysisSchema>;

// ============================================
// ETF/INSTITUTIONAL ANALYSIS SCHEMA
// ============================================

export const ETFAnalysisSchema = z.object({
  etf_landscape: z.object({
    spot_etf_status: z.string(),
    futures_etf_products: z.array(z.string()).optional(),
    total_aum_estimate: z.string().optional(),
    approval_probability: z.enum(['Very High', 'High', 'Medium', 'Low', 'Very Low'])
  }),
  institutional_flows: z.object({
    flow_direction: z.enum(['Strong Inflows', 'Moderate Inflows', 'Neutral', 'Moderate Outflows', 'Strong Outflows']),
    weekly_flow_estimate: z.string().optional(),
    cumulative_flows: z.string().optional(),
    flow_sustainability: z.enum(['Sustainable', 'Moderate', 'Unsustainable'])
  }),
  spot_vs_derivatives: z.object({
    futures_oi: z.string(),
    spot_volume: z.string(),
    basis_analysis: z.string(),
    institutional_preference: z.string().optional()
  }),
  premium_discount: z.object({
    current_premium: z.string(),
    premium_trend: z.enum(['Expanding', 'Stable', 'Contracting']),
    arbitrage_opportunities: z.string().optional()
  }).optional(),
  institutional_sentiment: z.object({
    sentiment: z.enum(['Very Bullish', 'Bullish', 'Neutral', 'Bearish', 'Very Bearish']),
    positioning: z.string(),
    risk_appetite: z.enum(['Aggressive', 'Moderate', 'Conservative'])
  }),
  tradfi_integration: z.object({
    custody_solutions: z.array(z.string()).optional(),
    banking_partnerships: z.array(z.string()).optional(),
    payment_integrations: z.array(z.string()).optional()
  }).optional(),
  regulatory_landscape: z.object({
    regulatory_clarity: z.enum(['High', 'Medium', 'Low']),
    recent_developments: z.array(z.string()).optional(),
    impact_assessment: z.string()
  }),
  institutional_outlook: z.object({
    next_30_days: z.string(),
    next_90_days: z.string(),
    catalysts: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional()
  })
});

export type ETFAnalysis = z.infer<typeof ETFAnalysisSchema>;

// ============================================
// COIN DATA SCHEMA
// ============================================

export const CoinDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  price: z.number(),
  change24h: z.number(),
  marketCap: z.number(),
  volume: z.number()
});

export type CoinData = z.infer<typeof CoinDataSchema>;

// ============================================
// ANALYSIS RESULT SCHEMA (WRAPPER)
// ============================================

export const AnalysisResultSchema = z.object({
  id: z.string(),
  analysisType: z.enum(['technical', 'fundamental', 'sentiment', 'onchain', 'etf']),
  structuredAnalysis: z.union([
    TechnicalAnalysisSchema,
    FundamentalAnalysisSchema,
    SentimentAnalysisSchema,
    OnChainAnalysisSchema,
    ETFAnalysisSchema
  ]),
  timestamp: z.string(),
  confidence: z.number().min(0).max(100),
  metrics: z.record(z.any()),
  coinData: CoinDataSchema
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export const validateAnalysis = (analysisType: string, data: any): { success: boolean; data?: any; error?: string } => {
  try {
    let schema;
    switch (analysisType) {
      case 'technical':
        schema = TechnicalAnalysisSchema;
        break;
      case 'fundamental':
        schema = FundamentalAnalysisSchema;
        break;
      case 'sentiment':
        schema = SentimentAnalysisSchema;
        break;
      case 'onchain':
        schema = OnChainAnalysisSchema;
        break;
      case 'etf':
        schema = ETFAnalysisSchema;
        break;
      default:
        return { success: false, error: `Unknown analysis type: ${analysisType}` };
    }

    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
};

export const safeParseAnalysis = (analysisType: string, data: any) => {
  try {
    let schema;
    switch (analysisType) {
      case 'technical':
        schema = TechnicalAnalysisSchema;
        break;
      case 'fundamental':
        schema = FundamentalAnalysisSchema;
        break;
      case 'sentiment':
        schema = SentimentAnalysisSchema;
        break;
      case 'onchain':
        schema = OnChainAnalysisSchema;
        break;
      case 'etf':
        schema = ETFAnalysisSchema;
        break;
      default:
        return { success: false as const, error: new Error(`Unknown analysis type: ${analysisType}`) };
    }

    return schema.safeParse(data);
  } catch (error) {
    return { success: false as const, error };
  }
};
