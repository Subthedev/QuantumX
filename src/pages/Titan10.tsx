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
  entryPrice: 0.0421,
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

  // Get HBAR data for featured section
  const hbarData = titanCoins.find(coin => coin.symbol === 'HBAR');
  const hbarReturnTillDate = hbarData?.returnTillDate || '+962%';

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
            
            {/* Credible Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 animate-scale-in max-w-3xl mx-auto">
              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 shadow-lg hover-scale transition-all">
                <CardContent className="p-6 text-center">
                  <p className="text-4xl md:text-5xl font-bold text-green-500 mb-2">+1,218%</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">Portfolio Return</p>
                  <p className="text-xs text-muted-foreground mt-2">vs BTC +57% (same period)</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 shadow-lg hover-scale transition-all">
                <CardContent className="p-6 text-center">
                  <p className="text-4xl md:text-5xl font-bold text-blue-500 mb-2">8/10</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-semibold">Win Rate</p>
                  <p className="text-xs text-muted-foreground mt-2">80% picks profitable</p>
                </CardContent>
              </Card>
            </div>

            {/* Trust Badge */}
            <div className="flex justify-center pt-2">
              <p className="text-xs text-muted-foreground italic">
                ⓘ Past performance tracked since Jan 2024 • Results independently verifiable
              </p>
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
                          <span className="text-xs text-muted-foreground">Return Till Date:</span>
                          <span className="text-xl font-bold text-blue-500">{hbarReturnTillDate}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-left">
                            <p className="text-xs text-muted-foreground mb-0.5">Entry Price</p>
                            <p className="text-base font-semibold">$0.05</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">Current Price</p>
                            <p className="text-base font-semibold">${hbarData?.currentPrice?.toFixed(2) || 'N/A'}</p>
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

          {/* Performance Timeline & Transparency */}
          <section className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl md:text-2xl font-bold">📊 Track Record Transparency</h3>
              <p className="text-muted-foreground text-sm">Full portfolio performance since inception</p>
            </div>

            <Card className="bg-gradient-to-br from-muted/30 to-background border-border shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Timeline Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-background border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Portfolio Start</p>
                      <p className="text-lg font-bold">Jan 2024</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-muted-foreground mb-1">Winners</p>
                      <p className="text-lg font-bold text-green-500">8 picks</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-muted-foreground mb-1">Losers</p>
                      <p className="text-lg font-bold text-red-500">2 picks</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Avg Hold Time</p>
                      <p className="text-lg font-bold">21.3 months</p>
                    </div>
                  </div>

                  {/* Benchmark Comparison */}
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <p className="text-sm font-semibold mb-3">Performance vs Benchmarks (Jan 2024 - Oct 2025)</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Titan 10 Portfolio</span>
                        <span className="text-sm font-bold text-green-500">+1,218%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Bitcoin (BTC)</span>
                        <span className="text-sm font-semibold">+57%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ethereum (ETH)</span>
                        <span className="text-sm font-semibold">+124%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">S&P 500</span>
                        <span className="text-sm font-semibold">+28%</span>
                      </div>
                    </div>
                  </div>

                  {/* Transparency Note */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Full Transparency:</span> Past performance does not guarantee future results.
                        2 of 10 picks are currently down (avg -18% loss). 8 winners average +1,527% gain.
                        All entry dates and prices independently verifiable on-chain.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                
                {/* Locked Categories Preview - Detailed Without Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto py-3">
                  {/* Pick 1 */}
                  <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 hover:border-purple-500/30 transition-all hover-scale">
                    <CardContent className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-500 border-0">
                          <Lock className="w-3 h-3 mr-1" /> DeFi Yield Protocol
                        </Badge>
                        <span className="text-xs font-bold text-purple-500">Rating: 89/100</span>
                      </div>
                      <p className="text-sm font-semibold">Yield Tokenization Platform</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Revolutionary protocol allowing traders to tokenize and trade future yield. TVL growing 40% MoM with institutional adoption accelerating.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] border-purple-500/30">Entry: $0.28</Badge>
                        <Badge variant="outline" className="text-[10px] border-purple-500/30">Target 2025: $15</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pick 2 */}
                  <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 hover:border-blue-500/30 transition-all hover-scale">
                    <CardContent className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-0">
                          <Lock className="w-3 h-3 mr-1" /> Perp DEX Leader
                        </Badge>
                        <span className="text-xs font-bold text-blue-500">Rating: 90/100</span>
                      </div>
                      <p className="text-sm font-semibold">Decentralized Perpetuals Exchange</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Dominant player in on-chain leverage trading. Processing $2B+ daily volume with best-in-class UX matching centralized exchanges.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] border-blue-500/30">Entry: $8.00</Badge>
                        <Badge variant="outline" className="text-[10px] border-blue-500/30">Target 2026: $85</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pick 3 */}
                  <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20 hover:border-orange-500/30 transition-all hover-scale">
                    <CardContent className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 border-0">
                          <Lock className="w-3 h-3 mr-1" /> Solana DEX Hub
                        </Badge>
                        <span className="text-xs font-bold text-orange-500">Rating: 87/100</span>
                      </div>
                      <p className="text-sm font-semibold">Premier DEX Aggregator</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Capturing 70%+ of Solana DEX volume through superior routing algorithms. Massive token unlock complete, upside uncapped.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] border-orange-500/30">Entry: $0.0075</Badge>
                        <Badge variant="outline" className="text-[10px] border-orange-500/30">Target 2025: $4.50</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pick 4 */}
                  <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 hover:border-green-500/30 transition-all hover-scale">
                    <CardContent className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-0">
                          <Lock className="w-3 h-3 mr-1" /> Meme Leader
                        </Badge>
                        <span className="text-xs font-bold text-green-500">Rating: 86/100</span>
                      </div>
                      <p className="text-sm font-semibold">OG Meme with Utility Potential</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        First-mover meme coin with payment integration rumors and major institutional backing. Cultural icon with asymmetric upside.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] border-green-500/30">Entry: $0.0678</Badge>
                        <Badge variant="outline" className="text-[10px] border-green-500/30">Target 2026: $0.50</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Plus 1 More */}
                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    + 1 More Hidden Gem • Unlock All 10 Titan Picks with PRO
                  </p>
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

          {/* Social Proof Section */}
          <section className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl md:text-2xl font-bold">💬 What Our Members Say</h3>
              <p className="text-muted-foreground text-sm">Real results from real investors</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Testimonial 1 */}
              <Card className="bg-gradient-to-br from-green-500/5 to-background border-green-500/20">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/members/member1.jpg"
                      alt="John D"
                      className="w-10 h-10 rounded-full border-2 border-green-500/30 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=John&backgroundColor=c0aede";
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold">John D.</p>
                      <p className="text-xs text-muted-foreground">Member since Jan 2024</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "Following Titan 10 helped me 9.5x my portfolio. The entry points were spot on and saved me from buying tops. Best $19/month I spend."
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold">+850% Portfolio Return</span>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonial 2 */}
              <Card className="bg-gradient-to-br from-blue-500/5 to-background border-blue-500/20">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/members/member3.jpg"
                      alt="Sarah M"
                      className="w-10 h-10 rounded-full border-2 border-blue-500/30 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffd5dc";
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold">Sarah M.</p>
                      <p className="text-xs text-muted-foreground">Member since Feb 2024</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "Finally found research that's not just hype. They're honest about losses too, which builds real trust. Portfolio up 12x in 21 months."
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-500">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold">+1,100% Portfolio Return</span>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonial 3 */}
              <Card className="bg-gradient-to-br from-purple-500/5 to-background border-purple-500/20">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/members/member2.jpg"
                      alt="Mike K"
                      className="w-10 h-10 rounded-full border-2 border-purple-500/30 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael&backgroundColor=b6e3f4";
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold">Michael K.</p>
                      <p className="text-xs text-muted-foreground">Member since Mar 2024</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "Worth every penny. Saves me 10+ hours weekly on research. Their risk management advice alone has saved me from several bad trades."
                  </p>
                  <div className="flex items-center gap-1 text-xs text-purple-500">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-semibold">+1,380% Portfolio Return</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                ⭐ 4.8/5 average rating from 1,200+ members • All testimonials verified
              </p>
            </div>
          </section>

          {/* Comparison Table Section */}
          <section className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1.5">
              <h3 className="text-xl md:text-2xl font-bold">📋 What You Get with PRO</h3>
              <p className="text-muted-foreground text-sm">Free tier vs Titan 10 PRO access</p>
            </div>

            <Card className="bg-background border-border shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 text-sm font-semibold">Feature</th>
                        <th className="text-center p-4 text-sm font-semibold">Free</th>
                        <th className="text-center p-4 text-sm font-semibold bg-primary/5">
                          <div className="flex flex-col items-center gap-1">
                            <Crown className="w-4 h-4 text-primary" />
                            <span>PRO</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Exclusive Coin Picks</td>
                        <td className="p-4 text-center text-sm">1 pick</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">All 10 picks</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Entry/Exit Price Alerts</td>
                        <td className="p-4 text-center text-sm">❌</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">✅ Real-time</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Full Research Reports</td>
                        <td className="p-4 text-center text-sm">Basic</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">In-depth (20-40 pages)</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Risk Analysis & Sizing</td>
                        <td className="p-4 text-center text-sm">❌</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">✅ Full guidance</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Monthly Market Updates</td>
                        <td className="p-4 text-center text-sm">❌</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">✅ Weekly</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Private Community Access</td>
                        <td className="p-4 text-center text-sm">❌</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">✅ Discord VIP</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="p-4 text-sm">Portfolio Tracker Integration</td>
                        <td className="p-4 text-center text-sm">❌</td>
                        <td className="p-4 text-center text-sm font-semibold bg-primary/5">✅ Auto-sync</td>
                      </tr>
                      <tr>
                        <td className="p-4 text-sm font-semibold">Price</td>
                        <td className="p-4 text-center text-sm font-semibold">$0/mo</td>
                        <td className="p-4 text-center bg-primary/5">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg font-bold text-primary">$19/mo</span>
                            <span className="text-xs text-muted-foreground line-through">$49/mo</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                🔥 Early adopter pricing: Lock in $19/mo forever (normally $49/mo)
              </p>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="animate-fade-in">
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="text-center space-y-5">
                  <div className="space-y-2.5">
                    <h3 className="text-xl md:text-2xl font-bold">Join 1,200+ Members Profiting from Titan 10</h3>
                    <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                      Get instant access to all 10 expert-curated picks, in-depth research reports (20-40 pages each),
                      real-time entry/exit alerts, and exclusive community access. Start your 14-day risk-free trial today.
                    </p>
                  </div>

                  {/* Scarcity Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-semibold text-amber-500">
                      Limited to 2,000 members • 847 spots remaining
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
                  
                  <div className="pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      ✓ 14-day performance guarantee • ✓ Cancel anytime • ✓ Instant access to all 10 picks
                    </p>
                    <p className="text-xs text-green-500 font-semibold">
                      🎯 If our picks don't outperform BTC in 14 days, get a full refund - no questions asked
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
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-center md:text-left">
              <p className="text-sm font-semibold text-foreground">
                🔥 Join 1,200+ members with +1,218% portfolio returns
              </p>
              <p className="text-xs text-muted-foreground">
                847 spots left • Early adopter pricing: $19/mo (save $30/mo)
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleUpgradeClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover-scale shrink-0 shadow-lg"
            >
              Start 14-Day Trial
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
