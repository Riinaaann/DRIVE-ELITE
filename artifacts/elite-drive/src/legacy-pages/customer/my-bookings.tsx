import { useState } from "react";
import { useListBookings } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MyBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Change of plans");
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: bookings, isLoading } = useListBookings({ 
    userId: user?.id 
  });

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!res.ok) throw new Error("Failed to cancel");

      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Booking Cancelled",
        description: "Your reservation has been cancelled and logged.",
      });
      setBookingToCancel(null);
    } catch (err) {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel the booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading your bookings...</div>;
  }

  const activeBookings = bookings?.filter(b => b.status === "active" || b.status === "pending" || b.status === "confirmed") || [];
  const pastBookings = bookings?.filter(b => b.status === "completed" || b.status === "cancelled") || [];

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your upcoming and past reservations</p>
      </div>

      {(!bookings || bookings.length === 0) ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border border-border/60">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
          <p className="text-muted-foreground mb-6">You haven't made any reservations with Elite Drive.</p>
          <Link href="/fleet">
            <Button>Browse Fleet</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {activeBookings.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Active & Upcoming
              </h2>
              <div className="grid gap-4">
                {activeBookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancelClick={() => {
                      setCancelReason("Change of plans");
                      setBookingToCancel(booking);
                    }}
                    isCancelling={isCancelling && bookingToCancel?.id === booking.id}
                  />
                ))}
              </div>
            </section>
          )}

          {pastBookings.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Past Bookings</h2>
              <div className="grid gap-4 opacity-80">
                {pastBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your booking for{" "}
              <span className="font-semibold text-foreground">
                {bookingToCancel?.vehicle?.make} {bookingToCancel?.vehicle?.model}
              </span>
              ? This action will free up the vehicle and log your cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2 space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">Reason for cancellation</Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Change of plans">Change of plans</SelectItem>
                <SelectItem value="Found another vehicle">Found another vehicle</SelectItem>
                <SelectItem value="Scheduling conflict">Scheduling conflict</SelectItem>
                <SelectItem value="Booked by mistake">Booked by mistake</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmCancel();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BookingCard({
  booking,
  onCancelClick,
  isCancelling,
}: {
  booking: any;
  onCancelClick?: () => void;
  isCancelling?: boolean;
}) {
  const dPickup = parseISO(booking.pickupDate);
  const dReturn = parseISO(booking.returnDate);
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/20 transition-colors">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 bg-muted shrink-0 flex items-center justify-center p-4">
          {booking.vehicle?.imageUrl ? (
            <img src={booking.vehicle.imageUrl} alt="" className="object-cover w-full h-24 sm:h-full rounded-md" />
          ) : (
            <span className="font-bold text-muted-foreground uppercase tracking-wider">{booking.vehicle?.make || 'Vehicle'}</span>
          )}
        </div>
        <CardContent className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg leading-none mb-1">
                  {booking.vehicle?.make} {booking.vehicle?.model}
                </h3>
                <p className="text-sm text-muted-foreground">Booking #{booking.id.toString().padStart(6, '0')}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Dates</p>
                <p className="font-medium">{format(dPickup, "MMM d")} - {format(dReturn, "MMM d, yyyy")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{booking.durationDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Cost</p>
                <p className="font-bold text-primary text-base">₹{Number(booking.totalCost).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {canCancel && onCancelClick && (
            <div className="mt-4 pt-4 border-t border-border/40 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={onCancelClick}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
