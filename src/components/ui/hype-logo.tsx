import React from 'react';

interface HYPELogoProps {
  className?: string;
}

export const HYPELogo: React.FC<HYPELogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="url(#hype-gradient)"/>
      <path
        d="M11 11v4h2v-4h4v10h-4v-4h-2v4c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-10c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2zm10 0v10h2v-10h-2z"
        fill="white"
      />
      <defs>
        <linearGradient id="hype-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#9945FF"/>
          <stop offset="1" stopColor="#14F195"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default HYPELogo;