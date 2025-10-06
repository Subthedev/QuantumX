import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Activity, AlertCircle, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SentimentAnalysisProps {
  data: any;
  coinData: any;
}

export const SentimentAnalysisCard: React.FC<SentimentAnalysisProps> = ({ data, coinData }) => {
  const getSentimentColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSentimentBg = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Sentiment Score */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Market Sentiment Score
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
                Trend: {data.sentiment_score.trend}
              </div>
            </div>
          </div>
          <Progress value={data.sentiment_score.overall_score} className="h-3" />
          <div className="grid grid-cols-5 gap-1 text-xs text-center mt-2">
            <div className="text-red-600 dark:text-red-400">Extreme<br/>Fear</div>
            <div className="text-orange-600 dark:text-orange-400">Fear</div>
            <div className="text-yellow-600 dark:text-yellow-400">Neutral</div>
            <div className="text-blue-600 dark:text-blue-400">Greed</div>
            <div className="text-green-600 dark:text-green-400">Extreme<br/>Greed</div>
          </div>
        </CardContent>
      </Card>

      {/* Market Psychology */}
      <Card className={data.market_psychology.contrarian_opportunity ? 'border-2 border-primary/30 shadow-glow' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Market Psychology
            {data.market_psychology.contrarian_opportunity && (
              <Badge className="ml-auto bg-primary text-primary-foreground">
                Contrarian Opportunity
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Fear & Greed Analysis</div>
            <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
              {data.market_psychology.fear_greed_analysis}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Crowd Emotion</div>
            <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
              {data.market_psychology.crowd_emotion}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Momentum Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Momentum Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Price Momentum</div>
              <Badge className={
                data.momentum_indicators.price_momentum.includes('Positive') ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                data.momentum_indicators.price_momentum.includes('Negative') ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }>
                {data.momentum_indicators.price_momentum}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-sm text-muted-foreground mb-2">Volume Momentum</div>
              <Badge variant="outline">{data.momentum_indicators.volume_momentum}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground mb-2">Divergence</div>
              <div className="text-sm font-medium">{data.momentum_indicators.momentum_divergence || 'None detected'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Positioning */}
      <Card>
        <CardHeader>
          <CardTitle>Market Positioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">Retail Positioning</div>
              <Badge className="text-base" variant="outline">{data.positioning.retail_positioning}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-muted-foreground mb-2">Crowd Consensus</div>
              <div className="text-sm font-medium">{data.positioning.crowd_consensus}</div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-2">Smart Money Signals</div>
            <div className="text-sm leading-relaxed">{data.positioning.smart_money_signals}</div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Drivers */}
      {data.sentiment_drivers && data.sentiment_drivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.sentiment_drivers.map((driver: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{driver}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contrarian Signals */}
      {data.contrarian_signals && data.contrarian_signals.length > 0 && (
        <Card className="border-2 border-primary/30 shadow-glow">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Contrarian Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.contrarian_signals.map((signal: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="text-primary text-xl flex-shrink-0">⚡</div>
                  <span className="text-sm font-medium leading-relaxed">{signal}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sentiment Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Outlook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-sm font-medium text-muted-foreground mb-2">Next 7 Days</div>
            <div className="text-sm leading-relaxed">{data.sentiment_outlook.next_7_days}</div>
          </div>

          {data.sentiment_outlook.key_levels_to_watch && data.sentiment_outlook.key_levels_to_watch.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Key Levels to Watch</div>
              <div className="grid grid-cols-2 gap-2">
                {data.sentiment_outlook.key_levels_to_watch.map((level: string, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <div className="font-medium">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.sentiment_outlook.sentiment_change_triggers && data.sentiment_outlook.sentiment_change_triggers.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Sentiment Change Triggers</div>
              <div className="flex flex-wrap gap-2">
                {data.sentiment_outlook.sentiment_change_triggers.map((trigger: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{trigger}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Stance */}
      <Card className="border-l-4 border-l-primary shadow-elegant">
        <CardHeader>
          <CardTitle>Recommended Stance</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className="text-xl px-6 py-3" variant={
            data.recommended_stance.includes('Accumulation') ? 'default' :
            data.recommended_stance.includes('Hold') ? 'secondary' : 'destructive'
          }>
            {data.recommended_stance}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};
