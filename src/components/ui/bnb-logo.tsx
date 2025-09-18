import React from 'react';

interface BNBLogoProps {
  className?: string;
}

export const BNBLogo: React.FC<BNBLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
      <path
        d="M16 10.06L11.88 14.18l-1.6-1.6L16 6.86l5.72 5.72-1.6 1.6L16 10.06zm6.52 4.22l1.6 1.6-1.6 1.6-1.6-1.6 1.6-1.6zm-13.04 0l1.6 1.6-1.6 1.6-1.6-1.6 1.6-1.6zm6.52 6.52l4.12-4.12 1.6 1.6L16 23.94l-5.72-5.72 1.6-1.6L16 20.8zm0-2.52l-1.6-1.6-1.6 1.6 1.6 1.6 1.6-1.6z"
        fill="white"
      />
    </svg>
  );
};

export default BNBLogo;