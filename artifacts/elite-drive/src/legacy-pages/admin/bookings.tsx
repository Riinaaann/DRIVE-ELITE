import { useState } from "react";
import { useListBookings, useUpdateBooking, BookingStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: bookings, isLoading } = useListBookings(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );
  
  const updateMutation = useUpdateBooking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpdateStatus = (id: number, status: any) => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        toast({ title: `Booking marked as ${status}` });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage all reservations</p>
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              {Object.values(BookingStatus).map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground bg-muted/20">
                  <th className="py-3 px-4 font-medium">ID</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Vehicle</th>
                  <th className="py-3 px-4 font-medium">Dates</th>
                  <th className="py-3 px-4 font-medium">Total</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center">Loading...</td></tr>
                ) : !bookings?.length ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No bookings found.</td></tr>
                ) : bookings.map(b => (
                  <tr key={b.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-mono text-muted-foreground">#{b.id.toString().padStart(5, '0')}</td>
                    <td className="py-3 px-4 font-medium">{b.user?.name}</td>
                    <td className="py-3 px-4">{b.vehicle?.make} {b.vehicle?.model}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {format(parseISO(b.pickupDate), "MMM d, yy")} - {format(parseISO(b.returnDate), "MMM d, yy")}
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{Number(b.totalCost).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <Select 
                        value={b.status} 
                        onValueChange={(v) => handleUpdateStatus(b.id, v)}
                        disabled={updateMutation.isPending}
                      >
                        <SelectTrigger className="w-[130px] ml-auto h-8 text-xs">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(BookingStatus).map(s => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}