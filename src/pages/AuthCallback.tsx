import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Completing sign in • IgniteX";

    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback - Processing magic link');
        
        // Parse URL parameters - Supabase can send tokens in either hash or query
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for errors first
        const error = queryParams.get('error') || hashParams.get('error');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error('Auth error:', error, errorDescription);
          setError(errorDescription || error);
          return;
        }

        // Magic link tokens can come in different formats
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const code = queryParams.get('code');

        console.log('Auth params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type, 
          hasCode: !!code 
        });

        if (accessToken && refreshToken) {
          // This is a magic link with tokens - set the session
          console.log('Setting session from magic link tokens');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }

          if (data.session?.user) {
            console.log('Session established, user:', data.session.user.email);
            
            // For email verification, we might need to refresh the session
            if (type === 'signup' || type === 'magiclink') {
              await supabase.auth.refreshSession();
            }
            
            // Navigate to dashboard
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 100);
          }
        } else if (code) {
          // OAuth code flow
          console.log('Exchanging code for session');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            throw exchangeError;
          }

          if (data.session?.user) {
            console.log('Session established via code exchange');
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 100);
          }
        } else {
          // No tokens found - check if we already have a session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('Existing session found');
            navigate("/dashboard", { replace: true });
          } else {
            console.log('No auth tokens found in URL');
            setError("Invalid or expired authentication link. Please try signing in again.");
          }
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Failed to complete sign-in");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <section className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Sign-in Error</h1>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={() => navigate("/auth")} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <section className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Completing sign-in…</h1>
        <p className="text-muted-foreground max-w-md">
          Please wait while we verify your email and securely sign you in.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </section>
    </main>
  );
};

export default AuthCallback;
