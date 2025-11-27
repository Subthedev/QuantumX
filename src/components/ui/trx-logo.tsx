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
        d="M7.82 9.89L8.95 8.7l7.05 7.2v9.6L7.82 9.89zm11.12 6.53l6.24-6.53 1.18 1.41L16 25.5V16.42zm6.99-6.97l.95 1.13-6.89 5.97 5.94-7.1z"
        fill="white"
      />
    </svg>
  );
};

export default TRXLogo;