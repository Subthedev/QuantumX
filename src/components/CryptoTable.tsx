import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, BarChart, Sparkles } from 'lucide-react';
import { cryptoDataService, CryptoData } from '@/services/cryptoDataService';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr className="text-sm text-muted-foreground">
                <th className="text-left p-4 font-medium">#</th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-right p-4 font-medium">Price</th>
                <th className="text-right p-4 font-medium">24h %</th>
                <th className="text-right p-4 font-medium">7d %</th>
                <th className="text-right p-4 font-medium">Market Cap</th>
                <th className="text-right p-4 font-medium">Volume(24h)</th>
                <th className="text-right p-4 font-medium">Circulating Supply</th>
                <th className="text-center p-4 font-medium">Last 7 Days</th>
                <th className="text-center p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cryptos.map((crypto) => (
                <tr 
                  key={crypto.id} 
                  className="border-b hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4 text-sm font-medium">{crypto.market_cap_rank}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={crypto.image} 
                        alt={crypto.name} 
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-xs text-muted-foreground uppercase">{crypto.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-medium">
                    ${crypto.current_price.toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: crypto.current_price < 1 ? 6 : 2
                    })}
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "flex items-center justify-end space-x-1",
                      crypto.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                      </span>
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "flex items-center justify-end space-x-1",
                      (crypto.price_change_percentage_7d_in_currency || 0) >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {(crypto.price_change_percentage_7d_in_currency || 0) >= 0 ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {Math.abs(crypto.price_change_percentage_7d_in_currency || 0).toFixed(2)}%
                      </span>
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {cryptoDataService.formatNumber(crypto.market_cap)}
                  </td>
                  <td className="p-4 text-right">
                    {cryptoDataService.formatNumber(crypto.total_volume)}
                  </td>
                  <td className="p-4 text-right">
                    <div>
                      {crypto.circulating_supply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">{crypto.symbol}</div>
                  </td>
                  <td className="p-4">
                    <SparklineChart data={crypto.sparkline_in_7d?.price || []} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(crypto)}
                        className="h-8"
                      >
                        <BarChart className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateAIAnalysis(crypto)}
                        className="h-8 bg-gradient-to-r from-primary to-primary-foreground hover:opacity-90"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Analysis
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
          {selectedCrypto && (
            <CryptoDetailsModal crypto={selectedCrypto} />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Analysis Modal */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              {selectedCoinForAnalysis && (
                <>
                  <img 
                    src={selectedCoinForAnalysis.image} 
                    alt={selectedCoinForAnalysis.name} 
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{selectedCoinForAnalysis.name} AI Analysis</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCoinForAnalysis && (
            <CryptoReport
              coin={selectedCoinForAnalysis.symbol.toUpperCase()}
              icon={selectedCoinForAnalysis.image}
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
        stroke={isPositive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
      />
    </svg>
  );
};

export default CryptoTable;