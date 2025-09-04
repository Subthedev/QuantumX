import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, AlertCircle, ChartBar, DollarSign, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalysisResult {
  symbol: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
  keyPoints: string[];
  technicalIndicators: {
    rsi: number;
    macd: string;
    support: number;
    resistance: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
}

const AIAnalysisDashboard: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeCrypto = async (symbol: string) => {
    setLoading(symbol);
    setError(null);
    
    try {
      // Placeholder for analysis logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result for demonstration
      const mockResult: AnalysisResult = {
        symbol,
        signal: symbol === 'BTC' ? 'bullish' : 'bearish',
        confidence: symbol === 'BTC' ? 78 : 65,
        summary: `${symbol} is showing ${symbol === 'BTC' ? 'strong bullish momentum' : 'bearish pressure'} with key support levels holding.`,
        keyPoints: [
          "Technical indicators align for potential breakout",
          "Volume confirms trend direction",
          "Risk/reward ratio favorable for entry"
        ],
        technicalIndicators: {
          rsi: symbol === 'BTC' ? 62 : 38,
          macd: symbol === 'BTC' ? 'Bullish Cross' : 'Bearish Divergence',
          support: symbol === 'BTC' ? 92500 : 3200,
          resistance: symbol === 'BTC' ? 98000 : 3450
        },
        riskLevel: symbol === 'BTC' ? 'medium' : 'high'
      };
      
      setAnalysisResults(mockResult);
    } catch (err) {
      setError('Failed to analyze. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getSignalColor = (signal: string) => {
    switch(signal) {
      case 'bullish': return 'text-green-600 bg-green-50';
      case 'bearish': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Your AI-Powered Analysis Dashboard
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Professional Crypto Trading Signals & Analysis
        </p>
      </div>

      {/* Analysis Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-primary-light/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-primary" />
            Quick Analysis
          </CardTitle>
          <CardDescription>
            Select a cryptocurrency to receive instant AI-powered trading signals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => handleAnalyzeCrypto('BTC')}
              disabled={loading !== null}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow"
            >
              {loading === 'BTC' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Analyze BTC
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={() => handleAnalyzeCrypto('ETH')}
              disabled={loading !== null}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-hover hover:to-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:shadow-glow"
            >
              {loading === 'ETH' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Analyze ETH
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResults && !loading && (
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-primary-glow" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {analysisResults.symbol} Analysis Results
              </CardTitle>
              <Badge className={`px-4 py-1 text-sm font-semibold ${getSignalColor(analysisResults.signal)}`}>
                {analysisResults.signal.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-light/20 to-transparent rounded-lg">
              <span className="font-medium">AI Confidence Score</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                    style={{ width: `${analysisResults.confidence}%` }}
                  />
                </div>
                <span className="font-bold text-primary">{analysisResults.confidence}%</span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Market Summary
              </h3>
              <p className="text-muted-foreground">{analysisResults.summary}</p>
            </div>

            {/* Key Points */}
            <div>
              <h3 className="font-semibold mb-3">Key Trading Points</h3>
              <div className="space-y-2">
                {analysisResults.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">RSI</div>
                <div className="text-xl font-bold">{analysisResults.technicalIndicators.rsi}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">MACD</div>
                <div className="text-sm font-semibold">{analysisResults.technicalIndicators.macd}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Support</div>
                <div className="text-xl font-bold">${analysisResults.technicalIndicators.support.toLocaleString()}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Resistance</div>
                <div className="text-xl font-bold">${analysisResults.technicalIndicators.resistance.toLocaleString()}</div>
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="font-medium">Risk Level</span>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getRiskColor(analysisResults.riskLevel)}`} />
                <span className="font-semibold capitalize">{analysisResults.riskLevel}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!analysisResults && !loading && !error && (
        <Card className="border-dashed border-2 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 rounded-full bg-primary-light mb-4">
              <ChartBar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Select a cryptocurrency above to receive instant AI-powered trading signals and analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAnalysisDashboard;