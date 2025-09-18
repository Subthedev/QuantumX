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
        d="M16 6.5l3.03 3.03-1.89 1.89-1.14-1.14-1.14 1.14-1.89-1.89L16 6.5zm-5.53 5.53l1.89 1.89-1.89 1.89-3.03-3.03 3.03-3.03v.28zm11.06 0l3.03 3.03-3.03 3.03-1.89-1.89 1.89-1.89v-.28zM16 14.86l1.14 1.14-1.14 1.14L14.86 16l1.14-1.14zm-5.53 5.72l3.03 3.03L16 20.58l1.14 1.14 1.14-1.14 2.5 2.5L16 25.5l-5.53-5.53 1.89-1.89 1.89 1.89-1.89-1.89z"
        fill="white"
      />
    </svg>
  );
};

export default BNBLogo;