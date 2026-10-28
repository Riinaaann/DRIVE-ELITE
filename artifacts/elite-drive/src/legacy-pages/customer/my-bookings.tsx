import { useState } from "react";
import { useListBookings, useCancelBooking, Booking } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Loader2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Button, buttonVariants } from "@/components/ui/button";

export default function MyBookings() {
  const { user } = useAuth();
  
  const { data: bookings, isLoading } = useListBookings({ 
    userId: user?.id 
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading your bookings...</div>;
  }

  const activeBookings = bookings?.filter((b: Booking) => b.status === "active" || b.status === "pending" || b.status === "confirmed") || [];
  const pastBookings = bookings?.filter((b: Booking) => b.status === "completed" || b.status === "cancelled") || [];

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
                {activeBookings.map((booking: Booking) => (
                  <BookingCard key={booking.id} booking={booking} allowCancellation={true} />
                ))}
              </div>
            </section>
          )}

          {pastBookings.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Past Bookings</h2>
              <div className="grid gap-4 opacity-80">
                {pastBookings.map((booking: Booking) => (
                  <BookingCard key={booking.id} booking={booking} allowCancellation={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BookingCard({ 
  booking, 
  allowCancellation = false 
}: { 
  booking: Booking; 
  allowCancellation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cancelMutation = useCancelBooking();

  const dPickup = parseISO(booking.pickupDate);
  const dReturn = parseISO(booking.returnDate);

  const canCancel = allowCancellation && (
    booking.status === "pending" || 
    booking.status === "confirmed" || 
    booking.status === "active"
  );

  const handleCancelBooking = () => {
    cancelMutation.mutate(
      { id: booking.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
          setOpen(false);
          toast({
            title: "Booking Cancelled",
            description: `Reservation #${booking.id.toString().padStart(6, '0')} has been successfully cancelled.`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Cancellation Failed",
            description: error?.message || "Could not cancel the reservation. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

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

          {canCancel && (
            <div className="mt-5 pt-4 border-t border-border/50 flex justify-end">
              <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Cancel Booking
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your reservation for the{" "}
                      <strong>{booking.vehicle?.make} {booking.vehicle?.model}</strong> (Booking #{booking.id.toString().padStart(6, '0')})?
                      This action will release the reserved vehicle immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelMutation.isPending}>
                      Keep Booking
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleCancelBooking();
                      }}
                      disabled={cancelMutation.isPending}
                      className={buttonVariants({ variant: "destructive" })}
                    >
                      {cancelMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          Cancelling...
                        </>
                      ) : (
                        "Yes, Cancel Booking"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
