import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Authenticating | 4H Crypto Signals";

    let unsubscribe: (() => void) | undefined;
    let timeoutId: number | undefined;

    const finalize = async () => {
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash;
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          // Clean URL hash to avoid exposing tokens
          window.history.replaceState(null, "", window.location.pathname);
          if (!error) {
            navigate("/dashboard", { replace: true });
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/dashboard", { replace: true });
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (session) {
              navigate("/dashboard", { replace: true });
            }
          }
        );
        unsubscribe = () => subscription.unsubscribe();

        timeoutId = window.setTimeout(() => {
          subscription.unsubscribe();
          navigate("/auth", { replace: true });
        }, 8000);
      } catch (_) {
        navigate("/auth", { replace: true });
      }
    };

    finalize();

    return () => {
      unsubscribe?.();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Finalizing sign-in…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>Verifying your email link and preparing your dashboard.</p>
          <Progress value={66} className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
