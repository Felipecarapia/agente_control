import { Skeleton } from "./skeleton";
import { Card, CardContent } from "./card";

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, stageIndex) => (
        <div key={stageIndex} className="flex-shrink-0 w-80">
          <Card className="border border-border/60">
            <CardContent className="p-4">
              {/* Header da coluna */}
              <div className="mb-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              
              {/* Cards do kanban */}
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <Card key={cardIndex} className="border border-border/40">
                    <CardContent className="p-3">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-3" />
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}




