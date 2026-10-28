import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case BookingStatus.pending:
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-500 dark:border-yellow-500/20">Pending</Badge>;
    case BookingStatus.confirmed:
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20">Confirmed</Badge>;
    case BookingStatus.active:
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20">Active</Badge>;
    case BookingStatus.completed:
      return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20">Completed</Badge>;
    case BookingStatus.cancelled:
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}