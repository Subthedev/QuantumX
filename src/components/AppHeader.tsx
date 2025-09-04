import { memo } from 'react';
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
import { AIBrainIcon } from '@/components/ui/ai-brain-icon';
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
  Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AppHeaderComponent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
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
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const navigationLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/about', label: 'About', icon: FileText },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pricing', label: 'Pricing', icon: CreditCard },
  ];

  return (
    <nav className="bg-background/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <AIBrainIcon className="h-7 w-7 md:h-8 md:w-8" />
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              IgniteX
            </h1>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navigationLinks.map((link) => (
              <Link 
                key={link.href}
                to={link.href} 
                className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
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
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col gap-4 mt-6">
                  {user && (
                    <div className="pb-4 border-b">
                      <p className="text-sm font-medium">Signed in as</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user.email}
                      </p>
                    </div>
                  )}
                  
                  <nav className="flex flex-col gap-2">
                    {navigationLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    ))}
                  </nav>

                  <div className="pt-4 border-t flex flex-col gap-2">
                    {user ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start gap-2"
                          onClick={() => navigate('/pricing')}
                        >
                          <CreditCard className="h-4 w-4" />
                          Subscription
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link to="/auth" className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            Sign In
                          </Button>
                        </Link>
                        <Link to="/auth" className="w-full">
                          <Button size="sm" className="w-full gap-2">
                            Get Started
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Memoize the header to prevent unnecessary re-renders
export const AppHeader = memo(AppHeaderComponent);