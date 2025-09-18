import React from 'react';

interface ADALogoProps {
  className?: string;
}

export const ADALogo: React.FC<ADALogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#0D1E30"/>
      <g fill="#3468D1">
        <circle cx="16" cy="22" r="1.2"/>
        <circle cx="12" cy="18" r="1.2"/>
        <circle cx="20" cy="18" r="1.2"/>
        <circle cx="16" cy="18" r="1.2"/>
        <circle cx="10" cy="14" r="1.2"/>
        <circle cx="22" cy="14" r="1.2"/>
        <circle cx="13" cy="14" r="1.2"/>
        <circle cx="19" cy="14" r="1.2"/>
        <circle cx="16" cy="14" r="1.2"/>
        <circle cx="12" cy="10" r="1.2"/>
        <circle cx="20" cy="10" r="1.2"/>
        <circle cx="16" cy="10" r="1.2"/>
      </g>
    </svg>
  );
};

export default ADALogo;