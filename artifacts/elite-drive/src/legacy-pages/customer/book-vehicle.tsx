import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { getGetVehicleQueryKey, useGetVehicle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays, parseISO, isValid } from "date-fns";

export default function BookVehicle() {
  const [, params] = useRoute("/vehicles/:id/book");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0", 10);
  
  // Set default dates: tomorrow and day after tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const [pickupDate, setPickupDate] = useState(format(tomorrow, "yyyy-MM-dd"));
  const [returnDate, setReturnDate] = useState(format(dayAfter, "yyyy-MM-dd"));
  
  const { data: vehicle, isLoading } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) }
  });

  if (isLoading || !vehicle) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Calculate duration and costs
  let duration = 0;
  let totalCost = 0;
  
  const dPickup = parseISO(pickupDate);
  const dReturn = parseISO(returnDate);
  
  if (isValid(dPickup) && isValid(dReturn)) {
    duration = differenceInDays(dReturn, dPickup);
    if (duration < 1) duration = 1; // Minimum 1 day
    totalCost = duration * vehicle.dailyRate;
  }

  const handleContinue = () => {
    setLocation(`/vehicles/${id}/confirm?pickup=${pickupDate}&return=${returnDate}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href={`/vehicles/${id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Details
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Rental Details</h1>
        <p className="text-muted-foreground mt-1">Select your dates for the {vehicle.make} {vehicle.model}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Select Dates</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pick-up Date</Label>
                  <Input 
                    id="pickup" 
                    type="date" 
                    min={format(today, "yyyy-MM-dd")}
                    value={pickupDate}
                    onChange={(e) => {
                      setPickupDate(e.target.value);
                      // Auto-adjust return date if it's before pickup
                      const newP = parseISO(e.target.value);
                      const currR = parseISO(returnDate);
                      if (isValid(newP) && isValid(currR) && newP >= currR) {
                        const next = new Date(newP);
                        next.setDate(next.getDate() + 1);
                        setReturnDate(format(next, "yyyy-MM-dd"));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return">Return Date</Label>
                  <Input 
                    id="return" 
                    type="date" 
                    min={pickupDate}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className="border-border/60 sticky top-24 bg-card/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
              
              <div className="flex gap-4 items-center mb-6 pb-6 border-b border-border/40">
                {vehicle.imageUrl ? (
                  <img src={vehicle.imageUrl} alt="" className="w-16 h-12 object-cover rounded bg-muted" />
                ) : (
                  <div className="w-16 h-12 rounded bg-primary/10" />
                )}
                <div>
                  <p className="font-medium text-sm leading-tight">{vehicle.make}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.model}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Rate</span>
                  <span>₹{Number(vehicle.dailyRate).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span className="text-green-600 dark:text-green-400">Included</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-between items-end mb-6">
                <span className="font-semibold">Total Cost</span>
                <span className="text-2xl font-bold text-primary">₹{totalCost.toLocaleString("en-IN")}</span>
              </div>

              <Button 
                onClick={handleContinue} 
                className="w-full font-bold"
                size="lg"
                disabled={duration < 1}
              >
                Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}