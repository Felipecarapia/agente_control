"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle } from "lucide-react";

const CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 horas em milissegundos
const STORAGE_KEY = "last_overdue_check";

type OverdueCheckResponse = {
    has_overdue: boolean;
    overdue_count: number;
    message: string;
};

export function OverdueTasksMonitor() {
    const { toast } = useToast();
    const [lastCheck, setLastCheck] = useState<number>(0);

    useEffect(() => {
        // Carregar último check do localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setLastCheck(parseInt(stored, 10));
        }

        // Verificar imediatamente ao carregar
        checkOverdueTasks();

        // Configurar intervalo de 2 horas
        const interval = setInterval(() => {
            checkOverdueTasks();
        }, CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    async function checkOverdueTasks() {
        try {
            const now = Date.now();

            // Verificar se já passou 2 horas desde o último check
            if (lastCheck && now - lastCheck < CHECK_INTERVAL) {
                return;
            }

            const response = await api<OverdueCheckResponse>("/api/v1/productivity/check-overdue");

            if (response.has_overdue) {
                toast({
                    title: "⚠️ Tarefas Atrasadas!",
                    description: response.message,
                    variant: "destructive",
                    duration: 10000, // 10 segundos
                });
            }

            // Atualizar timestamp do último check
            const newTimestamp = Date.now();
            setLastCheck(newTimestamp);
            localStorage.setItem(STORAGE_KEY, newTimestamp.toString());
        } catch (error) {
            console.error("Erro ao verificar tarefas atrasadas:", error);
        }
    }

    // Componente invisível - apenas monitora
    return null;
}
