import React from 'react';

interface IgniteXLogoProps {
  className?: string;
  showText?: boolean;
}

export const IgniteXLogo: React.FC<IgniteXLogoProps> = ({ 
  className = "h-10", 
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 80 80"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orangeGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFCC80" />
            <stop offset="100%" stopColor="#FFB366" />
          </linearGradient>
          <linearGradient id="orangeGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFAB66" />
            <stop offset="100%" stopColor="#FF9952" />
          </linearGradient>
          <linearGradient id="orangeGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF9952" />
            <stop offset="100%" stopColor="#FF7F3F" />
          </linearGradient>
          <linearGradient id="redArrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="50%" stopColor="#FF5757" />
            <stop offset="100%" stopColor="#FF4444" />
          </linearGradient>
        </defs>
        
        {/* First bar (shortest) */}
        <rect x="12" y="50" width="10" height="18" fill="url(#orangeGradient1)" rx="1" />
        
        {/* Second bar (medium) */}
        <rect x="28" y="38" width="10" height="30" fill="url(#orangeGradient2)" rx="1" />
        
        {/* Third bar (tallest) */}
        <rect x="44" y="26" width="10" height="42" fill="url(#orangeGradient3)" rx="1" />
        
        {/* Curved arrow wrapping around the bars */}
        <path
          d="M 10 62 C 10 54, 15 50, 22 46 C 30 42, 38 38, 46 32 C 54 26, 60 20, 64 12"
          stroke="url(#redArrowGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Arrow head pointing upward */}
        <path
          d="M 62 15 L 68 10 L 68 18 Z"
          fill="#FF4444"
          transform="rotate(-35 65 14)"
        />
      </svg>
      {showText && (
        <span className="text-2xl font-bold text-black">
          IgniteX
        </span>
      )}
    </div>
  );
};

export default IgniteXLogo;