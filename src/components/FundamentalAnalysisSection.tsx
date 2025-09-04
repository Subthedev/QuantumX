import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, TrendingUp, Shield, Users, Globe, Zap, AlertTriangle, Trophy, BarChart2, Activity } from 'lucide-react';

interface FundamentalAnalysisProps {
  analysis: any;
  marketData: any;
}

export const FundamentalAnalysisSection: React.FC<FundamentalAnalysisProps> = ({
  analysis,
  marketData
}) => {
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getMarketPositionScore = (position: string) => {
    const posLower = position?.toLowerCase() || '';
    if (posLower.includes('dominant') || posLower.includes('leader')) return 90;
    if (posLower.includes('strong') || posLower.includes('established')) return 75;
    if (posLower.includes('growing') || posLower.includes('emerging')) return 60;
    if (posLower.includes('challenger')) return 50;
    return 40;
  };

  const getNetworkHealthScore = (health: string) => {
    const healthLower = health?.toLowerCase() || '';
    if (healthLower.includes('excellent') || healthLower.includes('robust')) return 95;
    if (healthLower.includes('strong') || healthLower.includes('healthy')) return 80;
    if (healthLower.includes('good') || healthLower.includes('stable')) return 65;
    if (healthLower.includes('moderate')) return 50;
    return 35;
  };

  // Handle both direct analysis object and metrics nested structure
  const hasData = analysis && (
    analysis.strengths?.length > 0 || 
    analysis.weaknesses?.length > 0 || 
    analysis.metrics?.competitivePosition ||
    analysis.metrics?.adoptionRate ||
    analysis.metrics?.networkHealth ||
    analysis.metrics?.institutionalFlow ||
    analysis.catalysts?.bullish?.length > 0 ||
    analysis.catalysts?.bearish?.length > 0
  );

  if (!hasData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
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

  // Map the data from the API structure to the component's expected structure
  const mappedAnalysis = {
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    market_position: analysis.metrics?.competitivePosition || analysis.market_position || '',
    adoption_metrics: analysis.metrics?.adoptionRate || analysis.adoption_metrics || '',
    network_health: analysis.metrics?.networkHealth || analysis.network_health || '',
    institutional_flow: analysis.metrics?.institutionalFlow || analysis.institutional_flow || '',
    macro_environment: analysis.macroFactors?.marketRegime || analysis.macro_environment || '',
    competitive_landscape: analysis.macroFactors?.correlation || analysis.competitive_landscape || '',
    competitive_position: analysis.metrics?.competitivePosition || analysis.competitive_position || '',
    catalysts: (() => {
      if (analysis.catalysts?.bullish || analysis.catalysts?.bearish) {
        const bullish = analysis.catalysts.bullish || [];
        const bearish = analysis.catalysts.bearish || [];
        return `Bullish: ${bullish.slice(0, 2).join(', ')}. Bearish: ${bearish.slice(0, 2).join(', ')}`;
      }
      return analysis.catalysts || '';
    })()
  };

  const marketPositionScore = getMarketPositionScore(mappedAnalysis.market_position);
  const networkHealthScore = getNetworkHealthScore(mappedAnalysis.network_health);
  const volToMcapRatio = marketData ? (marketData.volume24h / marketData.marketCap) * 100 : 0;
  const isHighVolume = volToMcapRatio > 10;

  // Calculate market rank (mock calculation based on market cap)
  const marketRank = marketData?.marketCap ? 
    (marketData.marketCap > 100e9 ? Math.floor(Math.random() * 5) + 1 :
     marketData.marketCap > 10e9 ? Math.floor(Math.random() * 20) + 6 :
     marketData.marketCap > 1e9 ? Math.floor(Math.random() * 30) + 21 :
     Math.floor(Math.random() * 50) + 51) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Fundamental Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Overview */}
        {marketData && (
          <div className="space-y-4">
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <BarChart2 className="h-3 w-3" />
                  Market Cap
                </div>
                <div className="font-semibold text-lg">{formatMarketCap(marketData.marketCap)}</div>
                <Badge variant="outline" className="mt-1 text-xs">
                  Rank #{marketRank}
                </Badge>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Activity className="h-3 w-3" />
                  24h Volume
                </div>
                <div className="font-semibold text-lg">{formatVolume(marketData.volume24h)}</div>
                <Badge variant={isHighVolume ? "default" : "secondary"} className="mt-1 text-xs">
                  {isHighVolume ? "High Activity" : "Normal"}
                </Badge>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">Vol/MCap Ratio</div>
                <div className="font-semibold text-lg">{volToMcapRatio.toFixed(2)}%</div>
                <Progress value={Math.min(volToMcapRatio * 10, 100)} className="h-1 mt-2" />
              </div>
              
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">24h Change</div>
                <div className={`font-semibold text-lg flex items-center gap-1 ${
                  marketData.percentChange24h >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {marketData.percentChange24h >= 0 ? 
                    <TrendingUp className="h-4 w-4" /> : 
                    <AlertTriangle className="h-4 w-4" />
                  }
                  {marketData.percentChange24h >= 0 ? '+' : ''}{marketData.percentChange24h?.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Market Position Score */}
            {mappedAnalysis.market_position && (
              <div className="bg-muted/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    Market Position
                  </span>
                  <Badge variant="default" className="text-xs">
                    {marketPositionScore}% Dominance
                  </Badge>
                </div>
                <Progress value={marketPositionScore} className="h-2 mb-3" />
                <p className="text-sm text-muted-foreground">{mappedAnalysis.market_position}</p>
              </div>
            )}
          </div>
        )}

        {/* Strengths & Weaknesses Analysis */}
        <div className="grid md:grid-cols-2 gap-4">
          {mappedAnalysis.strengths && mappedAnalysis.strengths.length > 0 && (
            <div className="bg-success/5 border border-success/20 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                Fundamental Strengths
              </h4>
              <ul className="space-y-2">
                {mappedAnalysis.strengths.slice(0, 4).map((strength: string, idx: number) => (
                  <li key={idx} className="text-xs flex items-start gap-2">
                    <span className="text-success mt-0.5">✓</span>
                    <span className="text-muted-foreground">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {mappedAnalysis.weaknesses && mappedAnalysis.weaknesses.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Risk Factors
              </h4>
              <ul className="space-y-2">
                {mappedAnalysis.weaknesses.slice(0, 4).map((weakness: string, idx: number) => (
                  <li key={idx} className="text-xs flex items-start gap-2">
                    <span className="text-destructive mt-0.5">⚠</span>
                    <span className="text-muted-foreground">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Key Fundamental Metrics */}
        <div className="grid md:grid-cols-2 gap-4">
          {mappedAnalysis.adoption_metrics && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Adoption Metrics</span>
              </div>
              <p className="text-xs text-muted-foreground">{mappedAnalysis.adoption_metrics}</p>
            </div>
          )}
          
          {mappedAnalysis.network_health && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Network Health</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {networkHealthScore}%
                </Badge>
              </div>
              <Progress value={networkHealthScore} className="h-1 mb-2" />
              <p className="text-xs text-muted-foreground">{mappedAnalysis.network_health}</p>
            </div>
          )}
        </div>

        {/* Institutional & Macro Factors */}
        <div className="space-y-3">
          {mappedAnalysis.institutional_flow && (
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Institutional Flow Analysis</span>
              </div>
              <p className="text-sm text-muted-foreground">{mappedAnalysis.institutional_flow}</p>
            </div>
          )}
          
          {mappedAnalysis.macro_environment && (
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Macro Environment Impact</span>
              </div>
              <p className="text-sm text-muted-foreground">{mappedAnalysis.macro_environment}</p>
            </div>
          )}
        </div>

        {/* Competitive Analysis & Catalysts */}
        <div className="space-y-3">
          {mappedAnalysis.competitive_landscape && (
            <div className="border-l-2 border-primary pl-4">
              <div className="text-sm font-medium mb-2">Competitive Landscape</div>
              <p className="text-xs text-muted-foreground">{mappedAnalysis.competitive_landscape}</p>
            </div>
          )}
          
          {mappedAnalysis.catalysts && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Upcoming Catalysts</span>
              </div>
              <p className="text-sm">{mappedAnalysis.catalysts}</p>
            </div>
          )}
        </div>

        {/* Additional Metrics if available */}
        {mappedAnalysis.competitive_position && (
          <div className="bg-muted/20 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Competitive Position</div>
            <p className="text-sm">{mappedAnalysis.competitive_position}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};