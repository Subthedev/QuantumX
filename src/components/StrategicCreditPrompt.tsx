import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  TrendingUp, 
  Lock, 
  Gift, 
  Sparkles,
  AlertTriangle,
  Crown,
  Timer,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StrategicCreditPromptProps {
  credits: number;
  variant?: 'header' | 'empty' | 'low' | 'action' | 'floating';
  onGetFreeCredits?: () => void;
  showFreeOption?: boolean;
}

export const StrategicCreditPrompt = ({ 
  credits, 
  variant = 'header',
  onGetFreeCredits,
  showFreeOption = false 
}: StrategicCreditPromptProps) => {
  const navigate = useNavigate();
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    // Trigger pulse animation when credits are low
    if (credits <= 2 && credits > 0) {
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [credits]);

  const isLowCredits = credits <= 2;
  const isNoCredits = credits === 0;

  // Header variant - compact with urgency
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300",
          isNoCredits ? "bg-red-500/10 border-red-500/30" : 
          isLowCredits ? "bg-orange-500/10 border-orange-500/30" : 
          "bg-primary/10 border-primary/20",
          pulseAnimation && "animate-pulse"
        )}>
          <Zap className={cn(
            "h-4 w-4",
            isNoCredits ? "text-red-500" : 
            isLowCredits ? "text-orange-500" : 
            "text-primary"
          )} />
          <span className="text-sm font-bold">{credits}</span>
          <span className="text-xs text-muted-foreground">credits</span>
        </div>
        
        {isLowCredits && (
          <Badge variant="destructive" className="animate-pulse">
            Low Balance
          </Badge>
        )}
        
        <Button 
          onClick={() => navigate("/pricing")}
          size="sm"
          variant={isNoCredits ? "default" : "outline"}
          className={cn(
            "gap-1.5 transition-all",
            isNoCredits && "animate-pulse bg-gradient-to-r from-primary to-primary/80"
          )}
        >
          <Crown className="h-3.5 w-3.5" />
          <span className="font-semibold">Get Credits</span>
        </Button>
      </div>
    );
  }

  // Empty state variant - prominent CTA
  if (variant === 'empty') {
    return (
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
            <Lock className="h-12 w-12 text-primary relative" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">
            {isNoCredits ? "Out of Credits!" : "Start Analyzing Markets"}
          </h3>
          
          <p className="text-muted-foreground mb-6 max-w-sm">
            {isNoCredits 
              ? "You need credits to generate AI-powered analysis. Get instant access now!"
              : "Unlock professional crypto analysis with our AI-powered signals"}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {showFreeOption && onGetFreeCredits && (
              <Button 
                onClick={onGetFreeCredits}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Gift className="h-4 w-4" />
                Get Free Credits
              </Button>
            )}
            
            <Button 
              onClick={() => navigate("/pricing")}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 animate-pulse"
            >
              <Sparkles className="h-4 w-4" />
              Buy Credits Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            <span>Limited time offer - 50% off first purchase</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Low credits warning variant
  if (variant === 'low' && isLowCredits) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-semibold">Low Balance Alert:</span> You have only {credits} credit{credits !== 1 ? 's' : ''} remaining
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate("/pricing")}
            className="ml-4 bg-orange-500 hover:bg-orange-600"
          >
            Recharge Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Action variant - near analyze buttons
  if (variant === 'action') {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isNoCredits ? "bg-red-500/5 border-red-500/30" : 
        isLowCredits ? "bg-orange-500/5 border-orange-500/30" : 
        "bg-muted/30 border-border"
      )}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Zap className={cn(
              "h-4 w-4",
              isNoCredits ? "text-red-500" : 
              isLowCredits ? "text-orange-500" : 
              "text-primary"
            )} />
            <span className="text-sm font-semibold">
              {isNoCredits ? "No Credits Available" : 
               isLowCredits ? `Only ${credits} Credit${credits !== 1 ? 's' : ''} Left` : 
               `${credits} Credits Available`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Each analysis requires 1 credit
          </p>
        </div>
        
        <Button 
          size="sm"
          variant={isLowCredits ? "default" : "outline"}
          onClick={() => navigate("/pricing")}
          className={cn(
            "gap-1.5",
            isLowCredits && "animate-pulse"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Add Credits
        </Button>
      </div>
    );
  }

  // Floating variant - sticky bottom banner
  if (variant === 'floating' && isLowCredits) {
    return (
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
        <Card className="border-2 border-primary shadow-2xl bg-gradient-to-r from-primary/95 to-primary text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm mb-1">
                  🔥 Running Low on Credits
                </h4>
                <p className="text-xs opacity-90">
                  Don't miss out on profitable trades. Recharge now and get 20% bonus credits!
                </p>
              </div>
              <Button 
                size="sm"
                variant="secondary"
                onClick={() => navigate("/pricing")}
                className="shrink-0 font-bold"
              >
                Get Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};