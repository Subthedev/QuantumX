import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CryptoTable from '@/components/CryptoTable';
import Titan10Section from '@/components/Titan10Section';
import { TrendingUp, Zap, BarChart3, Sparkles, Globe, Activity, DollarSign, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

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
      const { data, error } = await supabase
        .from('crypto_reports')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

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
      const { count, error } = await supabase
        .from('crypto_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      setTotalReportsCount(count || 0);
    } catch (error) {
      // Silently handle error
    }
  }, []);

  if (loadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" role="status" aria-label="Loading"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      label: 'Global Market Cap',
      value: '$3.42T',
      change: '+2.3%',
      isPositive: true,
      icon: Globe,
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      label: '24h Volume',
      value: '$142B',
      change: '+8.7%',
      isPositive: true,
      icon: Activity,
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    {
      label: 'AI Reports',
      value: String(totalReportsCount),
      change: 'Today',
      isPositive: null,
      icon: BarChart3,
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    },
    {
      label: 'BTC Dominance',
      value: '54.2%',
      change: 'Market Share',
      isPositive: null,
      icon: DollarSign,
      bgGradient: 'from-orange-500/10 to-red-500/10'
    },
    {
      label: 'Titan 10 Returns',
      value: '+1,218%',
      change: '8/10 Win Rate',
      isPositive: true,
      icon: Crown,
      bgGradient: 'from-yellow-500/10 to-amber-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 max-w-[1400px]">

        {/* Compact Page Header */}
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Today's Cryptocurrency Prices</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Market cap <span className="font-semibold">$3.42T</span> <span className="text-green-500">+2.3%</span>
          </p>
        </div>

        {/* Horizontal Scrolling Stats - Mobile Optimized */}
        <div className="relative -mx-4 md:mx-0">
          <Swiper
            modules={[FreeMode, Autoplay]}
            spaceBetween={12}
            slidesPerView="auto"
            freeMode={true}
            loop={true}
            autoplay={typeof window !== 'undefined' && window.innerWidth < 768 ? {
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            } : false}
            speed={typeof window !== 'undefined' && window.innerWidth < 768 ? 3000 : 300}
            className="!px-4 md:!px-0"
          >
            {statsCards.map((stat, index) => (
              <SwiperSlide key={index} className="!w-[160px] md:!w-auto md:!flex-1">
                <Card className={`border-border/50 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm h-full`}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
                        <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1 truncate">{stat.value}</p>
                        <p className={`text-[10px] md:text-xs mt-0.5 md:mt-1 truncate ${
                          stat.isPositive === true ? 'text-green-500' :
                          stat.isPositive === false ? 'text-red-500' :
                          'text-muted-foreground'
                        }`}>
                          {stat.change}
                        </p>
                      </div>
                      <stat.icon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/30 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Compact Titan 10 Section - Always Visible */}
        <Titan10Section />

        {/* Main Crypto Table */}
        <CryptoTable />

        {/* Recent AI Analysis */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 md:pb-5">
            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Recent AI Analysis
            </CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1">
              Latest AI-powered crypto analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            {Object.keys(reports).length > 0 ? (
              Object.entries(reports).slice(0, 5).map(([symbol, report]) => (
                <div key={report.id} className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-background/50 border border-border/50 hover:bg-background/70 transition-colors">
                  <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-xs md:text-sm">{symbol}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm md:text-base truncate">{symbol}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {new Date(report.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-medium">Confidence</p>
                      <p className="text-base font-bold">{report.confidence_score}%</p>
                    </div>
                    <Badge
                      variant={report.prediction_summary.includes('Bullish') ? 'default' : 'destructive'}
                      className="text-xs md:text-sm min-w-[60px] md:min-w-[80px] justify-center"
                    >
                      {report.prediction_summary.split(' ')[0]}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 md:py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-30" />
                <p className="text-sm md:text-base font-medium mb-1 md:mb-2">No AI analyses yet</p>
                <p className="text-xs md:text-sm">Click "AI Analysis" on any crypto to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
