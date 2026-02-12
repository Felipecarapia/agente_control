
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, RefreshCw, Filter } from "lucide-react";
import { useState } from "react";

interface DashboardHeaderProps {
    range: string;
    setRange: (range: string) => void;
    status: string;
    setStatus: (status: string) => void;
    loading: boolean;
    onRefresh: () => void;
    lastUpdated: Date | null;
    onToggleVersion: () => void;
}

export function DashboardHeader({
    range,
    setRange,
    status,
    setStatus,
    loading,
    onRefresh,
    lastUpdated,
    onToggleVersion,
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Dashboard Projetos
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Visão executiva de performance financeira e operacional.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button size="sm" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Atualizando..." : "Atualizar"}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Filtros:</span>
                </div>

                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-[140px] h-9">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="14d">Últimos 14 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="90d">Últimos 90 dias</SelectItem>
                        <SelectItem value="all">Todo o período</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="ativo">Ativos</SelectItem>
                        <SelectItem value="arquivado">Arquivados</SelectItem>
                        <SelectItem value="concluido">Concluídos</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto text-xs text-muted-foreground hidden md:block">
                    {lastUpdated && (
                        <span>Atualizado há {Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000)} minutos</span>
                    )}
                </div>
            </div>
        </div>
    );
}
