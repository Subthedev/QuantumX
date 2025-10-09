import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Holding {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  profit_loss_percentage?: number;
}

interface ProfitGuardRecommendationsProps {
  holdings: Holding[];
}

export function ProfitGuardRecommendations({ holdings }: ProfitGuardRecommendationsProps) {
  const navigate = useNavigate();
  const [isActivating, setIsActivating] = useState(false);

  // Find holdings with significant profits (>15%)
  const profitableHoldings = holdings
    .filter((h) => h.profit_loss_percentage && h.profit_loss_percentage > 15)
    .sort((a, b) => (b.profit_loss_percentage || 0) - (a.profit_loss_percentage || 0))
    .slice(0, 3);

  if (profitableHoldings.length === 0) {
    return null;
  }

  const handleActivateAll = async () => {
    setIsActivating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      toast({
        title: "Activating ProfitGuards",
        description: `Creating ${profitableHoldings.length} AI-powered profit guards...`,
      });

      // Create profit guards for each holding
      for (const holding of profitableHoldings) {
        try {
          // Call AI analysis
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
            "profit-guard-analysis",
            {
              body: {
                coinId: holding.coin_id,
                coinSymbol: holding.coin_symbol,
                entryPrice: holding.purchase_price,
                timeframe: "medium-term",
                investmentPeriod: 30,
              },
            }
          );

          if (analysisError) throw analysisError;

          // Temporary placeholder user_id until authentication is re-implemented
          const placeholderUserId = '00000000-0000-0000-0000-000000000000';

          // Create position
          const { error: insertError } = await supabase.from("profit_guard_positions").insert({
            user_id: placeholderUserId,
            coin_id: holding.coin_id,
            coin_symbol: holding.coin_symbol.toUpperCase(),
            coin_name: holding.coin_name,
            coin_image: holding.coin_image,
            entry_price: holding.purchase_price,
            current_price: holding.current_price || holding.purchase_price,
            quantity: holding.quantity,
            timeframe: "medium-term",
            investment_period: 30,
            profit_levels: analysisData.profit_levels,
            ai_analysis: analysisData.analysis,
            status: "active",
          });

          if (insertError) throw insertError;
          successCount++;
        } catch (error) {
          console.error(`Error creating guard for ${holding.coin_symbol}:`, error);
          failCount++;
        }
      }

      // Show final result
      if (successCount > 0) {
        toast({
          title: "ProfitGuards Activated! 🛡️",
          description: `Successfully created ${successCount} AI-powered profit guard${successCount > 1 ? 's' : ''}${failCount > 0 ? `. ${failCount} failed.` : ''}`,
        });
        
        // Navigate to profit guard page after short delay
        setTimeout(() => {
          navigate("/profit-guard");
        }, 1500);
      } else {
        toast({
          title: "Activation Failed",
          description: "Could not create any profit guards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error activating guards:", error);
      toast({
        title: "Error",
        description: "Failed to activate profit guards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ProfitGuard Recommendations</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/profit-guard")}
            className="gap-2"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Let IgniteX AI analyze these positions and recommend optimal profit-taking levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {profitableHoldings.map((holding) => (
            <div
              key={holding.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={holding.coin_image}
                  alt={holding.coin_name}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <div className="font-semibold">{holding.coin_symbol}</div>
                  <div className="text-sm text-muted-foreground">{holding.coin_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-bold text-success">
                    +{holding.profit_loss_percentage?.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Entry: ${holding.purchase_price.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs">
            <span className="font-semibold">AI-Powered Protection:</span> IgniteX AI analyzes market conditions, volatility, and momentum to recommend strategic profit levels. Avoid the #1 mistake: losing gains to greed.
          </p>
        </div>
        <Button
          onClick={handleActivateAll}
          className="w-full mt-4 gap-2"
          variant="default"
          disabled={isActivating}
        >
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Activating {profitableHoldings.length} Guard{profitableHoldings.length > 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Activate AI ProfitGuards ({profitableHoldings.length})
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
