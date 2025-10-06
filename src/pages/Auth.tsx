import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Chrome, Loader2 } from 'lucide-react';

// Validation schemas
const emailSchema = z.string().email({ message: "Please enter a valid email address" });
const passwordSchema = z.string()
  .min(6, { message: "Password must be at least 6 characters long" })
  .max(72, { message: "Password must be less than 72 characters" });

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      
      if (isSignUp) {
        passwordSchema.parse(password);
      } else if (password.length === 0) {
        throw new Error("Password is required");
      }
      
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, message: error.errors[0].message };
      }
      if (error instanceof Error) {
        return { valid: false, message: error.message };
      }
      return { valid: false, message: "Invalid input" };
    }
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return "An unexpected error occurred";
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials')) {
      return "Invalid email or password. Please try again.";
    }
    if (message.includes('user already registered')) {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (message.includes('email not confirmed')) {
      return "Please check your email and confirm your account before signing in.";
    }
    if (message.includes('invalid email')) {
      return "Please enter a valid email address.";
    }
    if (message.includes('password')) {
      return "Password must be at least 6 characters long.";
    }
    
    return error.message || "An unexpected error occurred";
  };

  const handleAuth = async (isSignUp: boolean) => {
    const validation = validateInputs(isSignUp);
    
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({
          title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      } else if (isSignUp) {
        toast({
          title: "Account Created Successfully!",
          description: "Please check your email to confirm your account before signing in.",
          duration: 6000,
        });
        setEmail('');
        setPassword('');
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        // Check if it's a configuration error
        if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
          toast({
            title: "Google Sign-In Not Configured",
            description: "Google authentication needs to be set up in Supabase. Please contact the administrator.",
            variant: "destructive",
            duration: 6000,
          });
        } else {
          toast({
            title: "Google Sign In Failed",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        }
        setGoogleLoading(false);
      }
      // Don't set loading to false here if no error - browser will redirect
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Google sign-in. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary"></CardTitle>
          <CardDescription>
            Access your AI-powered crypto predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={googleLoading || loading}
                  type="button"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Chrome className="h-4 w-4" />
                  )}
                  Continue with Google
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth(false)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth(false)}
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={() => handleAuth(false)} 
                className="w-full gap-2"
                disabled={loading || googleLoading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={googleLoading || loading}
                  type="button"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Chrome className="h-4 w-4" />
                  )}
                  Continue with Google
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth(true)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth(true)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>
              <Button 
                onClick={() => handleAuth(true)} 
                className="w-full gap-2"
                disabled={loading || googleLoading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;