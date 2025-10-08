import React from 'react';
import logoImage from '@/assets/ignitex-logo.svg';

interface IgniteXLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IgniteXLogo: React.FC<IgniteXLogoProps> = ({ 
  className = "", 
  showText = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-12',
      text: 'text-xl'
    },
    md: {
      container: 'h-[3.75rem]',
      text: 'text-2xl'
    },
    lg: {
      container: 'h-[4.5rem]',
      text: 'text-3xl'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img 
        src={logoImage} 
        alt="IgniteX Logo" 
        className={`${currentSize.container} w-auto object-contain`}
      />
      {showText && (
        <span className={`${currentSize.text} font-bold text-foreground tracking-tight`}>
          IgniteX
        </span>
      )}
    </div>
  );
};

export default IgniteXLogo;