import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

const EmailVerified = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Check if user is verified and authenticated
    if (user && session) {
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Redirect to dashboard
            navigate("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user, session, navigate]);

  // If no user/session yet, show loading (Supabase is processing)
  if (!user || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle>Verifying Your Email...</CardTitle>
            <CardDescription>
              Please wait while we confirm your email address
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // User is verified and authenticated
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Email Verified Successfully!</CardTitle>
          <CardDescription>
            Welcome to IgniteX, {user.email?.split('@')[0]}!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              ✓ Your account has been verified
            </p>
            <p className="text-sm text-green-700 mt-1">
              ✓ You're now logged in
            </p>
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard in <span className="font-bold text-primary">{countdown}</span> second{countdown !== 1 ? 's' : ''}...
            </p>
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-primary hover:underline mt-4"
          >
            Skip and go to dashboard →
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;
