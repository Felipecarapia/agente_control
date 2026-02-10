"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

type ProductivityData = {
    user_id: string;
    user_name: string;
    month_period: string;
    period_start: string;
    period_end: string;
    productivity_score: number;
    tasks_completed_on_time: number;
    tasks_completed_late: number;
    tasks_pending: number;
    tasks_overdue: number;
    last_updated: string | null;
};

export function ProductivityWidget() {
    const [data, setData] = useState<ProductivityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProductivity();
    }, []);

    async function loadProductivity() {
        try {
            const response = await api<ProductivityData>("/api/v1/productivity/my-productivity");
            setData(response);
        } catch (error) {
            console.error("Erro ao carregar produtividade:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card className="border-2">
                <CardHeader>
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-8 bg-muted animate-pulse rounded" />
                        <div className="h-4 bg-muted animate-pulse rounded" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const score = data.productivity_score;
    const getScoreColor = () => {
        if (score >= 80) return "text-green-600";
        if (score >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreGradient = () => {
        if (score >= 80) return "from-green-500 to-emerald-600";
        if (score >= 50) return "from-yellow-500 to-orange-600";
        return "from-red-500 to-rose-600";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                Taxa de Produtividade
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                                Período: {new Date(data.period_start).toLocaleDateString()} - {new Date(data.period_end).toLocaleDateString()}
                            </CardDescription>
                        </div>
                        {score >= 80 ? (
                            <TrendingUp className="h-6 w-6 text-green-500" />
                        ) : (
                            <TrendingDown className="h-6 w-6 text-red-500" />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Score Principal */}
                    <div className="text-center space-y-2">
                        <div className={`text-5xl font-bold ${getScoreColor()}`}>
                            {score.toFixed(0)}%
                        </div>
                        <Progress
                            value={score}
                            className="h-3"
                        />
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">No Prazo</div>
                                <div className="text-lg font-bold text-green-700">{data.tasks_completed_on_time}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Atrasadas</div>
                                <div className="text-lg font-bold text-yellow-700">{data.tasks_completed_late}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Pendentes</div>
                                <div className="text-lg font-bold text-blue-700">{data.tasks_pending}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Vencidas</div>
                                <div className="text-lg font-bold text-red-700">{data.tasks_overdue}</div>
                            </div>
                        </div>
                    </div>

                    {/* Alerta de Tarefas Atrasadas */}
                    {data.tasks_overdue > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                        >
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div className="text-xs text-red-700 dark:text-red-400">
                                    <strong>Atenção!</strong> Você tem {data.tasks_overdue} tarefa(s) atrasada(s).
                                    Tarefas atrasadas não contabilizam pontos. Realize imediatamente!
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Info de Reset */}
                    <div className="text-center pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            🔄 Sua taxa será resetada no dia <strong>20 do próximo mês</strong>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
