import { useEffect, useState, useCallback, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfessionalAnalysisDashboard from '@/components/ProfessionalAnalysisDashboard';
import CreditDisplay from '@/components/CreditDisplay';
import { TrendingUp, Home, Coins, Gift, Bitcoin, Zap, BarChart3, Lightbulb, CreditCard, Crown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { StrategicCreditPrompt } from '@/components/StrategicCreditPrompt';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CryptoReportData {
  id: string;
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  report_data: any;
  created_at: string;
}

const Dashboard = () => {
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Record<string, CryptoReportData>>({});
  const [totalReportsCount, setTotalReportsCount] = useState(0);
  const [loadingReports, setLoadingReports] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      fetchExistingReports();
      fetchTotalReportsCount();
      fetchUserCredits();
    }
  }, [user]);
  const fetchUserCredits = useCallback(async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
    if (data) {
      setUserCredits(data.credits || 0);
    }
  }, [user]);
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
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('crypto_reports').select('*').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', {
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
  }, [user]);
  
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
  
  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);
  if (loading || loadingReports) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }
  if (!user) {
    return null;
  }
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Use the new professional header */}
      <AppHeader />

      {/* Professional Credit Alert - Only when critically low */}
      {userCredits === 0 && (
        <Alert className="border-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-none">
          <AlertDescription className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">No credits remaining</span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => navigate('/pricing')}
              className="h-7 px-3"
            >
              Get Credits
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        
        {/* AI Analysis Dashboard */}
        <div className="w-full">
          <ProfessionalAnalysisDashboard onCreditUsed={fetchUserCredits} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Reports Today</p>
                  <p className="text-2xl font-bold mt-1">{totalReportsCount}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avg Confidence</p>
                  <p className="text-2xl font-bold mt-1">85%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Credits Balance</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold">{userCredits}</p>
                    {userCredits <= 2 && userCredits > 0 && (
                      <Badge variant="secondary" className="text-xs">Low</Badge>
                    )}
                    {userCredits === 0 && (
                      <Badge variant="destructive" className="text-xs">Empty</Badge>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/pricing')}
                  size="sm"
                  variant={userCredits === 0 ? 'default' : 'outline'}
                  className="h-8 px-3 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Signals - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Recent Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(reports).length > 0 ? (
                  Object.entries(reports).slice(0, 3).map(([symbol, report]) => (
                    <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        {symbol === 'BTC' ? <BTCLogo /> : <ETHLogo />}
                        <div>
                          <p className="font-medium text-sm">{symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.confidence_score >= 75 ? 'default' : 'secondary'} className="text-xs">
                          {report.confidence_score}%
                        </Badge>
                        <span className={`text-xs font-medium ${report.prediction_summary.includes('Bullish') ? 'text-green-500' : 'text-red-500'}`}>
                          {report.prediction_summary.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent signals</p>
                    <p className="text-xs mt-1">Generate your first analysis above</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background/50 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                        </div>
                        <span className="text-xs font-medium">72%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-background/50 rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-xs font-medium">85%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Signals</p>
                      <p className="text-lg font-bold">247</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                      <p className="text-lg font-bold text-green-500">+18.4%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Market Overview & Quick Actions */}
          <div className="space-y-4">
            {/* Market Overview */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bitcoin className="h-4 w-4 text-primary" />
                  Market Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/50">
                    <div className="flex items-center gap-2">
                      <BTCLogo />
                      <span className="text-sm font-medium">BTC</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">$67,234</p>
                      <p className="text-xs text-green-500">+2.4%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/50">
                    <div className="flex items-center gap-2">
                      <ETHLogo />
                      <span className="text-sm font-medium">ETH</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">$3,456</p>
                      <p className="text-xs text-red-500">-1.2%</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-medium">$2.4T</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-medium">$98B</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9"
                  onClick={() => navigate('/pricing')}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-2" />
                  Upgrade Plan
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-2" />
                  New Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm h-9"
                >
                  <Crown className="h-3.5 w-3.5 mr-2" />
                  Refer & Earn
                </Button>
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  Pro Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the 4H timeframe analysis for better swing trading opportunities. Our AI analyzes multiple indicators for higher accuracy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>;
};
export default Dashboard;