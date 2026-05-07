/**
 * Online logistic-regression win-probability predictor.
 *
 * Pure JS, runs in <1ms, weights persisted in autonomous_state.state.mlWeights.
 * Trained online via single SGD step per closed trade. No batch retraining,
 * no external ML stack — this is the "agents that learn" part of the system,
 * built free.
 *
 * Features (all bounded 0..1 to avoid weight blowup):
 *   f0  qualityScore / 100
 *   f1  signalConfidence / 100
 *   f2  (sentimentBias + 15) / 30                              // -15..+15 → 0..1
 *   f3  (liquidationBias + 15) / 30                            // -15..+15 → 0..1
 *   f4  feedbackBias normalized
 *   f5  isTrendStrategy ? 1 : 0
 *   f6  isReversionStrategy ? 1 : 0
 *   f7  isVolStrategy ? 1 : 0
 *   f8  regimeIsBullish ? 1 : 0
 *   f9  regimeIsBearish ? 1 : 0
 *   f10 regimeIsHighVol ? 1 : 0
 *   f11 directionIsLong ? 1 : 0
 *
 * Model:  p = sigmoid(W·f + b)
 * Loss:   binary cross-entropy
 * Update: w_i += lr * (y - p) * f_i ; b += lr * (y - p)
 */

const LR = 0.05;
const N_FEATURES = 12;

export interface MLWeights {
  w: number[];      // length N_FEATURES
  b: number;
  trained: number;  // count of training updates seen
  version: number;  // bumped when feature space changes
}

export interface MLFeatureInput {
  qualityScore: number;
  signalConfidence: number;
  sentimentBias: number;          // -15..+15
  liquidationBias: number;        // -15..+15
  feedbackBias: number;           // -15..+15
  agentRiskProfile: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  regime: string;
  direction: 'LONG' | 'SHORT';
}

const FEATURE_VERSION = 1;

export function defaultWeights(): MLWeights {
  // Start with a small inductive prior: high quality + high confidence + aligned cascade
  // are the strongest hand-engineered drivers.
  const w = new Array(N_FEATURES).fill(0);
  w[0] = 0.8;   // qualityScore
  w[1] = 0.4;   // signalConfidence
  w[2] = 0.2;   // sentimentBias
  w[3] = 0.5;   // liquidationBias
  w[4] = 0.3;   // feedbackBias
  return { w, b: -0.4, trained: 0, version: FEATURE_VERSION };
}

function featurize(x: MLFeatureInput): number[] {
  const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const f: number[] = [
    clamp(x.qualityScore / 100),
    clamp(x.signalConfidence / 100),
    clamp((x.sentimentBias + 15) / 30),
    clamp((x.liquidationBias + 15) / 30),
    clamp((x.feedbackBias + 15) / 30),
    x.agentRiskProfile === 'AGGRESSIVE' ? 1 : 0,
    x.agentRiskProfile === 'BALANCED' ? 1 : 0,
    x.agentRiskProfile === 'CONSERVATIVE' ? 1 : 0,
    x.regime.startsWith('BULLISH') ? 1 : 0,
    x.regime.startsWith('BEARISH') ? 1 : 0,
    x.regime.includes('HIGH_VOL') ? 1 : 0,
    x.direction === 'LONG' ? 1 : 0,
  ];
  return f;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function predictWinProbability(weights: MLWeights, x: MLFeatureInput): number {
  const w = weights.w.length === N_FEATURES ? weights.w : defaultWeights().w;
  const f = featurize(x);
  let z = weights.b ?? 0;
  for (let i = 0; i < N_FEATURES; i++) z += w[i] * f[i];
  return sigmoid(z);
}

/**
 * Online update on one closed trade. Returns the new weights (mutates input).
 */
export function trainOne(weights: MLWeights, x: MLFeatureInput, isWin: boolean): MLWeights {
  if (weights.version !== FEATURE_VERSION || weights.w.length !== N_FEATURES) {
    weights = defaultWeights();
  }
  const y = isWin ? 1 : 0;
  const p = predictWinProbability(weights, x);
  const grad = y - p;
  const f = featurize(x);
  for (let i = 0; i < N_FEATURES; i++) {
    weights.w[i] += LR * grad * f[i];
  }
  weights.b += LR * grad;
  weights.trained++;
  return weights;
}

/**
 * Translate predicted probability into a confidence bias for the quality scorer.
 * Range roughly -20 .. +20. Untrained model (≤30 updates) returns a damped
 * version of the prior so the system can still trade while learning.
 */
export function mlBias(weights: MLWeights, x: MLFeatureInput): { bias: number; pWin: number; reasons: string[] } {
  const p = predictWinProbability(weights, x);
  const damping = Math.min(1, weights.trained / 30);
  const raw = (p - 0.5) * 40 * damping;
  const bias = Math.max(-20, Math.min(20, raw));
  return {
    bias,
    pWin: p,
    reasons: [`${bias >= 0 ? '+' : ''}${bias.toFixed(0)} ml pWin=${(p * 100).toFixed(0)}% n=${weights.trained}`],
  };
}
