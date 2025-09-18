import React from 'react';

interface SOLLogoProps {
  className?: string;
}

export const SOLLogo: React.FC<SOLLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sol-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#sol-gradient)"/>
      <path
        d="M9.5 18.85a.5.5 0 01.35-.15h13.3a.25.25 0 01.18.43l-2.58 2.62a.5.5 0 01-.35.15H7.1a.25.25 0 01-.18-.43l2.58-2.62zM9.5 10.15a.5.5 0 01.35-.15h13.3a.25.25 0 01.18.43l-2.58 2.62a.5.5 0 01-.35.15H7.1a.25.25 0 01-.18-.43l2.58-2.62zm13.65 4.27a.5.5 0 01-.35.15H9.5a.25.25 0 01-.18-.43l2.58-2.62a.5.5 0 01.35-.15h13.3a.25.25 0 01.18.43l-2.58 2.62z"
        fill="white"
      />
    </svg>
  );
};

export default SOLLogo;