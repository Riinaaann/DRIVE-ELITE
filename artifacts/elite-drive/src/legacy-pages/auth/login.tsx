import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { CarLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, AlertCircle, KeyRound } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState<string | null>(null);

  // Password reset dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure your new password and confirm password match exactly.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      toast({
        title: "Password Reset Successful",
        description: data.message || "Your password has been updated. You can now sign in.",
      });

      setEmail(resetEmail);
      setPassword("");
      setShowResetDialog(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast({
        title: "Password Reset Failed",
        description: err.message || "Could not reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPendingApprovalMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setPendingApprovalMsg(data.error || "Your staff account is currently pending administrative approval.");
        toast({
          title: "Approval Required",
          description: "Your staff account has not yet been approved by an administrator.",
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      if (data?.token) {
        setAuthToken(data.token);
      }

      toast({
        title: "Signed in successfully",
        description: `Welcome back, ${data.user?.name || "User"}!`,
      });

      if (data?.user?.role === "admin" || data?.user?.role === "staff") {
        setLocation("/dashboard");
      } else {
        setLocation("/fleet");
      }
    } catch (err: any) {
      toast({
        title: "Sign in failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <CarLogo className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ELITE DRIVE</h1>
          <p className="text-muted-foreground mt-2">Premium Vehicle Rental Management</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApprovalMsg && (
              <Alert className="mb-4 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="font-semibold text-xs tracking-wide uppercase">Staff Approval Pending</AlertTitle>
                <AlertDescription className="text-xs mt-1 leading-relaxed">
                  {pendingApprovalMsg}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Phone</Label>
                <Input 
                  id="email" 
                  type="text" 
                  placeholder="name@example.com or +1234567890" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email || "");
                      setShowResetDialog(true);
                    }}
                    className="text-xs text-primary font-medium hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full font-semibold" size="lg" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-border/40 p-6">
            <p className="text-sm text-center text-muted-foreground w-full">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Register now
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <KeyRound className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Reset Password</DialogTitle>
            </div>
            <DialogDescription>
              Enter your registered email address or phone number and choose a new password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email or Phone</Label>
              <Input
                id="reset-email"
                type="text"
                placeholder="name@example.com or +1234567890"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 6 characters"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="••••••••"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-destructive mt-1 font-medium">Passwords do not match</p>
              )}
            </div>

            <DialogFooter className="pt-3 flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting ? "Updating..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
