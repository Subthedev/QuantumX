import { useState } from "react";
import { MobileOptimizedHeader } from "@/components/MobileOptimizedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalculatorIcon, TrendingUp, TrendingDown } from "lucide-react";

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
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8 mt-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CalculatorIcon className="w-10 h-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Trading Calculator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Calculate your potential profit, loss, and risk metrics for spot and futures trades
          </p>
        </div>

        <Tabs defaultValue="spot" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="spot">Spot Trading</TabsTrigger>
            <TabsTrigger value="futures">Futures Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="spot" className="animate-fade-in">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalculatorIcon className="w-5 h-5 text-primary" />
                    Spot Position Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="spot-entry">Entry Price (USD)</Label>
                    <Input
                      id="spot-entry"
                      type="number"
                      placeholder="0.00"
                      value={spotEntry}
                      onChange={(e) => setSpotEntry(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="spot-amount">Amount (Quantity)</Label>
                    <Input
                      id="spot-amount"
                      type="number"
                      placeholder="0.00"
                      value={spotAmount}
                      onChange={(e) => setSpotAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spot-exit">Exit Price (USD) - Optional</Label>
                    <Input
                      id="spot-exit"
                      type="number"
                      placeholder="0.00"
                      value={spotExit}
                      onChange={(e) => setSpotExit(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Calculated Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spotResults ? (
                    <>
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Entry Cost</span>
                        <span className="font-semibold">${spotResults.entryCost.toFixed(2)}</span>
                      </div>

                      {spotResults.exitValue !== null && (
                        <>
                          <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">Exit Value</span>
                            <span className="font-semibold">${spotResults.exitValue.toFixed(2)}</span>
                          </div>

                          <div className={`flex justify-between items-center p-3 rounded-lg ${
                            spotResults.profitLoss! >= 0 
                              ? 'bg-green-500/10 border border-green-500/20' 
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <span className="text-sm font-medium">Profit/Loss</span>
                            <div className="flex items-center gap-2">
                              {spotResults.profitLoss! >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className={`font-bold ${
                                spotResults.profitLoss! >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                ${Math.abs(spotResults.profitLoss!).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className={`flex justify-between items-center p-3 rounded-lg ${
                            spotResults.roi! >= 0 
                              ? 'bg-green-500/10 border border-green-500/20' 
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <span className="text-sm font-medium">ROI</span>
                            <span className={`font-bold ${
                              spotResults.roi! >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {spotResults.roi! >= 0 ? '+' : ''}{spotResults.roi!.toFixed(2)}%
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalculatorIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Enter entry price and amount to calculate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="futures" className="animate-fade-in">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalculatorIcon className="w-5 h-5 text-primary" />
                    Futures Position Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="position-type">Position Type</Label>
                    <Select value={positionType} onValueChange={(value: "long" | "short") => setPositionType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long (Buy)</SelectItem>
                        <SelectItem value="short">Short (Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="futures-entry">Entry Price (USD)</Label>
                    <Input
                      id="futures-entry"
                      type="number"
                      placeholder="0.00"
                      value={futuresEntry}
                      onChange={(e) => setFuturesEntry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="futures-size">Position Size (USD)</Label>
                    <Input
                      id="futures-size"
                      type="number"
                      placeholder="0.00"
                      value={futuresSize}
                      onChange={(e) => setFuturesSize(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leverage">Leverage</Label>
                    <Select value={leverage} onValueChange={setLeverage}>
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="futures-exit">Exit Price (USD) - Optional</Label>
                    <Input
                      id="futures-exit"
                      type="number"
                      placeholder="0.00"
                      value={futuresExit}
                      onChange={(e) => setFuturesExit(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle>Calculated Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {futuresResults ? (
                    <>
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Position Value</span>
                        <span className="font-semibold">${futuresResults.positionValue.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Required Margin</span>
                        <span className="font-semibold">${futuresResults.margin.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <span className="text-sm font-medium">Liquidation Price</span>
                        <span className="font-bold text-orange-500">
                          ${futuresResults.liquidationPrice.toFixed(2)}
                        </span>
                      </div>

                      {futuresResults.profitLoss !== null && (
                        <>
                          <div className={`flex justify-between items-center p-3 rounded-lg ${
                            futuresResults.profitLoss >= 0 
                              ? 'bg-green-500/10 border border-green-500/20' 
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <span className="text-sm font-medium">Profit/Loss</span>
                            <div className="flex items-center gap-2">
                              {futuresResults.profitLoss >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className={`font-bold ${
                                futuresResults.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                ${Math.abs(futuresResults.profitLoss).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className={`flex justify-between items-center p-3 rounded-lg ${
                            futuresResults.pnlPercentage! >= 0 
                              ? 'bg-green-500/10 border border-green-500/20' 
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <span className="text-sm font-medium">PnL %</span>
                            <span className={`font-bold ${
                              futuresResults.pnlPercentage! >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {futuresResults.pnlPercentage! >= 0 ? '+' : ''}{futuresResults.pnlPercentage!.toFixed(2)}%
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalculatorIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Enter position details to calculate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 IgniteX AI. Trading calculator for educational purposes.</p>
        </div>
      </footer>
    </div>
  );
}
