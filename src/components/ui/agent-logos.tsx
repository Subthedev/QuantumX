/**
 * AGENT LOGOS - Premium SVG Logos for QuantumX Trading Agents
 *
 * Three stunning, distinctive logos:
 * - AlphaX: Aggressive lightning bolt - red/orange gradient
 * - BetaX: Diamond crystal - blue/cyan gradient
 * - GammaX: Shield guardian - emerald/teal gradient
 */

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * AlphaX Logo - The Trend Hunter
 * Lightning bolt representing speed and aggressive momentum trading
 */
export function AlphaXLogo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="alphaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="alphaBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <filter id="alphaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#alphaBgGradient)" stroke="url(#alphaGradient)" strokeWidth="2" />

      {/* Lightning bolt */}
      <g filter="url(#alphaGlow)">
        <path
          d="M55 15L30 50H45L40 85L70 45H55L60 15Z"
          fill="url(#alphaGradient)"
        />
      </g>

      {/* Inner glow effect */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#alphaGradient)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/**
 * BetaX Logo - The Reversion Master
 * Diamond/crystal representing precision and calculated trading
 */
export function BetaXLogo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="betaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="betaBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="betaFacetLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="betaFacetDark" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <filter id="betaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#betaBgGradient)" stroke="url(#betaGradient)" strokeWidth="2" />

      {/* Diamond shape */}
      <g filter="url(#betaGlow)">
        {/* Top facet */}
        <path d="M50 18L30 40H70L50 18Z" fill="url(#betaFacetLight)" />
        {/* Left facet */}
        <path d="M30 40L50 18L50 82L25 50L30 40Z" fill="url(#betaGradient)" />
        {/* Right facet */}
        <path d="M70 40L50 18L50 82L75 50L70 40Z" fill="url(#betaFacetDark)" />
        {/* Bottom left */}
        <path d="M25 50L50 82L50 40L30 40L25 50Z" fill="url(#betaFacetDark)" opacity="0.8" />
        {/* Bottom right */}
        <path d="M75 50L50 82L50 40L70 40L75 50Z" fill="url(#betaGradient)" opacity="0.8" />
      </g>

      {/* Inner glow effect */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#betaGradient)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/**
 * GammaX Logo - The Chaos Surfer
 * Shield representing protection and defensive volatility trading
 */
export function GammaXLogo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gammaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="gammaBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="gammaShieldInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="gammaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#gammaBgGradient)" stroke="url(#gammaGradient)" strokeWidth="2" />

      {/* Shield shape */}
      <g filter="url(#gammaGlow)">
        {/* Main shield body */}
        <path
          d="M50 15C50 15 25 20 25 35V55C25 70 50 85 50 85C50 85 75 70 75 55V35C75 20 50 15 50 15Z"
          fill="url(#gammaGradient)"
        />
        {/* Inner shield highlight */}
        <path
          d="M50 22C50 22 32 26 32 38V52C32 63 50 75 50 75C50 75 68 63 68 52V38C68 26 50 22 50 22Z"
          fill="url(#gammaShieldInner)"
          opacity="0.5"
        />
        {/* Checkmark inside */}
        <path
          d="M40 48L47 55L62 40"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Inner glow effect */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#gammaGradient)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/**
 * Get the appropriate logo component based on agent ID
 */
export function AgentLogo({ agentId, size = 40, className = '' }: { agentId: string } & LogoProps) {
  switch (agentId.toLowerCase()) {
    case 'alphax':
      return <AlphaXLogo size={size} className={className} />;
    case 'betax':
      return <BetaXLogo size={size} className={className} />;
    case 'gammax':
      return <GammaXLogo size={size} className={className} />;
    default:
      return <AlphaXLogo size={size} className={className} />;
  }
}

export default AgentLogo;
