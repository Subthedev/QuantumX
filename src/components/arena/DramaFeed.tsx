/**
 * LIVE DRAMA FEED - Real-time storytelling engine
 *
 * Transforms agent trading data into compelling narrative
 * Creates emotional hooks that keep users watching
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, Target, AlertTriangle, Trophy, Flame } from 'lucide-react';
import { globalHubService } from '@/services/globalHubService';
import { arenaService } from '@/services/arenaService';

interface DramaEvent {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  type: 'trade_opened' | 'massive_win' | 'comeback' | 'drawdown' | 'agents_agree' | 'perfect_call' | 'streak';
  message: string;
  emotion: 'excited' | 'cautious' | 'confident' | 'worried' | 'triumphant';
  icon: 'fire' | 'zap' | 'warning' | 'trophy' | 'target' | 'trending';
  color: 'orange' | 'green' | 'red' | 'yellow' | 'blue';
  data?: any;
}

export const DramaFeed: React.FC = () => {
  const [events, setEvents] = useState<DramaEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Subscribe to arena events
    const handleArenaEvent = (event: any) => {
      const dramaEvent = convertToDramaEvent(event);
      if (dramaEvent) {
        setEvents(prev => [dramaEvent, ...prev].slice(0, 20)); // Keep last 20 events
      }
    };

    // Subscribe to relevant events
    globalHubService.on('signal:new', handleArenaEvent);

    // Poll agent states for dramatic moments
    const checkDramaticMoments = () => {
      const agents = arenaService.getAgents();
      agents.forEach((agent: any) => {
        checkForDramaticMoment(agent);
      });
    };

    const interval = setInterval(checkDramaticMoments, 5000); // Check every 5 seconds

    return () => {
      globalHubService.off('signal:new', handleArenaEvent);
      clearInterval(interval);
    };
  }, []);

  const convertToDramaEvent = (event: any): DramaEvent | null => {
    // Transform raw events into narrative
    if (event.type === 'signal:new') {
      return {
        id: `${Date.now()}-signal`,
        timestamp: new Date(),
        agentId: 'system',
        agentName: 'Intelligence Hub',
        agentAvatar: '🎯',
        type: 'trade_opened',
        message: `New ${event.direction} signal detected for ${event.symbol}`,
        emotion: 'confident',
        icon: 'target',
        color: event.direction === 'LONG' ? 'green' : 'red',
        data: event
      };
    }
    return null;
  };

  const checkForDramaticMoment = (agent: any) => {
    const lastTrade = agent.lastTrade;
    if (!lastTrade) return;

    // Massive win (>5% in single trade)
    if (lastTrade.pnlPercent > 5) {
      addDramaEvent({
        id: `${Date.now()}-${agent.id}-win`,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        agentAvatar: agent.avatar,
        type: 'massive_win',
        message: `${agent.name} SURGING +${lastTrade.pnlPercent.toFixed(1)}% on ${lastTrade.symbol}!`,
        emotion: 'triumphant',
        icon: 'fire',
        color: 'green',
        data: lastTrade
      });
    }

    // Dramatic drawdown
    if (lastTrade.pnlPercent < -3 && lastTrade.pnlPercent > -8) {
      addDramaEvent({
        id: `${Date.now()}-${agent.id}-drawdown`,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        agentAvatar: agent.avatar,
        type: 'drawdown',
        message: `${agent.name} holding strong despite -${Math.abs(lastTrade.pnlPercent).toFixed(1)}% drawdown`,
        emotion: 'worried',
        icon: 'warning',
        color: 'yellow',
        data: lastTrade
      });
    }
  };

  const addDramaEvent = (event: DramaEvent) => {
    setEvents(prev => {
      // Don't add duplicate events within 10 seconds
      const isDuplicate = prev.some(e =>
        e.agentId === event.agentId &&
        e.type === event.type &&
        Date.now() - e.timestamp.getTime() < 10000
      );

      if (isDuplicate) return prev;

      return [event, ...prev].slice(0, 20);
    });
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'fire': return <Flame className="w-4 h-4" />;
      case 'zap': return <Zap className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'trophy': return <Trophy className="w-4 h-4" />;
      case 'target': return <Target className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'orange': return 'bg-orange-500 text-white border-orange-600';
      case 'green': return 'bg-green-500 text-white border-green-600';
      case 'red': return 'bg-red-500 text-white border-red-600';
      case 'yellow': return 'bg-yellow-500 text-white border-yellow-600';
      case 'blue': return 'bg-blue-500 text-white border-blue-600';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const formatTimestamp = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="bg-white border border-gray-200 hover:border-orange-300 transition-colors shadow-sm">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-base text-gray-900">Live Activity</h3>
          </div>
          <Badge className={`${isLive ? 'bg-orange-500' : 'bg-gray-400'} text-white px-2 py-0.5 text-xs`}>
            {isLive ? 'LIVE' : 'PAUSED'}
          </Badge>
        </div>

        {/* Events Feed */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for action...</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 p-2.5 rounded-md bg-gray-50/50 hover:bg-gray-100/80 transition-all border border-transparent hover:border-orange-200"
              >
                {/* Agent Avatar */}
                <div className="text-2xl flex-shrink-0">{event.agentAvatar}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${getColorClass(event.color)} text-xs px-2 py-0.5 flex items-center gap-1`}>
                      {getIcon(event.icon)}
                      <span className="uppercase font-bold">{event.agentName}</span>
                    </Badge>
                    <span className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{event.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <span>{events.length} events today</span>
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>
    </Card>
  );
};
