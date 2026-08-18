import { Skeleton } from "@/components/ui/skeleton";

export default function ActivosLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-[160px] rounded-lg" />
        <Skeleton className="h-[160px] rounded-lg" />
        <Skeleton className="h-[160px] rounded-lg" />
      </div>
      <Skeleton className="h-[320px] rounded-lg" />
    </div>
  );
}
