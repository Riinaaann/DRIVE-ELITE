import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { CarLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: clearAuth } = useAuth();
  const logoutMutation = useLogout();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
        setLocation("/login");
      },
      onError: () => {
        // Force clear anyway if network fails
        clearAuth();
        setLocation("/login");
      }
    });
  };

  if (!user) return <>{children}</>;

  const isAdminOrStaff = user.role === "admin" || user.role === "staff";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center mx-auto px-4 md:px-8">
          <Link href={isAdminOrStaff ? "/dashboard" : "/fleet"} className="flex items-center gap-2 mr-6">
            <CarLogo className="h-8 w-8" />
            <span className="font-bold text-lg tracking-tight text-foreground hidden md:inline-block">
              ELITE DRIVE
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            {isAdminOrStaff ? (
              <>
                <Link href="/dashboard" className={`transition-colors hover:text-foreground/80 ${location === "/dashboard" ? "text-foreground" : "text-foreground/60"}`}>Dashboard</Link>
                <Link href="/admin/vehicles" className={`transition-colors hover:text-foreground/80 ${location.startsWith("/admin/vehicles") ? "text-foreground" : "text-foreground/60"}`}>Vehicles</Link>
                <Link href="/admin/bookings" className={`transition-colors hover:text-foreground/80 ${location.startsWith("/admin/bookings") ? "text-foreground" : "text-foreground/60"}`}>Bookings</Link>
                {user.role === "admin" && (
                  <Link href="/admin/users" className={`transition-colors hover:text-foreground/80 ${location.startsWith("/admin/users") ? "text-foreground" : "text-foreground/60"}`}>Users</Link>
                )}
              </>
            ) : (
              <>
                <Link href="/fleet" className={`transition-colors hover:text-foreground/80 ${location.startsWith("/fleet") || location.startsWith("/vehicles") ? "text-foreground" : "text-foreground/60"}`}>Fleet</Link>
                <Link href="/my-bookings" className={`transition-colors hover:text-foreground/80 ${location === "/my-bookings" ? "text-foreground" : "text-foreground/60"}`}>My Bookings</Link>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-auto flex items-center gap-2 rounded-full pl-2 pr-4 hover:bg-accent/50 border border-transparent hover:border-border transition-all">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start hidden sm:flex">
                    <span className="text-sm font-medium leading-none">{user.name}</span>
                    <span className="text-xs text-muted-foreground mt-1 capitalize">{user.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none flex items-center gap-2">
                      {user.name}
                      {user.isVerified && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">Verified</Badge>}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}