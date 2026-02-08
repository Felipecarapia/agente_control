"use client";

import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Insight {
  type: string;
  severity: string;
  title: string;
  message: string;
  stage_id?: number;
  stage_name?: string;
  value_cents?: number;
  suggestion?: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500/50 bg-red-50/50 dark:bg-red-950/10";
      case "warning":
        return "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10";
      default:
        return "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/10";
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Insights Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "border rounded-lg p-4 space-y-2",
                getSeverityColor(insight.severity)
              )}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(insight.severity)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insight.message}
                  </p>
                  {insight.value_cents && (
                    <p className="text-sm font-semibold text-primary">
                      💰 {formatCurrency(insight.value_cents)} travados nessa etapa
                    </p>
                  )}
                  {insight.suggestion && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-background/50 rounded border border-primary/20">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Sugestão:</span> {insight.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}




