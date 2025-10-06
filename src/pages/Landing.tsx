import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CryptoTable from '@/components/CryptoTable';
import { supabase } from '@/integrations/supabase/client';
import { cryptoDataService } from '@/services/cryptoDataService';
import { TrendingUp, BarChart3, Brain, Clock, Crown, ArrowRight, DollarSign, Target } from 'lucide-react';

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
  const [hbarReturn, setHbarReturn] = useState('+962%');

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

  useEffect(() => {
    const fetchHBARPrice = async () => {
      try {
        const cryptos = await cryptoDataService.getTopCryptos(100);
        const hbarData = cryptos.find(c => c.id === 'hedera-hashgraph');
        
        if (hbarData) {
          const entryPrice = 0.05;
          const currentPrice = hbarData.current_price;
          const returnPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
          setHbarReturn(`${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(0)}%`);
        }
      } catch (error) {
        console.error('Error fetching HBAR price:', error);
      }
    };

    fetchHBARPrice();
  }, []);

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

        {/* Titan 10 Section with Updated Picks */}
        <div className="mb-8">
          <div className="space-y-6">
            {/* Professional Hero Section */}
            <div className="rounded-xl bg-card border border-border p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        IgniteX Titan 10
                      </h2>
                      <p className="text-sm text-muted-foreground">Expert-Curated Portfolio for 2025 Bull Run</p>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    EXCLUSIVE
                  </Badge>
                </div>
                
                {/* Key Metrics - Clean Professional Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-border bg-background">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs">Avg. Returns</CardDescription>
                      <CardTitle className="text-2xl flex items-center gap-1.5 text-primary">
                        <TrendingUp className="h-4 w-4" />
                        23,879%
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card className="border-border bg-background">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs">Total Volume</CardDescription>
                      <CardTitle className="text-2xl flex items-center gap-1.5 text-primary">
                        <DollarSign className="h-4 w-4" />
                        $2.8M
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card className="border-border bg-background">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs">Hit Rate</CardDescription>
                      <CardTitle className="text-2xl flex items-center gap-1.5 text-primary">
                        <Target className="h-4 w-4" />
                        87%
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                
                {/* Latest Picks by IgniteX Team */}
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">🔓 Get Access to Our Latest Picks for 2025</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* RWA Pick */}
                    <Card className="border-blue-500/20 bg-blue-500/5">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs font-semibold text-blue-500 border-blue-500/50">
                              💎 RWA PICK
                            </Badge>
                            <Badge variant="secondary" className="text-xs">Locked</Badge>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 blur-sm"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground blur-sm">HBAR</p>
                              <p className="text-xs text-muted-foreground">Enterprise DLT</p>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Return Till Date:</span>
                              <span className="text-lg font-bold text-blue-500">{hbarReturn}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* MEME Pick */}
                    <Card className="border-purple-500/20 bg-purple-500/5">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs font-semibold text-purple-500 border-purple-500/50">
                              🚀 MEME PICK
                            </Badge>
                            <Badge variant="secondary" className="text-xs">Locked</Badge>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-sm"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground blur-sm">HYPE</p>
                              <p className="text-xs text-muted-foreground">Perp DEX</p>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Return Till Date:</span>
                              <span className="text-lg font-bold text-purple-500">+4,900%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* CTA */}
                <Button 
                  onClick={() => navigate('/titan10')} 
                  size="lg" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  View Complete Titan 10 Portfolio
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Get instant access to 2 exclusive picks • 8 more coins available for members
                </p>
              </div>
            </div>
          </div>
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
