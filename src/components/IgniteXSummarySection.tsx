import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, AlertCircle, CheckCircle2, XCircle, Clock, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface IgniteXSummaryProps {
  report: any;
}

export const IgniteXSummarySection: React.FC<IgniteXSummaryProps> = ({ report }) => {
  const getActionabilityScore = () => {
    if (!report) return 0;
    
    let score = 0;
    if (report.signal_4h?.confidence >= 70) score += 25;
    if (report.signal_4h?.direction !== 'HOLD') score += 25;
    if (report.targets?.take_profit_1) score += 20;
    if (report.risk_management?.risk_reward_ratio) score += 15;
    if (report.analysis?.technical?.primary_trend) score += 15;
    
    return score;
  };

  const getRecommendation = () => {
    const score = getActionabilityScore();
    const confidence = report?.signal_4h?.confidence || 0;
    
    if (score >= 80 && confidence >= 75) {
      return { action: 'STRONG BUY/SELL', color: 'text-green-600 bg-green-500/10', icon: CheckCircle2 };
    }
    if (score >= 60 && confidence >= 60) {
      return { action: 'CONSIDER ENTRY', color: 'text-blue-600 bg-blue-500/10', icon: Target };
    }
    if (score >= 40) {
      return { action: 'WAIT & WATCH', color: 'text-yellow-600 bg-yellow-500/10', icon: Clock };
    }
    return { action: 'AVOID', color: 'text-red-600 bg-red-500/10', icon: XCircle };
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reportTime = new Date(timestamp);
    const diffMs = now.getTime() - reportTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  };

  const recommendation = getRecommendation();
  const actionScore = getActionabilityScore();

  return (
    <Card className="border-2 border-primary/30 shadow-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            IgniteX AI Summary
          </CardTitle>
          {report && (
            <Badge variant="outline" className="text-xs">
              Generated {formatTimeAgo(report.timestamp)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {report ? (
          <>
            {/* Executive Summary */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <h3 className="text-sm font-semibold mb-2">Executive Summary</h3>
              <p className="text-sm text-muted-foreground">
                {report.summary || `${report.coin} shows ${report.signal_4h?.direction || 'neutral'} signal with ${report.signal_4h?.confidence || 0}% confidence. ${report.analysis?.technical?.primary_trend ? `Market trend is ${report.analysis.technical.primary_trend}.` : ''}`}
              </p>
            </div>

            {/* Actionability Score */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Actionability Score</div>
                <div className="text-2xl font-bold text-primary">{actionScore}%</div>
              </div>
              <div className={`p-3 rounded-lg ${recommendation.color}`}>
                <recommendation.icon className="h-6 w-6" />
              </div>
            </div>

            {/* Trading Recommendation */}
            <Alert className={`border-2 ${
              recommendation.action === 'STRONG BUY/SELL' ? 'border-green-500/30' :
              recommendation.action === 'CONSIDER ENTRY' ? 'border-blue-500/30' :
              recommendation.action === 'WAIT & WATCH' ? 'border-yellow-500/30' :
              'border-red-500/30'
            }`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendation:</strong> {recommendation.action}
                {report.signal_4h?.direction && report.signal_4h.direction !== 'HOLD' && (
                  <span> - {report.signal_4h.direction} position recommended</span>
                )}
              </AlertDescription>
            </Alert>

            <Separator />

            {/* Key Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Direction</div>
                <div className={`font-bold ${
                  report.signal_4h?.direction === 'LONG' ? 'text-green-600' :
                  report.signal_4h?.direction === 'SHORT' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {report.signal_4h?.direction || 'NEUTRAL'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="font-bold text-primary">
                  {report.signal_4h?.confidence || 0}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground">Risk Level</div>
                <div className={`font-bold ${
                  report.analysis?.sentiment?.risk_level?.toLowerCase().includes('low') ? 'text-green-600' :
                  report.analysis?.sentiment?.risk_level?.toLowerCase().includes('medium') ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {report.analysis?.sentiment?.risk_level?.toUpperCase().replace(/RISK/g, '').trim() || 'UNKNOWN'}
                </div>
              </div>
              
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground">R:R Ratio</div>
                <div className="font-bold text-accent">
                  {report.risk_management?.risk_reward_ratio || 'N/A'}
                </div>
              </div>
            </div>

            {/* Multi-Directional Scenarios */}
            {report.analysis?.multi_directional_signals && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Scenario Analysis</h3>
                <div className="grid grid-cols-3 gap-2">
                  {/* Bullish Scenario */}
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-xs font-medium text-green-700 mb-1">Bullish ({report.analysis.multi_directional_signals.bullish_scenario.probability})</div>
                    <div className="text-xs text-muted-foreground">
                      Target: {report.analysis.multi_directional_signals.bullish_scenario.targets}
                    </div>
                  </div>
                  
                  {/* Neutral Scenario */}
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="text-xs font-medium text-yellow-700 mb-1">Neutral ({report.analysis.multi_directional_signals.neutral_scenario.probability})</div>
                    <div className="text-xs text-muted-foreground">
                      Range: {report.analysis.multi_directional_signals.neutral_scenario.range}
                    </div>
                  </div>
                  
                  {/* Bearish Scenario */}
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="text-xs font-medium text-red-700 mb-1">Bearish ({report.analysis.multi_directional_signals.bearish_scenario.probability})</div>
                    <div className="text-xs text-muted-foreground">
                      Target: {report.analysis.multi_directional_signals.bearish_scenario.targets}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Items */}
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommended Actions
              </h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.signal_4h?.direction === 'LONG' && (
                  <>
                    <li>• Enter long position at ${report.signal_4h.entry.toFixed(2)}</li>
                    <li>• Set stop loss at ${report.signal_4h.stop_loss.toFixed(2)}</li>
                    <li>• Take partial profits at marked TP levels</li>
                  </>
                )}
                {report.signal_4h?.direction === 'SHORT' && (
                  <>
                    <li>• Enter short position at ${report.signal_4h.entry.toFixed(2)}</li>
                    <li>• Set stop loss at ${report.signal_4h.stop_loss.toFixed(2)}</li>
                    <li>• Cover partial position at marked TP levels</li>
                  </>
                )}
                {report.signal_4h?.direction === 'HOLD' && (
                  <>
                    <li>• Wait for clearer market direction</li>
                    <li>• Monitor key support/resistance levels</li>
                    <li>• Consider smaller position sizes</li>
                  </>
                )}
                <li>• Use proper position sizing based on risk tolerance</li>
                <li>• Monitor market conditions for changes</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No summary available. Generate a report to see AI recommendations.
          </div>
        )}
      </CardContent>
    </Card>
  );
};