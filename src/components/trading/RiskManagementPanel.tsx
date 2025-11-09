/**
 * Risk Management Panel
 * Advanced risk management tools to help traders preserve capital
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { riskAwarePositionSizer, RiskProfile } from "@/services/igx/RiskAwarePositionSizer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RiskManagementPanelProps {
  accountBalance: number;
  currentPrice: number;
  symbol: string;
  openPositionsCount: number;
  onPositionSizeCalculated?: (size: number) => void;
}

export function RiskManagementPanel({
  accountBalance,
  currentPrice,
  symbol,
  openPositionsCount,
  onPositionSizeCalculated
}: RiskManagementPanelProps) {
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('MODERATE');
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState(6);
  const [confidence, setConfidence] = useState(75);
  const [positionSizeRecommendation, setPositionSizeRecommendation] = useState<any>(null);

  useEffect(() => {
    if (currentPrice > 0) {
      calculatePositionSize();
    }
  }, [currentPrice, stopLossPercent, takeProfitPercent, confidence, riskProfile, accountBalance]);

  const calculatePositionSize = () => {
    const stopLoss = currentPrice * (1 - stopLossPercent / 100);
    const target1 = currentPrice * (1 + takeProfitPercent / 100);
    
    const recommendation = riskAwarePositionSizer.calculatePositionSize(
      {
        symbol,
        direction: 'LONG',
        entryPrice: currentPrice,
        stopLoss,
        targets: [target1],
        confidence,
        expectedProfit: takeProfitPercent,
        riskRewardRatio: takeProfitPercent / stopLossPercent,
        volatility: 50
      },
      {
        accountSize: accountBalance,
        riskProfile,
        maxRiskPerTrade: 5,
        currentDrawdown: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        openPositions: openPositionsCount,
        correlatedPositions: 0
      }
    );

    setPositionSizeRecommendation(recommendation);
    onPositionSizeCalculated?.(recommendation.recommendedUSD || 0);
  };

  const riskAmount = positionSizeRecommendation?.riskAmount || 0;
  const potentialProfit = positionSizeRecommendation?.expectedReturn || 0;
  const riskRewardRatio = takeProfitPercent / stopLossPercent;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Risk Management
        </CardTitle>
        <CardDescription>
          Advanced position sizing & capital preservation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Profile */}
        <div className="space-y-2">
          <Label className="text-xs">Risk Profile</Label>
          <Select value={riskProfile} onValueChange={(v) => setRiskProfile(v as RiskProfile)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSERVATIVE">Conservative (1-2%)</SelectItem>
              <SelectItem value="MODERATE">Moderate (2-3%)</SelectItem>
              <SelectItem value="AGGRESSIVE">Aggressive (3-5%)</SelectItem>
              <SelectItem value="VERY_AGGRESSIVE">Very Aggressive (5-8%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stop Loss */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Stop Loss</Label>
            <span className="text-xs text-muted-foreground">{stopLossPercent}%</span>
          </div>
          <Slider
            value={[stopLossPercent]}
            onValueChange={(v) => setStopLossPercent(v[0])}
            min={0.5}
            max={10}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            ${(currentPrice * (1 - stopLossPercent / 100)).toFixed(4)}
          </p>
        </div>

        {/* Take Profit */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Take Profit</Label>
            <span className="text-xs text-muted-foreground">{takeProfitPercent}%</span>
          </div>
          <Slider
            value={[takeProfitPercent]}
            onValueChange={(v) => setTakeProfitPercent(v[0])}
            min={1}
            max={30}
            step={0.5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            ${(currentPrice * (1 + takeProfitPercent / 100)).toFixed(4)}
          </p>
        </div>

        {/* Signal Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Signal Confidence</Label>
            <span className="text-xs text-muted-foreground">{confidence}%</span>
          </div>
          <Slider
            value={[confidence]}
            onValueChange={(v) => setConfidence(v[0])}
            min={50}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Position Size Recommendation */}
        {positionSizeRecommendation && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Recommended Position Size</Label>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-xs text-muted-foreground">Min</p>
                  <p className="text-sm font-mono">${positionSizeRecommendation.minimumUSD}</p>
                </div>
                <div className="bg-primary/10 rounded p-2 border border-primary/20">
                  <p className="text-xs text-primary">Optimal</p>
                  <p className="text-sm font-mono font-semibold">${positionSizeRecommendation.recommendedUSD}</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-xs text-muted-foreground">Max</p>
                  <p className="text-sm font-mono">${positionSizeRecommendation.maximumUSD}</p>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <Label className="text-xs">Risk Amount</Label>
                </div>
                <p className="text-sm font-mono text-destructive">${riskAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{positionSizeRecommendation.riskPercentage}% of account</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <Label className="text-xs">Potential Profit</Label>
                </div>
                <p className="text-sm font-mono text-success">${potentialProfit.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">R:R {riskRewardRatio.toFixed(2)}:1</p>
              </div>
            </div>

            {/* Risk Factors */}
            {positionSizeRecommendation.riskFactors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <Label className="text-xs text-destructive">Risk Warnings</Label>
                    {positionSizeRecommendation.riskFactors.map((factor: string, idx: number) => (
                      <p key={idx} className="text-xs text-muted-foreground">• {factor}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Adjustments */}
            {positionSizeRecommendation.adjustments.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Applied Adjustments:</Label>
                {positionSizeRecommendation.adjustments.map((adj: string, idx: number) => (
                  <p key={idx} className="text-xs text-muted-foreground">• {adj}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={calculatePositionSize}
          className="w-full h-8 text-xs"
          variant="outline"
        >
          Recalculate Position Size
        </Button>
      </CardContent>
    </Card>
  );
}
