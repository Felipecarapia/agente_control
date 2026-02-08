import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function AgendaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-3 pb-2">
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}




