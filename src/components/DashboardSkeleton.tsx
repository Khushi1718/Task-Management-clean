import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12 pb-24">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32 rounded-2xl" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <Skeleton className="h-5 w-48 rounded-lg ml-2" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-[32px]" />
            <Skeleton className="h-32 rounded-[32px]" />
            <Skeleton className="h-32 rounded-[32px]" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-5 w-48 rounded-lg ml-2" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-[32px]" />
            <Skeleton className="h-32 rounded-[32px]" />
            <Skeleton className="h-32 rounded-[32px]" />
          </div>
        </div>
      </div>

      {/* Graph Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-10 shadow-sm h-[500px]">
        <div className="flex justify-between mb-12">
          <div className="space-y-3">
            <Skeleton className="h-6 w-56 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
        <Skeleton className="h-[300px] w-full rounded-[32px]" />
      </div>

      {/* Recent Activity Skeleton */}
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[48px] p-12 shadow-sm h-[400px] space-y-8">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
          </div>
        </div>
        <div className="lg:col-span-4 bg-zinc-900 rounded-[48px] p-12 h-[400px]">
          <Skeleton className="h-8 w-32 rounded-lg mb-4 bg-zinc-800" />
          <Skeleton className="h-4 w-full rounded-lg mb-10 bg-zinc-800" />
          <div className="space-y-6">
            <Skeleton className="h-14 w-full rounded-2xl bg-zinc-800" />
            <Skeleton className="h-14 w-full rounded-2xl bg-zinc-800" />
            <Skeleton className="h-14 w-full rounded-2xl bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
