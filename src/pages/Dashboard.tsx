import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfessionalAnalysisDashboard from '@/components/ProfessionalAnalysisDashboard';
import CreditDisplay from '@/components/CreditDisplay';
import FeedbackModal from '@/components/FeedbackModal';
import { useFeedbackPopup } from '@/hooks/useFeedbackPopup';
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
  const [userFeedbackCount, setUserFeedbackCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Feedback popup management  
  const {
    shouldShowFeedback,
    handleFeedbackClose,
    handleFeedbackComplete
  } = useFeedbackPopup();
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
  const fetchUserCredits = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('profiles').select('credits, feedback_count').eq('user_id', user.id).single();
    if (data) {
      setUserCredits(data.credits || 0);
      setUserFeedbackCount(data.feedback_count || 0);
    }
  };
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
  const fetchExistingReports = async () => {
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
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };
  const fetchTotalReportsCount = async () => {
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
      console.error('Error fetching total reports count:', error);
    }
  };
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
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
      <main className="flex-1 px-4 sm:px-6 pb-6 space-y-6 flex flex-col">
        
        {/* AI Analysis Dashboard */}
        <div className="flex-1 -mx-4 sm:-mx-6 mt-4">
          <ProfessionalAnalysisDashboard onCreditUsed={fetchUserCredits} />
        </div>

        {/* Stats Section with Enhanced Credit Card */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="border-border/50 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-500/5 to-purple-600/5 group">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-status-success group-hover:scale-110 transition-transform" />
                Reports Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalReportsCount}
              </div>
              <CardDescription className="text-xs">in the last 24 hours</CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-500/5 to-emerald-600/5 group">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-4 w-4 text-status-warning group-hover:scale-110 transition-transform" />
                Average Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                85%
              </div>
              <CardDescription className="text-xs">across all predictions</CardDescription>
            </CardContent>
          </Card>
          
          {/* Credit Card - Static Design */}
          <Card className="border-border/50 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-500/5 to-pink-600/5 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Zap className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  Credits
                </CardTitle>
                {userCredits <= 2 && (
                  <Badge variant="outline">
                    {userCredits === 0 ? "Empty" : "Low"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {userCredits}
                  </div>
                  <CardDescription className="text-xs">
                    {userCredits === 0 ? 'Get credits to start analyzing' : 
                     userCredits === 1 ? 'Last credit remaining!' : 
                     'Use credits to generate reports'}
                  </CardDescription>
                </div>
                
                <div className="flex gap-2">
                  {(userFeedbackCount === 0 || user.email === 'contactsubhrajeet@gmail.com') && (
                    <Button 
                      onClick={() => setShowFeedbackModal(true)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Gift className="h-3.5 w-3.5 mr-1" />
                      Free
                    </Button>
                  )}
                  <Button 
                    onClick={() => navigate('/pricing')}
                    size="sm"
                    variant={userCredits === 0 ? "default" : "outline"}
                    className="flex-1"
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                    Buy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="bg-gradient-to-r from-indigo-500/5 to-blue-600/5 border-indigo-500/20 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-indigo-500 animate-pulse" />
              Pro Tips for Better Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 hover:text-foreground transition-colors">
                <BTCLogo className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Generate BTC reports during high market volatility for more accurate predictions</span>
              </li>
              <li className="flex items-start gap-3 hover:text-foreground transition-colors">
                <ETHLogo className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Compare ETH confidence scores across different time periods to identify trends</span>
              </li>
              <li className="flex items-start gap-2 hover:text-foreground transition-colors">
                <span className="text-indigo-500">•</span>
                <span>Use the key insights to understand the reasoning behind each prediction</span>
              </li>
              <li className="flex items-start gap-2 hover:text-foreground transition-colors">
                <span className="text-indigo-500">•</span>
                <span>Consider both technical and fundamental factors mentioned in the reports</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
      
      {/* Feedback Modal - Manual Trigger */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} onComplete={() => {
      setShowFeedbackModal(false);
      fetchUserCredits(); // Refresh credits after completion
    }} />
      
      {/* Feedback Modal - Auto Popup */}
      <FeedbackModal isOpen={shouldShowFeedback} onClose={handleFeedbackClose} onComplete={handleFeedbackComplete} />
    </div>;
};
export default Dashboard;