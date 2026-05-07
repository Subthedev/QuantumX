/**
 * QuantumX Agent Ingest Endpoint
 *
 * Vercel Serverless Function — receives validated signal payloads from the
 * Market Intel OpenClaw agent and writes them to Supabase intelligence_signals.
 *
 * Security: shared secret header (x-agent-secret) validated before any processing.
 * The secret must match AGENT_INGEST_SECRET in Vercel env vars.
 *
 * Route: POST /api/agents/ingest
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngestPayload {
  symbol: string;
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  price: number;
  change24h: number;
  volume24h: number;
  regime: string;
  entryMin: number;
  entryMax: number;
  target1: number;
  target2: number;
  stopLoss: number;
  fundingRate: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
  thesis: string;
  invalidation: string;
  generatedAt: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePayload(body: unknown): IngestPayload | null {
  if (!body || typeof body !== 'object') return null;
  const p = body as Record<string, unknown>;

  const required = [
    'symbol', 'signal', 'confidence', 'price', 'change24h',
    'regime', 'entryMin', 'entryMax', 'target1', 'target2',
    'stopLoss', 'thesis', 'invalidation', 'generatedAt',
  ];

  for (const key of required) {
    if (p[key] === undefined || p[key] === null) return null;
  }

  if (!['LONG', 'SHORT', 'NEUTRAL'].includes(p.signal as string)) return null;
  if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 100) return null;
  if (typeof p.price !== 'number' || p.price <= 0) return null;

  return p as unknown as IngestPayload;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://quantumx.org.in');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-agent-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const providedSecret = req.headers['x-agent-secret'];
  const expectedSecret = process.env.AGENT_INGEST_SECRET;

  if (!expectedSecret) {
    console.error('[ingest] AGENT_INGEST_SECRET not configured');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Parse + Validate ──────────────────────────────────────────────────────
  const payload = validatePayload(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload schema' });
  }

  if (payload.confidence < 55) {
    return res.status(200).json({ status: 'skipped', reason: 'confidence below threshold' });
  }

  // ── Write to Supabase ─────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } }
  );

  const ticker = payload.symbol.replace('USDT', '');
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  // Deduplication check
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: dupeCount } = await supabase
    .from('intelligence_signals')
    .select('id', { count: 'exact', head: true })
    .eq('symbol', ticker)
    .eq('signal_type', payload.signal)
    .gte('created_at', since);

  if ((dupeCount ?? 0) > 0) {
    return res.status(200).json({ status: 'skipped', reason: 'duplicate within 15 minutes' });
  }

  const { data, error } = await supabase
    .from('intelligence_signals')
    .insert({
      symbol: ticker,
      signal_type: payload.signal,
      confidence: payload.confidence,
      entry_min: payload.entryMin,
      entry_max: payload.entryMax,
      target_1: payload.target1,
      target_2: payload.target2,
      stop_loss: payload.stopLoss,
      risk_level: payload.confidence >= 80 ? 'LOW' : payload.confidence >= 65 ? 'MEDIUM' : 'HIGH',
      strength: Math.round(payload.confidence / 10),
      status: 'active',
      expires_at: expiresAt,
      // extended metadata stored as extra cols (schema-permissive)
      regime: payload.regime,
      fear_greed_index: payload.fearGreedIndex,
      funding_rate: payload.fundingRate,
      thesis: payload.thesis,
      invalidation: payload.invalidation,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ingest] Supabase insert error:', error.message);
    return res.status(502).json({ error: 'Database write failed' });
  }

  console.info(`[ingest] Signal stored: ${ticker} ${payload.signal} @ ${payload.confidence}% | id=${data.id}`);

  return res.status(201).json({
    status: 'stored',
    id: data.id,
    symbol: ticker,
    signal: payload.signal,
    confidence: payload.confidence,
  });
}
