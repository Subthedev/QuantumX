import { memo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Eye, Zap } from 'lucide-react';
import { cryptoDataService } from '@/services/cryptoDataService';
import type { CoinData } from '@/types/crypto';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import CryptoDetailsModal from './CryptoDetailsModal';
import { toast } from 'sonner';
import { useBinancePrices } from '@/hooks/useBinancePrices';

interface CryptoTableProps {
  onGenerateReport?: (coin: CoinData) => void;
}

const CryptoTableComponent = ({ onGenerateReport }: CryptoTableProps) => {
  const [cryptos, setCryptos] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CoinData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get Binance real-time prices for all coins
  const binanceSymbols = cryptos.map(c => c.symbol.toLowerCase());
  const { prices: binancePrices, latency } = useBinancePrices({
    symbols: binanceSymbols,
    refetchInterval: 10000, // Update every 10s for real-time feel
    enabled: cryptos.length > 0
  });

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
    // Reduced polling to 2 minutes since Binance provides real-time updates
    const interval = setInterval(loadCryptoData, 120000);
    return () => clearInterval(interval);
  }, [loadCryptoData]);

  // Merge Binance real-time prices with CoinGecko data
  const mergedCryptos = cryptos.map(crypto => {
    const binancePrice = binancePrices[crypto.symbol.toLowerCase()];
    if (binancePrice) {
      return {
        ...crypto,
        current_price: binancePrice.price,
        price_change_percentage_24h: binancePrice.change_24h,
        high_24h: binancePrice.high_24h,
        low_24h: binancePrice.low_24h,
        total_volume: binancePrice.volume_24h,
        lastUpdated: 'realtime' // Mark as real-time data
      };
    }
    return crypto;
  });
  const handleViewDetails = useCallback((crypto: CoinData) => {
    setSelectedCrypto(crypto);
    setShowDetails(true);
  }, []);
  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center px-2 py-2.5 sm:p-4 border-b">
            <Skeleton className="w-5 h-3.5 mr-2 sm:mr-4" />
            <Skeleton className="h-7 w-7 sm:h-10 sm:w-10 rounded-full mr-2 sm:mr-3" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-20 sm:w-32 mb-1" />
              <Skeleton className="h-2.5 w-10 sm:w-12" />
            </div>
            <div className="text-right">
              <Skeleton className="h-3.5 w-16 sm:w-24 mb-1 ml-auto" />
              <Skeleton className="h-2.5 w-12 sm:w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="w-full">
        {/* Real-time indicator */}
        {latency && latency !== 'unavailable' && latency !== 'connecting' && (
          <div className="flex items-center justify-end gap-1.5 px-2 py-1 text-[10px] text-green-600 font-medium bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900">
            <Zap className="w-3 h-3 animate-pulse" />
            <span>Real-time updates ({latency})</span>
          </div>
        )}
        {latency === 'connecting' && (
          <div className="flex items-center justify-end gap-1.5 px-2 py-1 text-[10px] text-yellow-600 font-medium bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900">
            <Zap className="w-3 h-3 animate-spin" />
            <span>Connecting to real-time data...</span>
          </div>
        )}

        {/* Mobile: Compact List View */}
        <div className="block md:hidden">
          {mergedCryptos.map((crypto, index) => (
            <div
              key={crypto.id}
              onClick={() => handleViewDetails(crypto)}
              className="flex items-center px-2 py-2.5 border-b border-border/50 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer"
            >
              {/* Rank */}
              <div className="w-6 flex-shrink-0 text-center">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
              </div>

              {/* Logo + Name */}
              <div className="flex items-center gap-2 flex-1 min-w-0 ml-2">
                <img
                  src={crypto.image}
                  alt={crypto.name}
                  className="w-9 h-9 rounded-full flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] leading-tight truncate">
                    {crypto.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase truncate">
                    {crypto.symbol}
                  </div>
                </div>
              </div>

              {/* Price + Change (Right aligned) */}
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <div className="font-semibold text-[13px] leading-tight whitespace-nowrap">
                  ${crypto.current_price >= 1000
                    ? crypto.current_price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : crypto.current_price >= 1
                    ? crypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : crypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                  }
                </div>
                <div className={cn(
                  "text-[11px] font-semibold leading-tight mt-0.5",
                  (crypto.price_change_percentage_24h ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {(crypto.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                  {(crypto.price_change_percentage_24h ?? 0).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr className="text-xs font-medium text-muted-foreground">
                <th className="text-center p-3">#</th>
                <th className="text-left p-3">Name</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">24h %</th>
                <th className="text-right p-3 hidden lg:table-cell">Market Cap</th>
                <th className="text-center p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {mergedCryptos.map((crypto, index) => (
                <tr key={crypto.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-center">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={crypto.image}
                        alt={crypto.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{crypto.name}</div>
                        <div className="text-xs text-muted-foreground uppercase truncate">{crypto.symbol}</div>
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
                      (crypto.price_change_percentage_24h ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {(crypto.price_change_percentage_24h ?? 0) >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>{Math.abs(crypto.price_change_percentage_24h ?? 0).toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right hidden lg:table-cell">
                    <span className="text-sm font-medium">
                      {cryptoDataService.formatNumber(crypto.market_cap)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(crypto)}
                        className="h-8 w-8 p-0 hover:bg-muted"
                      >
                        <Eye className="w-4 h-4" />
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