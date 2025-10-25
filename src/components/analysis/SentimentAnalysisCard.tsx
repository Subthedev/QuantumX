import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SentimentAnalysis } from '@/schemas/analysis-schemas';

interface SentimentAnalysisProps {
  data: SentimentAnalysis;
  coinData?: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    marketCap: number;
    volume: number;
  };
}

export const SentimentAnalysisCard: React.FC<SentimentAnalysisProps> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['score', 'psychology']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getSentimentColor = (score: number) => {
    if (score >= 75) return 'text-success dark:text-success';
    if (score >= 60) return 'text-info';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sentiment Score - Mobile Optimized */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('score')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Brain className="h-4 w-4 md:h-5 md:w-5" />
              <span>Market Sentiment</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('score') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('score') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-0">
              <div className="text-center md:text-left">
                <div className={`text-4xl md:text-5xl font-bold ${getSentimentColor(data.sentiment_score.overall_score)}`}>
                  {data.sentiment_score.overall_score}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">out of 100</div>
              </div>
              <div className="text-center md:text-right">
                <Badge className="text-base md:text-lg px-3 md:px-4 py-1.5 md:py-2 mb-2" variant="outline">
                  {data.sentiment_score.sentiment_label}
                </Badge>
                <div className="text-xs md:text-sm text-muted-foreground">
                  {data.sentiment_score.trend}
                </div>
              </div>
            </div>
            <Progress value={data.sentiment_score.overall_score} className="h-2 md:h-3" />
            <div className="grid grid-cols-5 gap-1 text-[10px] md:text-xs text-center">
              <div className="text-destructive">Extreme Fear</div>
              <div className="text-warning">Fear</div>
              <div className="text-muted-foreground">Neutral</div>
              <div className="text-info">Greed</div>
              <div className="text-success dark:text-success">Extreme Greed</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Market Psychology - Mobile Optimized */}
      <Card className={`shadow-md hover:shadow-lg transition-shadow ${data.market_psychology.contrarian_opportunity ? 'border-primary/30' : ''}`}>
        <CardHeader
          className={`cursor-pointer p-3 md:p-6 ${data.market_psychology.contrarian_opportunity ? 'bg-primary/10' : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10'}`}
          onClick={() => toggleSection('psychology')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Activity className="h-4 w-4 md:h-5 md:w-5" />
              <CardTitle className="text-base md:text-lg">Market Psychology</CardTitle>
              {data.market_psychology.contrarian_opportunity && (
                <Badge className="text-xs md:text-sm">Contrarian Opportunity</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('psychology') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('psychology') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Fear & Greed</div>
              <p className="text-xs md:text-sm leading-relaxed">{data.market_psychology.fear_greed_analysis}</p>
            </div>
            <div>
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Crowd Emotion</div>
              <p className="text-xs md:text-sm leading-relaxed">{data.market_psychology.crowd_emotion}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Positioning - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('positioning')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Market Positioning</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('positioning') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('positioning') && (
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Retail</div>
                <Badge variant="outline" className="text-xs md:text-sm">{data.positioning.retail_positioning}</Badge>
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-muted/50">
                <div className="text-xs md:text-sm text-muted-foreground mb-2">Consensus</div>
                <div className="text-xs md:text-sm font-medium">{data.positioning.crowd_consensus}</div>
              </div>
            </div>
            <div className="p-3 md:p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Smart Money</div>
              <div className="text-xs md:text-sm leading-relaxed">{data.positioning.smart_money_signals}</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Outlook - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('outlook')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Sentiment Outlook</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('outlook') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('outlook') && (
          <CardContent className="p-3 md:p-6">
            <div className="p-3 md:p-4 rounded-lg bg-muted/50">
              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Next 7 Days</div>
              <p className="text-xs md:text-sm leading-relaxed">{data.sentiment_outlook.next_7_days}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommended Stance - Mobile Optimized */}
      <Card>
        <CardHeader
          className="cursor-pointer p-3 md:p-6"
          onClick={() => toggleSection('stance')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Recommended Stance</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expandedSections.has('stance') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.has('stance') && (
          <CardContent className="p-3 md:p-6">
            <Badge className="text-base md:text-lg lg:text-xl px-4 md:px-6 py-2 md:py-3" variant={
              data.recommended_stance.includes('Accumulation') ? 'default' : 'secondary'
            }>
              {data.recommended_stance}
            </Badge>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
