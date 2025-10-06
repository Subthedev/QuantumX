import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Zap, TrendingUp, AlertCircle, Trash2, ChevronDown, Clock, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfitLevel {
  percentage: number;
  target_price: number;
  quantity_to_sell: number;
  reasoning?: string;
  triggered: boolean;
}

interface ProfitGuardPosition {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
  entry_price: number;
  current_price: number;
  quantity: number;
  timeframe: string;
  investment_period: number;
  ai_analysis: string | null;
  profit_levels: ProfitLevel[];
  status: string;
  created_at: string;
}

interface ProfitGuardCardProps {
  position: ProfitGuardPosition;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function ProfitGuardCard({ position, onDelete }: ProfitGuardCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const currentProfit = ((position.current_price - position.entry_price) / position.entry_price) * 100;
  const positionValue = position.quantity * position.current_price;
  const totalInvested = position.quantity * position.entry_price;
  const profitUsd = positionValue - totalInvested;

  const getNextTarget = () => {
    const untriggered = position.profit_levels.filter((l) => !l.triggered);
    return untriggered.length > 0 ? untriggered[0] : null;
  };

  const nextTarget = getNextTarget();
  const triggeredCount = position.profit_levels.filter((l) => l.triggered).length;

  const timeframeLabels = {
    "short-term": "Short-term",
    "medium-term": "Medium-term",
    "long-term": "Long-term"
  };

  return (
    <>
      <Card className="border-primary/20 hover:border-primary/40 transition-all">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {position.coin_image && (
                <img src={position.coin_image} alt={position.coin_name} className="h-12 w-12 rounded-full" />
              )}
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {position.coin_symbol}
                  <Badge variant="outline" className="border-primary text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{position.coin_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeframeLabels[position.timeframe as keyof typeof timeframeLabels]}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {position.investment_period} days
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Profit Display - Prominent */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Profit</p>
                <div className={`text-2xl font-bold ${currentProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {currentProfit >= 0 ? "+" : ""}{currentProfit.toFixed(2)}%
                </div>
                <div className={`text-sm ${profitUsd >= 0 ? "text-success" : "text-destructive"}`}>
                  {profitUsd >= 0 ? "+" : ""}${profitUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Position Value</p>
                <p className="text-lg font-semibold">${positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Next Target Progress */}
          {nextTarget && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Next Target: +{nextTarget.percentage}%
                </span>
                <span className="text-muted-foreground">Sell {nextTarget.quantity_to_sell}%</span>
              </div>
              <Progress
                value={Math.min((currentProfit / nextTarget.percentage) * 100, 100)}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>${nextTarget.target_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span>{((currentProfit / nextTarget.percentage) * 100).toFixed(0)}% of target</span>
              </div>
            </div>
          )}

          {/* Progress Summary */}
          <div className="flex items-center justify-between py-2 border-t border-b">
            <div className="text-sm">
              <span className="text-muted-foreground">Targets Hit: </span>
              <span className="font-semibold">{triggeredCount} / {position.profit_levels.length}</span>
            </div>
            {currentProfit < 0 && (
              <Badge variant="outline" className="border-destructive/50 text-destructive text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Below Entry
              </Badge>
            )}
          </div>

          {/* All Profit Levels - Compact Grid */}
          <div className="space-y-2">
            <p className="text-sm font-medium">AI-Optimized Profit Levels</p>
            <div className="space-y-2">
              {position.profit_levels.map((level, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all ${
                    level.triggered
                      ? "bg-success/10 border-success/30"
                      : currentProfit >= level.percentage
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">+{level.percentage}%</span>
                      <span className="text-xs text-muted-foreground">
                        ${level.target_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Sell {level.quantity_to_sell}%
                      </Badge>
                      {level.triggered && (
                        <Badge variant="outline" className="text-xs bg-success/20 border-success">
                          Hit
                        </Badge>
                      )}
                    </div>
                  </div>
                  {level.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1">{level.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Collapsible */}
          {position.ai_analysis && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" size="sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    View AI Analysis
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs leading-relaxed">{position.ai_analysis}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Position Details Collapsible */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-8 text-xs">
                Position Details
                <ChevronDown className="h-3 w-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Entry Price</p>
                  <p className="font-medium">${position.entry_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Price</p>
                  <p className="font-medium">${position.current_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{position.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invested</p>
                  <p className="font-medium">${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove ProfitGuard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this ProfitGuard position? You'll lose all AI analysis and profit level tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(position.id)} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
