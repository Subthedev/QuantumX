import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowRight, TrendingUp, DollarSign, Target, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cryptoDataService } from '@/services/cryptoDataService';

export default function Titan10Section() {
  const navigate = useNavigate();
  const [hbarReturn, setHbarReturn] = useState('+387%');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHBARPrice = async () => {
      try {
        const cryptos = await cryptoDataService.getTopCryptos(100);
        const hbarData = cryptos.find(c => c.id === 'hedera-hashgraph');
        
        if (hbarData) {
          const entryPrice = 0.0421;
          const currentPrice = hbarData.current_price;
          const returnPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
          setHbarReturn(`${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(0)}%`);
        }
      } catch (error) {
        console.error('Error fetching HBAR price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHBARPrice();
  }, []);

  const handleViewPortfolio = () => {
    navigate('/titan10');
  };
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3 md:p-5 space-y-3 md:space-y-4">
        {/* Compact Header - Single Row on Mobile */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-bold truncate">Titan 10 Portfolio</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">2025 Bull Run Picks</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] md:text-xs flex-shrink-0">
            LIVE
          </Badge>
        </div>

        {/* Compact Stats Grid - 2 Columns */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="text-center p-2 md:p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-background border border-green-500/20">
            <p className="text-base md:text-xl font-bold text-green-500">+1,218%</p>
            <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">Total Return</p>
          </div>
          <div className="text-center p-2 md:p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-background border border-blue-500/20">
            <p className="text-base md:text-xl font-bold text-blue-500">8/10</p>
            <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">Win Rate</p>
          </div>
        </div>

        {/* Top Picks Preview - Horizontal Layout */}
        <div className="space-y-2">
          <p className="text-[10px] md:text-xs text-center text-muted-foreground">Top 2 Picks Preview</p>
          <div className="flex gap-2 md:gap-3">
            {/* RWA Pick - HBAR */}
            <div className="flex-1 p-2.5 md:p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] md:text-xs text-blue-500 border-blue-500/50">
                  💎 RWA
                </Badge>
                <Badge variant="secondary" className="text-[9px] md:text-xs">Locked</Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 blur-sm flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold blur-sm">HBAR</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-[9px] md:text-xs text-muted-foreground">Return:</span>
                <span className="text-sm md:text-base font-bold text-blue-500">{hbarReturn}</span>
              </div>
            </div>

            {/* DEX Pick - HYPE */}
            <div className="flex-1 p-2.5 md:p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] md:text-xs text-purple-500 border-purple-500/50">
                  🚀 DEX
                </Badge>
                <Badge variant="secondary" className="text-[9px] md:text-xs">Locked</Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-sm flex-shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold blur-sm">HYPE</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-[9px] md:text-xs text-muted-foreground">Target:</span>
                <span className="text-sm md:text-base font-bold text-purple-500">$85</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact CTA */}
        <Button
          onClick={handleViewPortfolio}
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm py-2 md:py-2.5"
        >
          View Full Portfolio
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1.5" />
        </Button>

        {/* Compact Footer */}
        <p className="text-[9px] md:text-xs text-center text-muted-foreground">
          🔥 1,200+ members • 80% win rate • 14-day guarantee
        </p>
      </CardContent>
    </Card>
  );
}