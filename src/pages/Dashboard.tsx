import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CryptoTable from '@/components/CryptoTable';
import Titan10Section from '@/components/Titan10Section';
import { TrendingUp, Zap, BarChart3, Sparkles, Globe, Activity, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface CryptoReportData {
  id: string;
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  report_data: any;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Record<string, CryptoReportData>>({});
  const [totalReportsCount, setTotalReportsCount] = useState(0);
  const [loadingReports, setLoadingReports] = useState(true);
  
  useEffect(() => {
    fetchExistingReports();
    fetchTotalReportsCount();
  }, []);
  useEffect(() => {
    document.title = '4H Crypto Signals Dashboard | Ignitex';
    const metaDesc = 'AI 4H crypto signals for BTC & ETH with confidence, entries, stops, and targets.';
    let descTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.name = 'description';
      document.head.appendChild(descTag);
    }
    descTag.content = metaDesc;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + '/dashboard';
  }, []);
  const fetchExistingReports = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('crypto_reports').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const reportsMap: Record<string, CryptoReportData> = {};
      data?.forEach(report => {
        reportsMap[report.coin_symbol] = report;
      });
      setReports(reportsMap);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoadingReports(false);
    }
  }, []);
  
  const fetchTotalReportsCount = useCallback(async () => {
    try {
      const {
        count,
        error
      } = await supabase.from('crypto_reports').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      setTotalReportsCount(count || 0);
    } catch (error) {
      // Silently handle error
    }
  }, []);
  
  
  if (loadingReports) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" role="status" aria-label="Loading"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }
  
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Use the new professional header */}
      <AppHeader />


      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6 max-w-[1400px]">
        
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Today's Cryptocurrency Prices by Market Cap</h1>
          <p className="text-sm text-muted-foreground">
            The global crypto market cap is <span className="font-semibold">$3.42T</span>, a <span className="text-green-500">+2.3%</span> change over the last 24 hours.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Global Market Cap</p>
                  <p className="text-2xl font-bold mt-1">$3.42T</p>
                  <p className="text-xs text-green-500 mt-1">+2.3%</p>
                </div>
                <Globe className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">24h Volume</p>
                  <p className="text-2xl font-bold mt-1">$142B</p>
                  <p className="text-xs text-green-500 mt-1">+8.7%</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">AI Reports</p>
                  <p className="text-2xl font-bold mt-1">{totalReportsCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Today</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">BTC Dominance</p>
                  <p className="text-2xl font-bold mt-1">54.2%</p>
                  <p className="text-xs text-muted-foreground mt-1">Market Share</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Titan 10 Section - Premium Feature - Hidden on Mobile */}
        <div className="hidden md:block">
          <Titan10Section />
        </div>

        {/* Main Crypto Table */}
        <CryptoTable />

        {/* Recent AI Analysis */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-5">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recent AI Analysis
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Your latest AI-powered crypto analysis results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(reports).length > 0 ? (
              Object.entries(reports).slice(0, 5).map(([symbol, report]) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:bg-background/70 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-sm">{symbol}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-base">{symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-lg font-bold">{report.confidence_score}%</p>
                    </div>
                    <Badge 
                      variant={report.prediction_summary.includes('Bullish') ? 'default' : 'destructive'} 
                      className="min-w-[80px] justify-center"
                    >
                      {report.prediction_summary.split(' ')[0]}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium mb-2">No AI analyses yet</p>
                <p className="text-sm">Click "AI Analysis" on any cryptocurrency above to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>;
};
export default Dashboard;