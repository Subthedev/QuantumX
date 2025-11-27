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
      <circle cx="16" cy="16" r="16" fill="#E8662D"/>
      <path
        d="M11 9v4.5h2V11h2v2.5h2V11h2v2.5h2V9h-2v1h-2V9h-2v1h-2V9h-2zm0 6v8h10v-8h-2v6h-2v-6h-2v6h-2v-6H11z"
        fill="white"
      />
    </svg>
  );
};

export default HYPELogo;