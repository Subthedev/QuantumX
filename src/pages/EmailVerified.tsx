import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const EmailVerified = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const [hasShownToast, setHasShownToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    // Check for errors in URL (both search params and hash)
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));

    const errorFromSearch = searchParams.get('error');
    const errorFromHash = hashParams.get('error');
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

    console.log('EmailVerified: user =', user ? 'exists' : 'null', ', session =', session ? 'exists' : 'null');
    console.log('URL search:', location.search);
    console.log('URL hash:', location.hash);
    console.log('Error:', errorFromSearch || errorFromHash, 'Code:', errorCode, 'Description:', errorDescription);

    if (errorFromSearch || errorFromHash) {
      if (errorCode === 'otp_expired') {
        setError('expired');
        setIsWaiting(false);
      } else {
        setError('general');
        setIsWaiting(false);
      }
      return;
    }

    // Give Supabase some time to process the session
    const timeout = setTimeout(() => {
      if (!user && !session) {
        console.log('Timeout: No session detected after 5 seconds');
        setIsWaiting(false);
      }
    }, 5000);

    if (user && session) {
      console.log('User and session found, showing success');
      clearTimeout(timeout);
      setIsWaiting(false);

      // Show success toast once
      if (!hasShownToast) {
        toast.success("Email verified successfully! You're now logged in.");
        setHasShownToast(true);
      }

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

      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    }

    return () => clearTimeout(timeout);
  }, [user, session, navigate, hasShownToast, location]);

  // Show error states
  if (error === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Verification Link Expired</CardTitle>
            <CardDescription>
              Your email verification link has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Verification links expire after 24 hours for security reasons.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Go to Sign In & Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'general') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>
              We couldn't verify your email. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no user/session yet and still waiting, show loading
  if ((!user || !session) && isWaiting) {
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

  // If no user/session and timeout passed, show error
  if (!user || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Verification Incomplete</CardTitle>
            <CardDescription>
              We couldn't complete the verification. The link may be invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Return to Sign In
            </Button>
          </CardContent>
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
