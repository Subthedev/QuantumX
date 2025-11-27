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
        d="M20.88 15.47c0 1.11-.37 2.02-1.11 2.73-.74.71-1.71 1.07-2.91 1.07h-2.34v4.23h-2.87V8.5h5.37c1.15 0 2.08.36 2.78 1.08.7.72 1.08 1.66 1.08 2.82v3.07zm-2.87-.1v-2.74c0-.45-.14-.81-.42-1.08-.28-.27-.65-.41-1.11-.41h-2v5.73h2c.46 0 .83-.14 1.11-.42.28-.28.42-.63.42-1.08z"
        fill="white"
      />
    </svg>
  );
};

export default DOGELogo;