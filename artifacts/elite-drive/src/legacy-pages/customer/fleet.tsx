import { useState, useEffect } from "react";
import { useListVehicles } from "@workspace/api-client-react";
import { VehicleCard } from "@/components/vehicle-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "Luxury", "Premium", "Normal"];

export default function Fleet() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams: any = {};
  if (category !== "All") queryParams.category = category;
  if (debouncedSearch) queryParams.search = debouncedSearch;

  const { data: vehicles, isLoading } = useListVehicles(queryParams);

  return (
    <div className="container mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Available Fleet</h1>
          <p className="text-muted-foreground mt-1">Browse our collection of premium vehicles</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search vehicles..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <Badge
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm transition-all ${
              category === cat 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                : "bg-background hover:bg-muted/50 text-muted-foreground"
            }`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="rounded-xl border border-border/60 overflow-hidden bg-card">
              <div className="aspect-[16/10] bg-muted animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !vehicles?.length ? (
        <div className="text-center py-24 bg-muted/20 rounded-xl border border-border/40 border-dashed">
          {search || category !== "All" ? (
            <>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No vehicles found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                No vehicles match your current search or category filter.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategory("All"); }}>
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-5">
                <Car className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No cars available yet</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Our fleet is being set up. Please check back soon — exciting vehicles are coming your way!
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map(vehicle => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}