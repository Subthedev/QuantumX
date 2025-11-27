import React from 'react';

interface ETHLogoProps {
  className?: string;
}

export const ETHLogo: React.FC<ETHLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <g fill="white">
        <path d="M15.998 4v8.87l7.497 3.35z" opacity=".6"/>
        <path d="M15.998 4l-7.497 12.22 7.497-3.35z"/>
        <path d="M15.998 21.968v6.027L23.5 17.616z" opacity=".6"/>
        <path d="M15.998 27.995v-6.028L8.5 17.616z"/>
        <path d="M15.998 20.573l7.497-4.353-7.497-3.348z" opacity=".2"/>
        <path d="M8.501 16.22l7.497 4.353v-7.701z" opacity=".6"/>
      </g>
    </svg>
  );
};

export default ETHLogo;