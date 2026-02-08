"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Segment {
  segment_name: string;
  volume: number;
  conversion_rate: number;
  avg_value_cents: number | null;
  total_value_cents: number;
}

interface SegmentAnalysisProps {
  segments: Segment[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function SegmentAnalysis({ segments }: SegmentAnalysisProps) {
  if (segments.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado de segmentação disponível
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {segments.map((segment, index) => (
        <Card key={index} className="border">
          <CardContent className="p-4 space-y-3">
            <div>
              <h4 className="font-semibold text-sm">{segment.segment_name}</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-semibold">{segment.volume}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conversão:</span>
                  <Badge
                    variant={
                      segment.conversion_rate >= 50
                        ? "default"
                        : segment.conversion_rate >= 30
                        ? "outline"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {segment.conversion_rate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={segment.conversion_rate} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor total:</span>
                <span className="font-semibold">
                  {formatCurrency(segment.total_value_cents)}
                </span>
              </div>
              {segment.avg_value_cents && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ticket médio:</span>
                  <span className="font-semibold">
                    {formatCurrency(segment.avg_value_cents)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}




