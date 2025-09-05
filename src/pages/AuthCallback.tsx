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
        // Check if we already have a session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // Get the full URL including hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in URL params
        const error = queryParams.get('error') || hashParams.get('error');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          setError(errorDescription || error);
          return;
        }

        // Try to get verification token from either hash or query params
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const code = queryParams.get('code');

        if (accessToken && refreshToken) {
          // Handle hash fragment tokens (email confirmation)
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          if (data.session?.user) {
            navigate("/dashboard", { replace: true });
          }
        } else if (code) {
          // Handle OAuth code exchange
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) throw exchangeError;
          if (data.session?.user) {
            navigate("/dashboard", { replace: true });
          }
        } else {
          // No tokens or code found, wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
              navigate("/dashboard", { replace: true });
            }
          });

          // Clean up subscription on unmount
          return () => subscription.unsubscribe();
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
