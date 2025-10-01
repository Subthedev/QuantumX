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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { IgniteXLogo } from '@/components/ui/ignitex-logo';
import { 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  CreditCard, 
  LayoutDashboard,
  ArrowRight,
  Shield,
  FileText,
  Home,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const navigationLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio', icon: CreditCard },
  { href: '/privacy-policy', label: 'Privacy', icon: Shield },
  { href: '/terms-of-service', label: 'Terms', icon: FileText },
];

const MobileOptimizedHeaderComponent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account"
      });
      navigate('/');
      setIsSheetOpen(false);
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

  const handleNavigation = useCallback((href: string) => {
    navigate(href);
    setIsSheetOpen(false);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <IgniteXLogo size="sm" showText={true} />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navigationLinks.slice(0, 2).map((link) => (
            <Link key={link.href} to={link.href}>
              <Button variant="ghost" size="sm" className="font-medium">
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/pricing">
                <Button variant="outline" size="sm" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Upgrade
                </Button>
              </Link>
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
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/pricing')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          {user && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px] p-0">
              {/* Mobile Sheet Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <IgniteXLogo size="sm" showText={true} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSheetOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col h-full">
                {user && (
                  <div className="p-4 border-b bg-muted/30">
                    <p className="text-sm font-medium">Signed in as</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user.email}
                    </p>
                  </div>
                )}
                
                {/* Navigation Links */}
                <nav className="flex-1 p-4">
                  <div className="space-y-1">
                    {navigationLinks.map((link) => (
                      <button
                        key={link.href}
                        onClick={() => handleNavigation(link.href)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors text-left"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </button>
                    ))}
                  </div>
                </nav>

                {/* Actions */}
                <div className="p-4 border-t mt-auto space-y-2">
                  {user ? (
                    <>
                      <Button 
                        onClick={() => handleNavigation('/pricing')}
                        variant="outline" 
                        className="w-full justify-start gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Manage Credits
                      </Button>
                      <Button 
                        onClick={handleSignOut}
                        variant="ghost" 
                        className="w-full justify-start gap-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={() => handleNavigation('/auth')}
                        variant="outline" 
                        className="w-full"
                      >
                        Sign In
                      </Button>
                      <Button 
                        onClick={() => handleNavigation('/auth')}
                        className="w-full gap-2"
                      >
                        Get Started
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};

export const MobileOptimizedHeader = memo(MobileOptimizedHeaderComponent);