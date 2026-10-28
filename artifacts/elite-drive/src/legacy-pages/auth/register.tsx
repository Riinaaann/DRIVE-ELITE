import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister, RegisterInputRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { CarLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuthToken } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterInputRole>("customer");
  
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { name, email, password, role } }, {
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
          title: "Registration failed",
          description: err?.data?.error || "Please check your information and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
            <CarLogo className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ELITE DRIVE</h1>
          <p className="text-muted-foreground mt-2">Join our premium platform</p>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Enter your details below to register</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
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
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={(v: any) => setRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full font-semibold" size="lg" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : "Create Account"}
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