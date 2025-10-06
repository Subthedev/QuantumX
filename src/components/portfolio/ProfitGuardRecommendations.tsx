import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  // Find holdings with significant profits (>15%)
  const profitableHoldings = holdings
    .filter((h) => h.profit_loss_percentage && h.profit_loss_percentage > 15)
    .sort((a, b) => (b.profit_loss_percentage || 0) - (a.profit_loss_percentage || 0))
    .slice(0, 3);

  if (profitableHoldings.length === 0) {
    return null;
  }

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
          onClick={() => navigate("/profit-guard")}
          className="w-full mt-4 gap-2"
          variant="default"
        >
          <Shield className="h-4 w-4" />
          Activate AI ProfitGuards
        </Button>
      </CardContent>
    </Card>
  );
}
