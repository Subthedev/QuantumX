import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cryptoDataService } from "@/services/cryptoDataService";

interface AddProfitGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledHolding?: {
    coin_id: string;
    coin_symbol: string;
    coin_name: string;
    coin_image: string;
    purchase_price: number;
    quantity: number;
    current_price?: number;
  };
}

export function AddProfitGuardDialog({ open, onOpenChange, onSuccess, prefilledHolding }: AddProfitGuardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [timeframe, setTimeframe] = useState<"short-term" | "medium-term" | "long-term">("medium-term");
  const [investmentPeriod, setInvestmentPeriod] = useState("30");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTopCoins();
      
      // Pre-fill form if holding data is provided
      if (prefilledHolding) {
        setSelectedCoin({
          id: prefilledHolding.coin_id,
          symbol: prefilledHolding.coin_symbol,
          name: prefilledHolding.coin_name,
          image: prefilledHolding.coin_image,
          current_price: prefilledHolding.current_price || prefilledHolding.purchase_price,
        });
        setEntryPrice(prefilledHolding.purchase_price.toString());
        setQuantity(prefilledHolding.quantity.toString());
      }
    }
  }, [open, prefilledHolding]);

  const fetchTopCoins = async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(100);
      setCoins(data);
    } catch (error) {
      console.error("Error fetching coins:", error);
    }
  };

  const filteredCoins = coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedCoin || !entryPrice || !quantity || !investmentPeriod) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const period = parseInt(investmentPeriod);
    if (period <= 0 || isNaN(period)) {
      toast({
        title: "Invalid Period",
        description: "Investment period must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAnalyzing(true);

    try {
      const entry = parseFloat(entryPrice);

      // Call AI analysis first to get profit levels
      toast({
        title: "Analyzing...",
        description: "IgniteX AI is analyzing market conditions for optimal profit levels",
      });

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "profit-guard-analysis",
        {
          body: {
            coinId: selectedCoin.id,
            coinSymbol: selectedCoin.symbol,
            entryPrice: entry,
            timeframe,
            investmentPeriod: period,
          },
        }
      );

      if (analysisError) throw analysisError;

      setAnalyzing(false);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to add profit guards',
          variant: 'destructive',
        });
        setLoading(false);
        setAnalyzing(false);
        return;
      }

      // Create position with AI-generated profit levels
      const { error } = await supabase.from("profit_guard_positions").insert({
        user_id: user.id,
        coin_id: selectedCoin.id,
        coin_symbol: selectedCoin.symbol.toUpperCase(),
        coin_name: selectedCoin.name,
        coin_image: selectedCoin.image,
        entry_price: entry,
        current_price: selectedCoin.current_price,
        quantity: parseFloat(quantity),
        timeframe,
        investment_period: period,
        profit_levels: analysisData.profit_levels,
        ai_analysis: analysisData.analysis,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `ProfitGuard activated with ${analysisData.profit_levels.length} AI-optimized profit levels`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error adding position:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add profit guard position",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const resetForm = () => {
    setSelectedCoin(null);
    setEntryPrice("");
    setQuantity("");
    setSearchQuery("");
    setTimeframe("medium-term");
    setInvestmentPeriod("30");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <DialogTitle>Add AI-Powered ProfitGuard</DialogTitle>
          </div>
          <DialogDescription>
            IgniteX AI will analyze market conditions and recommend optimal profit levels based on your timeframe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Coin Selection */}
          <div className="space-y-2 relative">
            <Label>Select Cryptocurrency</Label>
            <Input
              placeholder="Search top 100 coins..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full h-11"
            />
            {(showDropdown || searchQuery) && !selectedCoin && filteredCoins.length > 0 && (
              <Card className="absolute z-50 w-full bg-background border shadow-lg mt-1 overflow-hidden">
                <ScrollArea className="h-[min(60vh,400px)]">
                  <div className="p-1.5 space-y-0.5">
                    {filteredCoins.slice(0, 100).map((coin) => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin);
                          setSearchQuery("");
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 hover:bg-accent transition-colors rounded-md text-left"
                      >
                        <img src={coin.image} alt={coin.name} className="h-8 w-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-sm">{coin.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                        </div>
                        <div className="text-sm font-medium flex-shrink-0 tabular-nums">${coin.current_price.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
            {selectedCoin && (
              <Card className="flex items-center gap-3 p-3 bg-primary/5 border-primary/20">
                <img src={selectedCoin.image} alt={selectedCoin.name} className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <div className="font-semibold">{selectedCoin.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCoin.symbol.toUpperCase()} • ${selectedCoin.current_price.toLocaleString()}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCoin(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            )}
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entry Price ($)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="Your buy price"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="Amount held"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* AI Parameters */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Investment Timeframe</Label>
              <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-term">Short-term (Days to 2 weeks)</SelectItem>
                  <SelectItem value="medium-term">Medium-term (Weeks to months)</SelectItem>
                  <SelectItem value="long-term">Long-term (Months+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Investment Period (Days)</Label>
              <Input
                type="number"
                placeholder="e.g., 30"
                value={investmentPeriod}
                onChange={(e) => setInvestmentPeriod(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                How long you plan to hold this position
              </p>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-primary/5 border-primary/20 p-4">
            <div className="flex gap-3">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">AI-Powered Analysis</p>
                <p className="text-xs text-muted-foreground">
                  IgniteX AI will analyze current market conditions, volatility, technical levels, and your timeframe to recommend 3-5 optimal profit-taking levels. This helps you secure profits strategically and avoid the common mistake of holding too long.
                </p>
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing ? "Analyzing..." : loading ? "Creating..." : "Activate ProfitGuard"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
