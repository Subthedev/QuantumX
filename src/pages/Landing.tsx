import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Titan10Section from '@/components/Titan10Section';
import CryptoTable from '@/components/CryptoTable';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, BarChart3, Brain, Clock } from 'lucide-react';

interface CryptoReportData {
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  created_at: string;
}

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<CryptoReportData[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExistingReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_reports')
        .select('coin_symbol, prediction_summary, confidence_score, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, []);

  const fetchTotalReportsCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('crypto_reports')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalReports(count || 0);
    } catch (error) {
      console.error('Error fetching report count:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(false);
      await Promise.all([
        fetchExistingReports(),
        fetchTotalReportsCount()
      ]);
    };

    loadData();
  }, [fetchExistingReports, fetchTotalReportsCount]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Global Market Cap</CardDescription>
              <CardTitle className="text-2xl">$2.8T</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +2.4% (24h)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">24h Volume</CardDescription>
              <CardTitle className="text-2xl">$156B</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3 mr-1" />
                Moderate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">AI Reports</CardDescription>
              <CardTitle className="text-2xl">{totalReports}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <Brain className="h-3 w-3 mr-1" />
                Generated
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">BTC Dominance</CardDescription>
              <CardTitle className="text-2xl">54.3%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                Stable
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Titan 10 Section */}
        <div className="mb-8">
          <Titan10Section />
        </div>

        {/* Main Crypto Table */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Real-time cryptocurrency prices and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <CryptoTable />
            </CardContent>
          </Card>
        </div>

        {/* Recent AI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Recent AI Analysis</CardTitle>
            <CardDescription>Latest predictions and market insights</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No AI reports generated yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate your first report from the AI Analysis page
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/ai-analysis')}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          {report.coin_symbol}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.prediction_summary}
                      </p>
                    </div>
                    <div className="ml-4">
                      <Badge 
                        variant={report.confidence_score >= 75 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {report.confidence_score}% Confidence
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Landing;
