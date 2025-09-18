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
      <circle cx="16" cy="16" r="16" fill="#EB0029"/>
      <path
        d="M9 9.45l.65-.63 5.45 5.07.01 11.66L9 9.45zm7.88 4.91l5.88-5.54.57.01L16 25.65V14.57l-.12-.21zm7.55-5.41L24 9.62l-5.25 4.84.08.13 5.6 1.93z"
        fill="white"
      />
    </svg>
  );
};

export default TRXLogo;