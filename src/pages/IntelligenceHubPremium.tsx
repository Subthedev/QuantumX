/**
 * IGX INTELLIGENCE HUB - PREMIUM EDITION
 *
 * Minimal, elegant, professional interface for premium subscribers
 * Zero clutter, maximum value - just the signals that matter
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Activity, TrendingUp, TrendingDown, Clock, Target, DollarSign } from 'lucide-react';
import { globalHubService, HubSignal } from '@/services/globalHubService';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function IntelligenceHubPremium() {
  const [signals, setSignals] = useState<HubSignal[]>([]);
  const [stats, setStats] = useState({ live: 0, wins: 0, losses: 0, winRate: 0, avgReturn: 0 });

  useEffect(() => {
    // Ensure Hub is running
    if (!globalHubService.isRunning()) {
      globalHubService.start();
    }

    const updateData = () => {
      const activeSignals = globalHubService.getActiveSignals();
      const history = globalHubService.getSignalHistory();

      // Calculate 24h stats
      const last24h = history.filter(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000);
      const completed = last24h.filter(s => s.outcome && s.outcome !== 'PENDING');
      const wins = completed.filter(s => s.outcome === 'WIN').length;
      const losses = completed.filter(s => s.outcome === 'LOSS').length;
      const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
      const totalReturn = completed.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
      const avgReturn = completed.length > 0 ? totalReturn / completed.length : 0;

      setSignals([...activeSignals, ...last24h.slice(0, 20)]);
      setStats({
        live: activeSignals.length,
        wins,
        losses,
        winRate,
        avgReturn
      });
    };

    updateData();
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <AppHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                Intelligence Hub
              </h1>
              <p className="text-slate-600 mt-2">Premium AI-powered trading signals</p>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
              <div className="relative">
                <Activity className="w-6 h-6 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
              <div className="text-white">
                <div className="text-2xl font-black">{stats.live}</div>
                <div className="text-xs font-semibold opacity-90">LIVE SIGNALS</div>
              </div>
            </div>
          </div>
        </div>

        {/* 24H Performance Dashboard */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Win Rate</div>
            <div className="text-3xl font-black text-emerald-600">{stats.winRate.toFixed(1)}%</div>
            <div className="text-xs text-slate-600 mt-2">{stats.wins}W / {stats.losses}L</div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Avg Return</div>
            <div className={`text-3xl font-black ${stats.avgReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {stats.avgReturn > 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 mt-2">Per Signal</div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Total Wins</div>
            <div className="text-3xl font-black text-emerald-600">{stats.wins}</div>
            <div className="text-xs text-slate-600 mt-2">Last 24 Hours</div>
          </Card>

          <Card className="p-6 bg-white border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Active</div>
            <div className="text-3xl font-black text-orange-600">{stats.live}</div>
            <div className="text-xs text-slate-600 mt-2">Live Positions</div>
          </Card>
        </div>

        {/* Unified Signals Feed */}
        <Card className="border-slate-200 bg-white">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Trading Signals</h2>
            <p className="text-sm text-slate-600 mt-1">Real-time positions and recent history</p>
          </div>

          <div className="divide-y divide-slate-100">
            {signals.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-slate-400 mb-2">
                  <Activity className="w-12 h-12 mx-auto opacity-30" />
                </div>
                <p className="text-slate-600 font-semibold">No signals yet</p>
                <p className="text-sm text-slate-500 mt-1">Signals will appear as they're generated</p>
              </div>
            ) : (
              signals.map((signal) => {
                const confidence = signal.confidence || signal.qualityScore || 0;
                const isLive = !signal.outcome || signal.outcome === 'PENDING';
                const isWin = signal.outcome === 'WIN';
                const isLoss = signal.outcome === 'LOSS';

                return (
                  <div key={signal.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-6">
                      {/* Status Indicator */}
                      <div className="flex-shrink-0">
                        {isLive && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center relative">
                            <Activity className="w-8 h-8 text-white" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                        {isWin && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-white" />
                          </div>
                        )}
                        {isLoss && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                            <TrendingDown className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Crypto Logo */}
                      {signal.image && (
                        <img
                          src={signal.image}
                          alt={signal.symbol}
                          className="w-14 h-14 rounded-full border-2 border-slate-200 flex-shrink-0"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}

                      {/* Signal Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-black text-slate-900">{signal.symbol}</h3>
                          <div className={`px-4 py-1.5 rounded-lg font-bold text-sm ${
                            signal.direction === 'LONG'
                              ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                              : 'bg-red-100 text-red-800 border-2 border-red-300'
                          }`}>
                            {signal.direction}
                          </div>
                          {isLive && (
                            <div className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
                              LIVE
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="font-semibold">{signal.strategyName || signal.strategy || 'Strategy'}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {timeAgo(signal.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Trading Levels */}
                      <div className="flex items-center gap-8">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Entry</div>
                          <div className="text-lg font-bold text-slate-900">
                            ${signal.entry?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-red-500 uppercase mb-1">Stop Loss</div>
                          <div className="text-lg font-bold text-red-600">
                            ${signal.stopLoss?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-emerald-500 uppercase mb-1">Target</div>
                          <div className="text-lg font-bold text-emerald-600">
                            ${(signal.targets && signal.targets[0])?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Confidence & Performance */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-4xl font-black mb-2 ${
                          confidence >= 80 ? 'text-emerald-600' :
                          confidence >= 70 ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {confidence}%
                        </div>
                        <div className={`text-xs font-bold mb-2 ${
                          confidence >= 80 ? 'text-emerald-600' :
                          confidence >= 70 ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {confidence >= 80 ? 'EXCELLENT' :
                           confidence >= 70 ? 'GOOD' :
                           'ACCEPTABLE'}
                        </div>
                        {signal.actualReturn !== undefined && signal.actualReturn !== null && (
                          <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                            signal.actualReturn >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {signal.actualReturn > 0 ? '+' : ''}{signal.actualReturn.toFixed(2)}%
                          </div>
                        )}
                        {(isLive || (!signal.actualReturn && signal.actualReturn !== 0)) && (
                          <div className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm">
                            Grade {signal.grade || 'A'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Premium Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Premium Intelligence Hub • Real-time AI Analysis • Institutional Grade Signals</p>
        </div>
      </div>
    </div>
  );
}
