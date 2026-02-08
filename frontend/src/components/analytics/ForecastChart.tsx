"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ForecastItem {
  deal_id: number;
  title: string;
  value_cents: number;
  probability: number;
  expected_close_date: string | null;
  stage_name: string;
}

interface ForecastChartProps {
  forecastTotal: number;
  forecastItems: ForecastItem[];
}

export function ForecastChart({ forecastTotal, forecastItems }: ForecastChartProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "bg-green-500";
    if (prob >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <div className="text-2xl font-bold text-primary">
          {formatCurrency(forecastTotal)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Valor previsto de fechamento
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {forecastItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum deal com previsão de fechamento
          </p>
        ) : (
          forecastItems.map((item) => (
            <Card key={item.deal_id} className="border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.stage_name}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold">{formatCurrency(item.value_cents)}</div>
                    <Badge variant="outline" className="text-xs">
                      {item.probability.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={item.probability}
                  className="h-2"
                />
                {item.expected_close_date && (
                  <p className="text-xs text-muted-foreground">
                    Previsão: {format(new Date(item.expected_close_date), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}




