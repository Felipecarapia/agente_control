import { Skeleton } from "./skeleton";
import { Card, CardContent } from "./card";

export function CardSkeleton() {
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <div className="border-t border-border/50 my-3" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        <div className="border-t border-border/50 mt-3 pt-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




