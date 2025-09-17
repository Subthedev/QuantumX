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
        d="M22.5 9.5h-3.19l-3.31 3.31-3.31-3.31H9.5l5.19 5.19L9.5 20h3.19L16 16.69 19.31 20h3.19l-5.19-5.31L22.5 9.5z"
        fill="white"
      />
    </svg>
  );
};

export default XRPLogo;