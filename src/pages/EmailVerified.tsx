import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const EmailVerified = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Handle email verification from URL hash
    const handleEmailVerification = async () => {
      try {
        // Get the hash from URL (contains the verification token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'signup') {
          // Exchange the token for a session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) {
            console.error('Session error:', error);
            setHasError(true);
            setIsProcessing(false);
            toast.error("Failed to verify email. Please try again.");
            return;
          }

          if (data.session) {
            toast.success("Email verified successfully!");
            setIsProcessing(false);
          }
        } else {
          // No token in URL, check if already authenticated
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setHasError(true);
        setIsProcessing(false);
        toast.error("An error occurred during verification.");
      }
    };

    handleEmailVerification();
  }, []);

  useEffect(() => {
    // Check if user is verified and authenticated, then start countdown
    if (user && session && !isProcessing) {
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
  }, [user, session, navigate, isProcessing]);

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your email. The link may have expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <button
              onClick={() => navigate("/auth")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no user/session yet, show loading (Supabase is processing)
  if (!user || !session || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle>Verifying Your Email...</CardTitle>
            <CardDescription>
              Please wait while we confirm your email address and log you in
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
