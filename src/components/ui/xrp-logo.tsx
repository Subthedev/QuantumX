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
        d="M22.5 8h-3.19l-3.31 3.31L12.69 8H9.5l4.69 4.69a.75.75 0 0 0 1.06 0L19.31 8.62c.14-.14.33-.22.53-.22H22.5zm-13 16h3.19l3.31-3.31L19.31 24h3.19l-4.69-4.69a.75.75 0 0 0-1.06 0l-4.06 4.07c-.14.14-.33.22-.53.22H9.5z"
        fill="white"
      />
    </svg>
  );
};

export default XRPLogo;