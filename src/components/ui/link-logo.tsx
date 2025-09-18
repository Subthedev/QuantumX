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
        d="M16 6l-6 3.46v12.08L16 26l6-3.46V10.46L16 6zm0 3.5l3.5 2.02v5.96L16 19.5l-3.5-2.02v-5.96L16 9.5z"
        fill="white"
      />
    </svg>
  );
};

export default LINKLogo;