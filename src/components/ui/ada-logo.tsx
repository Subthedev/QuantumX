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
        <circle cx="16" cy="22.5" r="1.3"/>
        <circle cx="11.5" cy="19" r="1.3"/>
        <circle cx="20.5" cy="19" r="1.3"/>
        <circle cx="16" cy="19" r="1.3"/>
        <circle cx="9.5" cy="15" r="1.3"/>
        <circle cx="22.5" cy="15" r="1.3"/>
        <circle cx="13" cy="15" r="1.3"/>
        <circle cx="19" cy="15" r="1.3"/>
        <circle cx="16" cy="15" r="1.3"/>
        <circle cx="11.5" cy="11" r="1.3"/>
        <circle cx="20.5" cy="11" r="1.3"/>
        <circle cx="16" cy="11" r="1.3"/>
        <circle cx="16" cy="7.5" r="1.3"/>
      </g>
    </svg>
  );
};

export default ADALogo;