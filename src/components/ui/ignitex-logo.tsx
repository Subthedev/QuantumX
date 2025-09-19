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
        viewBox="0 0 100 100"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bar1Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFA366" />
            <stop offset="100%" stopColor="#FF7F42" />
          </linearGradient>
          <linearGradient id="bar2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF9156" />
            <stop offset="100%" stopColor="#FF6B32" />
          </linearGradient>
          <linearGradient id="bar3Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8046" />
            <stop offset="100%" stopColor="#FF5722" />
          </linearGradient>
          <linearGradient id="arrowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF5252" />
            <stop offset="50%" stopColor="#FF4444" />
            <stop offset="100%" stopColor="#FF6B6B" />
          </linearGradient>
        </defs>
        
        {/* Three ascending bars */}
        <rect x="18" y="60" width="12" height="25" fill="url(#bar1Gradient)" rx="2" />
        <rect x="36" y="45" width="12" height="40" fill="url(#bar2Gradient)" rx="2" />
        <rect x="54" y="30" width="12" height="55" fill="url(#bar3Gradient)" rx="2" />
        
        {/* Curved arrow path wrapping around bars */}
        <path
          d="M 15 75 Q 15 65, 25 60 T 45 50 Q 65 40, 70 25"
          stroke="url(#arrowGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Arrow head */}
        <path
          d="M 68 28 L 74 22 L 74 30 Z"
          fill="#FF5252"
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