import { useListUsers, useUpdateUser, useDeleteUser, UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, Shield, ShieldAlert } from "lucide-react";
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

  const handleVerify = (id: number, isVerified: boolean) => {
    updateMutation.mutate({ id, data: { isVerified: !isVerified } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "User verification status updated" });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage staff and customer accounts</p>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground bg-muted/20">
                  <th className="py-3 px-4 font-medium">Name</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Verified</th>
                  <th className="py-3 px-4 font-medium">Joined</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center">Loading...</td></tr>
                ) : !users?.length ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-medium">{u.name}</td>
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
                      {u.isVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Unverified</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {format(parseISO(u.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleVerify(u.id, u.isVerified)}
                          title={u.isVerified ? "Revoke Verification" : "Verify User"}
                        >
                          {u.isVerified ? <ShieldAlert className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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