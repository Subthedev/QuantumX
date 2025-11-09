import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Brain,
  Database,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Signal {
  id: string;
  symbol: string;
  signal_type: string;
  direction?: string;
  entry_min: number;
  entry_max: number;
  current_price: number;
  confidence: number;
  status: string;
  created_at: string;
  target_1?: number;
  target_2?: number;
  target_3?: number;
  stop_loss?: number;
}

export default function IntelligenceHub() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    fetchSignals();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchSignals = async () => {
    try {
      let query = supabase
        .from('intelligence_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'active') {
        query = query.eq('status', 'ACTIVE');
      } else if (filter === 'completed') {
        query = query.in('status', ['COMPLETED', 'STOPPED']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSignals(data || []);
    } catch (err) {
      console.error('Error fetching signals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSignalTypeIcon = (type: string) => {
    switch (type) {
      case 'SCALP': return <Activity className="h-4 w-4" />;
      case 'SWING': return <TrendingUp className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      ACTIVE: { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: <Activity className="h-3 w-3" /> },
      COMPLETED: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <CheckCircle2 className="h-3 w-3" /> },
      STOPPED: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <XCircle className="h-3 w-3" /> },
    };
    
    const variant = variants[status] || variants.ACTIVE;
    
    return (
      <Badge className={`${variant.color} border flex items-center gap-1`}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return price >= 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(6)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const activeCount = signals.filter(s => s.status === 'ACTIVE').length;
  const completedCount = signals.filter(s => s.status === 'COMPLETED').length;
  const avgConfidence = signals.length > 0 
    ? (signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length).toFixed(0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-hover">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Intelligence Hub</h1>
              <p className="text-sm text-muted-foreground">AI-powered signal intelligence system</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Signals
              </CardDescription>
              <CardTitle className="text-3xl">{activeCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </CardDescription>
              <CardTitle className="text-3xl">{completedCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Avg Confidence
              </CardDescription>
              <CardTitle className="text-3xl">{avgConfidence}%</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Total Signals
              </CardDescription>
              <CardTitle className="text-3xl">{signals.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Signal Filter Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Live Signals</CardTitle>
              </div>
              <Badge variant="outline" className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-6">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Loading signals...
                  </div>
                ) : signals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No signals found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {signals.map((signal) => (
                      <Card key={signal.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Symbol & Type */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-muted shrink-0">
                                {getSignalTypeIcon(signal.signal_type)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg">{signal.symbol}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {signal.signal_type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(signal.created_at)}
                                </div>
                              </div>
                            </div>

                            {/* Right: Price & Status */}
                            <div className="flex items-start gap-6 shrink-0">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Entry Range</div>
                                <div className="font-semibold">
                                  {formatPrice(signal.entry_min)} - {formatPrice(signal.entry_max)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Current: {formatPrice(signal.current_price)}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                                <div className="font-bold text-lg text-primary">
                                  {signal.confidence}%
                                </div>
                              </div>

                              <div>
                                {getStatusBadge(signal.status)}
                              </div>
                            </div>
                          </div>

                          {/* Targets Row */}
                          {(signal.target_1 || signal.target_2 || signal.target_3 || signal.stop_loss) && (
                            <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs">
                              {signal.stop_loss && (
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-muted-foreground">SL:</span>
                                  <span className="font-semibold">{formatPrice(signal.stop_loss)}</span>
                                </div>
                              )}
                              {signal.target_1 && (
                                <div className="flex items-center gap-1.5">
                                  <Target className="h-3 w-3 text-green-500" />
                                  <span className="text-muted-foreground">T1:</span>
                                  <span className="font-semibold">{formatPrice(signal.target_1)}</span>
                                </div>
                              )}
                              {signal.target_2 && (
                                <div className="flex items-center gap-1.5">
                                  <Target className="h-3 w-3 text-green-500" />
                                  <span className="text-muted-foreground">T2:</span>
                                  <span className="font-semibold">{formatPrice(signal.target_2)}</span>
                                </div>
                              )}
                              {signal.target_3 && (
                                <div className="flex items-center gap-1.5">
                                  <Target className="h-3 w-3 text-green-500" />
                                  <span className="text-muted-foreground">T3:</span>
                                  <span className="font-semibold">{formatPrice(signal.target_3)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
