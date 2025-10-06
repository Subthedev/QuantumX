import { memo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { IgniteXLogo } from '@/components/ui/ignitex-logo';
import { 
  LogOut, 
  CreditCard, 
  LayoutDashboard,
  ArrowRight,
  Calculator,
  Crown,
  Brain,
  Shield,
  Briefcase,
  Menu
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const featureLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Market overview' },
  { href: '/titan10', label: 'Titan 10', icon: Crown, description: 'Expert portfolio' },
  { href: '/ai-analysis', label: 'AI Analysis', icon: Brain, description: 'Smart insights' },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase, description: 'Track holdings' },
  { href: '/profit-guard', label: 'ProfitGuard', icon: Shield, description: 'Protect gains' },
  { href: '/calculator', label: 'Calculator', icon: Calculator, description: 'Trading tools' },
];

const MobileOptimizedHeaderComponent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account"
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive"
      });
    }
  }, [navigate]);

  const getUserInitials = useCallback(() => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <IgniteXLogo size="sm" showText={true} />
        </Link>

        {/* Features Menu & Actions */}
        <div className="flex items-center gap-2">
          {/* Features Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                Features
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Platform Features</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {featureLinks.map((feature) => (
                <DropdownMenuItem key={feature.href} onClick={() => navigate(feature.href)}>
                  <feature.icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{feature.label}</span>
                    <span className="text-xs text-muted-foreground">{feature.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Actions */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Account</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/pricing')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="shadow-sm gap-2 font-medium">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export const MobileOptimizedHeader = memo(MobileOptimizedHeaderComponent);