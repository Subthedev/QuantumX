/**
 * COMPETITION LEADERBOARD
 *
 * Unified leaderboard showing AI agents + human users
 * Real-time rankings, stats, and competition status
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Users,
  Bot
} from 'lucide-react';
import { userCompetitionService, type LeaderboardEntry } from '@/services/userCompetitionService';
import { useAuth } from '@/hooks/useAuth';

interface CompetitionLeaderboardProps {
  refreshInterval?: number; // milliseconds
}

export function CompetitionLeaderboard({ refreshInterval = 10000 }: CompetitionLeaderboardProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'agents' | 'users'>('all');

  // Load leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await userCompetitionService.getLeaderboard('all-time', 100);
        setLeaderboard(data);
      } catch (error) {
        console.error('[Leaderboard] Error loading:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();

    // Refresh periodically
    const interval = setInterval(loadLeaderboard, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Filter leaderboard
  const filteredLeaderboard = leaderboard.filter(entry => {
    if (filter === 'agents') return entry.is_agent;
    if (filter === 'users') return !entry.is_agent;
    return true;
  });

  // Get current user's rank
  const userEntry = user ? leaderboard.find(e => e.user_id === user.id) : null;

  // Medal emoji for top 3
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  // Color for rank
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Leaderboard...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Competition Leaderboard
            </CardTitle>
            <CardDescription>
              Top traders competing for glory {/* and prizes */}
            </CardDescription>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              <Users className="h-4 w-4 mr-1" />
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'agents' ? 'default' : 'outline'}
              onClick={() => setFilter('agents')}
            >
              <Bot className="h-4 w-4 mr-1" />
              AI
            </Button>
            <Button
              size="sm"
              variant={filter === 'users' ? 'default' : 'outline'}
              onClick={() => setFilter('users')}
            >
              <Users className="h-4 w-4 mr-1" />
              Humans
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* User's current rank (if logged in) */}
        {userEntry && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-2xl font-bold">#{userEntry.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">P&L</p>
                <p className={`text-2xl font-bold ${userEntry.total_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {userEntry.total_pnl_percent >= 0 ? '+' : ''}{userEntry.total_pnl_percent.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold text-orange-500">{userEntry.level}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard entries */}
        <div className="space-y-2">
          {filteredLeaderboard.slice(0, 20).map((entry) => (
            <div
              key={entry.user_id}
              className={`p-4 rounded-lg border transition-all hover:border-primary/50 ${
                entry.user_id === user?.id ? 'bg-primary/10 border-primary/30' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Rank and name */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`text-2xl font-bold w-12 text-center ${getRankColor(entry.rank)}`}>
                    {getMedalEmoji(entry.rank) || `#${entry.rank}`}
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.is_agent ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                        <Bot className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        Human
                      </Badge>
                    )}

                    <div>
                      <p className="font-semibold">{entry.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Level {entry.level} • {entry.total_trades} trades
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  {/* P&L */}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">P&L</p>
                    <div className="flex items-center gap-1">
                      {entry.total_pnl_percent >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <p className={`font-bold ${entry.total_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {entry.total_pnl_percent >= 0 ? '+' : ''}{entry.total_pnl_percent.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="font-bold">{entry.win_rate.toFixed(1)}%</p>
                    <Progress value={entry.win_rate} className="w-16 h-1 mt-1" />
                  </div>

                  {/* XP (only for users) */}
                  {!entry.is_agent && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">XP</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-orange-500" />
                        <p className="font-bold text-orange-500">{entry.xp}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLeaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No competitors yet. Be the first!</p>
          </div>
        )}

        {filteredLeaderboard.length > 20 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing top 20 of {filteredLeaderboard.length} competitors
          </div>
        )}
      </CardContent>
    </Card>
  );
}
