import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/main-layout";
import NotFound from "@/legacy-pages/not-found";
import Login from "@/legacy-pages/auth/login";
import Register from "@/legacy-pages/auth/register";
import Fleet from "@/legacy-pages/customer/fleet";
import VehicleDetail from "@/legacy-pages/customer/vehicle-detail";
import BookVehicle from "@/legacy-pages/customer/book-vehicle";
import ConfirmBooking from "@/legacy-pages/customer/confirm-booking";
import MyBookings from "@/legacy-pages/customer/my-bookings";
import Dashboard from "@/legacy-pages/admin/dashboard";
import AdminVehicles from "@/legacy-pages/admin/vehicles";
import AdminBookings from "@/legacy-pages/admin/bookings";
import AdminUsers from "@/legacy-pages/admin/users";

const queryClient = new QueryClient();

function ProtectedContent({ component: Component, adminOnly, params }: { component: React.ComponentType<any>; adminOnly?: boolean; params: any }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user?.role === "customer") {
    return <Redirect to="/fleet" />;
  }

  return (
    <MainLayout>
      <Component params={params} />
    </MainLayout>
  );
}

function ProtectedRoute({ component, adminOnly = false, ...rest }: { component: React.ComponentType<any>; adminOnly?: boolean; path: string }) {
  return (
    <Route {...rest}>
      {(params) => <ProtectedContent component={component} adminOnly={adminOnly} params={params} />}
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <ProtectedRoute path="/fleet" component={Fleet} />
      <ProtectedRoute path="/vehicles/:id/book" component={BookVehicle} />
      <ProtectedRoute path="/vehicles/:id/confirm" component={ConfirmBooking} />
      <ProtectedRoute path="/vehicles/:id" component={VehicleDetail} />
      <ProtectedRoute path="/my-bookings" component={MyBookings} />

      <ProtectedRoute path="/dashboard" component={Dashboard} adminOnly />
      <ProtectedRoute path="/admin/vehicles" component={AdminVehicles} adminOnly />
      <ProtectedRoute path="/admin/bookings" component={AdminBookings} adminOnly />
      <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="/">
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
