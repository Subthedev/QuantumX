import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, TrendingUp, TrendingDown, Globe, Building, Users, Zap, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FundamentalAnalysisProps {
  analysis: any;
  marketData: any;
}

export const FundamentalAnalysisSection: React.FC<FundamentalAnalysisProps> = ({ analysis, marketData }) => {
  console.log('FundamentalAnalysisSection received analysis:', analysis);
  console.log('FundamentalAnalysisSection received marketData:', marketData);
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="border-2 border-purple-500/20 shadow-xl bg-gradient-to-br from-background to-purple-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            Fundamental Analysis
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {analysis ? (
          <>
            {/* Market Metrics */}
            {marketData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                  <div className="font-bold text-sm">{formatMarketCap(marketData.marketCap)}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
                  <div className="font-bold text-sm">{formatMarketCap(marketData.volume24h)}</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Vol/MCap</div>
                  <div className="font-bold text-sm">
                    {((marketData.volume24h / marketData.marketCap) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">24h Change</div>
                  <div className={`font-bold text-sm ${
                    marketData.percentChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {marketData.percentChange24h >= 0 ? '+' : ''}{marketData.percentChange24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Strengths
                </div>
                <div className="space-y-1">
                  {analysis.strengths?.map((strength: string, i: number) => (
                    <div key={i} className="p-2 bg-green-500/10 rounded text-sm border-l-2 border-green-500">
                      {strength}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Weaknesses
                </div>
                <div className="space-y-1">
                  {analysis.weaknesses?.map((weakness: string, i: number) => (
                    <div key={i} className="p-2 bg-red-500/10 rounded text-sm border-l-2 border-red-500">
                      {weakness}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Market Position & Metrics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-blue-600" />
                Market Fundamentals
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.market_position && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-xs font-medium text-blue-700 mb-1">Market Position</div>
                    <p className="text-sm">{analysis.market_position}</p>
                  </div>
                )}
                
                {analysis.adoption_metrics && (
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="text-xs font-medium text-purple-700 mb-1">Adoption Metrics</div>
                    <p className="text-sm">{analysis.adoption_metrics}</p>
                  </div>
                )}
                
                {analysis.network_health && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-xs font-medium text-green-700 mb-1">Network Health</div>
                    <p className="text-sm">{analysis.network_health}</p>
                  </div>
                )}
                
                {analysis.institutional_flow && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <div className="text-xs font-medium text-orange-700 mb-1">Institutional Flow</div>
                    <p className="text-sm">{analysis.institutional_flow}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Macro Environment */}
            {analysis.macro_environment && (
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium">Macro Environment</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.macro_environment}
                </p>
              </div>
            )}

            {/* Competitive Landscape */}
            {analysis.competitive_landscape && (
              <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Competitive Landscape</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.competitive_landscape}
                </p>
              </div>
            )}

            {/* Catalysts */}
            {analysis.catalysts && (
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Upcoming Catalysts</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.catalysts}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No fundamental analysis available. Generate a report to see detailed analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
};