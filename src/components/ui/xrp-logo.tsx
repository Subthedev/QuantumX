import React from 'react';

interface XRPLogoProps {
  className?: string;
}

export const XRPLogo: React.FC<XRPLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#23292F"/>
      <path
        d="M21.65 8h-2.73l-2.92 3.2L13.08 8h-2.73l4.43 4.85L10.35 18h2.73l2.92-3.2L18.92 18h2.73l-4.43-4.85L21.65 8z"
        fill="white"
      />
    </svg>
  );
};

export default XRPLogo;