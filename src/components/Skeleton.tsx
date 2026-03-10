import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({ className, width = "w-full", height = "h-4", rounded = "md" }: SkeletonProps) {
  const roundedClass = {
    sm: "rounded-sm",
    md: "rounded-lg",
    lg: "rounded-2xl",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn(
        "skeleton-shimmer bg-primary-800",
        width,
        height,
        roundedClass,
        className
      )}
    />
  );
}

export function SkeletonLine({ className, width = "w-full" }: { className?: string; width?: string }) {
  return <Skeleton width={width} height="h-4" rounded="md" className={className} />;
}

export function SkeletonAvatar({ size = "w-10 h-10" }: { size?: string }) {
  return <Skeleton width={size.split(" ")[0]} height={size.split(" ")[1]} rounded="full" className={size} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-2xl border border-primary-700 bg-primary-900/40 flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="w-10 h-10" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonLine width="w-2/3" />
          <SkeletonLine width="w-1/3" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine width="w-3/4" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  const widths = ["w-1/3", "w-1/4", "w-1/5", "w-1/6", "w-1/4", "w-1/5"];
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-primary-800">
      <SkeletonAvatar size="w-9 h-9" />
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <div key={i} className="flex-1">
          <SkeletonLine width={widths[i % widths.length]} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-6 rounded-2xl border border-primary-700 bg-primary-900/40 flex flex-col gap-3">
      <Skeleton width="w-1/2" height="h-4" />
      <Skeleton width="w-2/3" height="h-8" />
      <Skeleton width="w-full" height="h-16" rounded="lg" />
    </div>
  );
}

export function SkeletonList({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonBoardCards({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
