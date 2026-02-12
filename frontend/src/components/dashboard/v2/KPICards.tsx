
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Wallet, TrendingDown, Percent, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface KPIData {
    currency: string;
    revenue_cents: number;
    expected_revenue_cents: number;
    spent_cents: number;
    profit_cents: number;
    roi_percent: number;
    margin_percent: number;
    total_budget_cents: number;
    budget_used_percent: number;
    projects_count: number;
    projects_at_risk_count: number;
}

interface KPIProps {
    data: KPIData | null;
    loading: boolean;
}

export function KPICards({ data, loading }: KPIProps) {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
    };

    const formatPercent = (val: number) => {
        return `${val.toFixed(1)}%`;
    };

    if (loading || !data) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    const kpis = [
        {
            label: "Receita Real",
            value: formatCurrency(data.revenue_cents),
            subValue: `Previsto: ${formatCurrency(data.expected_revenue_cents)}`,
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            tooltip: "Valor total de receitas realizadas vs previstas."
        },
        {
            label: "Gastos Totais",
            value: formatCurrency(data.spent_cents),
            subValue: `${data.projects_count} projetos ativos`,
            icon: TrendingDown,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            tooltip: "Soma de todas as despesas lançadas."
        },
        {
            label: "Lucro Líquido",
            value: formatCurrency(data.profit_cents),
            subValue: "Receita - Gastos",
            icon: Wallet,
            color: data.profit_cents >= 0 ? "text-primary" : "text-destructive",
            bg: "bg-primary/10",
            tooltip: "Diferença entre receita realizada e gastos totais."
        },
        {
            label: "ROI Médio",
            value: formatPercent(data.roi_percent),
            subValue: "Retorno sobre Invest.",
            icon: TrendingUp,
            color: data.roi_percent > 0 ? "text-emerald-500" : "text-amber-500",
            bg: "bg-blue-500/10",
            tooltip: "(Receita - Custo) / Custo * 100"
        },
        {
            label: "Margem",
            value: formatPercent(data.margin_percent),
            subValue: "Eficiência",
            icon: Percent,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
            tooltip: "Lucro / Receita * 100"
        },
        {
            label: "Verba Comprometida",
            value: formatPercent(data.budget_used_percent),
            subValue: `${formatCurrency(data.total_budget_cents)} Total`,
            icon: Info,
            color: data.budget_used_percent > 100 ? "text-destructive" : "text-orange-500",
            bg: "bg-orange-500/10",
            tooltip: "Porcentagem do orçamento total já utilizado."
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                    <TooltipProvider key={index}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/80 bg-card/50 backdrop-blur-sm cursor-default group overflow-hidden relative">
                                    {/* Glow effect on hover */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent to-${kpi.color.split('-')[1]}-500/5 pointer-events-none`} />

                                    <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            {index === 5 && data.projects_at_risk_count > 0 && (
                                                <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                                    {data.projects_at_risk_count} risco
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold tracking-tight mb-1">{kpi.value}</h3>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{kpi.subValue}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{kpi.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}
