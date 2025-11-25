/**
 * QuantumX Logo Component
 * Circular design with atom/quantum particle theme
 */

import React from 'react';

interface QuantumXLogoProps {
  className?: string;
  size?: number;
}

export const QuantumXLogo: React.FC<QuantumXLogoProps> = ({ className = '', size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle background - purple gradient */}
      <circle cx="100" cy="100" r="95" fill="url(#quantumGradient)" />

      {/* Inner square - cyan blue */}
      <rect x="50" y="50" width="100" height="100" rx="12" fill="#00B4D8" />

      {/* Atom rings */}
      <ellipse cx="100" cy="100" rx="35" ry="55" fill="none" stroke="white" strokeWidth="6" opacity="0.9" />
      <ellipse cx="100" cy="100" rx="55" ry="35" fill="none" stroke="white" strokeWidth="6" opacity="0.9" />
      <ellipse cx="100" cy="100" rx="45" ry="45" fill="none" stroke="white" strokeWidth="5" opacity="0.7" transform="rotate(45 100 100)" />

      {/* Particles - yellow dots */}
      <circle cx="100" cy="45" r="8" fill="#FFB703" />
      <circle cx="100" cy="155" r="8" fill="#FFB703" />
      <circle cx="45" cy="100" r="8" fill="#FFB703" />
      <circle cx="155" cy="100" r="8" fill="#FFB703" />

      {/* Center core - hexagon */}
      <path
        d="M 100 85 L 112 92.5 L 112 107.5 L 100 115 L 88 107.5 L 88 92.5 Z"
        fill="#023047"
        stroke="white"
        strokeWidth="2"
      />

      {/* Center particle */}
      <circle cx="100" cy="100" r="5" fill="#FFB703" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="quantumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A3F8C" />
          <stop offset="50%" stopColor="#5B4EA1" />
          <stop offset="100%" stopColor="#6B5FAA" />
        </linearGradient>
      </defs>
    </svg>
  );
};
