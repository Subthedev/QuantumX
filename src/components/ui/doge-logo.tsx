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
        d="M20.5 15.7h-3.7v-3.2h3.2c.8 0 1.5.2 2 .5.5.4.8.9.8 1.6 0 .6-.2 1.1-.7 1.4-.4.3-1 .5-1.6.5v-.8zm-6.5 7.8V8.5h6c1.8 0 3.3.5 4.3 1.4 1 .9 1.5 2.1 1.5 3.7 0 1.6-.5 2.8-1.5 3.7-1 .9-2.5 1.4-4.3 1.4h-3.2v4.8H14zm-3.5-8.6c-.2 0-.3 0-.5.1-.1.1-.2.2-.2.4v4.1c0 .2.1.3.2.4.1.1.3.1.5.1h3.5c2.1 0 3.8-.5 5-1.6 1.2-1.1 1.8-2.6 1.8-4.5s-.6-3.4-1.8-4.5c-1.2-1.1-2.9-1.6-5-1.6h-3.5c-.2 0-.3 0-.5.1-.1.1-.2.2-.2.4v4.1c0 .2.1.3.2.4.1.1.3.1.5.1z"
        fill="white"
      />
    </svg>
  );
};

export default DOGELogo;