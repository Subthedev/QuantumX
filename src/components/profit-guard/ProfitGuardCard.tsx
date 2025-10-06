import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, TrendingUp, AlertCircle, Trash2 } from "lucide-react";
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
  ai_enabled: boolean;
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

  return (
    <>
      <Card className="border-primary/20 hover:border-primary/40 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {position.coin_image && (
                <img src={position.coin_image} alt={position.coin_name} className="h-10 w-10 rounded-full" />
              )}
              <div>
                <CardTitle className="text-xl">{position.coin_symbol}</CardTitle>
                <p className="text-sm text-muted-foreground">{position.coin_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {position.ai_enabled ? (
                <Badge variant="outline" className="border-primary">
                  <Zap className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Target className="h-3 w-3 mr-1" />
                  Manual
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Position */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Entry Price</p>
              <p className="text-lg font-semibold">${position.entry_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-lg font-semibold">${position.current_price.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="text-lg font-semibold">{position.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Position Value</p>
              <p className="text-lg font-semibold">${positionValue.toLocaleString()}</p>
            </div>
          </div>

          {/* Profit Display */}
          <div className="p-4 rounded-lg bg-accent/50 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Profit</span>
              <div className="text-right">
                <div className={`text-lg font-bold ${currentProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {currentProfit >= 0 ? "+" : ""}{currentProfit.toFixed(2)}%
                </div>
                <div className={`text-sm ${profitUsd >= 0 ? "text-success" : "text-destructive"}`}>
                  {profitUsd >= 0 ? "+" : ""}${profitUsd.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Next Target */}
          {nextTarget && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next Target</span>
                <span className="font-medium">+{nextTarget.percentage}%</span>
              </div>
              <Progress
                value={Math.min((currentProfit / nextTarget.percentage) * 100, 100)}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>${nextTarget.target_price.toLocaleString()}</span>
                <span>Sell {nextTarget.quantity_to_sell}%</span>
              </div>
            </div>
          )}

          {/* Profit Levels Summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                {triggeredCount} of {position.profit_levels.length} targets hit
              </span>
            </div>
            {currentProfit < 0 && (
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Below Entry
              </Badge>
            )}
          </div>

          {/* All Profit Levels */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Profit Targets</p>
            <div className="grid grid-cols-2 gap-2">
              {position.profit_levels.map((level, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border text-sm ${
                    level.triggered
                      ? "bg-success/10 border-success/30"
                      : currentProfit >= level.percentage
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted border-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">+{level.percentage}%</span>
                    {level.triggered && <Badge variant="outline" className="text-xs">Hit</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${level.target_price.toLocaleString()} • Sell {level.quantity_to_sell}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profit Guard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this profit guard position? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(position.id)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
