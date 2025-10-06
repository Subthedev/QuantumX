import { useState } from "react";
import { MobileOptimizedHeader } from "@/components/MobileOptimizedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalculatorIcon } from "lucide-react";

export default function Calculator() {
  // Spot Calculator State
  const [spotEntry, setSpotEntry] = useState("");
  const [spotExit, setSpotExit] = useState("");
  const [spotAmount, setSpotAmount] = useState("");

  // Futures Calculator State
  const [futuresEntry, setFuturesEntry] = useState("");
  const [futuresExit, setFuturesExit] = useState("");
  const [futuresSize, setFuturesSize] = useState("");
  const [leverage, setLeverage] = useState("10");
  const [positionType, setPositionType] = useState<"long" | "short">("long");

  // Spot Calculations
  const calculateSpot = () => {
    const entry = parseFloat(spotEntry);
    const exit = parseFloat(spotExit);
    const amount = parseFloat(spotAmount);

    if (!entry || !amount) return null;

    const entryCost = entry * amount;
    const exitValue = exit ? exit * amount : 0;
    const profitLoss = exit ? exitValue - entryCost : 0;
    const roi = exit ? ((profitLoss / entryCost) * 100) : 0;

    return {
      entryCost,
      exitValue: exit ? exitValue : null,
      profitLoss: exit ? profitLoss : null,
      roi: exit ? roi : null,
    };
  };

  // Futures Calculations
  const calculateFutures = () => {
    const entry = parseFloat(futuresEntry);
    const exit = parseFloat(futuresExit);
    const size = parseFloat(futuresSize);
    const lev = parseFloat(leverage);

    if (!entry || !size || !lev) return null;

    const positionValue = size;
    const margin = positionValue / lev;
    
    let profitLoss = 0;
    let pnlPercentage = 0;
    let liquidationPrice = 0;

    if (exit) {
      const priceChange = exit - entry;
      const priceChangePercent = (priceChange / entry) * 100;
      
      if (positionType === "long") {
        profitLoss = (priceChangePercent / 100) * positionValue;
        liquidationPrice = entry * (1 - (1 / lev) * 0.9); // 90% of margin
      } else {
        profitLoss = -(priceChangePercent / 100) * positionValue;
        liquidationPrice = entry * (1 + (1 / lev) * 0.9);
      }
      
      pnlPercentage = (profitLoss / margin) * 100;
    } else {
      if (positionType === "long") {
        liquidationPrice = entry * (1 - (1 / lev) * 0.9);
      } else {
        liquidationPrice = entry * (1 + (1 / lev) * 0.9);
      }
    }

    return {
      positionValue,
      margin,
      profitLoss: exit ? profitLoss : null,
      pnlPercentage: exit ? pnlPercentage : null,
      liquidationPrice,
    };
  };

  const spotResults = calculateSpot();
  const futuresResults = calculateFutures();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileOptimizedHeader />
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-4 mt-16">
        <div className="text-center mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CalculatorIcon className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-1 leading-tight">
              Trading Calculator
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Calculate profit, loss, and risk metrics for your trades
          </p>
        </div>

        <Tabs defaultValue="spot" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
            <TabsTrigger value="spot" className="text-sm">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="text-sm">Futures</TabsTrigger>
          </TabsList>

          <TabsContent value="spot" className="animate-fade-in">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Position Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="spot-entry" className="text-xs">Entry Price ($)</Label>
                    <Input
                      id="spot-entry"
                      type="number"
                      placeholder="0.00"
                      value={spotEntry}
                      onChange={(e) => setSpotEntry(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="spot-amount" className="text-xs">Amount</Label>
                    <Input
                      id="spot-amount"
                      type="number"
                      placeholder="0.00"
                      value={spotAmount}
                      onChange={(e) => setSpotAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="spot-exit" className="text-xs">Exit Price ($)</Label>
                    <Input
                      id="spot-exit"
                      type="number"
                      placeholder="Optional"
                      value={spotExit}
                      onChange={(e) => setSpotExit(e.target.value)}
                    />
                  </div>
                </div>

                {spotResults ? (
                  <div className="border-t pt-3">
                    <h3 className="text-sm font-semibold mb-2">Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-xs text-muted-foreground">Entry Cost</p>
                        <p className="text-sm font-bold">${spotResults.entryCost.toFixed(2)}</p>
                      </div>

                      {spotResults.exitValue !== null && (
                        <>
                          <div className="p-2 bg-background/50 rounded">
                            <p className="text-xs text-muted-foreground">Exit Value</p>
                            <p className="text-sm font-bold">${spotResults.exitValue.toFixed(2)}</p>
                          </div>

                          <div className={`p-2 rounded ${
                            spotResults.profitLoss! >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <p className="text-xs text-muted-foreground">Profit/Loss</p>
                            <p className={`text-sm font-bold ${
                              spotResults.profitLoss! >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              ${Math.abs(spotResults.profitLoss!).toFixed(2)}
                            </p>
                          </div>

                          <div className={`p-2 rounded ${
                            spotResults.roi! >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <p className="text-xs text-muted-foreground">ROI</p>
                            <p className={`text-sm font-bold ${
                              spotResults.roi! >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {spotResults.roi! >= 0 ? '+' : ''}{spotResults.roi!.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border-t">
                    <p className="text-xs">Enter entry price and amount to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="futures" className="animate-fade-in">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Position Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="position-type" className="text-xs">Type</Label>
                    <Select value={positionType} onValueChange={(value: "long" | "short") => setPositionType(value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="leverage" className="text-xs">Leverage</Label>
                    <Select value={leverage} onValueChange={setLeverage}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 5, 10, 20, 25, 50, 75, 100, 125].map((lev) => (
                          <SelectItem key={lev} value={lev.toString()}>
                            {lev}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="futures-entry" className="text-xs">Entry Price ($)</Label>
                    <Input
                      id="futures-entry"
                      type="number"
                      placeholder="0.00"
                      value={futuresEntry}
                      onChange={(e) => setFuturesEntry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="futures-size" className="text-xs">Position Size ($)</Label>
                    <Input
                      id="futures-size"
                      type="number"
                      placeholder="0.00"
                      value={futuresSize}
                      onChange={(e) => setFuturesSize(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="futures-exit" className="text-xs">Exit Price ($)</Label>
                    <Input
                      id="futures-exit"
                      type="number"
                      placeholder="Optional"
                      value={futuresExit}
                      onChange={(e) => setFuturesExit(e.target.value)}
                    />
                  </div>
                </div>

                {futuresResults ? (
                  <div className="border-t pt-3">
                    <h3 className="text-sm font-semibold mb-2">Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-xs text-muted-foreground">Position Value</p>
                        <p className="text-sm font-bold">${futuresResults.positionValue.toFixed(2)}</p>
                      </div>

                      <div className="p-2 bg-background/50 rounded">
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className="text-sm font-bold">${futuresResults.margin.toFixed(2)}</p>
                      </div>

                      <div className="p-2 bg-orange-500/10 rounded">
                        <p className="text-xs text-muted-foreground">Liquidation</p>
                        <p className="text-sm font-bold text-orange-500">
                          ${futuresResults.liquidationPrice.toFixed(2)}
                        </p>
                      </div>

                      {futuresResults.profitLoss !== null && (
                        <>
                          <div className={`p-2 rounded ${
                            futuresResults.profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <p className="text-xs text-muted-foreground">Profit/Loss</p>
                            <p className={`text-sm font-bold ${
                              futuresResults.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              ${Math.abs(futuresResults.profitLoss).toFixed(2)}
                            </p>
                          </div>

                          <div className={`p-2 rounded col-span-2 ${
                            futuresResults.pnlPercentage! >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <p className="text-xs text-muted-foreground">PnL Percentage</p>
                            <p className={`text-sm font-bold ${
                              futuresResults.pnlPercentage! >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {futuresResults.pnlPercentage! >= 0 ? '+' : ''}{futuresResults.pnlPercentage!.toFixed(2)}%
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border-t">
                    <p className="text-xs">Enter position details to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-4 mt-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© 2025 IgniteX. For educational purposes only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
