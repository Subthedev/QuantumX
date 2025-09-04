import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, TrendingDown, Users, MessageSquare, BarChart, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SentimentAnalysisProps {
  analysis: any;
}

export const SentimentAnalysisSection: React.FC<SentimentAnalysisProps> = ({ analysis }) => {
  const getSentimentScore = (sentiment: string) => {
    const sentimentLower = sentiment?.toLowerCase() || '';
    if (sentimentLower.includes('extremely bullish')) return 95;
    if (sentimentLower.includes('very bullish')) return 85;
    if (sentimentLower.includes('bullish')) return 70;
    if (sentimentLower.includes('slightly bullish')) return 60;
    if (sentimentLower.includes('neutral')) return 50;
    if (sentimentLower.includes('slightly bearish')) return 40;
    if (sentimentLower.includes('bearish')) return 30;
    if (sentimentLower.includes('very bearish')) return 15;
    if (sentimentLower.includes('extremely bearish')) return 5;
    return 50;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 40) return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
    if (score >= 30) return 'text-orange-600 bg-orange-500/10 border-orange-500/30';
    return 'text-red-600 bg-red-500/10 border-red-500/30';
  };

  const getRiskLevel = (risk: string) => {
    const riskLower = risk?.toLowerCase() || '';
    if (riskLower.includes('low')) return { level: 'LOW', color: 'text-green-600 bg-green-500/10' };
    if (riskLower.includes('medium')) return { level: 'MEDIUM', color: 'text-yellow-600 bg-yellow-500/10' };
    if (riskLower.includes('high')) return { level: 'HIGH', color: 'text-red-600 bg-red-500/10' };
    return { level: 'UNKNOWN', color: 'text-gray-600 bg-gray-500/10' };
  };

  const sentimentScore = getSentimentScore(analysis?.overall);
  const riskData = getRiskLevel(analysis?.risk_level);

  return (
    <Card className="border-2 border-orange-500/20 shadow-xl bg-gradient-to-br from-background to-orange-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-500" />
            Sentiment Analysis
          </CardTitle>
          {analysis?.overall && (
            <Badge 
              variant="outline" 
              className={`px-3 py-1 ${getSentimentColor(sentimentScore)}`}
            >
              {analysis.overall}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {analysis ? (
          <>
            {/* Overall Sentiment Gauge */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Market Sentiment Score</span>
                <span className="text-sm font-bold">{sentimentScore}%</span>
              </div>
              <Progress 
                value={sentimentScore} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Extreme Fear</span>
                <span>Neutral</span>
                <span>Extreme Greed</span>
              </div>
            </div>

            {/* Sentiment Factors */}
            {analysis.factors && analysis.factors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Contributing Factors</div>
                <div className="space-y-1">
                  {analysis.factors.map((factor: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        factor.toLowerCase().includes('bullish') ? 'bg-green-500' :
                        factor.toLowerCase().includes('bearish') ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Level */}
            <div className="p-4 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-lg border border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Risk Assessment</span>
                <Badge className={`${riskData.color}`}>
                  {riskData.level} RISK
                </Badge>
              </div>
              {analysis.risk_level && (
                <p className="text-xs text-muted-foreground">
                  {analysis.risk_level}
                </p>
              )}
            </div>

            {/* Market Sentiment Details */}
            <div className="grid grid-cols-2 gap-3">
              {analysis.market_sentiment && (
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Market Pulse</span>
                  </div>
                  <p className="text-xs">{analysis.market_sentiment}</p>
                </div>
              )}
              
              {analysis.social_metrics && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Social Metrics</span>
                  </div>
                  <p className="text-xs">{analysis.social_metrics}</p>
                </div>
              )}
            </div>

            {/* Fear & Greed Analysis */}
            {analysis.fear_greed_analysis && (
              <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Fear & Greed Analysis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.fear_greed_analysis}
                </p>
              </div>
            )}

            {/* Options Flow */}
            {analysis.options_flow && (
              <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-lg border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium">Options Flow</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.options_flow}
                </p>
              </div>
            )}

            {/* Contrarian Indicators */}
            {analysis.contrarian_indicators && (
              <div className="p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-medium">Contrarian Indicators</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.contrarian_indicators}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No sentiment analysis available. Generate a report to see market sentiment.
          </div>
        )}
      </CardContent>
    </Card>
  );
};