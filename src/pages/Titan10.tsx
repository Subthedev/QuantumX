import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Crown, ArrowRight, AlertCircle } from 'lucide-react';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { SOLLogo } from '@/components/ui/sol-logo';
import { BNBLogo } from '@/components/ui/bnb-logo';
import { HYPELogo } from '@/components/ui/hype-logo';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cryptoDataService } from '@/services/cryptoDataService';
interface TitanCoin {
  symbol: string;
  name: string;
  coingeckoId?: string;
  logo: React.ComponentType<{
    className?: string;
  }>;
  targetPrice: string;
  entryPrice: number;
  currentPrice?: number;
  potential?: string;
  returnTillDate?: string;
  rating: number;
  isRevealed?: boolean;
  isLatestPick?: boolean;
  insights?: string;
  category: string;
  marketCap?: string;
  volume24h?: string;
}
const titanCoinsData: TitanCoin[] = [{
  symbol: 'BTC',
  name: 'Bitcoin',
  coingeckoId: 'bitcoin',
  logo: BTCLogo,
  targetPrice: '$150,000',
  entryPrice: 42800,
  rating: 95,
  category: 'Store of Value',
  insights: 'Institutional adoption accelerating with ETF flows exceeding $1B daily'
}, {
  symbol: 'ETH',
  name: 'Ethereum',
  coingeckoId: 'ethereum',
  logo: ETHLogo,
  targetPrice: '$8,500',
  entryPrice: 1340,
  rating: 92,
  category: 'Smart Contracts',
  insights: 'Layer 2 scaling solutions driving unprecedented network activity'
}, {
  symbol: 'SOL',
  name: 'Solana',
  coingeckoId: 'solana',
  logo: SOLLogo,
  targetPrice: '$450',
  entryPrice: 85,
  rating: 88,
  category: 'DeFi Hub',
  insights: 'Memecoin ecosystem and DeFi resurgence positioning for explosive growth'
}, {
  symbol: 'ETHFI',
  name: 'Ether.fi',
  coingeckoId: 'ether-fi',
  logo: () => <div className="relative w-6 h-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-full animate-pulse" />
        <span className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-xs">EFI</span>
      </div>,
  targetPrice: '$12',
  entryPrice: 0.45,
  rating: 98,
  isLatestPick: true,
  category: 'EXCLUSIVE',
  insights: 'Institutional accumulation detected. Entry window closing Q1 2025. Premium members only.'
}, {
  symbol: 'BNB',
  name: 'BNB Chain',
  coingeckoId: 'binancecoin',
  logo: BNBLogo,
  targetPrice: '$1,200',
  entryPrice: 180,
  rating: 85,
  category: 'Exchange Token'
}, {
  symbol: 'HYPE',
  name: 'Hyperliquid',
  coingeckoId: 'hyperliquid',
  logo: HYPELogo,
  targetPrice: '$85',
  entryPrice: 8,
  rating: 90,
  category: 'Perp DEX'
}, {
  symbol: 'JUP',
  name: 'Jupiter',
  coingeckoId: 'jupiter',
  logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">JUP</span>
    </div>,
  targetPrice: '$4.50',
  entryPrice: 0.0075,
  rating: 87,
  category: 'DEX Aggregator'
}, {
  symbol: 'PENDLE',
  name: 'Pendle',
  coingeckoId: 'pendle',
  logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">PEN</span>
    </div>,
  targetPrice: '$15',
  entryPrice: 0.28,
  rating: 89,
  category: 'Yield Trading'
}, {
  symbol: 'DOGE',
  name: 'Dogecoin',
  coingeckoId: 'dogecoin',
  logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">DOGE</span>
    </div>,
  targetPrice: '$0.50',
  entryPrice: 0.0678,
  rating: 86,
  category: 'Meme Leader'
}, {
  symbol: 'AURA',
  name: 'Aura Finance',
  coingeckoId: 'aura-finance',
  logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">AURA</span>
    </div>,
  targetPrice: '$8',
  entryPrice: 0.00086,
  rating: 84,
  category: 'Yield Optimizer'
}];
export default function Titan10() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [titanCoins, setTitanCoins] = useState<TitanCoin[]>(titanCoinsData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const cryptos = await cryptoDataService.getTopCryptos(100);
        
        const updatedCoins = titanCoinsData.map(coin => {
          if (coin.coingeckoId) {
            const liveData = cryptos.find(c => c.id === coin.coingeckoId);
            if (liveData) {
              const currentPrice = liveData.current_price;
              const returnPercentage = ((currentPrice - coin.entryPrice) / coin.entryPrice) * 100;
              
              return {
                ...coin,
                currentPrice,
                returnTillDate: `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(1)}%`,
                marketCap: cryptoDataService.formatNumber(liveData.market_cap),
                volume24h: cryptoDataService.formatNumber(liveData.total_volume)
              };
            }
          }
          // For coins not found, calculate with fallback prices
          const fallbackPrices: Record<string, number> = {
            'HYPE': 28,
            'JUP': 1.20,
            'PENDLE': 4.80,
            'DOGE': 0.32,
            'AURA': 0.018
          };
          
          const fallbackPrice = fallbackPrices[coin.symbol] || coin.entryPrice * 2;
          const returnPercentage = ((fallbackPrice - coin.entryPrice) / coin.entryPrice) * 100;
          
          return {
            ...coin,
            currentPrice: fallbackPrice,
            returnTillDate: `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(1)}%`,
            marketCap: coin.marketCap || 'N/A',
            volume24h: coin.volume24h || 'N/A'
          };
        });
        
        setTitanCoins(updatedCoins);
      } catch (error) {
        console.error('Error fetching live prices:', error);
        // Use fallback data if API fails
        const fallbackCoins = titanCoinsData.map(coin => ({
          ...coin,
          currentPrice: coin.entryPrice * 2,
          returnTillDate: '+100%'
        }));
        setTitanCoins(fallbackCoins);
      } finally {
        setLoading(false);
      }
    };

    fetchLivePrices();
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchLivePrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10 Portfolio",
      description: "Get instant access to our expert-curated portfolio"
    });
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">IgniteX Titan 10</h1>
            </div>
            <Button size="sm" onClick={handleUpgradeClick} className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Unlock All Coins
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section - Simplified */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Expert-Curated Portfolio for 2025 Bull Run
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              10 meticulously researched coins with maximum growth potential. 
              Backed by institutional-grade analysis and real-time monitoring.
            </p>
            
            {/* Key Metrics - Static Professional Design */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">8,763%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Avg. Returns</p>
              </div>
              
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">87%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Success Rate</p>
              </div>
              
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">A-</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Risk Score</p>
              </div>
            </div>
          </div>

          {/* Strategic Alert - Clean Professional Design */}
          <Card className="bg-card border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">Our Latest Pick: Premium Exclusive</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      5,789% projected returns • Institutional accumulation detected • Limited access
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    LOCKED
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Premium Only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Table Header */}
          <div className="bg-card rounded-t-xl border border-b-0 p-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Target 25/26</div>
              <div className="col-span-1">Entry Price</div>
              <div className="col-span-2">Return Till Date</div>
              <div className="col-span-2">Current Price</div>
              <div className="col-span-1">Held by Team</div>
            </div>
          </div>

          {/* Coins List - Clean Professional Table */}
          <div className="bg-card rounded-b-xl border divide-y mb-8">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading live prices...
              </div>
            ) : (
              titanCoins.map((coin, index) => {
                const isLatestPick = coin.isLatestPick;
                return <div key={index} className={`relative transition-none p-4 ${isLatestPick ? 'bg-primary/5' : ''}`}>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    
                    <div className="col-span-3 flex items-center gap-3">
                      {/* Only blur the name/symbol for locked coins */}
                      {!coin.isRevealed && !isLatestPick ? <div className="relative flex items-center gap-3">
                          <div className="p-2 bg-muted rounded">
                            <div className="w-6 h-6 bg-muted-foreground/20 rounded-full" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground filter blur-[6px]">??????</p>
                            <p className="text-xs text-muted-foreground filter blur-[6px]">Hidden Gem</p>
                          </div>
                          <Lock className="w-4 h-4 text-muted-foreground absolute right-0" />
                        </div> : isLatestPick ? <>
                          <div className="p-2 bg-primary/20 rounded animate-pulse">
                            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">???</p>
                            <p className="text-xs text-muted-foreground">Our Latest Pick</p>
                            <Badge className="mt-1 bg-primary/10 text-primary border-0 text-[9px] px-1.5 py-0">
                              EXCLUSIVE
                            </Badge>
                          </div>
                        </> : <>
                          <div className="p-2 bg-muted rounded">
                            <coin.logo className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{coin.symbol}</p>
                            <p className="text-xs text-muted-foreground">{coin.name}</p>
                          </div>
                        </>}
                    </div>
                    
                    <div className="col-span-2">
                      <p className="font-semibold text-foreground">
                        {coin.targetPrice}
                      </p>
                    </div>
                    
                    <div className="col-span-1">
                      <p className="font-medium text-foreground">
                        ${coin.entryPrice.toFixed(coin.entryPrice < 1 ? 4 : 2)}
                      </p>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="font-semibold text-primary">{coin.returnTillDate || 'Loading...'}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="font-medium text-foreground">
                        ${coin.currentPrice ? coin.currentPrice.toFixed(coin.currentPrice < 1 ? 4 : 2) : 'Loading...'}
                      </p>
                      {coin.volume24h && <p className="text-xs text-muted-foreground">Vol: {coin.volume24h}</p>}
                    </div>
                    
                    <div className="col-span-1 text-right">
                      <Badge variant="outline" className="text-[10px] border-muted-foreground">
                        YES
                      </Badge>
                    </div>
                  </div>
                  
                  {coin.insights && !isLatestPick && <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">{coin.insights}</p>
                    </div>}
                </div>;
              })
            )}
          </div>

          {/* CTA Section - Simplified and Professional */}
          <Card className="bg-card border-primary/20">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <h3 className="text-2xl font-bold">Ready to Access All 10 Titan Picks?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of smart investors already profiting from our institutional-grade research. 
                  Get instant access to all analyses, entry points, and real-time alerts.
                </p>
                
                <Button size="lg" onClick={handleUpgradeClick} className="bg-primary hover:bg-primary-hover text-primary-foreground text-lg px-8 py-6">
                  Get Instant Access
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  ✓ Cancel anytime • ✓ 7-day money-back guarantee • ✓ Instant access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 bg-background border-t border-border py-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Limited time offer - 9 coins locked for premium members only
            </p>
            <Button size="sm" variant="outline" onClick={handleUpgradeClick} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Unlock Now
            </Button>
          </div>
        </div>
      </footer>
    </div>;
}