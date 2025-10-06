import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Target, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cryptoDataService } from "@/services/cryptoDataService";

interface AddProfitGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProfitLevel {
  percentage: number;
  quantity_to_sell: number;
}

export function AddProfitGuardDialog({ open, onOpenChange, onSuccess }: AddProfitGuardDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [profitLevels, setProfitLevels] = useState<ProfitLevel[]>([
    { percentage: 25, quantity_to_sell: 25 },
    { percentage: 50, quantity_to_sell: 25 },
    { percentage: 100, quantity_to_sell: 50 },
  ]);

  useEffect(() => {
    if (open) {
      fetchTopCoins();
    }
  }, [open]);

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

  const addProfitLevel = () => {
    setProfitLevels([...profitLevels, { percentage: 0, quantity_to_sell: 0 }]);
  };

  const removeProfitLevel = (index: number) => {
    setProfitLevels(profitLevels.filter((_, i) => i !== index));
  };

  const updateProfitLevel = (index: number, field: keyof ProfitLevel, value: number) => {
    const updated = [...profitLevels];
    updated[index][field] = value;
    setProfitLevels(updated);
  };

  const handleSubmit = async () => {
    if (!selectedCoin || !entryPrice || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const entry = parseFloat(entryPrice);
      const formattedLevels = profitLevels.map((level) => ({
        percentage: level.percentage,
        target_price: entry * (1 + level.percentage / 100),
        quantity_to_sell: level.quantity_to_sell,
        triggered: false,
      }));

      const { error } = await supabase.from("profit_guard_positions").insert({
        user_id: user?.id,
        coin_id: selectedCoin.id,
        coin_symbol: selectedCoin.symbol.toUpperCase(),
        coin_name: selectedCoin.name,
        coin_image: selectedCoin.image,
        entry_price: entry,
        current_price: selectedCoin.current_price,
        quantity: parseFloat(quantity),
        ai_enabled: aiEnabled,
        profit_levels: formattedLevels,
        status: "active",
      });

      if (error) throw error;

      // If AI enabled, trigger analysis
      if (aiEnabled) {
        await supabase.functions.invoke("profit-guard-analysis", {
          body: {
            coinId: selectedCoin.id,
            coinSymbol: selectedCoin.symbol,
            entryPrice: entry,
          },
        });
      }

      toast({
        title: "Success",
        description: "Profit guard position added successfully",
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error adding position:", error);
      toast({
        title: "Error",
        description: "Failed to add profit guard position",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCoin(null);
    setEntryPrice("");
    setQuantity("");
    setSearchQuery("");
    setAiEnabled(false);
    setProfitLevels([
      { percentage: 25, quantity_to_sell: 25 },
      { percentage: 50, quantity_to_sell: 25 },
      { percentage: 100, quantity_to_sell: 50 },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Profit Guard Position</DialogTitle>
          <DialogDescription>
            Set up profit protection for your crypto position
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <Card className={aiEnabled ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {aiEnabled ? <Zap className="h-5 w-5 text-primary" /> : <Target className="h-5 w-5" />}
                  <CardTitle className="text-lg">
                    {aiEnabled ? "AI-Powered Mode" : "Manual Mode"}
                  </CardTitle>
                </div>
                <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
              </div>
              <CardDescription>
                {aiEnabled
                  ? "AI will analyze market conditions and recommend optimal profit levels"
                  : "Set custom profit targets manually"}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Coin Selection */}
          <div className="space-y-2">
            <Label>Select Cryptocurrency</Label>
            <Input
              placeholder="Search coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {filteredCoins.slice(0, 10).map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      setSelectedCoin(coin);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors"
                  >
                    <img src={coin.image} alt={coin.name} className="h-8 w-8 rounded-full" />
                    <div className="text-left">
                      <div className="font-semibold">{coin.name}</div>
                      <div className="text-sm text-muted-foreground">{coin.symbol.toUpperCase()}</div>
                    </div>
                    <div className="ml-auto text-sm">${coin.current_price.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedCoin && (
              <div className="flex items-center gap-3 p-3 border rounded-md bg-accent/50">
                <img src={selectedCoin.image} alt={selectedCoin.name} className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <div className="font-semibold">{selectedCoin.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedCoin.symbol.toUpperCase()}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCoin(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entry Price ($)</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Profit Levels */}
          {!aiEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Profit Levels</Label>
                <Button variant="outline" size="sm" onClick={addProfitLevel}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Level
                </Button>
              </div>
              {profitLevels.map((level, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-end gap-4">
                      <div className="flex-1 space-y-2">
                        <Label>Profit %</Label>
                        <Input
                          type="number"
                          value={level.percentage}
                          onChange={(e) => updateProfitLevel(index, "percentage", parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Sell % of Position</Label>
                        <Input
                          type="number"
                          value={level.quantity_to_sell}
                          onChange={(e) => updateProfitLevel(index, "quantity_to_sell", parseFloat(e.target.value))}
                        />
                      </div>
                      {profitLevels.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeProfitLevel(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding..." : "Add Position"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
