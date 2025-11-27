import React from 'react';

interface LINKLogoProps {
  className?: string;
}

export const LINKLogo: React.FC<LINKLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#375BD2"/>
      <path
        d="M16 6l-6.5 3.75v11.5L16 25l6.5-3.75v-11.5L16 6zm0 4.5l3 1.73v5.54L16 19.5l-3-1.73v-5.54L16 10.5z"
        fill="white"
      />
    </svg>
  );
};

export default LINKLogo;