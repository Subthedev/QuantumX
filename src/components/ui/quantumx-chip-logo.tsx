/**
 * QuantumX Chip Logo - Purple processor chip with atom symbol
 * Based on user's exact design
 */

import React from 'react';

interface QuantumXChipLogoProps {
  className?: string;
  size?: number;
}

export const QuantumXChipLogo: React.FC<QuantumXChipLogoProps> = ({ className = '', size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer purple circle */}
      <circle cx="100" cy="100" r="100" fill="#5B4B8A" />
      <circle cx="100" cy="100" r="85" fill="#6B5B9A" />

      {/* Chip pins - top */}
      <rect x="80" y="0" width="10" height="25" rx="5" fill="#E8E8E8" />
      <rect x="95" y="0" width="10" height="25" rx="5" fill="#E8E8E8" />
      <rect x="110" y="0" width="10" height="25" rx="5" fill="#E8E8E8" />

      {/* Chip pins - right */}
      <rect x="175" y="80" width="25" height="10" rx="5" fill="#E8E8E8" />
      <rect x="175" y="95" width="25" height="10" rx="5" fill="#E8E8E8" />
      <rect x="175" y="110" width="25" height="10" rx="5" fill="#E8E8E8" />

      {/* Chip pins - bottom */}
      <rect x="80" y="175" width="10" height="25" rx="5" fill="#E8E8E8" />
      <rect x="95" y="175" width="10" height="25" rx="5" fill="#E8E8E8" />
      <rect x="110" y="175" width="10" height="25" rx="5" fill="#E8E8E8" />

      {/* Chip pins - left */}
      <rect x="0" y="80" width="25" height="10" rx="5" fill="#E8E8E8" />
      <rect x="0" y="95" width="25" height="10" rx="5" fill="#E8E8E8" />
      <rect x="0" y="110" width="25" height="10" rx="5" fill="#E8E8E8" />

      {/* White chip body */}
      <rect x="35" y="35" width="130" height="130" rx="8" fill="white" />

      {/* Cyan/blue center square */}
      <rect x="50" y="50" width="100" height="100" rx="6" fill="#00B4D8" />

      {/* Atom symbol - white orbital rings */}
      <ellipse cx="100" cy="100" rx="30" ry="45" fill="none" stroke="white" strokeWidth="5" opacity="0.9" />
      <ellipse cx="100" cy="100" rx="45" ry="30" fill="none" stroke="white" strokeWidth="5" opacity="0.9" />
      <ellipse cx="100" cy="100" rx="38" ry="38" fill="none" stroke="white" strokeWidth="4" opacity="0.8" transform="rotate(45 100 100)" />

      {/* Yellow electrons/particles on orbits */}
      <circle cx="100" cy="55" r="6" fill="#FFD700" />
      <circle cx="100" cy="145" r="6" fill="#FFD700" />
      <circle cx="55" cy="100" r="6" fill="#FFD700" />
      <circle cx="145" cy="100" r="6" fill="#FFD700" />

      {/* Center hexagon core */}
      <path
        d="M 100 85 L 110 90 L 110 110 L 100 115 L 90 110 L 90 90 Z"
        fill="#2C3E50"
        stroke="white"
        strokeWidth="2"
      />

      {/* Center particle */}
      <circle cx="100" cy="100" r="4" fill="#FFD700" />
    </svg>
  );
};
