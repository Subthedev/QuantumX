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
      <circle cx="16" cy="16" r="16" fill="#2A5ADA"/>
      <path
        d="M16 6l-2.5 1.5L8 10.5v11l5.5 3L16 26l2.5-1.5 5.5-3v-11l-5.5-3L16 6zm0 3.5l3.5 2v7l-3.5 2-3.5-2v-7l3.5-2z"
        fill="white"
      />
    </svg>
  );
};

export default LINKLogo;