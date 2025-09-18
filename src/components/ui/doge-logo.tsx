import React from 'react';

interface DOGELogoProps {
  className?: string;
}

export const DOGELogo: React.FC<DOGELogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#C2A633"/>
      <path
        d="M21 12.5c0-1.9-1.6-3.5-3.5-3.5H11v14h6.5c1.9 0 3.5-1.6 3.5-3.5v-7zm-3.5 7h-3.5v-7h3.5c.6 0 1 .4 1 1v5c0 .6-.4 1-1 1z"
        fill="white"
      />
      <path
        d="M8 9h2v14H8V9z"
        fill="white"
      />
    </svg>
  );
};

export default DOGELogo;