
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "./KPICards";

interface BudgetChartProps {
    data: {
        budget_cents: number;
        total_spent_cents: number;
        expenses_by_category: { category: string; total_cents: number }[];
    } | null;
    loading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
const CATEGORY_LABELS: Record<string, string> = {
    DOMAIN: "Domínio",
    ADS: "Tráfego/Ads",
    TOOLS: "Ferramentas",
    HUMAN_RESOURCES: "Recursos Humanos",
    OTHER: "Outros",
};

export function BudgetChart({ data, loading }: BudgetChartProps) {
    if (loading || !data) {
        return <Skeleton className="h-[250px] w-full rounded-xl" />;
    }

    const { budget_cents, total_spent_cents, expenses_by_category } = data;

    // Data for Donut Chart (Spent vs Remaining)
    // If budget is 0, we can't show meaningful percentage, maybe show just spent distribution?
    // Let's show Category Distribution which corresponds to "Breakdown por categoria" mentioned in prompt

    const chartData = expenses_by_category.map((item) => ({
        name: CATEGORY_LABELS[item.category] || item.category,
        value: item.total_cents / 100, // Convert to BRL for chart
        raw: item.total_cents
    }));

    // If no expenses, add a placeholder
    if (chartData.length === 0) {
        chartData.push({ name: "Sem gastos", value: 0.01, raw: 0 }); // Tiny value to render something or handle empty state
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full relative">
                    {chartData[0].raw === 0 && chartData.length === 1 && total_spent_cents === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            Nenhum gasto registrado
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="space-y-2 mt-4">
                    {expenses_by_category.map((item, index) => {
                        const percent = budget_cents > 0 ? (item.total_cents / budget_cents) * 100 : 0;
                        return (
                            <div key={item.category} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{formatCurrency(item.total_cents)}</span>
                                    {budget_cents > 0 && (
                                        <span className="text-muted-foreground">({percent.toFixed(1)}%)</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
