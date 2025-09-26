import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, ArrowRight, Zap, TrendingUp, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DOGELogo } from '@/components/ui/doge-logo';

export default function Titan10Section() {
  const navigate = useNavigate();

  const handleViewPortfolio = () => {
    navigate('/titan10');
  };

  return (
    <div className="space-y-6">
      {/* Compact Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  IgniteX Titan 10
                </h2>
                <p className="text-sm text-muted-foreground">Expert-Curated Portfolio</p>
              </div>
            </div>
            
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Zap className="w-3 h-3 mr-1" />
              Limited Access
            </Badge>
          </div>
          
          {/* Mystery Coin Teaser */}
          <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl">
                    <DOGELogo className="w-8 h-8" />
                  </div>
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground opacity-60" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">Strategic Reserve Asset</p>
                  <h3 className="font-bold text-lg mb-1">The $47B Presidential Play</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Returns:</span>
                    <div className="flex items-center gap-1 text-green-500 font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>4,634%</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Congressional Backing
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">195%</p>
              <p className="text-xs text-muted-foreground">Avg. Return</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">10</p>
              <p className="text-xs text-muted-foreground">Expert Picks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">A+</p>
              <p className="text-xs text-muted-foreground">Risk Rating</p>
            </div>
          </div>
          
          {/* CTA */}
          <Button 
            onClick={handleViewPortfolio}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Unlock Full Titan 10 Portfolio
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}