import { useGetDashboardSummary, useGetRecentBookings, useGetFleetStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckSquare, CalendarClock, DollarSign, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: recent, isLoading: recLoading } = useGetRecentBookings();
  const { data: fleetStatus, isLoading: fleetLoading } = useGetFleetStatus();

  if (sumLoading || recLoading || fleetLoading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Platform performance and activity summary</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard 
            title="Total Revenue" 
            value={`₹${Number(summary.totalRevenue).toLocaleString("en-IN")}`} 
            icon={<DollarSign className="h-5 w-5 text-green-500" />} 
          />
          <SummaryCard 
            title="Active Bookings" 
            value={summary.activeBookings} 
            icon={<CalendarClock className="h-5 w-5 text-blue-500" />} 
          />
          <SummaryCard 
            title="Available Fleet" 
            value={`${summary.availableVehicles} / ${summary.totalVehicles}`} 
            icon={<Car className="h-5 w-5 text-primary" />} 
          />
          <SummaryCard 
            title="Total Customers" 
            value={summary.totalCustomers} 
            icon={<Users className="h-5 w-5 text-purple-500" />} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-semibold">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-muted-foreground">
                      <th className="py-3 px-4 font-medium">Customer</th>
                      <th className="py-3 px-4 font-medium">Vehicle</th>
                      <th className="py-3 px-4 font-medium">Dates</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent?.map((booking) => (
                      <tr key={booking.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium">{booking.user?.name}</div>
                        </td>
                        <td className="py-3 px-4">{booking.vehicle?.make} {booking.vehicle?.model}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(booking.pickupDate), "MMM d")} - {format(parseISO(booking.returnDate), "MMM d")}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))}
                    {!recent?.length && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">No recent bookings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border/60">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-semibold">Fleet Utilization</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {fleetStatus?.map((item) => {
                  const utilPercent = item.total > 0 ? (item.rented / item.total) * 100 : 0;
                  return (
                    <div key={item.category} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.available} available</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.rented} / {item.total}</p>
                        <div className="w-20 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${utilPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}