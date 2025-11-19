/**
 * USER PORTFOLIO DASHBOARD
 *
 * Shows user's trading stats, achievements, open positions, and progress
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Flame,
  Target,
  Activity,
  BarChart3,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userCompetitionService, type UserProfile } from '@/services/userCompetitionService';
import { mockTradingService, type MockTradingPosition } from '@/services/mockTradingService';
import { useNavigate } from 'react-router-dom';

export function UserPortfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [positions, setPositions] = useState<MockTradingPosition[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load profile
        const userProfile = await userCompetitionService.getUserProfile(user.id);
        setProfile(userProfile);

        // Load open positions
        const openPositions = await mockTradingService.getOpenPositions(user.id);
        setPositions(openPositions);

      } catch (error) {
        console.error('[UserPortfolio] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Refresh every 10 seconds
    const interval = setInterval(loadUserData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate XP progress to next level
  const calculateLevelProgress = () => {
    if (!profile) return 0;
    const currentLevelXP = Math.pow(profile.level - 1, 2) * 100;
    const nextLevelXP = Math.pow(profile.level, 2) * 100;
    const progress = ((profile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  // Get level tier
  const getLevelTier = (level: number) => {
    if (level >= 20) return { name: 'Legend', color: 'text-purple-500', badge: 'bg-purple-500' };
    if (level >= 15) return { name: 'Master', color: 'text-orange-500', badge: 'bg-orange-500' };
    if (level >= 10) return { name: 'Expert', color: 'text-blue-500', badge: 'bg-blue-500' };
    if (level >= 5) return { name: 'Pro', color: 'text-green-500', badge: 'bg-green-500' };
    return { name: 'Rookie', color: 'text-gray-500', badge: 'bg-gray-500' };
  };

  // Close position handler
  const handleClosePosition = async (positionId: string) => {
    if (!user) return;

    try {
      await userCompetitionService.closePosition(user.id, positionId);

      // Refresh positions
      const openPositions = await mockTradingService.getOpenPositions(user.id);
      setPositions(openPositions);

      // Refresh profile (stats updated)
      const userProfile = await userCompetitionService.getUserProfile(user.id);
      setProfile(userProfile);

    } catch (error) {
      console.error('[UserPortfolio] Error closing position:', error);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join the Competition</CardTitle>
          <CardDescription>Sign in to compete with AI agents and other traders</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Sign In to Compete
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Profile...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-48 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No profile (error)
  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
          <CardDescription>Please try refreshing the page</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tier = getLevelTier(profile.level);
  const levelProgress = calculateLevelProgress();

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {profile.username}
                <Badge className={tier.badge}>{tier.name}</Badge>
              </CardTitle>
              <CardDescription>Level {profile.level} Trader</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
              <p className="text-3xl font-bold">${profile.balance.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* P&L */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <div className="flex items-center gap-2">
                {profile.total_pnl >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <p className={`text-2xl font-bold ${profile.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {profile.total_pnl >= 0 ? '+' : ''}${profile.total_pnl.toFixed(2)}
                </p>
              </div>
              <p className={`text-sm ${profile.total_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {profile.total_pnl_percent >= 0 ? '+' : ''}{profile.total_pnl_percent.toFixed(2)}%
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">{profile.win_rate.toFixed(1)}%</p>
              <Progress value={profile.win_rate} className="h-2 mt-2" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{profile.total_trades}</p>
              <p className="text-sm text-muted-foreground">
                {profile.wins}W / {profile.losses}L
              </p>
            </div>
          </div>

          {/* XP Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-orange-500" />
                <p className="font-semibold">Experience: {profile.xp} XP</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.pow(profile.level, 2) * 100 - profile.xp} XP to Level {profile.level + 1}
              </p>
            </div>
            <Progress value={levelProgress} className="h-3" />
          </div>

          {/* Win Streak */}
          {profile.win_streak > 0 && (
            <Alert className="bg-orange-500/10 border-orange-500/20">
              <Flame className="h-4 w-4 text-orange-500" />
              <AlertDescription>
                <strong>🔥 {profile.win_streak} Win Streak!</strong> Keep it going!
                {profile.win_streak >= 3 && ' You\'re on fire!'}
              </AlertDescription>
            </Alert>
          )}

          {/* Achievements */}
          <div>
            <p className="font-semibold mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Achievements ({profile.achievements.length}/5)
            </p>
            <div className="flex flex-wrap gap-2">
              {userCompetitionService.getAchievementsList().map(achievement => {
                const unlocked = profile.achievements.includes(achievement.id);
                return (
                  <Badge
                    key={achievement.id}
                    variant={unlocked ? 'default' : 'outline'}
                    className={unlocked ? 'bg-orange-500' : 'opacity-50'}
                  >
                    {achievement.icon} {achievement.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Open Positions ({positions.length})
          </CardTitle>
          <CardDescription>Your active trades</CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No open positions</p>
              <p className="text-sm text-muted-foreground">Take a signal from Intelligence Hub to start trading</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map(position => (
                <div key={position.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold">{position.symbol}</p>
                        <Badge variant={position.side === 'BUY' ? 'default' : 'destructive'}>
                          {position.side}
                        </Badge>
                        {position.unrealized_pnl_percent !== undefined && (
                          <Badge variant={position.unrealized_pnl_percent >= 0 ? 'default' : 'destructive'} className={position.unrealized_pnl_percent >= 0 ? 'bg-green-500' : 'bg-red-500'}>
                            {position.unrealized_pnl_percent >= 0 ? '+' : ''}{position.unrealized_pnl_percent.toFixed(2)}%
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-semibold">${position.entry_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-semibold">${position.current_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">P&L</p>
                          <p className={`font-semibold ${(position.unrealized_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(position.unrealized_pnl || 0) >= 0 ? '+' : ''}${(position.unrealized_pnl || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClosePosition(position.id)}
                      className="ml-4"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Close
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
