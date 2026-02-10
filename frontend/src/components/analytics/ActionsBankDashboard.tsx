"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import {
    Activity, AlertCircle, CheckCircle, Clock, TrendingUp, User, Search, Filter, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interfaces (importar de types se preferir, mas inline aqui para velocidade)
interface UserPerformance {
    user: { id: string; nome: string; email: string; role: string; avatar?: string };
    kpis: { total_pending: number; overdue_count: number; avg_timing: number; weighted_load: number; recent_completed: number; efficiency_score: number };
    top_tasks: Array<{ id: string; titulo: string; status: string; prioridade: string; vencimento?: string; projeto: string; timing: number }>;
}

interface ActionsBankData {
    summary: { total_pending: number; total_overdue: number; avg_efficiency: number };
    users: UserPerformance[];
}

interface ChartData {
    productivity_trend: Array<{ date: string; completed: number }>;
    timing_distribution: Array<{ bucket: string; count: number }>;
}

export default function ActionsBankDashboard() {
    const [activeTab, setActiveTab] = useState("actions");
    const [data, setData] = useState<ActionsBankData | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [rangeDays, setRangeDays] = useState("30");

    useEffect(() => {
        fetchData();
    }, [rangeDays]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Parallel fetch
            const [bankData, perfData] = await Promise.all([
                api<ActionsBankData>(`/api/v1/analytics/actions-bank?range_days=${rangeDays}`),
                api<ChartData>(`/api/v1/analytics/performance?range_days=${rangeDays}`)
            ]);
            setData(bankData);
            setChartData(perfData);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "bg-emerald-500";
        if (score >= 70) return "bg-amber-500";
        return "bg-rose-500";
    };

    const getPriorityBadge = (p: string) => {
        switch (p?.toLowerCase()) {
            case "Urgente": return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>;
            case "Alta": return <Badge className="bg-orange-500 text-[10px]">Alta</Badge>;
            case "Media": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">Média</Badge>;
            default: return <Badge variant="outline" className="text-[10px]">Baixa</Badge>;
        }
    };

    if (loading && !data) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Controls */}
            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="actions">Banco de Ações</TabsTrigger>
                        <TabsTrigger value="performance">Métricas de Time</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <Select value={rangeDays} onValueChange={setRangeDays}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Últimos 7 dias</SelectItem>
                            <SelectItem value="14">Últimos 14 dias</SelectItem>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                            <SelectItem value="90">Últimos 90 dias</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <Activity className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary KPIs */}
            {data && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Pendente"
                        value={data.summary.total_pending}
                        icon={Activity}
                        description="Tarefas ativas no sistema"
                    />
                    <StatCard
                        title="Atrasadas"
                        value={data.summary.total_overdue}
                        icon={AlertCircle}
                        className="text-rose-500"
                        description="Precisam de atenção imediata"
                    />
                    <StatCard
                        title="Eficiência Média"
                        value={`${data.summary.avg_efficiency}%`}
                        icon={TrendingUp}
                        className="text-emerald-500"
                        description="Score ponderado do time"
                    />
                    <StatCard
                        title="Aging Médio"
                        value="3.2 dias" // Exemplo placeholder se back não calcular
                        description="Tempo médio de resolução"
                        icon={Clock}
                    />
                </div>
            )}

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {activeTab === "actions" && data ? (
                    <motion.div
                        key="actions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                    >
                        {data.users.map((item) => (
                            <UserActionCard key={item.user.id} data={item} getPriorityBadge={getPriorityBadge} getScoreColor={getScoreColor} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="performance"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="grid gap-6 md:grid-cols-2"
                    >
                        {chartData && (
                            <>
                                <Card className="col-span-2 md:col-span-1">
                                    <CardHeader>
                                        <CardTitle>Produtividade (Concluídas)</CardTitle>
                                        <CardDescription>Volume de entregas por dia</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.productivity_trend}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis
                                                    dataKey="date"
                                                    fontSize={12}
                                                    tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                                                />
                                                <YAxis fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    labelFormatter={(val) => format(new Date(val), "dd 'de' MMMM", { locale: ptBR })}
                                                />
                                                <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Concluídas" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="col-span-2 md:col-span-1">
                                    <CardHeader>
                                        <CardTitle>Distribuição de Timing</CardTitle>
                                        <CardDescription>Quanto tempo as tarefas ficam abertas</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.timing_distribution} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                                                <XAxis type="number" fontSize={12} />
                                                <YAxis dataKey="bucket" type="category" fontSize={12} width={60} />
                                                <Tooltip cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={32} name="Tarefas" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Sub-components para organização
function StatCard({ title, value, icon: Icon, description, className }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${className || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${className}`}>{value}</div>
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </CardContent>
        </Card>
    );
}

function UserActionCard({ data, getPriorityBadge, getScoreColor }: any) {
    const { user, kpis, top_tasks } = data;

    return (
        <Card className="hover:shadow-md transition-shadow duration-200 overflow-hidden border-t-4 border-t-transparent hover:border-t-primary/20">
            <CardHeader className="pb-3 bg-muted/5">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-background shadow-sm">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {user.nome.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-base font-semibold">{user.nome}</CardTitle>
                            <CardDescription className="text-xs">{user.email}</CardDescription>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-bold">{kpis.efficiency_score}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Eficiência</span>
                        <span>{kpis.efficiency_score}%</span>
                    </div>
                    <Progress value={kpis.efficiency_score} className={`h-1.5 [&>div]:${getScoreColor(kpis.efficiency_score)}`} />
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-muted/10 p-2 rounded-lg">
                        <div className="text-lg font-bold text-foreground">{kpis.total_pending}</div>
                        <div className="text-[10px] text-muted-foreground">Pendentes</div>
                    </div>
                    <div className="bg-rose-500/10 p-2 rounded-lg">
                        <div className="text-lg font-bold text-rose-600">{kpis.overdue_count}</div>
                        <div className="text-[10px] text-rose-600/80">Atrasadas</div>
                    </div>
                    <div className="bg-blue-500/10 p-2 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{kpis.avg_timing}d</div>
                        <div className="text-[10px] text-blue-600/80">Timing Médio</div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" /> Prioritárias
                    </h4>
                    {top_tasks.length > 0 ? (
                        top_tasks.map((task: any) => (
                            <div key={task.id} className="flex items-center justify-between text-sm group hover:bg-muted/50 p-1.5 rounded-md -mx-1.5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`h-2 w-2 rounded-full ring-2 ring-background ${task.status === 'pendente' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                                    <span className="truncate max-w-[140px] font-medium text-foreground/90">{task.titulo}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {task.timing > 3 && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{task.timing}d</span>}
                                    {getPriorityBadge(task.prioridade)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-muted-foreground py-4 text-center italic">Sem tarefas pendentes</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
