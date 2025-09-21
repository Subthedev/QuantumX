import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart, Sparkles, Eye } from 'lucide-react';
import { cryptoDataService, CryptoData } from '@/services/cryptoDataService';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import CryptoDetailsModal from './CryptoDetailsModal';
import CryptoReport from './CryptoReport';
import { toast } from 'sonner';

interface CryptoTableProps {
  onGenerateReport?: (coin: CryptoData) => void;
}

const CryptoTable: React.FC<CryptoTableProps> = ({ onGenerateReport }) => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedCoinForAnalysis, setSelectedCoinForAnalysis] = useState<CryptoData | null>(null);

  useEffect(() => {
    loadCryptoData();
    const interval = setInterval(loadCryptoData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadCryptoData = async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(50);
      setCryptos(data);
    } catch (error) {
      toast.error('Failed to load cryptocurrency data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIAnalysis = (crypto: CryptoData) => {
    setSelectedCoinForAnalysis(crypto);
    setShowAIAnalysis(true);
  };

  const handleViewDetails = (crypto: CryptoData) => {
    setSelectedCrypto(crypto);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center p-4 border-b">
            <Skeleton className="w-10 h-5 mr-4" />
            <Skeleton className="h-10 w-10 rounded-full mr-3" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-5 w-24 ml-4" />
            <Skeleton className="h-5 w-16 ml-4" />
            <Skeleton className="h-5 w-16 ml-4" />
            <Skeleton className="h-5 w-28 ml-4" />
            <Skeleton className="h-5 w-24 ml-4" />
            <Skeleton className="h-10 w-24 ml-4" />
            <Skeleton className="h-8 w-24 ml-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b sticky top-0 z-10">
              <tr className="text-xs font-medium text-muted-foreground">
                <th className="text-center p-3 w-12">#</th>
                <th className="text-left p-3 min-w-[200px]">Name</th>
                <th className="text-right p-3 min-w-[100px]">Price</th>
                <th className="text-right p-3 min-w-[80px]">24h %</th>
                <th className="text-right p-3 min-w-[80px] hidden lg:table-cell">7d %</th>
                <th className="text-right p-3 min-w-[120px] hidden md:table-cell">Market Cap</th>
                <th className="text-right p-3 min-w-[120px] hidden xl:table-cell">Volume(24h)</th>
                <th className="text-center p-3 min-w-[140px] hidden 2xl:table-cell">Last 7 Days</th>
                <th className="text-center p-3 min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {cryptos.map((crypto) => (
                <tr 
                  key={crypto.id} 
                  className="hover:bg-muted/20 transition-colors group"
                >
                  <td className="p-3 text-center">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {crypto.market_cap_rank}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={crypto.image} 
                        alt={crypto.name} 
                        className="w-10 h-10 rounded-full"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{crypto.name}</div>
                        <div className="text-xs text-muted-foreground uppercase">{crypto.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold text-sm">
                      ${crypto.current_price.toLocaleString(undefined, { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: crypto.current_price < 1 ? 6 : 2
                      })}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className={cn(
                      "flex items-center justify-end gap-1 text-sm font-semibold",
                      crypto.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right hidden lg:table-cell">
                    <div className={cn(
                      "flex items-center justify-end gap-1 text-sm font-semibold",
                      (crypto.price_change_percentage_7d_in_currency || 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {(crypto.price_change_percentage_7d_in_currency || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {Math.abs(crypto.price_change_percentage_7d_in_currency || 0).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <span className="text-sm font-medium">
                      ${cryptoDataService.formatNumber(crypto.market_cap)}
                    </span>
                  </td>
                  <td className="p-3 text-right hidden xl:table-cell">
                    <span className="text-sm text-muted-foreground">
                      ${cryptoDataService.formatNumber(crypto.total_volume)}
                    </span>
                  </td>
                  <td className="p-3 hidden 2xl:table-cell">
                    <SparklineChart data={crypto.sparkline_in_7d?.price || []} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(crypto)}
                        className="h-8 w-8 p-0 hover:bg-muted"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateAIAnalysis(crypto)}
                        className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>Cryptocurrency Details</DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="sr-only">
            Detailed information about {selectedCrypto?.name}
          </DialogDescription>
          {selectedCrypto && (
            <CryptoDetailsModal crypto={selectedCrypto} />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Analysis Modal */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>AI Analysis Report</DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="sr-only">
            AI-powered analysis for {selectedCoinForAnalysis?.name}
          </DialogDescription>
          {selectedCoinForAnalysis && (
            <CryptoReport
              coin={selectedCoinForAnalysis.symbol.toUpperCase()}
              icon={
                <img 
                  src={selectedCoinForAnalysis.image} 
                  alt={selectedCoinForAnalysis.name} 
                  className="w-8 h-8 rounded-full"
                />
              }
              name={selectedCoinForAnalysis.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const SparklineChart: React.FC<{ data: number[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const height = 40;
  const width = 120;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = data[data.length - 1] > data[0];

  return (
    <svg width={width} height={height} className="mx-auto">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CryptoTable;