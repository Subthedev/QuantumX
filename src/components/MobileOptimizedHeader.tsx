import { memo, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  LayoutDashboard,
  ArrowRight,
  Calculator,
  Crown,
  Brain,
  Shield,
  Briefcase,
  Menu,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const featureLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Market overview' },
  { href: '/titan10', label: 'Titan 10', icon: Crown, description: 'Expert portfolio' },
  { href: '/ai-analysis', label: 'AI Analysis', icon: Brain, description: 'Smart insights' },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase, description: 'Track holdings' },
  { href: '/profit-guard', label: 'ProfitGuard', icon: Shield, description: 'Protect gains' },
  { href: '/calculator', label: 'Calculator', icon: Calculator, description: 'Trading tools' },
];

const MobileOptimizedHeaderComponent = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  }, [signOut]);

  const getUserInitials = useCallback(() => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
          <IgniteXLogo size="sm" showText={true} />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Features</span>
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

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Account</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="h-9 hidden sm:flex">
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/auth')} className="h-9 gap-1.5">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden"><User className="h-4 w-4" /></span>
                <ArrowRight className="h-4 w-4 hidden sm:inline" />
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export const MobileOptimizedHeader = memo(MobileOptimizedHeaderComponent);