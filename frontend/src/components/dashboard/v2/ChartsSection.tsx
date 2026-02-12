
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface ChartsSectionProps {
    range: string;
    loading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function ChartsSection({ range, loading }: ChartsSectionProps) {
    const [timeSeries, setTimeSeries] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [chartLoading, setChartLoading] = useState(true);

    useEffect(() => {
        async function loadCharts() {
            setChartLoading(true);
            try {
                const [tsData, catData, rankData] = await Promise.all([
                    api<{ points: any[] }>(`/api/v1/dashboard/projects/timeseries?range=${range}`),
                    api<{ categories: any[] }>(`/api/v1/dashboard/projects/by-category?range=${range}`),
                    api<any[]>(`/api/v1/dashboard/projects/ranking?range=${range}&limit=5`)
                ]);
                setTimeSeries(tsData.points);
                setCategories(catData.categories);
                setRanking(rankData);
            } catch (e) {
                console.error("Error loading charts", e);
            } finally {
                setChartLoading(false);
            }
        }
        loadCharts();
    }, [range]);

    if (loading || chartLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val / 100);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Main Trend Chart */}
            <Card className="col-span-1 lg:col-span-2 xl:col-span-1 min-h-[400px]">
                <CardHeader>
                    <CardTitle>Fluxo Financeiro no Tempo</CardTitle>
                    <p className="text-sm text-muted-foreground">Evolução de gastos e resultado.</p>
                </CardHeader>
                <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `R$${(val / 100000).toFixed(0)}k`} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value: any) => [formatCurrency(Number(value)), "Valor"]}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Area
                                type="monotone"
                                dataKey="spent_cents"
                                stroke="#f43f5e"
                                fillOpacity={1}
                                fill="url(#colorSpent)"
                                name="Gastos"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Breakdown + Ranking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:col-span-1">
                {/* Category Donut */}
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Gastos por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[320px] relative">
                        {categories.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados no período</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="spent_cents"
                                    >
                                        {categories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Top Projects Ranking */}
                <Card className="min-h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Top Projetos (Lucro)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-2">
                            {ranking.map((project, i) => (
                                <div key={project.id} className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                            i === 1 ? "bg-slate-300/20 text-slate-300" :
                                                i === 2 ? "bg-orange-700/20 text-orange-700" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium truncate max-w-[120px]" title={project.name}>{project.name}</p>
                                            <p className="text-[10px] text-muted-foreground">ROI: {project.roi.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(project.profit_cents)}</p>
                                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden ml-auto mt-1">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${Math.min(100, Math.max(0, (project.profit_cents / (ranking[0]?.profit_cents || 1)) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {ranking.length === 0 && <p className="text-center text-muted-foreground text-sm pt-8">Sem dados de ranking.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
