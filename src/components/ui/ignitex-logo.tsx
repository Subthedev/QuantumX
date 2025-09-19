import React from 'react';
import logoImage from '@/assets/ignitex-logo.png';

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
      container: 'h-8',
      text: 'text-xl'
    },
    md: {
      container: 'h-10',
      text: 'text-2xl'
    },
    lg: {
      container: 'h-12',
      text: 'text-3xl'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
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