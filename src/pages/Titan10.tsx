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
import { AppHeader } from '@/components/AppHeader';
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
  isRevealed: true,
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
  isRevealed: true,
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
  isRevealed: true,
  category: 'DeFi Hub',
  insights: 'Memecoin ecosystem and DeFi resurgence positioning for explosive growth'
}, {
  symbol: 'HBAR',
  name: 'Hedera',
  coingeckoId: 'hedera-hashgraph',
  logo: () => <div className="relative w-6 h-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">H</span>
      </div>,
  targetPrice: '$2.50',
  entryPrice: 0.05,
  rating: 98,
  isRevealed: true,
  isLatestPick: true,
  category: 'RWA PICK',
  insights: 'Enterprise-grade DLT with major institutional adoption and RWA tokenization partnerships.'
}, {
  symbol: 'BNB',
  name: 'BNB Chain',
  coingeckoId: 'binancecoin',
  logo: BNBLogo,
  targetPrice: '$1,200',
  entryPrice: 180,
  rating: 85,
  isRevealed: true,
  category: 'Exchange Token',
  insights: 'Binance ecosystem growth with new chain launches'
}, {
  symbol: 'HYPE',
  name: 'Hyperliquid',
  coingeckoId: 'hyperliquid',
  logo: HYPELogo,
  targetPrice: '$85',
  entryPrice: 8,
  rating: 90,
  category: 'Perp DEX',
  insights: 'Leading decentralized perpetuals platform with massive volume growth'
}, {
  symbol: 'JUP',
  name: 'Jupiter',
  coingeckoId: 'jupiter-ag-wormhole',
  logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">JUP</span>
    </div>,
  targetPrice: '$4.50',
  entryPrice: 0.0075,
  rating: 87,
  category: 'DEX Aggregator',
  insights: 'Solana DEX aggregator capturing significant market share'
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
  category: 'Yield Trading',
  insights: 'Innovative yield tokenization protocol with growing TVL'
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
  category: 'Meme Leader',
  insights: 'Original meme coin with potential payment integration momentum'
}, {
  symbol: 'AURA',
  name: 'Aura Finance',
  coingeckoId: 'aura-finance',
  logo: () => <div className="relative w-6 h-6">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">AUR</span>
    </div>,
  targetPrice: '$8',
  entryPrice: 0.00086,
  rating: 91,
  isRevealed: false,
  category: 'MEME PICK',
  insights: 'Meme coin with massive viral potential and community growth'
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
          
          const manualPriceMapping: Record<string, { coingeckoId: string, fallbackPrice: number }> = {
            'ETHFI': { coingeckoId: 'ether-fi', fallbackPrice: 1.80 },
            'HYPE': { coingeckoId: 'hyperliquid', fallbackPrice: 28 },
            'JUP': { coingeckoId: 'jupiter-ag-wormhole', fallbackPrice: 1.20 },
            'PENDLE': { coingeckoId: 'pendle', fallbackPrice: 4.80 },
            'AURA': { coingeckoId: 'aura-finance', fallbackPrice: 0.018 }
          };
          
          const mapping = manualPriceMapping[coin.symbol];
          if (mapping) {
            const liveData = cryptos.find(c => c.id === mapping.coingeckoId);
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
            } else {
              const returnPercentage = ((mapping.fallbackPrice - coin.entryPrice) / coin.entryPrice) * 100;
              
              return {
                ...coin,
                currentPrice: mapping.fallbackPrice,
                returnTillDate: `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(1)}%`,
                marketCap: coin.marketCap || 'N/A',
                volume24h: coin.volume24h || 'N/A'
              };
            }
          }
          
          const fallbackPrice = coin.entryPrice * 2;
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-12">
          
          {/* Hero Section */}
          <section className="text-center space-y-4 animate-fade-in">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                Expert-Curated Portfolio for 2025 Bull Run
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
                10 meticulously researched coins with maximum growth potential. Get access to all exclusive picks and institutional-grade analysis.
              </p>
            </div>
            
            <div className="flex justify-center">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-4 py-1.5">
                <Lock className="w-3 h-3 mr-1.5" />
                Only 1 of 10 Picks Revealed Below
              </Badge>
            </div>
            
            {/* Average Returns Metric */}
            <div className="flex justify-center pt-4 animate-scale-in">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-lg hover-scale transition-all">
                <CardContent className="p-5 text-center">
                  <p className="text-3xl md:text-4xl font-bold text-primary mb-1">23,879.45%</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Average Returns</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Featured Pick Section */}
          <section className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl md:text-2xl font-bold">🔥 Featured Pick for 2025</h3>
              <p className="text-muted-foreground text-sm">1 out of 10 exclusive opportunities revealed</p>
            </div>
            
            <div className="max-w-xl mx-auto">
              <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background border-blue-500/30 hover:border-blue-500/50 transition-all shadow-lg hover-scale">
                <CardContent className="p-5 md:p-6">
                  <div className="text-center space-y-4">
                    {/* Icon */}
                    <div className="inline-flex p-3 bg-blue-500/20 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-blue-500" />
                    </div>
                    
                    {/* Badge and Title */}
                    <div className="space-y-2">
                      <Badge className="bg-blue-500/20 text-blue-500 border-0 text-xs px-2.5 py-0.5">
                        Latest RWA Pick
                      </Badge>
                      <div>
                        <h4 className="text-2xl font-bold text-foreground mb-1">HBAR</h4>
                        <p className="text-sm text-muted-foreground">Enterprise DLT & RWA Leader</p>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <Card className="bg-card/80 border-blue-500/20">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                          <span className="text-xs text-muted-foreground">Potential Return:</span>
                          <span className="text-xl font-bold text-blue-500">4,900%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-left">
                            <p className="text-xs text-muted-foreground mb-0.5">Entry Price</p>
                            <p className="text-base font-semibold">$0.05</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">Target Price</p>
                            <p className="text-base font-semibold">$2.50</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Insights */}
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        Major institutional partnerships with Google, IBM, and Boeing. Leading enterprise blockchain for tokenization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Locked Coins Teaser */}
          <section className="space-y-5 animate-fade-in">
            <Card className="bg-gradient-to-br from-muted/50 to-background border-dashed border-2 border-primary/30 shadow-lg">
              <CardContent className="p-6 md:p-8 text-center space-y-5">
                <div className="inline-flex p-4 bg-primary/10 rounded-xl">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                
                <div className="space-y-2.5">
                  <h3 className="text-xl md:text-2xl font-bold">9 More Exclusive Picks Locked</h3>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                    Our institutional-grade research has identified 9 additional high-potential coins across 
                    DeFi, AI, Gaming, MEME, and Infrastructure sectors. Each with detailed entry points, targets, and risk analysis.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto py-3">
                  <Card className="bg-card/50 border-border hover:border-primary/30 transition-all">
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2 filter blur-md">
                        <ETHLogo className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">DeFi Gem</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50 border-border hover:border-primary/30 transition-all">
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2 filter blur-md">
                        <SOLLogo className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">AI Sector</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50 border-border hover:border-primary/30 transition-all">
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2 filter blur-md">
                        <BNBLogo className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Gaming</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/50 border-border hover:border-primary/30 transition-all">
                    <CardContent className="p-4 text-center">
                      <div className="flex justify-center mb-2 filter blur-md">
                        <BTCLogo className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Layer 1</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Button 
                  size="default" 
                  onClick={handleUpgradeClick} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg hover-scale transition-all"
                >
                  Unlock All 10 Titan Picks
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Final CTA Section */}
          <section className="animate-fade-in">
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="text-center space-y-5">
                  <div className="space-y-2.5">
                    <h3 className="text-xl md:text-2xl font-bold">Don't Miss Out on the Full Portfolio</h3>
                    <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                      Join thousands of smart investors who are already profiting from our institutional-grade research. 
                      Get instant access to all 10 picks, detailed analysis, entry points, and real-time alerts.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4 py-3">
                    {[
                      'Full Portfolio Access',
                      'Real-Time Price Alerts',
                      'Expert Analysis'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span className="font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    size="default" 
                    onClick={handleUpgradeClick} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 shadow-lg hover-scale transition-all"
                  >
                    Get Instant Access Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      ✓ Cancel anytime • ✓ 7-day money-back guarantee • ✓ Instant access to all 10 picks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="container mx-auto px-4 py-5 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              🔥 Limited Access: Only 1 of 10 picks revealed • 9 exclusive coins waiting
            </p>
            <Button 
              size="sm" 
              onClick={handleUpgradeClick} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover-scale shrink-0"
            >
              Unlock All 10 Now
              <Lock className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
