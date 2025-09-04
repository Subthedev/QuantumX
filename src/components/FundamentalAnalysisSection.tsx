import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Activity, DollarSign,
  Zap, AlertTriangle, Target, Info, Clock,
  ChevronUp, ChevronDown, Minus, BarChart
} from 'lucide-react';

interface FundamentalAnalysisProps {
  analysis: any;
  marketData: any;
}

export const FundamentalAnalysisSection: React.FC<FundamentalAnalysisProps> = ({
  analysis,
  marketData
}) => {
  const formatValue = (value: number, isPrice: boolean = false) => {
    if (!value && value !== 0) return 'N/A';
    
    if (isPrice) {
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
      if (value >= 1) return `$${value.toFixed(2)}`;
      return `$${value.toFixed(4)}`;
    }
    
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getHealthScore = () => {
    if (!marketData) return 50;
    
    let score = 50;
    
    // Volume to market cap ratio (healthy = 5-15%)
    const volMcapRatio = (marketData.volume24h / marketData.marketCap) * 100;
    if (volMcapRatio >= 5 && volMcapRatio <= 15) score += 20;
    else if (volMcapRatio < 5) score -= 10;
    else if (volMcapRatio > 30) score -= 15;
    
    // Price change momentum
    const change = marketData.percentChange24h || 0;
    if (Math.abs(change) < 5) score += 10; // Stable
    else if (change > 10) score += 15; // Strong upward
    else if (change < -10) score -= 15; // Strong downward
    
    // Network health from analysis
    const health = analysis?.metrics?.networkHealth?.toLowerCase() || '';
    if (health.includes('excellent') || health.includes('robust')) score += 25;
    else if (health.includes('strong') || health.includes('healthy')) score += 15;
    else if (health.includes('good')) score += 5;
    else if (health.includes('poor') || health.includes('weak')) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  };

  const hasData = analysis && (
    analysis.strengths?.length > 0 || 
    analysis.weaknesses?.length > 0 || 
    analysis.metrics || 
    analysis.catalysts
  );

  if (!hasData && !marketData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Fundamental Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No fundamental analysis data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = getHealthScore();
  const volMcapRatio = marketData ? (marketData.volume24h / marketData.marketCap) * 100 : 0;
  
  // Determine market sentiment
  const getMarketSentiment = () => {
    if (healthScore >= 75) return { text: 'Bullish', color: 'text-success', bg: 'bg-success/10' };
    if (healthScore >= 50) return { text: 'Neutral', color: 'text-warning', bg: 'bg-warning/10' };
    return { text: 'Bearish', color: 'text-destructive', bg: 'bg-destructive/10' };
  };
  
  const sentiment = getMarketSentiment();

  // Extract catalysts
  const bullishCatalysts = analysis?.catalysts?.bullish || [];
  const bearishCatalysts = analysis?.catalysts?.bearish || [];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Fundamental Analysis
          </div>
          <Badge className={`${sentiment.bg} ${sentiment.color} border-0`}>
            {sentiment.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Real-time Market Overview */}
        {marketData && (
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Market Cap</span>
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{formatValue(marketData.marketCap)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="bg-background border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">24h Volume</span>
                  <Activity className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{formatValue(marketData.volume24h)}</div>
                <Badge variant={volMcapRatio > 10 ? "default" : "secondary"} className="mt-1 text-xs">
                  {volMcapRatio.toFixed(1)}% of MCap
                </Badge>
              </div>

              <div className="bg-background border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">24h Change</span>
                  {marketData.percentChange24h >= 0 ? 
                    <ChevronUp className="h-3 w-3 text-success" /> : 
                    <ChevronDown className="h-3 w-3 text-destructive" />
                  }
                </div>
                <div className={`text-xl font-bold ${
                  marketData.percentChange24h >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {marketData.percentChange24h >= 0 ? '+' : ''}{marketData.percentChange24h?.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.abs(marketData.percentChange24h) > 10 ? 'High volatility' : 'Normal movement'}
                </div>
              </div>

              <div className="bg-background border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Health Score</span>
                  <Target className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{healthScore}/100</div>
                <Progress value={healthScore} className="h-1.5 mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Tabbed Content for Better Organization */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="catalysts">
              Catalysts
              {(bullishCatalysts.length + bearishCatalysts.length) > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {bullishCatalysts.length + bearishCatalysts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              {analysis?.strengths?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Key Strengths
                  </h4>
                  <div className="space-y-2">
                    {analysis.strengths.slice(0, 3).map((strength: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
                        <ChevronUp className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis?.weaknesses?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Risk Factors
                  </h4>
                  <div className="space-y-2">
                    {analysis.weaknesses.slice(0, 3).map((weakness: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                        <ChevronDown className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{weakness}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Insights */}
            {analysis?.metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.metrics.competitivePosition && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">Market Position</span>
                    <span className="text-sm text-muted-foreground">{analysis.metrics.competitivePosition}</span>
                  </div>
                )}
                {analysis.metrics.adoptionRate && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">Adoption Rate</span>
                    <span className="text-sm text-muted-foreground">{analysis.metrics.adoptionRate}</span>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Catalysts Tab - Real-time Latest Updates */}
          <TabsContent value="catalysts" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleString()}
              </span>
            </div>

            {bullishCatalysts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-success" />
                  Bullish Catalysts
                </h4>
                <div className="space-y-2">
                  {bullishCatalysts.map((catalyst: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-success/5 border border-success/20">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-success/10 text-success border-0 mt-0.5">NEW</Badge>
                        <div className="flex-1">
                          <p className="text-sm">{catalyst}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bearishCatalysts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Risk Catalysts
                </h4>
                <div className="space-y-2">
                  {bearishCatalysts.map((catalyst: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-destructive/10 text-destructive border-0 mt-0.5">RISK</Badge>
                        <div className="flex-1">
                          <p className="text-sm">{catalyst}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bullishCatalysts.length === 0 && bearishCatalysts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming catalysts identified</p>
              </div>
            )}
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            {analysis?.metrics && (
              <div className="space-y-4">
                {analysis.metrics.networkHealth && (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">Network Health</span>
                      <Badge variant="outline">{analysis.metrics.networkHealth}</Badge>
                    </div>
                    <Progress value={healthScore} className="h-2" />
                  </div>
                )}

                {analysis.metrics.institutionalFlow && (
                  <div className="p-4 rounded-lg bg-primary/5">
                    <h4 className="font-medium text-sm mb-2">Institutional Flow</h4>
                    <p className="text-sm text-muted-foreground">{analysis.metrics.institutionalFlow}</p>
                  </div>
                )}

                {analysis.macroFactors && (
                  <div className="space-y-3">
                    {analysis.macroFactors.marketRegime && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground">Market Regime</span>
                        <p className="text-sm mt-1">{analysis.macroFactors.marketRegime}</p>
                      </div>
                    )}
                    {analysis.macroFactors.correlation && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <span className="text-xs text-muted-foreground">Correlation Analysis</span>
                        <p className="text-sm mt-1">{analysis.macroFactors.correlation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!analysis?.metrics && (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No detailed metrics available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};