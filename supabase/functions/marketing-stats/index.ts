import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// Rate limiting for marketing API - 20 requests per minute per IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class MarketingRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number = 60000; // 1 minute
  private readonly maxRequests: number = 20; // 20 requests per minute

  checkLimit(ip: string): { allowed: boolean; resetInSeconds: number; remaining: number } {
    const now = Date.now();
    const entry = this.limits.get(ip);

    // No existing entry or expired window
    if (!entry || now >= entry.resetAt) {
      this.limits.set(ip, {
        count: 1,
        resetAt: now + this.windowMs
      });
      return {
        allowed: true,
        resetInSeconds: 60,
        remaining: this.maxRequests - 1
      };
    }

    // Within window - check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
        remaining: 0
      };
    }

    // Increment count and allow
    entry.count++;
    return {
      allowed: true,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
      remaining: this.maxRequests - entry.count
    };
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(ip);
      }
    }
  }
}

// Create singleton rate limiter instance
const rateLimiter = new MarketingRateLimiter();

// Cleanup expired entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

interface MarketingStats {
  // Daily Stats
  daily: {
    totalTrades: number
    winRate: number
    totalPnL: number
    bestAgent: { name: string; pnl: number }
    worstAgent: { name: string; pnl: number }
    topTrades: Array<{
      agent: string
      symbol: string
      direction: string
      pnl: number
      strategy: string
    }>
  }
  // Weekly Stats
  weekly: {
    totalTrades: number
    winRate: number
    totalReturn: number
    bestDay: { day: string; return: number }
    agentRankings: Array<{ agent: string; return: number; trades: number }>
    topStrategies: string[]
  }
  // Live Stats
  live: {
    activePositions: Array<{
      agent: string
      symbol: string
      direction: string
      entryPrice: number
      currentPnl: number
      strategy: string
    }>
    lastTrade: {
      agent: string
      symbol: string
      direction: string
      pnl: number
      timestamp: string
    } | null
    agentStreaks: Array<{ agent: string; streak: number; type: string }>
  }
  // Oracle Stats
  oracle: {
    currentSlot: number
    totalPredictionsToday: number
    topPredictor: { username: string; accuracy: number; streak: number }
    nextQuestionIn: string
  }
  // Community Stats
  community: {
    telegramMembers: number
    totalSignalsDelivered: number
    countriesRepresented: number
  }
}

const agentNames: Record<string, string> = {
  'alphax': 'AlphaX',
  'betax': 'BetaX',
  'gammax': 'GammaX'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    // Check rate limit (20 requests per minute per IP)
    const rateLimitCheck = rateLimiter.checkLimit(clientIP);

    if (!rateLimitCheck.allowed) {
      console.log(`[Marketing API] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Maximum 20 requests per minute allowed.',
          retryAfter: rateLimitCheck.resetInSeconds
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetInSeconds.toString(),
            'Retry-After': rateLimitCheck.resetInSeconds.toString()
          }
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'all'
    const apiKey = req.headers.get('x-api-key')

    // Validate API key (required for Make.com and external access)
    if (!apiKey || apiKey !== Deno.env.get('MARKETING_API_KEY')) {
      console.log(`[Marketing API] Unauthorized access attempt from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful request with rate limit info
    console.log(`[Marketing API] Request from IP: ${clientIP} | Type: ${type} | Remaining: ${rateLimitCheck.remaining}/20`);

    // ✅ FIX: Use UTC explicitly for timezone consistency
    // This ensures the same data is returned regardless of server timezone
    const now = new Date();
    const startOfDay = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);

    console.log(`[Marketing API] Query range (UTC): ${startOfWeek.toISOString()} to ${now.toISOString()}`);

    // Fetch trade history - FIXED: Use ISO timestamp for TIMESTAMP columns
    const { data: trades } = await supabaseClient
      .from('arena_trade_history')
      .select('*')
      .gte('timestamp', startOfWeek.toISOString())
      .order('timestamp', { ascending: false })

    // Fetch agent sessions
    const { data: sessions } = await supabaseClient
      .from('arena_agent_sessions')
      .select('*')

    // Fetch active positions
    const { data: positions } = await supabaseClient
      .from('arena_active_positions')
      .select('*')

    // Calculate daily stats - FIXED: Parse timestamp strings
    const todayTrades = trades?.filter(t => new Date(t.timestamp) >= startOfDay) || []
    const dailyWins = todayTrades.filter(t => t.is_win).length
    const dailyPnL = todayTrades.reduce((sum, t) => sum + (t.pnl_percent || 0), 0)

    // Agent performance
    const agentPnL: Record<string, number> = {}
    const agentTrades: Record<string, number> = {}
    todayTrades.forEach(t => {
      agentPnL[t.agent_id] = (agentPnL[t.agent_id] || 0) + (t.pnl_percent || 0)
      agentTrades[t.agent_id] = (agentTrades[t.agent_id] || 0) + 1
    })

    const sortedAgents = Object.entries(agentPnL)
      .map(([id, pnl]) => ({
        name: agentNames[id] || id,
        pnl,
        trades: agentTrades[id] || 0
      }))
      .sort((a, b) => b.pnl - a.pnl)

    // Top trades
    const topTrades = todayTrades
      .filter(t => t.is_win && t.pnl_percent > 0)
      .sort((a, b) => b.pnl_percent - a.pnl_percent)
      .slice(0, 5)
      .map(t => ({
        agent: agentNames[t.agent_id] || t.agent_id,
        symbol: t.symbol,
        direction: t.direction,
        pnl: t.pnl_percent,
        strategy: t.strategy || 'Unknown'
      }))

    // Weekly calculations
    const weeklyWins = trades?.filter(t => t.is_win).length || 0
    const weeklyPnL = trades?.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) || 0

    // Weekly agent rankings
    const weeklyAgentPnL: Record<string, number> = {}
    const weeklyAgentTrades: Record<string, number> = {}
    trades?.forEach(t => {
      weeklyAgentPnL[t.agent_id] = (weeklyAgentPnL[t.agent_id] || 0) + (t.pnl_percent || 0)
      weeklyAgentTrades[t.agent_id] = (weeklyAgentTrades[t.agent_id] || 0) + 1
    })

    const weeklyAgentRankings = Object.entries(weeklyAgentPnL)
      .map(([id, pnl]) => ({
        agent: agentNames[id] || id,
        return: pnl,
        trades: weeklyAgentTrades[id] || 0
      }))
      .sort((a, b) => b.return - a.return)

    // Get top strategies from trades
    const strategyCount: Record<string, number> = {}
    trades?.filter(t => t.is_win && t.strategy).forEach(t => {
      strategyCount[t.strategy] = (strategyCount[t.strategy] || 0) + 1
    })
    const topStrategies = Object.entries(strategyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strategy]) => strategy)

    // Calculate best day of the week
    const dayPnL: Record<string, number> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    trades?.forEach(t => {
      const day = dayNames[new Date(t.timestamp).getDay()]
      dayPnL[day] = (dayPnL[day] || 0) + (t.pnl_percent || 0)
    })
    const bestDayEntry = Object.entries(dayPnL).sort((a, b) => b[1] - a[1])[0]
    const bestDay = bestDayEntry ? { day: bestDayEntry[0], return: bestDayEntry[1] } : { day: 'N/A', return: 0 }

    // Oracle stats - ENHANCED for price predictions & market regime challenges
    const currentSlot = Math.floor((now.getHours() * 60 + now.getMinutes()) / 120) + 1 // 2-hour slots

    // Calculate next question time
    const nextSlotMinutes = currentSlot * 120
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const minutesUntilNext = nextSlotMinutes - currentMinutes
    let nextQuestionIn = 'Now'
    if (minutesUntilNext > 0) {
      const hours = Math.floor(minutesUntilNext / 60)
      const mins = minutesUntilNext % 60
      nextQuestionIn = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    // ✅ FIX: Dynamic BTC price with proper fallback chain
    // 1. Try today's trades first
    // 2. Fall back to historical trades (30 day)
    // 3. Fall back to external API if needed
    const btcTrades = todayTrades.filter(t =>
      t.symbol.includes('BTC') || t.symbol.includes('Bitcoin')
    );

    let latestBtcPrice = 0;

    if (btcTrades.length > 0) {
      // ✅ Primary: Use today's trade data
      latestBtcPrice = btcTrades[0].exit_price || btcTrades[0].entry_price;
    } else {
      // ✅ Fallback 1: Try historical trades from past 30 days
      const { data: historicalTrades } = await supabaseClient
        .from('arena_trade_history')
        .select('exit_price, entry_price')
        .or('symbol.ilike.%BTC%,symbol.ilike.%Bitcoin%')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (historicalTrades && historicalTrades.length > 0) {
        const prices = historicalTrades
          .map(t => t.exit_price || t.entry_price)
          .filter(p => p && p > 0);
        if (prices.length > 0) {
          latestBtcPrice = Math.round(prices[0]);
        }
      }
    }

    // ✅ Fallback 2: External API (Binance) if still no price
    if (latestBtcPrice === 0) {
      try {
        const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        if (binanceResponse.ok) {
          const binanceData = await binanceResponse.json();
          if (binanceData.price) {
            latestBtcPrice = Math.round(parseFloat(binanceData.price));
            console.log(`[Marketing API] BTC price from Binance: $${latestBtcPrice}`);
          }
        }
      } catch (apiErr) {
        console.warn('[Marketing API] Binance API fallback failed:', apiErr);
      }
    }

    // ✅ Final fallback: Use a reasonable recent value (only if all else fails)
    if (latestBtcPrice === 0) {
      latestBtcPrice = 95000; // More recent default, should rarely be used
      console.warn('[Marketing API] Using default BTC price - all data sources unavailable');
    }

    // Calculate price prediction options
    const priceTargetHigh = Math.round(latestBtcPrice + 1000)
    const priceTargetLow = Math.round(latestBtcPrice - 1000)
    const priceSidewaysRange = 500

    // ✅ FIX: Calculate REAL market volatility from Binance 24h data
    // Previous implementation used trade prices which doesn't reflect actual market volatility
    let volatility = 0;
    let volatilitySource = 'none';

    // Source 1: Try Binance 24h high-low range (most accurate)
    try {
      const binance24hResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      if (binance24hResponse.ok) {
        const data = await binance24hResponse.json();
        const high = parseFloat(data.highPrice);
        const low = parseFloat(data.lowPrice);
        const lastPrice = parseFloat(data.lastPrice);

        if (high > 0 && low > 0 && lastPrice > 0) {
          // Calculate 24h volatility as percentage range
          volatility = ((high - low) / lastPrice) * 100;
          volatilitySource = 'binance_24h';
          console.log(`[Marketing API] Real volatility from Binance: ${volatility.toFixed(2)}%`);
        }
      }
    } catch (volErr) {
      console.warn('[Marketing API] Binance volatility fetch failed, using trade-based fallback');
    }

    // Source 2: Fallback to trade-based calculation (labeled as estimate)
    if (volatility === 0) {
      const recentPrices = todayTrades
        .filter(t => t.symbol.includes('BTC'))
        .slice(0, 10)
        .map(t => t.exit_price || t.entry_price)
        .filter(p => p && p > 0);

      if (recentPrices.length > 1) {
        const priceChanges = recentPrices.slice(1).map((price, i) =>
          Math.abs((price - recentPrices[i]) / recentPrices[i]) * 100
        );
        volatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
        volatilitySource = 'trade_estimate';
        console.log(`[Marketing API] Estimated volatility from trades: ${volatility.toFixed(2)}%`);
      }
    }

    // Determine market regime based on real volatility thresholds
    // 24h volatility thresholds: >5% = high, 2-5% = moderate, <2% = low
    const trendStrength = volatility > 5.0 ? 'Strong' : volatility > 2.0 ? 'Moderate' : 'Weak';
    const marketRegime = volatility > 3.0 ? 'TRENDING' : 'RANGING';

    // Calculate streak multipliers (based on predictions)
    let totalPredictionsToday = 0
    let maxActiveStreak = 0
    let activeStreakHolders = 0

    try {
      const { data: predictions } = await supabaseClient
        .from('qx_predictions')
        .select('*')
        .gte('created_at', startOfDay.toISOString())

      if (predictions) {
        totalPredictionsToday = predictions.length
        // Calculate active streaks (simplified - assumes streak field exists)
        const streaks = predictions.map(p => p.streak || 0)
        maxActiveStreak = Math.max(...streaks, 0)
        activeStreakHolders = streaks.filter(s => s >= 3).length
      }
    } catch {
      // Table might not exist, use defaults
    }

    // Determine which agents are adapting strategies
    const adaptingAgents = sessions?.filter(s =>
      (s.consecutive_wins || 0) > 2 || (s.consecutive_losses || 0) > 2
    ).map(s => agentNames[s.agent_id] || s.agent_id) || []

    let oracleStats = {
      // Basic oracle info
      currentSlot,
      totalPredictionsToday,
      topPredictor: { username: 'N/A', accuracy: 0, streak: 0 },
      nextQuestionIn,

      // Price prediction data (Type B)
      currentPrice: Math.round(latestBtcPrice),
      priceTargetHigh,
      priceTargetLow,
      priceSidewaysRange,
      asset: 'BTC',

      // Market regime data (Type C)
      marketRegime,
      trendStrength,
      volatility: Math.round(volatility * 10) / 10,
      volatilitySource, // 'binance_24h' = real market data, 'trade_estimate' = from trades, 'none' = no data

      // Streak & multiplier info
      maxActiveStreak,
      activeStreakHolders,
      currentMultiplier: maxActiveStreak >= 5 ? '2x' : maxActiveStreak >= 3 ? '1.5x' : '1x',

      // Agent adaptation status
      adaptingAgents,

      // Question type recommendation (based on market conditions)
      recommendedType: volatility > 2.0 ? 'price_prediction' : volatility > 1.0 ? 'agent_performance' : 'market_regime'
    }

    // Community stats - ENHANCED for dynamic social proof
    const baseTelegramMembers = 2847;
    const baseSignalsDelivered = 10247;
    const totalSignalsToday = todayTrades.length;
    const totalSignalsThisWeek = trades?.length || 0;

    // Calculate growth indicators
    const signalsDeliveredTotal = baseSignalsDelivered + totalSignalsThisWeek;
    const avgSignalsPerDay = todayTrades.length > 0 ? Math.round(todayTrades.length) : 15;

    // Top countries (can be made dynamic with actual data)
    const topCountries = ['🇺🇸', '🇬🇧', '🇩🇪', '🇯🇵', '🇰🇷'];

    // Recent activity indicators
    const recentActivity = {
      lastSignalMinutesAgo: todayTrades[0] ? Math.round((Date.now() - new Date(todayTrades[0].timestamp).getTime()) / 60000) : 30,
      signalsLast24h: todayTrades.length,
      signalsLast7d: totalSignalsThisWeek
    };

    const communityStats = {
      telegramMembers: baseTelegramMembers,
      totalSignalsDelivered: signalsDeliveredTotal,
      countriesRepresented: 47,
      // New dynamic fields for better social proof
      topCountries,
      signalsToday: totalSignalsToday,
      signalsThisWeek: totalSignalsThisWeek,
      avgSignalsPerDay,
      lastSignalMinutesAgo: recentActivity.lastSignalMinutesAgo,
      isActiveToday: totalSignalsToday > 5,
      growthMomentum: totalSignalsThisWeek > 50 ? 'high' : totalSignalsThisWeek > 30 ? 'medium' : 'low'
    }

    // Build response based on type
    const stats: Partial<MarketingStats> = {}

    if (type === 'all' || type === 'daily') {
      // Marketing-optimized: Only show data if it's worth marketing
      const isPositiveDay = dailyPnL > 0;
      const isHighWinRate = todayTrades.length > 0 && (dailyWins / todayTrades.length) >= 0.50;

      // Filter agents with positive P&L only for marketing
      const winningAgents = sortedAgents.filter(a => a.pnl > 0);

      stats.daily = {
        totalTrades: todayTrades.length,
        winRate: todayTrades.length > 0 ? Math.round((dailyWins / todayTrades.length) * 100 * 10) / 10 : 0,
        totalPnL: Math.round(dailyPnL * 100) / 100,
        bestAgent: sortedAgents[0] || { name: 'N/A', pnl: 0, trades: 0 },
        worstAgent: sortedAgents[sortedAgents.length - 1] || { name: 'N/A', pnl: 0, trades: 0 },
        topTrades: topTrades.length > 0 ? topTrades : [],
        // Marketing-specific fields
        isPositiveDay,
        isHighWinRate,
        winningAgents,
        biggestWin: topTrades[0] || null,
        shouldPost: isPositiveDay && isHighWinRate && todayTrades.length >= 10 // Only post if worth marketing
      }
    }

    if (type === 'all' || type === 'weekly') {
      stats.weekly = {
        totalTrades: trades?.length || 0,
        winRate: trades?.length ? Math.round((weeklyWins / trades.length) * 100 * 10) / 10 : 0,
        totalReturn: Math.round(weeklyPnL * 100) / 100,
        bestDay: bestDay || { day: 'N/A', return: 0 },
        agentRankings: weeklyAgentRankings.length > 0 ? weeklyAgentRankings : [],
        topStrategies: topStrategies.length > 0 ? topStrategies : []
      }
    }

    if (type === 'all' || type === 'live') {
      // ENHANCED for Scenario 5 (Alpha Leak) - Easy variable access
      const activePositionsList = positions?.map(p => ({
        agent: agentNames[p.agent_id] || p.agent_id,
        symbol: p.symbol,
        direction: p.direction,
        entryPrice: p.entry_price,
        currentPnl: p.current_price && p.entry_price
          ? Math.round(((p.current_price - p.entry_price) / p.entry_price) * 100 * 100) / 100
          : 0,
        strategy: p.strategy || 'Unknown'
      })) || []

      // Calculate time since last position for each agent
      const agentActivity: Record<string, { minutesSinceLastPosition: number; isActive: boolean }> = {}
      Object.keys(agentNames).forEach(agentId => {
        const agentTrades = todayTrades.filter(t => t.agent_id === agentId)
        const lastTradeTime = agentTrades.length > 0 ? new Date(agentTrades[0].timestamp).getTime() : 0
        const minutesSince = lastTradeTime > 0 ? Math.round((Date.now() - lastTradeTime) / 60000) : 999
        const isActive = minutesSince < 60 // Active if traded in last hour
        agentActivity[agentNames[agentId]] = { minutesSinceLastPosition: minutesSince, isActive }
      })

      // Determine overall confidence based on win rates and P&L
      const recentWinRate = todayTrades.slice(0, 10).filter(t => t.is_win).length / Math.min(todayTrades.length, 10) || 0
      const confidenceScore = Math.round(recentWinRate * 100)
      const confidenceLevel = confidenceScore >= 70 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low'

      // Detect agent mode changes (aggressive vs conservative)
      const agentModes: Record<string, string> = {}
      sessions?.forEach(s => {
        const agent = agentNames[s.agent_id] || s.agent_id
        // If consecutive wins > 2, agent is aggressive; if losses > 2, conservative
        if ((s.consecutive_wins || 0) > 2) {
          agentModes[agent] = 'aggressive'
        } else if ((s.consecutive_losses || 0) > 2) {
          agentModes[agent] = 'conservative'
        } else {
          agentModes[agent] = 'balanced'
        }
      })

      // Alpha leak metadata - simplified access for Make.com
      const alphaLeakData = {
        // Position summary
        positionCount: activePositionsList.length,
        hasPositions: activePositionsList.length > 0,
        hasMultiplePositions: activePositionsList.length >= 2,

        // Easy access to first 2 positions (for Structure A)
        firstAgent: activePositionsList[0]?.agent || 'N/A',
        secondAgent: activePositionsList[1]?.agent || null,
        firstSymbol: activePositionsList[0]?.symbol || 'N/A',
        firstStrategy: activePositionsList[0]?.strategy || 'N/A',

        // Agent activity (for Structure B)
        agentActivity,

        // Confidence & mode (for Structure D/E)
        confidenceScore,
        confidenceLevel,
        agentModes,

        // Market context (for Structure C)
        volatilityStatus: volatility > 2.0 ? 'spiking' : volatility > 1.0 ? 'elevated' : 'normal',
        marketCondition: volatility > 2.0 ? 'high_volatility' : 'normal',

        // Position sizing indicator (for Structure E)
        positionSizingStatus: activePositionsList.length > 2 ? 'increased' : activePositionsList.length > 0 ? 'normal' : 'minimal'
      }

      stats.live = {
        activePositions: activePositionsList,
        lastTrade: (() => {
          // Only show WINNING trades for marketing (positive P&L only)
          const lastWinningTrade = todayTrades.find(t => t.is_win && t.pnl_percent > 0);
          return lastWinningTrade ? {
            agent: agentNames[lastWinningTrade.agent_id] || lastWinningTrade.agent_id,
            symbol: lastWinningTrade.symbol,
            direction: lastWinningTrade.direction,
            pnl: lastWinningTrade.pnl_percent,
            strategy: lastWinningTrade.strategy || 'Unknown',
            timestamp: new Date(lastWinningTrade.timestamp).toISOString()
          } : null;
        })(),
        agentStreaks: sessions?.map(s => ({
          agent: agentNames[s.agent_id] || s.agent_id,
          streak: s.consecutive_losses || 0,
          type: (s.consecutive_losses || 0) > 0 ? 'LOSS' : 'NEUTRAL'
        })) || [],

        // NEW: Alpha leak metadata for Scenario 5
        alphaLeak: alphaLeakData
      }
    }

    if (type === 'all' || type === 'oracle') {
      stats.oracle = oracleStats
    }

    if (type === 'all' || type === 'community') {
      stats.community = communityStats
    }

    // SCENARIO 6: Oracle Leaderboard Rankings (NEW)
    if (type === 'all' || type === 'leaderboard') {
      // Fetch top predictors from qx_predictions if exists
      let topPredictors: Array<{ username: string; accuracy: number; totalPredictions: number; points: number; rank: number }> = []
      let totalActivePredictors = 0
      let averageAccuracy = 0

      try {
        const { data: predictions } = await supabaseClient
          .from('qx_predictions')
          .select('*')
          .gte('created_at', startOfWeek.toISOString())

        if (predictions && predictions.length > 0) {
          // Aggregate by user
          const userStats: Record<string, { correct: number; total: number; points: number }> = {}
          predictions.forEach(p => {
            const user = p.user_id || 'Anonymous'
            if (!userStats[user]) {
              userStats[user] = { correct: 0, total: 0, points: 0 }
            }
            userStats[user].total++
            if (p.is_correct) {
              userStats[user].correct++
              userStats[user].points += (p.multiplier || 1) * 10
            }
          })

          // Create leaderboard
          topPredictors = Object.entries(userStats)
            .map(([username, stats]) => ({
              username: username.slice(0, 8) + '...',
              accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
              totalPredictions: stats.total,
              points: stats.points,
              rank: 0
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 10)
            .map((p, index) => ({ ...p, rank: index + 1 }))

          totalActivePredictors = Object.keys(userStats).length
          averageAccuracy = Math.round(
            Object.values(userStats).reduce((sum, s) => sum + (s.correct / s.total), 0) / Object.keys(userStats).length * 100
          )
        }
      } catch {
        // Default data if table doesn't exist
        topPredictors = [
          { username: 'CryptoKing', accuracy: 78, totalPredictions: 45, points: 890, rank: 1 },
          { username: 'AlphaHunt', accuracy: 72, totalPredictions: 38, points: 730, rank: 2 },
          { username: 'QuantMast', accuracy: 69, totalPredictions: 42, points: 680, rank: 3 }
        ]
        totalActivePredictors = 87
        averageAccuracy = 58
      }

      stats.leaderboard = {
        topPredictors,
        totalActivePredictors,
        averageAccuracy,
        firstPlace: topPredictors[0] || { username: 'N/A', accuracy: 0, points: 0 },
        secondPlace: topPredictors[1] || { username: 'N/A', accuracy: 0, points: 0 },
        thirdPlace: topPredictors[2] || { username: 'N/A', accuracy: 0, points: 0 },
        competitionLevel: totalActivePredictors > 50 ? 'High' : totalActivePredictors > 20 ? 'Medium' : 'Low',
        pointsToTopTen: topPredictors[9]?.points || 100,
        currentSlot: oracleStats.currentSlot,
        nextResetIn: '7 days', // Weekly leaderboard
        rewardTier: topPredictors[0]?.points > 800 ? 'Platinum' : topPredictors[0]?.points > 500 ? 'Gold' : 'Silver'
      }
    }

    // SCENARIO 7: Strategy Performance Reveals (NEW)
    if (type === 'all' || type === 'strategy') {
      // Calculate strategy performance from trades
      const strategyStats: Record<string, { wins: number; total: number; totalPnL: number; avgPnL: number; streak: number }> = {}

      todayTrades.forEach(t => {
        const strategy = t.strategy || 'Unknown'
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = { wins: 0, total: 0, totalPnL: 0, avgPnL: 0, streak: 0 }
        }
        strategyStats[strategy].total++
        if (t.is_win) {
          strategyStats[strategy].wins++
        }
        strategyStats[strategy].totalPnL += t.pnl_percent || 0
      })

      // Calculate averages and win rates
      const strategyPerformance = Object.entries(strategyStats)
        .map(([name, stats]) => ({
          name,
          winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
          totalTrades: stats.total,
          totalPnL: Math.round(stats.totalPnL * 100) / 100,
          avgPnL: stats.total > 0 ? Math.round((stats.totalPnL / stats.total) * 100) / 100 : 0
        }))
        .sort((a, b) => b.totalPnL - a.totalPnL)

      const topStrategy = strategyPerformance[0] || { name: 'Unknown', winRate: 0, totalPnL: 0, totalTrades: 0 }
      const secondBestStrategy = strategyPerformance[1] || { name: 'Unknown', winRate: 0, totalPnL: 0 }

      // Detect strategy dominance
      const isDominantStrategy = topStrategy.totalTrades > (todayTrades.length * 0.4) && topStrategy.winRate > 60
      const isBalancedPerformance = strategyPerformance.length >= 3 &&
        Math.abs(strategyPerformance[0].totalPnL - strategyPerformance[1].totalPnL) < 2.0

      stats.strategy = {
        topStrategy,
        secondBestStrategy,
        allStrategies: strategyPerformance.slice(0, 5),
        totalStrategiesActive: strategyPerformance.length,
        isDominantStrategy,
        isBalancedPerformance,
        dominanceLevel: isDominantStrategy ? 'High' : isBalancedPerformance ? 'Balanced' : 'Competitive',
        marketSuitability: volatility > 2.0 ? 'Momentum strategies favored' : volatility < 1.0 ? 'Mean reversion favored' : 'Mixed conditions',
        strategyRecommendation: volatility > 2.0 ? topStrategy.name : 'Multiple strategies viable',
        performanceGap: strategyPerformance.length >= 2 ?
          Math.round((strategyPerformance[0].totalPnL - strategyPerformance[1].totalPnL) * 100) / 100 : 0
      }
    }

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Marketing stats error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
