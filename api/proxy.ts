/**
 * Vercel Serverless CORS Proxy
 *
 * Proxies requests to crypto APIs that block browser CORS.
 * Usage: /api/proxy?url=https://fapi.binance.com/futures/data/topLongShortAccountRatio&symbol=BTCUSDT&period=5m
 *
 * Allowed origins: Binance Futures, CoinGecko, CryptoCompare
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_HOSTS = [
  'fapi.binance.com',
  'api.coingecko.com',
  'min-api.cryptocompare.com',
  'open-api-v3.coinglass.com',
  'api.alternative.me',
  'api-pub.bitfinex.com',
];

const CACHE_TTL: Record<string, number> = {
  'fapi.binance.com': 30,        // 30s - real-time data
  'api.coingecko.com': 300,      // 5min - rate limited
  'api.alternative.me': 3600,    // 1hr - daily data
  'api-pub.bitfinex.com': 60,    // 1min
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Security: only proxy allowed hosts
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return res.status(403).json({ error: `Host not allowed: ${parsed.hostname}` });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'QuantumX/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream error: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Cache based on host
    const ttl = CACHE_TTL[parsed.hostname] || 60;
    res.setHeader('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`);

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[proxy] Fetch error:', error.message);
    return res.status(502).json({ error: 'Failed to fetch upstream', detail: error.message });
  }
}
