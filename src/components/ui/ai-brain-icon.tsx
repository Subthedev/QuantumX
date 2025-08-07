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
        viewBox="0 0 120 120"
        className="w-full h-full drop-shadow-lg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient definitions */}
          <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          </linearGradient>
          
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="70%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Neural pulse animation */}
          <animate id="neuralPulse" attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </defs>
        
        {/* Outer glow effect */}
        <ellipse
          cx="60"
          cy="60"
          rx="45"
          ry="35"
          fill="url(#glowGradient)"
          className="animate-pulse"
          style={{ animationDuration: '3s' }}
        />
        
        {/* Main brain structure - left hemisphere */}
        <path
          d="M25 45C25 30 35 18 50 18C55 15 65 15 70 18C75 20 80 25 82 32C84 38 82 44 78 48C80 52 82 58 80 64C78 72 70 78 60 80C50 82 40 80 32 75C26 70 25 62 25 55C25 52 25 48 25 45Z"
          fill="url(#brainGradient)"
          filter="url(#glow)"
          className="animate-pulse"
          style={{ animationDuration: '4s', animationDelay: '0s' }}
        />
        
        {/* Main brain structure - right hemisphere */}
        <path
          d="M95 45C95 30 85 18 70 18C75 20 80 25 82 32C84 38 88 44 92 48C90 52 88 58 90 64C92 72 90 78 85 82C80 85 75 87 70 85C75 83 82 80 88 75C94 70 95 62 95 55C95 52 95 48 95 45Z"
          fill="url(#brainGradient)"
          filter="url(#glow)"
          className="animate-pulse"
          style={{ animationDuration: '4s', animationDelay: '0.5s' }}
        />
        
        {/* Brain cortex details */}
        <path
          d="M35 30C42 33 48 30 55 33C62 30 68 33 75 30"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          fill="none"
          className="opacity-60"
        />
        <path
          d="M32 42C39 45 45 42 52 45C59 42 65 45 72 42"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          fill="none"
          className="opacity-60"
        />
        <path
          d="M35 54C42 57 48 54 55 57C62 54 68 57 75 54"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          fill="none"
          className="opacity-60"
        />
        <path
          d="M38 66C45 69 51 66 58 69C65 66 71 69 78 66"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          fill="none"
          className="opacity-60"
        />
        
        {/* Neural network nodes */}
        <circle cx="45" cy="35" r="3" fill="hsl(var(--primary))" filter="url(#glow)" className="animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '0s' }} />
        <circle cx="75" cy="40" r="3" fill="hsl(var(--primary))" filter="url(#glow)" className="animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        <circle cx="50" cy="50" r="3" fill="hsl(var(--primary))" filter="url(#glow)" className="animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
        <circle cx="70" cy="55" r="3" fill="hsl(var(--primary))" filter="url(#glow)" className="animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '0.9s' }} />
        <circle cx="55" cy="65" r="3" fill="hsl(var(--primary))" filter="url(#glow)" className="animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '1.2s' }} />
        
        {/* Secondary nodes */}
        <circle cx="40" cy="45" r="2" fill="hsl(var(--primary))" className="opacity-70 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
        <circle cx="65" cy="35" r="2" fill="hsl(var(--primary))" className="opacity-70 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        <circle cx="80" cy="50" r="2" fill="hsl(var(--primary))" className="opacity-70 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.8s' }} />
        <circle cx="45" cy="60" r="2" fill="hsl(var(--primary))" className="opacity-70 animate-pulse" style={{ animationDuration: '2s', animationDelay: '1.1s' }} />
        
        {/* Neural connections with gradient */}
        <line x1="45" y1="35" x2="75" y2="40" stroke="url(#neuralGradient)" strokeWidth="2" className="opacity-60">
          <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" />
        </line>
        <line x1="75" y1="40" x2="50" y2="50" stroke="url(#neuralGradient)" strokeWidth="2" className="opacity-60">
          <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" begin="0.5s" />
        </line>
        <line x1="50" y1="50" x2="70" y2="55" stroke="url(#neuralGradient)" strokeWidth="2" className="opacity-60">
          <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" begin="1s" />
        </line>
        <line x1="70" y1="55" x2="55" y2="65" stroke="url(#neuralGradient)" strokeWidth="2" className="opacity-60">
          <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" begin="1.5s" />
        </line>
        
        {/* Additional neural pathways */}
        <line x1="40" y1="45" x2="65" y2="35" stroke="hsl(var(--primary))" strokeWidth="1" className="opacity-30">
          <animate attributeName="stroke-opacity" values="0.1;0.5;0.1" dur="4s" repeatCount="indefinite" />
        </line>
        <line x1="80" y1="50" x2="45" y2="60" stroke="hsl(var(--primary))" strokeWidth="1" className="opacity-30">
          <animate attributeName="stroke-opacity" values="0.1;0.5;0.1" dur="4s" repeatCount="indefinite" begin="1s" />
        </line>
        
        {/* Central processing core */}
        <circle 
          cx="60" 
          cy="50" 
          r="8" 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="1" 
          className="opacity-40"
        >
          <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />
        </circle>
        
        {/* Energy waves */}
        <circle 
          cx="60" 
          cy="50" 
          r="15" 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="0.5" 
          className="opacity-20"
        >
          <animate attributeName="r" values="10;20;10" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
};