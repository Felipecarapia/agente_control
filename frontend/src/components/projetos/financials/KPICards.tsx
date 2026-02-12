
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertTriangle, AlertCircle } from "lucide-react";

export function formatCurrency(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

interface KPICardsProps {
    data: {
        budget_cents: number;
        total_spent_cents: number;
        remaining_cents: number;
        percent_used: number;
        roi: number | null;
        roi_mode: string | null;
    } | null;
    loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
    if (loading || !data) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    const { budget_cents, total_spent_cents, remaining_cents, roi, roi_mode } = data;
    const isOverBudget = remaining_cents < 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Verba Total</span>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold tracking-tight">
                            {formatCurrency(budget_cents)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Total Gasto</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold tracking-tight text-destructive">
                            {formatCurrency(total_spent_cents)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className={isOverBudget ? "border-destructive/50 bg-destructive/5" : ""}>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                            {isOverBudget ? "Estourado" : "Restante"}
                        </span>
                        {isOverBudget ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        )}
                    </div>
                    <div className="mt-2">
                        <span
                            className={`text-2xl font-bold tracking-tight ${isOverBudget ? "text-destructive" : "text-emerald-500"
                                }`}
                        >
                            {formatCurrency(Math.abs(remaining_cents))}
                            {isOverBudget && <span className="text-xs ml-1 font-normal text-muted-foreground">(negativo)</span>}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">ROI {roi_mode === "expected" && "(Previsto)"}</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-bold tracking-tight ${roi && roi > 0 ? "text-emerald-500" : roi && roi < 0 ? "text-destructive" : ""
                            }`}>
                            {roi !== null ? `${roi.toLocaleString("pt-BR")}%` : "—"}
                        </span>
                        {roi_mode === "expected" && (
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Est.</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
