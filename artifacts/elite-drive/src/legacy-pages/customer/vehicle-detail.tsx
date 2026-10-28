import { useRoute } from "wouter";
import { Link } from "wouter";
import { getGetVehicleQueryKey, useGetVehicle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Fuel, Settings, Users, Star, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function VehicleDetail() {
  const [, params] = useRoute("/vehicles/:id");
  const id = parseInt(params?.id || "0", 10);
  
  const { data: vehicle, isLoading, error } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) }
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading vehicle details...</div>;
  }

  if (error || !vehicle) {
    return <div className="p-8 text-center text-destructive">Vehicle not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-6xl">
      <Link href="/fleet" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Fleet
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-muted aspect-video flex items-center justify-center relative shadow-sm">
            {vehicle.imageUrl ? (
              <img 
                src={vehicle.imageUrl} 
                alt={`${vehicle.make} ${vehicle.model}`} 
                className="object-cover w-full h-full" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="font-bold text-4xl text-primary/40 uppercase tracking-widest">{vehicle.make}</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-white/90 text-black border-transparent shadow-sm px-3 py-1 text-sm">
                {vehicle.category}
              </Badge>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight">{vehicle.make} {vehicle.model}</h1>
            <p className="text-xl text-muted-foreground mt-2">{vehicle.year} • {vehicle.licensePlate}</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-4">Vehicle Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Fuel className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.fuelType}</span>
                <span className="text-xs text-muted-foreground">Fuel Type</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Settings className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.transmission}</span>
                <span className="text-xs text-muted-foreground">Transmission</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Users className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.seats}</span>
                <span className="text-xs text-muted-foreground">Seats</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                <span className="text-sm font-medium">{vehicle.rating.toFixed(1)} / 5</span>
                <span className="text-xs text-muted-foreground">Rating</span>
              </div>
            </div>
          </div>

          {vehicle.description && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{vehicle.description}</p>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-baseline mb-2 text-primary">
                <span className="text-2xl font-semibold mr-1">₹</span>
                <span className="text-5xl font-bold tracking-tight">{Number(vehicle.dailyRate).toLocaleString("en-IN")}</span>
                <span className="text-muted-foreground ml-2">/ day</span>
              </div>
              
              <div className="flex items-center gap-2 mt-4 mb-6">
                {vehicle.isAvailable ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Available for rental</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Currently unavailable</span>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span className="font-medium">₹10,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Included</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mileage</span>
                  <span className="font-medium">Unlimited</span>
                </div>
              </div>

              <Link href={`/vehicles/${vehicle.id}/book`} className="w-full block">
                <Button 
                  className="w-full font-bold text-base h-12" 
                  size="lg" 
                  disabled={!vehicle.isAvailable}
                >
                  {vehicle.isAvailable ? "Rent This Vehicle" : "Not Available"}
                </Button>
              </Link>
            </div>
            <div className="bg-muted/50 p-4 text-center text-xs text-muted-foreground border-t border-border/40">
              Free cancellation up to 48 hours before pickup.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}