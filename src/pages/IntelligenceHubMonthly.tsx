import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { globalHubService, type HubSignal } from '@/services/globalHubService';

interface MonthlyStats {
  month: string;
  totalSignals: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalReturn: number;
  avgReturnPerTrade: number;
  bestTrade: number;
  worstTrade: number;
}

const IntelligenceHubMonthly = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);

  useEffect(() => {
    // Get all signal history
    const allSignals = globalHubService.getSignalHistory();

    // Group signals by month
    const monthGroups = new Map<string, HubSignal[]>();

    allSignals.forEach(signal => {
      const date = new Date(signal.outcomeTimestamp || signal.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, []);
      }
      monthGroups.get(monthKey)!.push(signal);
    });

    // Calculate stats for each month
    const stats: MonthlyStats[] = [];

    Array.from(monthGroups.entries())
      .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // Sort by date descending
      .forEach(([monthKey, signals]) => {
        const date = new Date(signals[0].outcomeTimestamp || signals[0].timestamp);
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const completed = signals.filter(s => s.outcome && s.outcome !== 'PENDING');
        const wins = completed.filter(s => s.outcome === 'WIN').length;
        const losses = completed.filter(s => s.outcome === 'LOSS').length;
        const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;

        const returns = completed.map(s => s.actualReturn || 0);
        const totalReturn = returns.reduce((sum, r) => sum + r, 0);
        const avgReturn = completed.length > 0 ? totalReturn / completed.length : 0;
        const bestTrade = returns.length > 0 ? Math.max(...returns) : 0;
        const worstTrade = returns.length > 0 ? Math.min(...returns) : 0;

        stats.push({
          month: monthName,
          totalSignals: completed.length,
          totalWins: wins,
          totalLosses: losses,
          winRate,
          totalReturn,
          avgReturnPerTrade: avgReturn,
          bestTrade,
          worstTrade
        });
      });

    setMonthlyData(stats);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        {/* Header with back button */}
        <div className="mb-8">
          <a
            href="/intelligence-hub"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Intelligence Hub
          </a>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-medium text-slate-900 tracking-tight mb-2">
                Monthly Performance
              </h1>
              <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Comprehensive monthly signal performance tracking
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Performance Cards */}
        <div className="space-y-6">
          {monthlyData.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm bg-white p-12">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-sm text-slate-600 font-medium">No monthly data available yet</p>
                <p className="text-xs text-slate-500 mt-1">Signal performance data will appear once signals are completed</p>
              </div>
            </Card>
          ) : (
            monthlyData.map((monthStats, index) => (
              <Card key={index} className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Month Header */}
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-slate-900">{monthStats.month}</h2>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Total Signals */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-600 font-semibold uppercase mb-2">
                        Total Signals
                      </div>
                      <div className="text-3xl font-bold text-slate-800">
                        {monthStats.totalSignals}
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="text-xs text-emerald-600 font-semibold uppercase mb-2">
                        Win Rate
                      </div>
                      <div className="text-3xl font-bold text-emerald-700">
                        {monthStats.winRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-600 mt-2">
                        {monthStats.totalWins}W / {monthStats.totalLosses}L
                      </div>
                    </div>

                    {/* Total Return */}
                    <div className={`p-4 rounded-lg border ${
                      monthStats.totalReturn >= 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className={`text-xs font-semibold uppercase mb-2 ${
                        monthStats.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        Total Return
                      </div>
                      <div className={`text-3xl font-bold flex items-center gap-2 ${
                        monthStats.totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {monthStats.totalReturn >= 0 ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                        {monthStats.totalReturn > 0 ? '+' : ''}{monthStats.totalReturn.toFixed(1)}%
                      </div>
                    </div>

                    {/* Avg Return per Trade */}
                    <div className={`p-4 rounded-lg border ${
                      monthStats.avgReturnPerTrade >= 0
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className={`text-xs font-semibold uppercase mb-2 ${
                        monthStats.avgReturnPerTrade >= 0 ? 'text-blue-600' : 'text-rose-600'
                      }`}>
                        Avg Return/Trade
                      </div>
                      <div className={`text-3xl font-bold flex items-center gap-2 ${
                        monthStats.avgReturnPerTrade >= 0 ? 'text-blue-700' : 'text-rose-700'
                      }`}>
                        {monthStats.avgReturnPerTrade >= 0 ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                        {monthStats.avgReturnPerTrade > 0 ? '+' : ''}{monthStats.avgReturnPerTrade.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Best Trade */}
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                      <div className="text-xs text-emerald-600 font-semibold uppercase mb-2">
                        Best Trade
                      </div>
                      <div className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        +{monthStats.bestTrade.toFixed(1)}%
                      </div>
                    </div>

                    {/* Worst Trade */}
                    <div className="p-4 bg-gradient-to-r from-rose-50 to-rose-100 rounded-lg border border-rose-200">
                      <div className="text-xs text-rose-600 font-semibold uppercase mb-2">
                        Worst Trade
                      </div>
                      <div className="text-2xl font-bold text-rose-700 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        {monthStats.worstTrade.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligenceHubMonthly;
