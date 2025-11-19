/**
 * ULTRA-FAST GAMIFIED ARENA HERO
 *
 * Lightweight hero section with live agent cards
 * Optimized for minimal latency and buttery smooth performance
 */

import React from 'react';
import { AgentCard } from './AgentCard';
import { useRankedAgents } from '@/hooks/useArenaAgents';

export const ArenaHero = React.memo(() => {
  const { agents, loading } = useRankedAgents(500); // 500ms refresh for ultra-fast real-time updates

  // Show skeleton cards while loading - NO BLANK SCREEN
  if (loading && agents.length === 0) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 h-[500px]">
              <div className="animate-pulse space-y-4">
                {/* Header skeleton */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>

                {/* Personality panel */}
                <div className="h-20 bg-gray-200 rounded-lg" />

                {/* Trade section */}
                <div className="h-48 bg-gray-200 rounded-xl" />

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show real agent cards (even if still loading in background)
  return (
    <div className="w-full">
      {/* THE 3 AGENT CARDS - CLEAN AND PROFESSIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {agents.map((agent, index) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            rank={index + 1}
            onShare={() => {
              const text = `🤖 ${agent.name} just ${agent.totalPnLPercent >= 0 ? 'made' : 'lost'} ${agent.totalPnLPercent >= 0 ? '+' : ''}${agent.totalPnLPercent.toFixed(2)}%!

Watch AI agents trade live 👇`;
              const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://ignitex.live/arena')}`;
              window.open(url, '_blank');
            }}
          />
        ))}
      </div>
    </div>
  );
});

ArenaHero.displayName = 'ArenaHero';
