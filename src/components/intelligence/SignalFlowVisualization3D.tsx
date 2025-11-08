/**
 * 3D Signal Flow Visualization
 * 
 * Beautiful real-time visualization showing data transformation through pipeline stages
 * with 3D CSS transforms, particle trails, and smooth animations
 */

import { useEffect, useState, useRef } from 'react';
import { Database, Brain, Target, CheckCircle2, Filter, Sparkles } from 'lucide-react';

interface Particle {
  id: string;
  x: number;
  y: number;
  stage: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
  opacity: number;
  trail: { x: number; y: number; opacity: number }[];
}

interface Stage {
  name: string;
  icon: any;
  color: string;
  glowColor: string;
  x: number;
  y: number;
  z: number;
}

const STAGES: Stage[] = [
  { name: 'Data', icon: Database, color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.5)', x: 10, y: 50, z: 0 },
  { name: 'Alpha', icon: Brain, color: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.5)', x: 30, y: 30, z: 20 },
  { name: 'Beta', icon: Target, color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.5)', x: 50, y: 50, z: 40 },
  { name: 'Gamma', icon: CheckCircle2, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.5)', x: 70, y: 30, z: 20 },
  { name: 'Delta', icon: Filter, color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.5)', x: 90, y: 50, z: 0 }
];

export default function SignalFlowVisualization3D() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate particles continuously
  useEffect(() => {
    const spawnParticle = () => {
      const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
      
      const newParticle: Particle = {
        id: `${Date.now()}-${Math.random()}`,
        x: STAGES[0].x,
        y: STAGES[0].y + (Math.random() - 0.5) * 10,
        stage: 0,
        progress: 0,
        speed: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        opacity: 0.8,
        trail: []
      };

      setParticles(prev => {
        if (prev.length > 50) return prev;
        return [...prev, newParticle];
      });
    };

    const interval = setInterval(spawnParticle, 200);
    return () => clearInterval(interval);
  }, []);

  // Animate particles with trails
  useEffect(() => {
    const animate = () => {
      setParticles(prev => {
        return prev
          .map(particle => {
            const currentStage = STAGES[particle.stage];
            const nextStage = STAGES[particle.stage + 1];

            if (!nextStage) {
              return null; // Remove particle at end
            }

            // Calculate position along bezier curve
            const t = particle.progress / 100;
            
            // Bezier curve for smooth flow
            const controlX = (currentStage.x + nextStage.x) / 2;
            const controlY = currentStage.y - 20; // Arc upward
            
            const x = Math.pow(1 - t, 2) * currentStage.x + 
                     2 * (1 - t) * t * controlX + 
                     Math.pow(t, 2) * nextStage.x;
            
            const y = Math.pow(1 - t, 2) * currentStage.y + 
                     2 * (1 - t) * t * controlY + 
                     Math.pow(t, 2) * nextStage.y;

            // Add current position to trail
            const trail = [
              { x: particle.x, y: particle.y, opacity: 0.6 },
              ...particle.trail.slice(0, 8)
            ].map((point, idx) => ({
              ...point,
              opacity: point.opacity * 0.85
            }));

            const newProgress = particle.progress + particle.speed;

            if (newProgress >= 100) {
              // Move to next stage
              if (particle.stage < STAGES.length - 2) {
                return {
                  ...particle,
                  x,
                  y,
                  stage: particle.stage + 1,
                  progress: 0,
                  trail: []
                };
              }
              return null; // Remove at end
            }

            return {
              ...particle,
              x,
              y,
              progress: newProgress,
              trail
            };
          })
          .filter((p): p is Particle => p !== null);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800">
      {/* 3D Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Flowing Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Bezier curves between stages */}
        {STAGES.slice(0, -1).map((stage, idx) => {
          const nextStage = STAGES[idx + 1];
          const controlX = (stage.x + nextStage.x) / 2;
          const controlY = stage.y - 20;
          
          return (
            <path
              key={idx}
              d={`M ${stage.x}% ${stage.y}% Q ${controlX}% ${controlY}%, ${nextStage.x}% ${nextStage.y}%`}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              fill="none"
              filter="url(#glow)"
              className="transition-all duration-300"
            />
          );
        })}

        {/* Particle trails */}
        {particles.map(particle => (
          <g key={particle.id}>
            {particle.trail.map((point, idx) => (
              <circle
                key={idx}
                cx={`${point.x}%`}
                cy={`${point.y}%`}
                r={particle.size * (1 - idx * 0.1)}
                fill={particle.color}
                opacity={point.opacity}
                filter="url(#glow)"
              />
            ))}
          </g>
        ))}

        {/* Active particles */}
        {particles.map(particle => (
          <g key={particle.id}>
            <circle
              cx={`${particle.x}%`}
              cy={`${particle.y}%`}
              r={particle.size}
              fill={particle.color}
              opacity={particle.opacity}
              filter="url(#glow)"
            />
            <circle
              cx={`${particle.x}%`}
              cy={`${particle.y}%`}
              r={particle.size + 2}
              fill="none"
              stroke={particle.color}
              strokeWidth="1"
              opacity={particle.opacity * 0.3}
            />
          </g>
        ))}
      </svg>

      {/* Stage Nodes with 3D effect */}
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const isHovered = hoveredStage === idx;
        
        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: `${stage.x}%`,
              top: `${stage.y}%`,
              transform: 'translate(-50%, -50%)',
              perspective: '1000px'
            }}
            onMouseEnter={() => setHoveredStage(idx)}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <div
              className="relative transition-all duration-300 cursor-pointer"
              style={{
                transform: isHovered 
                  ? `translateZ(${stage.z + 30}px) scale(1.2) rotateY(10deg)`
                  : `translateZ(${stage.z}px) scale(1)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300"
                style={{
                  background: stage.color,
                  opacity: isHovered ? 0.6 : 0.3,
                  transform: 'translateZ(-10px)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />

              {/* Main node */}
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-xl border-2 shadow-2xl transition-all duration-300"
                style={{
                  background: isHovered 
                    ? `linear-gradient(135deg, ${stage.color}dd, ${stage.color}99)`
                    : `linear-gradient(135deg, ${stage.color}66, ${stage.color}33)`,
                  borderColor: stage.color,
                  boxShadow: isHovered 
                    ? `0 20px 60px ${stage.glowColor}, inset 0 0 20px ${stage.glowColor}`
                    : `0 10px 30px ${stage.glowColor}`
                }}
              >
                <Icon className="w-10 h-10 text-white" strokeWidth={2} />
                
                {/* Sparkle effect on hover */}
                {isHovered && (
                  <Sparkles 
                    className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse"
                  />
                )}
              </div>

              {/* Stage label */}
              <div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold text-white px-3 py-1 rounded-full backdrop-blur-md transition-all duration-300"
                style={{
                  background: isHovered ? stage.color : `${stage.color}66`,
                  boxShadow: isHovered ? `0 0 20px ${stage.glowColor}` : 'none'
                }}
              >
                {stage.name}
              </div>

              {/* Particle count indicator */}
              <div
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white backdrop-blur-md border-2 transition-all duration-300"
                style={{
                  background: stage.color,
                  borderColor: isHovered ? '#fff' : stage.color,
                  transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                }}
              >
                {particles.filter(p => p.stage === idx).length}
              </div>
            </div>
          </div>
        );
      })}

      {/* Stats overlay */}
      <div className="absolute bottom-4 right-4 flex gap-4">
        <div className="px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700">
          <div className="text-xs text-slate-400">Active Particles</div>
          <div className="text-2xl font-bold text-white">{particles.length}</div>
        </div>
        <div className="px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700">
          <div className="text-xs text-slate-400">Flow Rate</div>
          <div className="text-2xl font-bold text-emerald-400">
            {(particles.length * 5).toFixed(0)}/s
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="absolute top-4 left-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Real-Time Signal Flow
        </h3>
        <p className="text-sm text-slate-400 mt-1">3D visualization with particle trails</p>
      </div>
    </div>
  );
}
