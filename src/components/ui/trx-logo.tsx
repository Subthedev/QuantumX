import React from 'react';

interface TRXLogoProps {
  className?: string;
}

export const TRXLogo: React.FC<TRXLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="#EF0027"/>
      <path
        d="M9 8l5.5 18L23 12.5 18.5 8H9zm2.5 2h5l-3 10-2-10zm6.5 0h.5l2 2-2.5 6v-8zm4 3l-5.5 9 3.5-9h2z"
        fill="white"
      />
    </svg>
  );
};

export default TRXLogo;