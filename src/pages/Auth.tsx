import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordValidation";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { AlertCircle, Check, Mail } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const { signIn, signUp, resetPassword, resendVerificationEmail, user, session } = useAuth();
  const navigate = useNavigate();

  // Password strength tracking for signup
  const passwordValidation = password ? validatePassword(password) : null;

  useEffect(() => {
    // Auto-redirect verified and logged-in users to dashboard
    if (user && session) {
      navigate("/dashboard");
    }
  }, [user, session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(getAuthErrorMessage(error));
    } else {
      toast.success("Signed in successfully!");
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    if (passwordValidation && !passwordValidation.isValid) {
      toast.error("Please fix password requirements");
      return;
    }

    setLoading(true);

    const { error, data } = await signUp(email, password);

    if (error) {
      toast.error(getAuthErrorMessage(error));
      setLoading(false);
    } else {
      // Show email verification screen
      setVerificationEmail(email);
      setShowEmailVerification(true);
      setEmail("");
      setPassword("");
      toast.success("Account created! Please check your email to verify your account.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);

    const { error } = await resendVerificationEmail(verificationEmail);

    if (error) {
      toast.error("Failed to resend verification email. Please try again.");
    } else {
      toast.success("Verification email sent! Please check your inbox.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await resetPassword(resetEmail);

    if (error) {
      toast.error(getAuthErrorMessage(error));
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    }

    setLoading(false);
  };

  // Email verification screen
  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <strong>{verificationEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Next steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Open the email we sent you</li>
                  <li>Click the verification link</li>
                  <li>Return here to sign in</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowEmailVerification(false);
                setVerificationEmail("");
              }}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to IgniteX</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />

                  {/* Password Strength Indicator */}
                  {password && passwordValidation && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span
                          className="font-medium"
                          style={{ color: passwordValidation.strength.color }}
                        >
                          {passwordValidation.strength.label}
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${passwordValidation.strength.percentage}%`,
                            backgroundColor: passwordValidation.strength.color,
                          }}
                        />
                      </div>

                      {/* Password Requirements */}
                      <div className="space-y-1 mt-3">
                        {passwordValidation.errors.length > 0 && (
                          <div className="space-y-1">
                            {passwordValidation.errors.map((error, index) => (
                              <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                                <span>{error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {passwordValidation.isValid && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            <span>Password meets all requirements</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    You'll receive a verification email after signing up. Please check your inbox to activate your account.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || (passwordValidation && !passwordValidation.isValid)}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
