import { memo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { cryptoDataService, CryptoData } from '@/services/cryptoDataService';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import CryptoDetailsModal from './CryptoDetailsModal';
import { toast } from 'sonner';

interface CryptoTableProps {
  onGenerateReport?: (coin: CryptoData) => void;
}

const CryptoTableComponent = ({ onGenerateReport }: CryptoTableProps) => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadCryptoData = useCallback(async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(100);
      setCryptos(data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCryptoData();
    const interval = setInterval(loadCryptoData, 60000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);
  const handleViewDetails = useCallback((crypto: CryptoData) => {
    setSelectedCrypto(crypto);
    setShowDetails(true);
  }, []);
  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center p-1.5 sm:p-4 border-b">
            <Skeleton className="w-4 h-3 mr-1 sm:mr-4" />
            <Skeleton className="h-6 w-6 sm:h-10 sm:w-10 rounded-full mr-1.5 sm:mr-3" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 sm:w-32 mb-1" />
              <Skeleton className="h-2 w-8 sm:w-12" />
            </div>
            <Skeleton className="h-4 w-12 sm:w-24 ml-1 sm:ml-4" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="w-full overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full min-w-full">
            <thead className="bg-muted/30 border-b">
              <tr className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                <th className="text-center p-1.5 sm:p-3 w-[8%] sm:w-auto">#</th>
                <th className="text-left p-1.5 sm:p-3 w-[42%] sm:w-auto">Name</th>
                <th className="text-right p-1.5 sm:p-3 w-[22%] sm:w-auto">Price</th>
                <th className="text-right p-1.5 sm:p-3 w-[18%] sm:w-auto">24h</th>
                <th className="text-right p-2 sm:p-3 hidden lg:table-cell">Market Cap</th>
                <th className="text-center p-1.5 sm:p-3 w-[10%] sm:w-auto">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {cryptos.map((crypto) => (
                <tr key={crypto.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-1.5 sm:p-3 text-center">
                    <span className="text-[10px] sm:text-sm font-semibold text-muted-foreground">
                      {crypto.market_cap_rank}
                    </span>
                  </td>
                  <td className="p-1.5 sm:p-3">
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <img
                        src={crypto.image}
                        alt={crypto.name}
                        className="w-6 h-6 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[11px] sm:text-sm truncate">{crypto.name}</div>
                        <div className="text-[9px] sm:text-xs text-muted-foreground uppercase truncate">{crypto.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-1.5 sm:p-3 text-right">
                    <div className="font-semibold text-[10px] sm:text-sm">
                      ${crypto.current_price.toLocaleString(undefined, {
                        minimumFractionDigits: crypto.current_price >= 1 ? 0 : 2,
                        maximumFractionDigits: crypto.current_price < 1 ? 4 : 0
                      })}
                    </div>
                  </td>
                  <td className="p-1.5 sm:p-3 text-right">
                    <div className={cn(
                      "flex items-center justify-end gap-0.5 text-[10px] sm:text-sm font-semibold",
                      crypto.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {crypto.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3 hidden sm:inline" />
                      ) : (
                        <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3 hidden sm:inline" />
                      )}
                      <span>{Math.abs(crypto.price_change_percentage_24h).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 text-right hidden lg:table-cell">
                    <span className="text-xs sm:text-sm font-medium">
                      ${cryptoDataService.formatNumber(crypto.market_cap)}
                    </span>
                  </td>
                  <td className="p-1.5 sm:p-3">
                    <div className="flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(crypto)}
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-muted"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog 
        open={showDetails} 
        onOpenChange={(open) => {
          setShowDetails(open);
          if (!open) setSelectedCrypto(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>Cryptocurrency Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedCrypto?.name}
            </DialogDescription>
          </VisuallyHidden>
          {selectedCrypto && (
            <CryptoDetailsModal 
              coin={selectedCrypto} 
              open={showDetails} 
              onClose={() => {
                setShowDetails(false);
                setSelectedCrypto(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default memo(CryptoTableComponent);