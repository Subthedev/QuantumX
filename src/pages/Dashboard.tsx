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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reports Today</p>
                  <p className="text-2xl font-bold mt-1">{totalReportsCount}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold mt-1">85%</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Credits Balance</p>
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
                  className="h-9 px-4"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
};
export default Dashboard;