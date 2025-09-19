import React from 'react';
import logoImage from '@/assets/ignitex-logo.png';

interface IgniteXLogoProps {
  className?: string;
  showText?: boolean;
}

export const IgniteXLogo: React.FC<IgniteXLogoProps> = ({ 
  className = "h-10", 
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logoImage} 
        alt="IgniteX Logo" 
        className="h-full w-auto object-contain"
      />
      {showText && (
        <span className="text-2xl font-bold text-black">
          IgniteX
        </span>
      )}
    </div>
  );
};

export default IgniteXLogo;