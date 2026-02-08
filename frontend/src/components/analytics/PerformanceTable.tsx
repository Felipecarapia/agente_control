"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
interface SalesPerformance {
  user_id: number;
  user_nome: string;
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  conversion_rate: number;
  total_revenue_cents: number;
  avg_deal_value_cents: number | null;
  avg_time_to_close_days: number | null;
  deals_by_stage: Record<string, number>;
}

interface PerformanceTableProps {
  performance: SalesPerformance[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function PerformanceTable({ performance }: PerformanceTableProps) {
  if (performance.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado de performance disponível
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendedor</TableHead>
            <TableHead>Criados</TableHead>
            <TableHead>Ganhos</TableHead>
            <TableHead>Perdidos</TableHead>
            <TableHead>Taxa Conversão</TableHead>
            <TableHead>Receita Total</TableHead>
            <TableHead>Ticket Médio</TableHead>
            <TableHead>Tempo Médio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {performance.map((perf) => (
            <TableRow key={perf.user_id}>
              <TableCell className="font-medium">{perf.user_nome}</TableCell>
              <TableCell>{perf.deals_created}</TableCell>
              <TableCell>
                <Badge variant="default" className="bg-green-600">
                  {perf.deals_won}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="destructive">{perf.deals_lost}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    perf.conversion_rate >= 50
                      ? "default"
                      : perf.conversion_rate >= 30
                      ? "outline"
                      : "destructive"
                  }
                >
                  {perf.conversion_rate.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">
                {formatCurrency(perf.total_revenue_cents)}
              </TableCell>
              <TableCell>
                {perf.avg_deal_value_cents
                  ? formatCurrency(perf.avg_deal_value_cents)
                  : "-"}
              </TableCell>
              <TableCell>
                {perf.avg_time_to_close_days
                  ? `${perf.avg_time_to_close_days.toFixed(1)} dias`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

