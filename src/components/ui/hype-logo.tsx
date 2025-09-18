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
      <circle cx="16" cy="16" r="16" fill="#E26C38"/>
      <path
        d="M11 9v6h2v-4h2v4h2v-4h2v4h2V9h-2v2h-2V9h-2v2h-2V9h-2zm0 8v6h10v-6h-2v4h-2v-4h-2v4h-2v-4H11z"
        fill="white"
      />
    </svg>
  );
};

export default HYPELogo;