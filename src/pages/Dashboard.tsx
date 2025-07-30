import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CryptoReport from '@/components/CryptoReport';
import { Bitcoin, Zap, LogOut, TrendingUp, Home } from 'lucide-react';
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
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Record<string, CryptoReportData>>({});
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExistingReports();
    }
  }, [user]);

  const fetchExistingReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('crypto_reports')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsMap: Record<string, CryptoReportData> = {};
      data?.forEach((report) => {
        reportsMap[report.coin_symbol] = report;
      });
      setReports(reportsMap);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || loadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">IgniteX</h1>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="bg-primary/10 text-primary">
                Dashboard
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
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

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <CryptoReport
            coin="BTC"
            icon={<Bitcoin className="h-6 w-6 text-orange-500" />}
            name="Bitcoin"
            existingReport={reports.BTC}
          />
          <CryptoReport
            coin="ETH"
            icon={<Zap className="h-6 w-6 text-blue-500" />}
            name="Ethereum"
            existingReport={reports.ETH}
          />
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
                {Object.keys(reports).length}
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
                {Object.keys(reports).length > 0 
                  ? Math.round(Object.values(reports).reduce((acc, report) => acc + report.confidence_score, 0) / Object.keys(reports).length)
                  : 0}%
              </div>
              <CardDescription>across all predictions</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Remaining Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {2 - Object.keys(reports).length}
              </div>
              <CardDescription>until next 24h cycle</CardDescription>
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
    </div>
  );
};

export default Dashboard;