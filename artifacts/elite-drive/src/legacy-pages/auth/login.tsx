import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { CarLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        if (data?.token) {
          setAuthToken(data.token);
        }
        if (data?.user?.role === "admin" || data?.user?.role === "staff") {
          setLocation("/dashboard");
        } else {
          setLocation("/fleet");
        }
      },
      onError: (err) => {
        toast({
          title: "Login failed",
          description: err?.data?.error || "Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[400px]">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full font-semibold" size="lg" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
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
    </div>
  );
}