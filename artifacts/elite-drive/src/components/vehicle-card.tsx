import { Vehicle } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Fuel, Settings, Star } from "lucide-react";
import { Link } from "wouter";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-lg border-border/60 hover:border-primary/30">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
        {vehicle.imageUrl ? (
          <img 
            src={vehicle.imageUrl} 
            alt={`${vehicle.make} ${vehicle.model}`} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="font-bold text-2xl text-primary/40 uppercase tracking-widest">{vehicle.make}</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {!vehicle.isAvailable && (
            <Badge variant="destructive" className="shadow-sm font-semibold">Unavailable</Badge>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <Badge variant="secondary" className="bg-white/90 text-black hover:bg-white border-transparent">
            {vehicle.category}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="p-5 pb-0">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{vehicle.year}</p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline text-primary">
              <span className="text-sm font-medium mr-1">₹</span>
              <span className="text-2xl font-bold tracking-tight">{Number(vehicle.dailyRate).toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-muted-foreground">/ day</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5 pt-4 flex-1">
        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary/60" />
            <span className="truncate">{vehicle.fuelType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary/60" />
            <span className="truncate">{vehicle.transmission}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary/60" />
            <span className="truncate">{vehicle.seats} Seats</span>
          </div>
          <div className="flex items-center gap-2 text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
            <span className="truncate text-foreground font-medium">{vehicle.rating.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0 mt-auto">
        <Link href={`/vehicles/${vehicle.id}`} className="w-full block">
          <Button className="w-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}