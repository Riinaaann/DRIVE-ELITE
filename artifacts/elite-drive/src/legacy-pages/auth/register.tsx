import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { CarLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"customer" | "staff">("customer");
  const [isLoading, setIsLoading] = useState(false);
  const [staffRegisteredSuccess, setStaffRegisteredSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure your password and confirm password fields match exactly.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please check your details.");
      }

      // If staff member registered, show approval notice
      if (role === "staff" || data.requiresApproval) {
        setStaffRegisteredSuccess(true);
        toast({
          title: "Registration Submitted",
          description: "Your staff account has been submitted for administrator approval.",
        });
        return;
      }

      // Customer registered -> log in immediately
      if (data?.token) {
        setAuthToken(data.token);
      }
      toast({
        title: "Welcome to Elite Drive!",
        description: "Your customer account is active. Start exploring our luxury fleet.",
      });
      setLocation("/fleet");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Please check your information and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Staff pending approval confirmation screen
  if (staffRegisteredSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-[440px]">
          <Card className="border-border/60 shadow-xl shadow-black/5 text-center p-6">
            <div className="h-16 w-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold mb-2">Registration Pending</CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed mb-6">
              Thank you, <span className="font-semibold text-foreground">{name}</span>. Your staff account for <span className="font-semibold text-foreground">{email}</span> has been submitted.
            </CardDescription>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left mb-6 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-4 w-4" /> Administrative Approval Required
              </p>
              <p className="text-xs text-muted-foreground leading-normal">
                To protect fleet operations, staff accounts must be confirmed by an administrator before access is granted. Please contact your system administrator to approve your account.
              </p>
            </div>

            <Link href="/login" className="w-full block">
              <Button className="w-full font-semibold" size="lg">
                Back to Sign In <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <CarLogo className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ELITE DRIVE</h1>
          <p className="text-muted-foreground mt-2">Join our premium vehicle rental platform</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              {role === "customer" 
                ? "Sign up for immediate access to browse and rent vehicles" 
                : "Register for staff access (requires admin approval)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="e.g. Rahul Sharma" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1 font-medium">Passwords do not match</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer (Instant Access)</SelectItem>
                    <SelectItem value="staff">Staff Member (Requires Approval)</SelectItem>
                  </SelectContent>
                </Select>
                {role === "staff" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Staff accounts require confirmation by an administrator before sign in.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full font-semibold" size="lg" disabled={isLoading}>
                {isLoading ? "Creating Account..." : role === "customer" ? "Create Customer Account" : "Submit Staff Registration"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-border/40 p-6">
            <p className="text-sm text-center text-muted-foreground w-full">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
