import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Completing sign in • IgniteX"; // SEO: concise title

    // 1) If a session already exists (e.g., user reopened link), go to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
        return;
      }
    });

    // 2) Listen for the magic-link / email confirmation to complete and sign in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
