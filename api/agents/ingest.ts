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

  // SECURITY DEFINER RPC handles dedup + insert atomically.
  // The DB-side function returns null when the signal is a duplicate within
  // the last 15 minutes; otherwise returns the new row's UUID.
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (!cronSecret) {
    console.error('[ingest] CRON_SECRET not configured');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const { data, error } = await supabase.rpc('worker_ingest_signal', {
    p_secret: cronSecret,
    p_symbol: ticker,
    p_signal: payload.signal,
    p_confidence: payload.confidence,
    p_entry_min: payload.entryMin,
    p_entry_max: payload.entryMax,
    p_target_1: payload.target1,
    p_target_2: payload.target2,
    p_stop_loss: payload.stopLoss,
    p_regime: payload.regime,
    p_thesis: payload.thesis,
    p_invalidation: payload.invalidation,
    p_fear_greed: payload.fearGreedIndex,
    p_funding_rate: payload.fundingRate,
    p_expires_at: expiresAt,
  });

  if (error) {
    console.error('[ingest] Supabase RPC error:', error.message);
    return res.status(502).json({ error: 'Database write failed' });
  }

  if (!data) {
    return res.status(200).json({ status: 'skipped', reason: 'duplicate within 15 minutes' });
  }

  console.info(`[ingest] Signal stored: ${ticker} ${payload.signal} @ ${payload.confidence}% | id=${data}`);

  return res.status(201).json({
    status: 'stored',
    id: data,
    symbol: ticker,
    signal: payload.signal,
    confidence: payload.confidence,
  });
}
