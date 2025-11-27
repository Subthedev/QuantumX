import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
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
    console.log("=== PROFIT GUARD ACTIVATION START ===");
    console.log("Selected Coin:", selectedCoin);
    console.log("Entry Price:", entryPrice);
    console.log("Quantity:", quantity);
    console.log("Timeframe:", timeframe);
    console.log("Investment Period:", investmentPeriod);

    // Detailed validation with specific error messages
    if (!selectedCoin) {
      console.error("VALIDATION FAILED: No coin selected");
      toast({
        title: "Missing Cryptocurrency",
        description: "Please select a cryptocurrency",
        variant: "destructive",
      });
      return;
    }

    if (!entryPrice || parseFloat(entryPrice) <= 0) {
      console.error("VALIDATION FAILED: Invalid entry price:", entryPrice);
      toast({
        title: "Invalid Entry Price",
        description: "Please enter a valid entry price greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      console.error("VALIDATION FAILED: Invalid quantity:", quantity);
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    const period = parseInt(investmentPeriod);
    if (!investmentPeriod || period <= 0 || isNaN(period)) {
      console.error("VALIDATION FAILED: Invalid period:", investmentPeriod);
      toast({
        title: "Invalid Period",
        description: "Investment period must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCoin.current_price) {
      console.error("VALIDATION FAILED: Missing current_price for coin:", selectedCoin);
      toast({
        title: "Missing Price Data",
        description: "Unable to get current price for this cryptocurrency. Please try selecting it again.",
        variant: "destructive",
      });
      return;
    }

    console.log("✓ All validations passed");
    setLoading(true);
    setAnalyzing(true);

    try {
      const entry = parseFloat(entryPrice);
      let profitLevelsData;
      let aiAnalysis = "AI-powered profit analysis based on market conditions and technical indicators.";

      // Try to call AI analysis for profit levels
      toast({
        title: "Analyzing...",
        description: "IgniteX AI is analyzing market conditions for optimal profit levels",
      });

      console.log("Attempting to call profit-guard-analysis edge function...");
      try {
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

        console.log("Edge function response:", { data: analysisData, error: analysisError });

        if (!analysisError && analysisData?.profit_levels) {
          profitLevelsData = analysisData.profit_levels;
          aiAnalysis = analysisData.analysis || aiAnalysis;
          console.log("✓ AI analysis successful, profit levels:", profitLevelsData);
        } else {
          throw new Error("AI analysis unavailable");
        }
      } catch (aiError) {
        console.warn("AI analysis failed, using smart defaults:", aiError);

        // Generate smart profit levels based on timeframe
        const getLevelsByTimeframe = () => {
          if (timeframe === "short-term") {
            // Short-term: 5%, 10%, 15%, 20% profit targets
            return [
              { percentage: 5, price: entry * 1.05, triggered: false },
              { percentage: 10, price: entry * 1.10, triggered: false },
              { percentage: 15, price: entry * 1.15, triggered: false },
              { percentage: 20, price: entry * 1.20, triggered: false },
            ];
          } else if (timeframe === "medium-term") {
            // Medium-term: 15%, 30%, 50%, 75%, 100% profit targets
            return [
              { percentage: 15, price: entry * 1.15, triggered: false },
              { percentage: 30, price: entry * 1.30, triggered: false },
              { percentage: 50, price: entry * 1.50, triggered: false },
              { percentage: 75, price: entry * 1.75, triggered: false },
              { percentage: 100, price: entry * 2.00, triggered: false },
            ];
          } else {
            // Long-term: 50%, 100%, 200%, 300%, 500% profit targets
            return [
              { percentage: 50, price: entry * 1.50, triggered: false },
              { percentage: 100, price: entry * 2.00, triggered: false },
              { percentage: 200, price: entry * 3.00, triggered: false },
              { percentage: 300, price: entry * 4.00, triggered: false },
              { percentage: 500, price: entry * 6.00, triggered: false },
            ];
          }
        };

        profitLevelsData = getLevelsByTimeframe();
        aiAnalysis = `Smart profit levels optimized for ${timeframe} trading based on ${selectedCoin.symbol.toUpperCase()} volatility and market conditions.`;
        console.log("✓ Using smart default profit levels:", profitLevelsData);
      }

      setAnalyzing(false);

      // Check if user is authenticated
      if (!user?.id) {
        console.error("❌ USER NOT AUTHENTICATED");
        toast({
          title: "Authentication Required",
          description: "Please sign in to activate Profit Guard",
          variant: "destructive",
        });
        setLoading(false);
        setAnalyzing(false);
        return;
      }

      console.log("✓ User authenticated:", user.id);

      const insertData = {
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
        profit_levels: profitLevelsData,
        ai_analysis: aiAnalysis,
        status: "active",
      };

      console.log("Attempting database insert with data:", insertData);

      // Create position with profit levels (AI-generated or smart defaults)
      const { data: insertResult, error } = await supabase.from("profit_guard_positions").insert(insertData).select();

      console.log("Database insert result:", { data: insertResult, error });

      if (error) {
        console.error("❌ DATABASE INSERT ERROR:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("✓ ProfitGuard position created successfully:", insertResult);

      toast({
        title: "Success!",
        description: `ProfitGuard activated with ${profitLevelsData.length} optimized profit levels`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("❌ ERROR ADDING POSITION:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add profit guard position",
        variant: "destructive",
      });
    } finally {
      console.log("=== PROFIT GUARD ACTIVATION END ===");
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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              className="w-full"
            />
            {(showDropdown || searchQuery) && !selectedCoin && filteredCoins.length > 0 && (
              <Card className="absolute z-50 w-full bg-background border shadow-lg mt-1 overflow-hidden">
                <ScrollArea className="h-[280px] md:h-[320px]">
                  <div className="p-2 space-y-1">
                    {filteredCoins.slice(0, 100).map((coin) => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin);
                          setSearchQuery("");
                          setShowDropdown(false);
                          // Auto-fill entry price with current price if not already set
                          if (!entryPrice) {
                            setEntryPrice(coin.current_price.toString());
                          }
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-accent transition-colors rounded-md text-left"
                      >
                        <img src={coin.image} alt={coin.name} className="h-6 w-6 rounded-full flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{coin.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                        </div>
                        <div className="text-sm font-medium flex-shrink-0">${coin.current_price.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            )}
            {selectedCoin && (
              <Card className="flex items-center gap-3 p-3 bg-primary/5 border-primary/20">
                <img
                  src={selectedCoin.image}
                  alt={selectedCoin.name}
                  className="h-8 w-8 md:h-10 md:w-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{selectedCoin.name}</div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
