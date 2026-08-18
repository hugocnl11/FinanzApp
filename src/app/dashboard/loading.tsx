import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[140px] rounded-lg" />
        <Skeleton className="h-[140px] rounded-lg" />
        <Skeleton className="h-[140px] rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[320px] rounded-lg" />
        <Skeleton className="h-[320px] rounded-lg" />
      </div>
    </div>
  );
}
