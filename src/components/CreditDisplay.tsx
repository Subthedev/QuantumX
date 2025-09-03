import { useEffect, useState } from "react";
import { Coins, Gift, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface CreditDisplayProps {
  onGetCredits?: () => void;
}

export default function CreditDisplay({ onGetCredits }: CreditDisplayProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setCredits(0);
      return;
    }

    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setCredits(data.credits || 0);
      }
    };

    fetchCredits();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('credit-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setCredits(payload.new.credits || 0);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">{credits}</span>
        <span className="text-xs text-muted-foreground">credits</span>
      </div>
      <Button 
        onClick={() => navigate("/pricing")}
        size="sm"
        variant="default"
        className="flex items-center gap-1.5 h-8 px-3"
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">Buy Credits</span>
      </Button>
    </div>
  );
}