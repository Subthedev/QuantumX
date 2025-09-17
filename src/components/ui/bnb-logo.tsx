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
        d="M16 6l2.62 2.62-5.12 5.12L10.88 11.12 16 6zm6 6l2.62 2.62L22 17.24l-2.62-2.62L22 12zM10 12l2.62 2.62L10 17.24 7.38 14.62 10 12zm6 6l2.62 2.62L16 26l-5.12-5.12 2.62-2.62L16 20.88l2.5-2.5v-.38z"
        fill="white"
      />
    </svg>
  );
};

export default BNBLogo;