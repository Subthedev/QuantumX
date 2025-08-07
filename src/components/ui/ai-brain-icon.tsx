import React from 'react';
import { cn } from '@/lib/utils';

interface AIBrainIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AIBrainIcon: React.FC<AIBrainIconProps> = ({ 
  className,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Brain outline */}
        <path
          d="M25 35C25 25 35 15 45 15C50 10 60 10 65 15C75 15 85 25 85 35C85 40 82 45 78 48C82 52 85 58 85 65C85 75 75 85 65 85C60 90 50 90 45 85C35 85 25 75 25 65C25 58 28 52 32 48C28 45 25 40 25 35Z"
          fill="hsl(var(--primary))"
          className="opacity-80"
        />
        
        {/* Brain folds/texture */}
        <path
          d="M35 25C40 28 45 25 50 28C55 25 60 28 65 25"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          className="opacity-60"
        />
        <path
          d="M32 40C37 43 42 40 47 43C52 40 57 43 62 40"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          className="opacity-60"
        />
        <path
          d="M35 55C40 58 45 55 50 58C55 55 60 58 65 55"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          className="opacity-60"
        />
        <path
          d="M38 70C43 73 48 70 53 73C58 70 63 73 68 70"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1.5"
          className="opacity-60"
        />
        
        {/* AI neural network dots */}
        <circle
          cx="40"
          cy="35"
          r="2"
          fill="hsl(var(--primary-foreground))"
          className="animate-pulse"
        />
        <circle
          cx="60"
          cy="45"
          r="2"
          fill="hsl(var(--primary-foreground))"
          className="animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
        <circle
          cx="45"
          cy="55"
          r="2"
          fill="hsl(var(--primary-foreground))"
          className="animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <circle
          cx="55"
          cy="65"
          r="2"
          fill="hsl(var(--primary-foreground))"
          className="animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
        
        {/* Neural connections */}
        <line
          x1="40"
          y1="35"
          x2="60"
          y2="45"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1"
          className="opacity-40"
        />
        <line
          x1="60"
          y1="45"
          x2="45"
          y2="55"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1"
          className="opacity-40"
        />
        <line
          x1="45"
          y1="55"
          x2="55"
          y2="65"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="1"
          className="opacity-40"
        />
      </svg>
    </div>
  );
};