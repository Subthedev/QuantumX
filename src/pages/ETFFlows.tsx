import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppHeader } from '@/components/AppHeader';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Download, RefreshCw, Building2, Wallet } from 'lucide-react';
import { etfDataService, type ETFFlowData, type ETFStats, type ETFDailyAggregate } from '@/services/etfDataService';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const ETFFlows = () => {
  const [assetClass, setAssetClass] = useState<'bitcoin' | 'ethereum' | 'all'>('bitcoin');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d' | '1y' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    switch (timeRange) {
      case 'today':
        // Today only - start and end are the same day at midnight
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { startDate: start, endDate: end };
  }, [timeRange, customStartDate, customEndDate]);

  // Fetch ETF flows data with daily automatic updates
  const { data: flowsData = [], isLoading: flowsLoading, refetch: refetchFlows, isRefetching } = useQuery({
    queryKey: ['etf-flows', startDate.toISOString(), endDate.toISOString(), assetClass],
    queryFn: async () => {
      console.log('[ETFFlows] Fetching flows data for', { startDate: startDate.toISOString(), endDate: endDate.toISOString(), assetClass });
      const flows = await etfDataService.getETFFlows(
        startDate,
        endDate,
        assetClass === 'all' ? undefined : assetClass,
        false // Normal fetch, not force refresh
      );
      setLastUpdate(new Date());
      console.log('[ETFFlows] Received', flows.length, 'flow records');
      return flows;
    },
    refetchInterval: 24 * 60 * 60 * 1000, // Refetch every 24 hours (daily update)
    refetchIntervalInBackground: true, // Continue refetching even when tab is not focused
    staleTime: 5 * 60 * 1000 // Consider data stale after 5 minutes
  });

  // Fetch daily aggregates
  const { data: dailyAggregates = [], refetch: refetchAggregates } = useQuery({
    queryKey: ['etf-daily-aggregates', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => etfDataService.getDailyAggregates(startDate, endDate),
    refetchInterval: 24 * 60 * 60 * 1000, // Daily update
    staleTime: 5 * 60 * 1000
  });

  // Fetch ETF stats
  const { data: etfStats = [], refetch: refetchStats } = useQuery({
    queryKey: ['etf-stats', assetClass],
    queryFn: () => etfDataService.getETFStats(assetClass === 'all' ? undefined : assetClass),
    refetchInterval: 24 * 60 * 60 * 1000, // Daily update
    staleTime: 5 * 60 * 1000
  });

  // Manual hard refresh - clears cache and forces new data fetch
  const handleManualRefresh = async () => {
    console.log('[ETFFlows] Hard refresh initiated - clearing cache and refetching all data');
    // Clear the service cache to force fresh data
    etfDataService.clearCache();

    // Refetch all queries
    await Promise.all([
      refetchFlows(),
      refetchAggregates(),
      refetchStats()
    ]);

    setLastUpdate(new Date());
    console.log('[ETFFlows] Hard refresh completed');
  };

  // Calculate summary statistics based on the selected time range
  const summaryStats = useMemo(() => {
    const stats = {
      totalInflow: 0,
      totalOutflow: 0,
      netFlow: 0,
      totalAUM: 0,
      avgDailyFlow: 0
    };

    if (flowsData.length === 0) return stats;

    // Get the latest date for AUM (most recent snapshot)
    const latestDate = flowsData.reduce((latest, flow) => {
      return flow.date > latest ? flow.date : latest;
    }, flowsData[0].date);

    const latestFlows = flowsData.filter(f => f.date === latestDate);

    // Calculate total AUM from latest date
    latestFlows.forEach(flow => {
      stats.totalAUM += flow.aum;
    });

    // Calculate flows across the entire selected time range
    flowsData.forEach(flow => {
      if (flow.netFlow > 0) {
        stats.totalInflow += flow.netFlow;
      } else {
        stats.totalOutflow += Math.abs(flow.netFlow);
      }
      stats.netFlow += flow.netFlow;
    });

    // Calculate average daily flow
    const uniqueDates = new Set(flowsData.map(f => f.date));
    if (uniqueDates.size > 0) {
      stats.avgDailyFlow = stats.netFlow / uniqueDates.size;
    }

    return stats;
  }, [flowsData]);

  // Export to CSV
  const exportToCSV = () => {
    if (flowsData.length === 0) return;

    const headers = ['Date', 'Issuer', 'Ticker', 'Asset Class', 'Net Flow ($M)', 'AUM ($M)', 'Volume'];
    const rows = flowsData.map(flow => [
      flow.date,
      flow.issuerName,
      flow.ticker,
      flow.assetClass,
      flow.netFlow.toFixed(2),
      flow.aum.toFixed(2),
      flow.volume.toFixed(0)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etf-flows-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
                <Building2 className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">ETF Flows</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Real-time Bitcoin & Ethereum ETF inflow/outflow tracking
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Last updated:</span>
                  <Badge variant="outline" className="text-xs">
                    {format(lastUpdate, 'HH:mm:ss')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={flowsLoading || isRefetching}
                  >
                    <RefreshCw className={cn('h-4 w-4 mr-2', (flowsLoading || isRefetching) && 'animate-spin')} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Asset Class Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Class</label>
                  <Select value={assetClass} onValueChange={(v) => setAssetClass(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Range</label>
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range (if selected) */}
                {timeRange === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate && customEndDate
                            ? `${format(customStartDate, 'MMM dd')} - ${format(customEndDate, 'MMM dd')}`
                            : 'Select dates'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="text-sm font-medium">Start Date</label>
                            <Calendar
                              mode="single"
                              selected={customStartDate}
                              onSelect={setCustomStartDate}
                              disabled={(date) => date > new Date() || date < new Date('2024-01-01')}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">End Date</label>
                            <Calendar
                              mode="single"
                              selected={customEndDate}
                              onSelect={setCustomEndDate}
                              disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total AUM</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-bold">
                  {etfDataService.formatNumber(summaryStats.totalAUM, 2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Flow</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className={cn(
                  'text-2xl md:text-3xl font-bold flex items-center gap-2',
                  summaryStats.netFlow >= 0 ? 'text-success dark:text-success' : 'text-destructive'
                )}>
                  {summaryStats.netFlow >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {etfDataService.formatFlow(summaryStats.netFlow)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Total Inflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  +{etfDataService.formatNumber(summaryStats.totalInflow, 1)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Total Outflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                  -{etfDataService.formatNumber(summaryStats.totalOutflow, 1)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="stats">Issuer Stats</TabsTrigger>
            </TabsList>

            {/* Table View */}
            <TabsContent value="table" className="space-y-4">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle>Daily ETF Flows</CardTitle>
                  <CardDescription>
                    Detailed inflow/outflow data by issuer and date
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Issuer</th>
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Ticker</th>
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Asset</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">Net Flow</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">AUM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              Loading data...
                            </td>
                          </tr>
                        ) : flowsData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              No data available for selected range
                            </td>
                          </tr>
                        ) : (
                          flowsData.slice().reverse().map((flow, idx) => (
                            <tr key={`${flow.date}-${flow.issuer}-${idx}`} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 text-xs md:text-sm">
                                {format(new Date(flow.date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3 text-xs md:text-sm font-medium">
                                {flow.issuerName}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {flow.ticker}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={flow.assetClass === 'bitcoin' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {flow.assetClass === 'bitcoin' ? 'BTC' : 'ETH'}
                                </Badge>
                              </td>
                              <td className={cn(
                                'px-4 py-3 text-right text-xs md:text-sm font-semibold',
                                flow.netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              )}>
                                {flow.netFlow >= 0 ? (
                                  <span className="flex items-center justify-end gap-1">
                                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                                    {etfDataService.formatFlow(flow.netFlow)}
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-end gap-1">
                                    <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />
                                    {etfDataService.formatFlow(flow.netFlow)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-xs md:text-sm text-muted-foreground">
                                {etfDataService.formatNumber(flow.aum, 1)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Charts View */}
            <TabsContent value="charts" className="space-y-4">
              {/* Daily Net Flow Chart */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle>Daily Net Flows</CardTitle>
                  <CardDescription>Aggregate inflows and outflows by date</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyAggregates}>
                      <defs>
                        <linearGradient id="colorBTC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f7931a" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f7931a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorETH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#627eea" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#627eea" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium mb-2">
                                {format(new Date(payload[0].payload.date), 'MMM dd, yyyy')}
                              </p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-xs" style={{ color: entry.color }}>
                                  {entry.name}: {etfDataService.formatNumber(entry.value as number)}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      {(assetClass === 'bitcoin' || assetClass === 'all') && (
                        <Area
                          type="monotone"
                          dataKey="bitcoin.netFlow"
                          name="Bitcoin"
                          stroke="#f7931a"
                          fillOpacity={1}
                          fill="url(#colorBTC)"
                        />
                      )}
                      {(assetClass === 'ethereum' || assetClass === 'all') && (
                        <Area
                          type="monotone"
                          dataKey="ethereum.netFlow"
                          name="Ethereum"
                          stroke="#627eea"
                          fillOpacity={1}
                          fill="url(#colorETH)"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* AUM Growth Chart */}
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle>Total Assets Under Management</CardTitle>
                  <CardDescription>Cumulative AUM growth over time</CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyAggregates}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="text-sm font-medium mb-2">
                                {format(new Date(payload[0].payload.date), 'MMM dd, yyyy')}
                              </p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-xs" style={{ color: entry.color }}>
                                  {entry.name}: {etfDataService.formatNumber(entry.value as number)}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend />
                      {(assetClass === 'bitcoin' || assetClass === 'all') && (
                        <Line
                          type="monotone"
                          dataKey="bitcoin.totalAUM"
                          name="Bitcoin AUM"
                          stroke="#f7931a"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      {(assetClass === 'ethereum' || assetClass === 'all') && (
                        <Line
                          type="monotone"
                          dataKey="ethereum.totalAUM"
                          name="Ethereum AUM"
                          stroke="#627eea"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Issuer Stats */}
            <TabsContent value="stats" className="space-y-4">
              <Card>
                <CardHeader className="p-4 md:p-6">
                  <CardTitle>ETF Statistics by Issuer</CardTitle>
                  <CardDescription>Performance metrics and flow analysis</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Issuer</th>
                          <th className="px-4 py-3 text-left text-xs md:text-sm font-medium text-muted-foreground">Ticker</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">AUM</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">7D Flow</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">30D Flow</th>
                          <th className="px-4 py-3 text-right text-xs md:text-sm font-medium text-muted-foreground">YTD Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {etfStats.map((stat, idx) => (
                          <tr key={`${stat.issuer}-${idx}`} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 text-xs md:text-sm font-medium">
                              {stat.issuerName}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">
                                {stat.ticker}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-xs md:text-sm font-semibold">
                              {etfDataService.formatNumber(stat.currentAUM, 1)}
                            </td>
                            <td className={cn(
                              'px-4 py-3 text-right text-xs md:text-sm font-medium',
                              stat.flow7d >= 0 ? 'text-success dark:text-success' : 'text-destructive'
                            )}>
                              {etfDataService.formatFlow(stat.flow7d)}
                            </td>
                            <td className={cn(
                              'px-4 py-3 text-right text-xs md:text-sm font-medium',
                              stat.flow30d >= 0 ? 'text-success dark:text-success' : 'text-destructive'
                            )}>
                              {etfDataService.formatFlow(stat.flow30d)}
                            </td>
                            <td className={cn(
                              'px-4 py-3 text-right text-xs md:text-sm font-medium',
                              stat.flowYTD >= 0 ? 'text-success dark:text-success' : 'text-destructive'
                            )}>
                              {etfDataService.formatFlow(stat.flowYTD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ETFFlows;
