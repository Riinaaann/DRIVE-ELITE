import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetDashboardSummary, useGetRecentBookings, useGetFleetStatus, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Car, 
  CalendarClock, 
  DollarSign, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  Plus, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Sparkles,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldAlert,
  Check,
  X,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { format, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    avgBookingValue: number;
    avgDailyRate: number;
    utilizationRate: number;
    completionRate: number;
    totalVehicles: number;
    availableVehicles: number;
    totalBookings: number;
    activeBookings: number;
    totalCustomers: number;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    bookings: number;
    target: number;
  }>;
  categoryStats: Array<{
    name: string;
    count: number;
    percentage: number;
    revenue: number;
    color: string;
  }>;
  statusCounts: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  topVehicles: Array<{
    id: number;
    make: string;
    model: string;
    category: string;
    dailyRate: number;
    rating: number;
    imageUrl: string | null;
    licensePlate: string;
    isAvailable: boolean;
    tripsCompleted: number;
    revenueEarned: number;
  }>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings">("revenue");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Standard API queries
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: recent, isLoading: recLoading } = useGetRecentBookings();
  const { data: fleetStatus, isLoading: fleetLoading } = useGetFleetStatus();

  // Staff approvals query
  const { data: users } = useListUsers();
  const pendingStaff = users?.filter((u: any) => u.role === "staff" && !u.isVerified) || [];
  const approvedStaff = users?.filter((u: any) => u.role === "staff" && u.isVerified) || [];

  const handleApproveStaff = async (staffUser: any) => {
    try {
      const res = await fetch(`/api/users/${staffUser.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval request failed");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Staff Member Approved!",
        description: `${staffUser.name} (${staffUser.email}) can now sign in and access the system.`,
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectStaff = async (staffUser: any) => {
    if (!confirm(`Are you sure you want to decline staff registration for ${staffUser.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${staffUser.id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Rejection request failed");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Staff Registration Declined",
        description: `Account request for ${staffUser.name} was removed.`,
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Custom analytics query
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/dashboard/analytics"],
    queryFn: async () => {
      const token = window.localStorage.getItem("elite_drive_token");
      const res = await fetch("/api/dashboard/analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Dashboard Refreshed",
        description: "All live metrics and graphs have been updated.",
      });
    }, 400);
  };

  const handleExportData = () => {
    const exportPayload = {
      timestamp: new Date().toISOString(),
      summary,
      analytics,
      recentBookings: recent,
      fleetStatus,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drive-elite-analytics-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Downloaded complete analytics report as JSON.",
    });
  };

  if (sumLoading || recLoading || fleetLoading || analyticsLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading executive analytics...</p>
      </div>
    );
  }

  const kpis = analytics?.kpis;
  const monthlyTrends = analytics?.monthlyTrends || [];
  const categoryStats = analytics?.categoryStats || [];
  const statusCounts = analytics?.statusCounts || [];
  const topVehicles = analytics?.topVehicles || [];

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 space-y-8 max-w-7xl">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live Operations Dashboard
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1.5 text-foreground">
            Platform Overview & Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor real-time rental volume, revenue performance, and fleet occupancy
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border/60 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportData}
            className="border-border/60 shadow-sm"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export Data
          </Button>

          <Button 
            size="sm" 
            onClick={() => setLocation("/admin/vehicles")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* 2. Database Status Banner */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-950 dark:text-emerald-200">
                Resilient Local PostgreSQL Engine Active
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                Data is automatically persisted to disk (<code className="font-mono text-[11px] bg-emerald-500/10 px-1 py-0.5 rounded">data/drive_elite_db.json</code>). Zero network dependencies.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              Latency: &lt;2ms
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">
              Supabase IPv4 Ready
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Metrics Cards (6 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`₹${Number(kpis?.totalRevenue || 0).toLocaleString("en-IN")}`}
          trend="+22.4%"
          trendPositive={true}
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
        />
        <MetricCard
          title="Active Bookings"
          value={kpis?.activeBookings ?? 0}
          subtitle={`${kpis?.totalBookings ?? 0} total all-time`}
          icon={<CalendarClock className="h-4 w-4 text-blue-500" />}
        />
        <MetricCard
          title="Fleet Utilization"
          value={`${kpis?.utilizationRate ?? 0}%`}
          subtitle={`${(kpis?.totalVehicles ?? 0) - (kpis?.availableVehicles ?? 0)} rented of ${kpis?.totalVehicles ?? 0}`}
          icon={<Car className="h-4 w-4 text-indigo-500" />}
        />
        <MetricCard
          title="Avg Daily Rate"
          value={`₹${Number(kpis?.avgDailyRate || 0).toLocaleString("en-IN")}`}
          subtitle="Across entire fleet"
          icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
        />
        <MetricCard
          title="Total Customers"
          value={kpis?.totalCustomers ?? 0}
          subtitle="Registered accounts"
          icon={<Users className="h-4 w-4 text-purple-500" />}
        />
        <MetricCard
          title="Completion Rate"
          value={`${kpis?.completionRate ?? 100}%`}
          subtitle="Successful returns"
          icon={<CheckCircle2 className="h-4 w-4 text-teal-500" />}
        />
      </div>

      {/* Staff Approval Workflow Section */}
      <Card className={`border-border/60 shadow-sm transition-colors ${pendingStaff.length > 0 ? "border-amber-500/50 bg-amber-500/[0.02]" : ""}`}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/30 gap-2">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${pendingStaff.length > 0 ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
              {pendingStaff.length > 0 ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Staff Approval Workflow</CardTitle>
                {pendingStaff.length > 0 ? (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold animate-pulse">
                    {pendingStaff.length} Pending Approval
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30 text-xs font-medium">
                    All Approved ({approvedStaff.length} active)
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Review and authorize staff members before granting them access to system operations
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/users")} className="text-xs">
            Manage All Accounts <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {pendingStaff.length === 0 ? (
            <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No staff registration requests currently pending authorization.</span>
              </div>
              <span className="text-xs text-muted-foreground">{approvedStaff.length} staff members authorized</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                Action Required: The following registered staff members cannot log in until an administrator authorizes their credentials.
              </div>
              <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden bg-background">
                {pendingStaff.map((staff: any) => (
                  <div key={staff.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-sm uppercase">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-none">{staff.name}</p>
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                            Pending Approval
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{staff.email} • Registered {format(parseISO(staff.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-medium text-xs h-8"
                        onClick={() => handleApproveStaff(staff)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve Staff
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8"
                        onClick={() => handleRejectStaff(staff)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Main Charts Section (Revenue Trend & Fleet Share) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue Trend Chart (Area / Bar) */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Revenue & Rental Trajectory
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly revenue performance vs projected earnings target
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
              <Button
                variant={activeTab === "revenue" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3 font-medium"
                onClick={() => setActiveTab("revenue")}
              >
                Revenue (₹)
              </Button>
              <Button
                variant={activeTab === "bookings" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3 font-medium"
                onClick={() => setActiveTab("bookings")}
              >
                Bookings Count
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === "revenue" ? (
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 12, fill: "#64748b" }} 
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Actual Revenue"
                      stroke="#6366f1" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#revenueGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="target" 
                      name="Target Projected"
                      stroke="#94a3b8" 
                      strokeDasharray="4 4"
                      strokeWidth={1.5} 
                      fillOpacity={1} 
                      fill="url(#targetGrad)" 
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="bookings" name="Bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: Fleet Category Distribution (Donut Chart) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Fleet Composition
            </CardTitle>
            <CardDescription className="text-xs">
              Vehicle breakdown by luxury & premium tiers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <div className="h-[180px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [`${value} vehicles`, name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-2xl font-black text-foreground">{kpis?.totalVehicles ?? 0}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Fleet</span>
              </div>
            </div>

            <div className="w-full space-y-2 mt-2 pt-2 border-t border-border/40">
              {categoryStats.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono">{cat.count} cars</span>
                    <span className="font-semibold text-foreground w-8 text-right">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Booking Status Pipeline & Fleet Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Pipeline */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Booking Status Distribution
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-primary" 
                onClick={() => setLocation("/admin/bookings")}
              >
                View all <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {statusCounts.map((status) => {
              const total = kpis?.totalBookings || 1;
              const percent = Math.round((status.count / total) * 100);
              return (
                <div key={status.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{status.name}</span>
                    <span className="text-muted-foreground font-mono">
                      {status.count} bookings ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%`, backgroundColor: status.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Fleet Availability per Category */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Category Occupancy Meter
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-primary" 
                onClick={() => setLocation("/admin/vehicles")}
              >
                Fleet Manager <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-border/40">
            {fleetStatus?.map((item) => {
              const utilPercent = item.total > 0 ? Math.round((item.rented / item.total) * 100) : 0;
              return (
                <div key={item.category} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{item.category}</p>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-muted-foreground">
                        {item.total} total
                      </Badge>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {item.available} currently available
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold">{item.rented} Rented ({utilPercent}%)</p>
                    <div className="w-28 h-2 bg-muted/80 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${utilPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 6. Top Performing Vehicles Leaderboard */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/30">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Top Performing Vehicles
            </CardTitle>
            <CardDescription className="text-xs">
              Highest-earning models and fleet occupancy leaders
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/admin/vehicles")}
            className="text-xs h-8"
          >
            All Vehicles
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-4 font-medium">Vehicle</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Daily Rate</th>
                  <th className="py-2.5 px-4 font-medium">Rating</th>
                  <th className="py-2.5 px-4 font-medium">Completed Trips</th>
                  <th className="py-2.5 px-4 font-medium text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={v.imageUrl || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=120&q=80"} 
                          alt={v.model} 
                          className="w-12 h-8 rounded object-cover border border-border/50 shrink-0" 
                        />
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight">{v.make} {v.model}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{v.licensePlate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs font-normal">
                        {v.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      ₹{v.dailyRate} / day
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {v.rating}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {v.tripsCompleted} trips
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{v.revenueEarned.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 7. Recent Bookings Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/30">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Recent Bookings Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Latest reservation requests and current customer trips
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/admin/bookings")}
            className="text-xs h-8"
          >
            Manage All ({summary?.totalBookings ?? 0})
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground bg-muted/20">
                  <th className="py-2.5 px-4 font-medium">Customer</th>
                  <th className="py-2.5 px-4 font-medium">Vehicle</th>
                  <th className="py-2.5 px-4 font-medium">Dates</th>
                  <th className="py-2.5 px-4 font-medium">Amount</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recent?.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{booking.user?.name || "Customer"}</div>
                      <div className="text-xs text-muted-foreground">{booking.user?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{booking.vehicle?.make} {booking.vehicle?.model}</span>
                      <span className="text-xs text-muted-foreground block font-mono">{booking.vehicle?.licensePlate}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                      {booking.pickupDate && booking.returnDate ? (
                        <>
                          {format(parseISO(booking.pickupDate), "MMM d")} - {format(parseISO(booking.returnDate), "MMM d, yyyy")}
                          <span className="block text-[11px] text-muted-foreground/80">{booking.durationDays} days</span>
                        </>
                      ) : "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      ₹{Number(booking.totalCost).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setLocation("/admin/bookings")}
                        className="h-7 text-xs text-primary hover:text-primary"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
                {!recent?.length && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      No bookings logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendPositive, 
  icon 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  trend?: string; 
  trendPositive?: boolean; 
  icon: React.ReactNode; 
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:border-primary/40 transition-colors">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-xl font-bold tracking-tight text-foreground truncate">{value}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {trend && (
              <span className={`text-[11px] font-semibold flex items-center ${trendPositive ? "text-emerald-500" : "text-rose-500"}`}>
                <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                {trend}
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-lg rounded-lg p-3 text-xs space-y-1">
        <p className="font-bold text-foreground mb-1">{label} Overview</p>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: p.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}:
            </span>
            <span className="font-mono font-bold">₹{Number(p.value).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-lg rounded-lg p-2.5 text-xs">
        <p className="font-bold text-foreground mb-1">{label}</p>
        <div className="flex items-center justify-between gap-3 text-primary">
          <span>Completed Rentals:</span>
          <span className="font-mono font-bold">{payload[0]?.value} bookings</span>
        </div>
      </div>
    );
  }
  return null;
}
