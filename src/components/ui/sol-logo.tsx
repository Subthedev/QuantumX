import React from 'react';

interface SOLLogoProps {
  className?: string;
}

export const SOLLogo: React.FC<SOLLogoProps> = ({ className = "w-6 h-6" }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="url(#sol-gradient)"/>
      <path
        d="M9.5 19.73a.5.5 0 01.35-.15h12.3c.22 0 .33.27.17.43l-2.77 2.77a.5.5 0 01-.35.15H6.9c-.22 0-.33-.27-.17-.43l2.77-2.77zm0-7.66a.5.5 0 01.35-.15h12.3c.22 0 .33.27.17.43l-2.77 2.77a.5.5 0 01-.35.15H6.9c-.22 0-.33-.27-.17-.43l2.77-2.77zm13-2.85a.5.5 0 00-.35-.15H9.85c-.22 0-.33.27-.17.43l2.77 2.77a.5.5 0 00.35.15h12.3c.22 0 .33-.27.17-.43L22.5 9.22z"
        fill="white"
      />
      <defs>
        <linearGradient id="sol-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#00FFA3"/>
          <stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default SOLLogo;