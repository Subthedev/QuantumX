import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SentimentAnalysisProps {
  data: any;
  coinData: any;
}

export const SentimentAnalysisCard: React.FC<SentimentAnalysisProps> = ({ data, coinData }) => {
  const getSentimentColor = (score: number) => {
    if (score >= 75) return 'text-success dark:text-success';
    if (score >= 60) return 'text-info';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Sentiment Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-5xl font-bold ${getSentimentColor(data.sentiment_score.overall_score)}`}>
                {data.sentiment_score.overall_score}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
            <div className="text-right">
              <Badge className="text-lg px-4 py-2 mb-2" variant="outline">
                {data.sentiment_score.sentiment_label}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {data.sentiment_score.trend}
              </div>
            </div>
          </div>
          <Progress value={data.sentiment_score.overall_score} className="h-3" />
          <div className="grid grid-cols-5 gap-1 text-xs text-center">
            <div className="text-destructive">Extreme Fear</div>
            <div className="text-warning">Fear</div>
            <div className="text-muted-foreground">Neutral</div>
            <div className="text-info">Greed</div>
            <div className="text-success dark:text-success">Extreme Greed</div>
          </div>
        </CardContent>
      </Card>

      {/* Market Psychology */}
      <Card className={data.market_psychology.contrarian_opportunity ? 'border-primary/30' : ''}>
        <CardHeader className={data.market_psychology.contrarian_opportunity ? 'bg-primary/5' : ''}>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Psychology
            {data.market_psychology.contrarian_opportunity && (
              <Badge className="ml-auto">Contrarian Opportunity</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Fear & Greed</div>
            <p className="text-sm leading-relaxed">{data.market_psychology.fear_greed_analysis}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Crowd Emotion</div>
            <p className="text-sm leading-relaxed">{data.market_psychology.crowd_emotion}</p>
          </div>
        </CardContent>
      </Card>

      {/* Positioning */}
      <Card>
        <CardHeader>
          <CardTitle>Market Positioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Retail</div>
              <Badge variant="outline">{data.positioning.retail_positioning}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-2">Consensus</div>
              <div className="text-sm font-medium">{data.positioning.crowd_consensus}</div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-2">Smart Money</div>
            <div className="text-sm leading-relaxed">{data.positioning.smart_money_signals}</div>
          </div>
        </CardContent>
      </Card>

      {/* Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 7 Days</div>
            <p className="text-sm leading-relaxed">{data.sentiment_outlook.next_7_days}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Stance */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Stance</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className="text-xl px-6 py-3" variant={
            data.recommended_stance.includes('Accumulation') ? 'default' : 'secondary'
          }>
            {data.recommended_stance}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};
