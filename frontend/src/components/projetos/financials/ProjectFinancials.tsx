
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { KPICards } from "./KPICards";
import { BudgetChart } from "./BudgetChart";
import { ExpenseList } from "./ExpenseList";
import { BudgetDialog } from "./BudgetDialog";
import { ExpenseDialog } from "./ExpenseDialog";
import { Plus, Settings, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ProjectFinancialsProps {
    projectId: string;
}

interface FinancialData {
    budget_cents: number;
    currency: string;
    expected_revenue_cents: number;
    actual_revenue_cents: number;
    total_spent_cents: number;
    remaining_cents: number;
    percent_used: number;
    roi: number | null;
    roi_mode: string | null;
    expenses_by_category: { category: string; total_cents: number }[];
    expenses: any[]; // Using any for simplicity as ExpenseList defines Expense interface
}

export function ProjectFinancials({ projectId }: ProjectFinancialsProps) {
    const { toast } = useToast();
    const [data, setData] = useState<FinancialData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<any | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await api<FinancialData>(`/api/v1/projetos/${projectId}/financials`);
            setData(result);
        } catch (err: any) {
            console.error("Error fetching financials:", err);
            setError(err.message || "Erro ao carregar dados financeiros.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateBudget = async (updates: any) => {
        try {
            await api(`/api/v1/projetos/${projectId}/budget`, {
                method: "PATCH",
                body: JSON.stringify(updates),
            });
            toast({
                title: "Sucesso",
                description: "Orçamento atualizado com sucesso.",
                variant: "default",
            });
            fetchData();
        } catch (err: any) {
            toast({
                title: "Erro",
                description: err.message || "Falha ao atualizar orçamento.",
                variant: "destructive",
            });
            throw err;
        }
    };

    const handleSaveExpense = async (expenseData: any) => {
        try {
            if (expenseData.id) {
                // Edit
                await api(`/api/v1/projetos/${projectId}/expenses/${expenseData.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(expenseData),
                });
            } else {
                // Create
                await api(`/api/v1/projetos/${projectId}/expenses`, {
                    method: "POST",
                    body: JSON.stringify(expenseData),
                });
            }
            toast({
                title: "Sucesso",
                description: expenseData.id ? "Despesa atualizada." : "Despesa adicionada.",
                variant: "default",
            });
            fetchData();
        } catch (err: any) {
            toast({
                title: "Erro",
                description: err.message || "Falha ao salvar despesa.",
                variant: "destructive",
            });
            throw err;
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover esta despesa?")) return;

        try {
            await api(`/api/v1/projetos/${projectId}/expenses/${id}`, {
                method: "DELETE",
            });
            toast({
                title: "Sucesso",
                description: "Despesa removida.",
                variant: "default",
            });
            fetchData();
        } catch (err: any) {
            toast({
                title: "Erro",
                description: err.message || "Falha ao remover despesa.",
                variant: "destructive",
            });
        }
    };

    const handleEditClick = (expense: any) => {
        setExpenseToEdit(expense);
        setIsExpenseOpen(true);
    };

    const handleAddClick = () => {
        setExpenseToEdit(null);
        setIsExpenseOpen(true);
    };

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md flex flex-col gap-2 border border-destructive/20">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <h5 className="font-semibold text-sm">Erro</h5>
                </div>
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchData} className="mt-2 text-destructive-foreground border-destructive/20 hover:bg-destructive/10 w-fit">
                    <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold tracking-tight">Gestão Financeira</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsBudgetOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Verba
                    </Button>
                    <Button size="sm" onClick={handleAddClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Despesa
                    </Button>
                </div>
            </div>

            <KPICards data={data} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-card rounded-xl border shadow-sm h-full">
                        <div className="p-4 border-b">
                            <h4 className="font-semibold text-sm">Histórico de Despesas</h4>
                        </div>
                        <div className="p-0">
                            <ExpenseList
                                expenses={data?.expenses || []}
                                loading={loading}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteExpense}
                            />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <BudgetChart data={data} loading={loading} />
                </div>
            </div>

            <BudgetDialog
                open={isBudgetOpen}
                onOpenChange={setIsBudgetOpen}
                initialData={data ? {
                    budget_cents: data.budget_cents,
                    expected_revenue_cents: data.expected_revenue_cents,
                    actual_revenue_cents: data.actual_revenue_cents
                } : undefined}
                onSave={handleUpdateBudget}
            />

            <ExpenseDialog
                open={isExpenseOpen}
                onOpenChange={setIsExpenseOpen}
                expenseToEdit={expenseToEdit}
                onSave={handleSaveExpense}
            />
        </div>
    );
}
