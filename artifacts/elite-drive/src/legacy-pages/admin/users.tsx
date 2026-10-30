import { useState } from "react";
import { useListUsers, useUpdateUser, useDeleteUser, UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, Shield, ShieldAlert, Check, X, Clock, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<"all" | "pending_staff" | "approved_staff" | "customers">("all");

  const pendingStaffCount = users?.filter(u => u.role === "staff" && !u.isVerified).length || 0;
  const approvedStaffCount = users?.filter(u => u.role === "staff" && u.isVerified).length || 0;
  const customerCount = users?.filter(u => u.role === "customer").length || 0;

  const filteredUsers = users?.filter(u => {
    if (activeFilter === "pending_staff") return u.role === "staff" && !u.isVerified;
    if (activeFilter === "approved_staff") return u.role === "staff" && u.isVerified;
    if (activeFilter === "customers") return u.role === "customer";
    return true;
  }) || [];

  const handleApproveStaff = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Approval request failed");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Staff Member Approved!",
        description: `${user.name} (${user.email}) has been approved and can now log in.`,
      });
    } catch (err: any) {
      toast({ title: "Approval Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRejectStaff = async (user: any) => {
    if (!confirm(`Are you sure you want to decline staff registration for ${user.name}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Rejection request failed");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Staff Registration Declined",
        description: `Staff request for ${user.name} has been removed.`,
      });
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleVerifyToggle = (id: number, currentVerified: boolean) => {
    updateMutation.mutate({ id, data: { isVerified: !currentVerified } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "User status updated" });
      }
    });
  };

  const handleRoleChange = (id: number, role: any) => {
    updateMutation.mutate({ id, data: { role } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "User role updated" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          toast({ title: "User deleted successfully" });
        }
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Review staff approvals, customer accounts, and access roles</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50 text-xs">
          <Button
            variant={activeFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setActiveFilter("all")}
          >
            All ({users?.length || 0})
          </Button>
          <Button
            variant={activeFilter === "pending_staff" ? "secondary" : "ghost"}
            size="sm"
            className={`h-8 text-xs font-semibold ${pendingStaffCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}
            onClick={() => setActiveFilter("pending_staff")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending Staff ({pendingStaffCount})
          </Button>
          <Button
            variant={activeFilter === "approved_staff" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setActiveFilter("approved_staff")}
          >
            <UserCheck className="h-3 w-3 mr-1" />
            Staff ({approvedStaffCount})
          </Button>
          <Button
            variant={activeFilter === "customers" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => setActiveFilter("customers")}
          >
            Customers ({customerCount})
          </Button>
        </div>
      </div>

      {pendingStaffCount > 0 && activeFilter !== "pending_staff" && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {pendingStaffCount} Staff {pendingStaffCount === 1 ? "Account" : "Accounts"} Awaiting Confirmation
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff cannot log in until approved by an administrator.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 text-xs"
            onClick={() => setActiveFilter("pending_staff")}
          >
            Review Requests
          </Button>
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground bg-muted/20">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status / Approval</th>
                  <th className="py-3 px-4 font-medium">Joined</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center">Loading accounts...</td></tr>
                ) : !filteredUsers.length ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No accounts match this filter.</td></tr>
                ) : filteredUsers.map(u => {
                  const isStaffPending = u.role === "staff" && !u.isVerified;
                  return (
                    <tr 
                      key={u.id} 
                      className={`border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors ${isStaffPending ? "bg-amber-500/[0.04]" : ""}`}
                    >
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs uppercase shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="leading-tight">{u.name}</p>
                          {isStaffPending && <span className="text-[10px] text-amber-600 font-semibold">Requires Approval</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 px-4">
                        <Select 
                          value={u.role} 
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(UserRole).map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        {isStaffPending ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold">
                            Pending Approval
                          </Badge>
                        ) : u.isVerified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800 text-xs">
                            Active / Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">Unverified</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {format(parseISO(u.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isStaffPending ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium"
                                onClick={() => handleApproveStaff(u)}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                                onClick={() => handleRejectStaff(u)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleVerifyToggle(u.id, u.isVerified)}
                              title={u.isVerified ? "Revoke Verification" : "Verify User"}
                            >
                              {u.isVerified ? <ShieldAlert className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-green-500" />}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                            onClick={() => handleDelete(u.id)}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
