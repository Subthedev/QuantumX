import React from 'react';

interface IgniteXLogoProps {
  className?: string;
  showText?: boolean;
}

export const IgniteXLogo: React.FC<IgniteXLogoProps> = ({ 
  className = "h-10", 
  showText = false 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFB366" />
            <stop offset="100%" stopColor="#FF8C42" />
          </linearGradient>
          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="50%" stopColor="#FF5252" />
            <stop offset="100%" stopColor="#FF8C42" />
          </linearGradient>
        </defs>
        
        {/* Chart bars */}
        <rect x="25" y="55" width="8" height="20" fill="url(#barGradient)" opacity="0.8" />
        <rect x="38" y="45" width="8" height="30" fill="url(#barGradient)" opacity="0.9" />
        <rect x="51" y="35" width="8" height="40" fill="url(#barGradient)" />
        
        {/* Upward arrow wrapping around */}
        <path
          d="M 20 70 C 20 70, 25 65, 35 60 C 45 55, 55 50, 65 40 L 60 42 L 65 40 L 63 45 M 65 40 C 70 35, 75 25, 75 25"
          stroke="url(#arrowGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Arrow head */}
        <path
          d="M 72 25 L 78 28 L 75 22 Z"
          fill="url(#arrowGradient)"
        />
      </svg>
      {showText && (
        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-variant bg-clip-text text-transparent">
          IgniteX
        </span>
      )}
    </div>
  );
};

export default IgniteXLogo;