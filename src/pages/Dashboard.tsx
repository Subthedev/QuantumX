import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CryptoReport from '@/components/CryptoReport';
import CreditDisplay from '@/components/CreditDisplay';
import FeedbackModal from '@/components/FeedbackModal';
import { useFeedbackPopup } from '@/hooks/useFeedbackPopup';
import { Bitcoin, Zap, LogOut, TrendingUp, Home, Coins, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
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
  return <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary"></h1>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <CreditDisplay onGetCredits={userFeedbackCount === 0 ? () => setShowFeedbackModal(true) : undefined} />
            <span className="text-sm text-muted-foreground hidden sm:block">
              Welcome, {user.email}
            </span>
            <Button variant="outline" onClick={handleSignOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your AI Prediction Dashboard</h2>
          <p className="text-muted-foreground">
            Generate intelligent market insights and price predictions for your favorite cryptocurrencies.
          </p>
        </div>

        {/* 4H Signal Cards */}
        

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <CryptoReport coin="BTC" icon={<Bitcoin className="h-6 w-6 text-orange-500" />} name="Bitcoin" existingReport={reports.BTC} />
          <CryptoReport coin="ETH" icon={<Zap className="h-6 w-6 text-blue-500" />} name="Ethereum" existingReport={reports.ETH} />
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Reports Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalReportsCount}
              </div>
              <CardDescription>in the last 24 hours</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="h-5 w-5 text-orange-500" />
                Average Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {Object.keys(reports).length > 0 ? Math.round(Object.values(reports).reduce((acc, report) => acc + report.confidence_score, 0) / Object.keys(reports).length) : 0}%
              </div>
              <CardDescription>across all predictions</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {userCredits}
                  </div>
                  <CardDescription>Use credits to generate reports</CardDescription>
                </div>
                {userFeedbackCount === 0 && (
                  <Button onClick={() => setShowFeedbackModal(true)} size="sm" variant="outline" className="flex items-center gap-1.5 border-accent/30 hover:bg-accent/10 hover:border-accent/50">
                    <Gift className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold">Get Free Credits</span>
                  </Button>
                )}
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