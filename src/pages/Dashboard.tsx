import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfessionalAnalysisDashboard from '@/components/ProfessionalAnalysisDashboard';
import CreditDisplay from '@/components/CreditDisplay';
import FeedbackModal from '@/components/FeedbackModal';
import { useFeedbackPopup } from '@/hooks/useFeedbackPopup';
import { TrendingUp, Home, Coins, Gift, Bitcoin, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { AIBrainIcon } from '@/components/ui/ai-brain-icon';
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
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Left: Logo + Credits */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <AIBrainIcon className="h-8 w-8" />
              <span className="text-xl font-bold text-foreground">IgniteX</span>
            </Link>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <CreditDisplay />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {(userFeedbackCount === 0 || user.email === 'contactsubhrajeet@gmail.com') && (
              <Button 
                onClick={() => setShowFeedbackModal(true)} 
                size="sm" 
                variant="outline"
                className="hidden sm:flex"
              >
                <Gift className="h-4 w-4 mr-2" />
                Get Free Credits
              </Button>
            )}
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-6 space-y-8">
        {/* AI Analysis Dashboard */}
        <div className="-mx-4 sm:-mx-6">
          <ProfessionalAnalysisDashboard />
        </div>
        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-status-success" />
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
          
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Bitcoin className="h-4 w-4 text-status-warning" />
                Average Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {Object.keys(reports).length > 0 ? Math.round(Object.values(reports).reduce((acc, report) => acc + report.confidence_score, 0) / Object.keys(reports).length) : 0}%
              </div>
              <CardDescription className="text-xs">across all predictions</CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {userCredits}
                  </div>
                  <CardDescription className="text-xs">Use credits to generate reports</CardDescription>
                </div>
                {(userFeedbackCount === 0 || user.email === 'contactsubhrajeet@gmail.com') && 
                  <Button 
                    onClick={() => setShowFeedbackModal(true)} 
                    size="sm" 
                    variant="default"
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    <span className="text-sm">Get Free Credits</span>
                  </Button>
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Pro Tips for Better Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Generate reports during high market volatility for more accurate predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Compare confidence scores across different time periods to identify trends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use the key insights to understand the reasoning behind each prediction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
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