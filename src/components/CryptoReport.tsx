import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Bitcoin, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CryptoReportData {
  id: string;
  coin_symbol: string;
  prediction_summary: string;
  confidence_score: number;
  report_data: any;
  created_at: string;
}

interface CryptoReportProps {
  coin: 'BTC' | 'ETH';
  icon: React.ReactNode;
  name: string;
  existingReport?: CryptoReportData;
}

const CryptoReport = ({ coin, icon, name, existingReport }: CryptoReportProps) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CryptoReportData | null>(existingReport || null);
  const { user } = useAuth();

  const generateReport = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if user can generate a report
      const { data: canGenerate, error: checkError } = await supabase
        .rpc('can_generate_report', {
          user_uuid: user.id,
          coin: coin
        });

      if (checkError) {
        throw checkError;
      }

      if (!canGenerate) {
        toast({
          title: "Report limit reached",
          description: "You can only generate one report per coin every 24 hours",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call edge function to generate report
      const { data, error } = await supabase.functions.invoke('generate-crypto-report', {
        body: { coin, userId: user.id }
      });

      if (error) {
        throw error;
      }

      setReport(data);
      toast({
        title: "Report generated!",
        description: `Your ${coin} prediction report is ready`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = () => {
    if (!report?.report_data?.trend) return null;
    return report.report_data.trend === 'bullish' 
      ? <TrendingUp className="h-4 w-4 text-green-600" />
      : <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {name} ({coin})
        </CardTitle>
        <CardDescription>
          AI-powered price prediction and market analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Generate an AI-powered prediction report for {coin}
            </p>
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate {coin} Report
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  className={getConfidenceColor(report.confidence_score)}
                  variant="secondary"
                >
                  {report.confidence_score}% Confidence
                </Badge>
                {getTrendIcon()}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Prediction Summary</h4>
              <p className="text-sm">{report.prediction_summary}</p>
            </div>

            {report.report_data?.key_insights && (
              <div>
                <h4 className="font-semibold mb-2">Key Insights</h4>
                <ul className="text-sm space-y-1">
                  {report.report_data.key_insights.map((insight: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={generateReport} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating New Report...
                </>
              ) : (
                "Generate New Report (24h limit)"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CryptoReport;