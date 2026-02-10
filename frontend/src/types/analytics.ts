export interface UserPerformance {
    user: {
        id: string;
        nome: string;
        email: string;
        role: string;
        avatar?: string;
    };
    kpis: {
        total_pending: number;
        overdue_count: number;
        avg_aging: number;
        weighted_load: number;
        recent_completed: number;
        efficiency_score: number;
    };
    top_tasks: Array<{
        id: string;
        titulo: string;
        status: string;
        prioridade: string | null;
        vencimento?: string;
        projeto: string;
        aging: number;
    }>;
}

export interface ActionsBankSummary {
    total_pending: number;
    total_overdue: number;
    avg_efficiency: number;
}

export interface ActionsBankResponse {
    summary: ActionsBankSummary;
    users: UserPerformance[];
}

export interface ChartData {
    productivity_trend: Array<{ date: string; completed: number }>;
    aging_distribution: Array<{ bucket: string; count: number }>;
}
