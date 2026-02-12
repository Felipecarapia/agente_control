
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "./KPICards";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Expense {
    id: string;
    title: string;
    category: string;
    amount_cents: number;
    occurred_at: string; // ISO date string from API
    vendor: string | null;
    notes: string | null;
}

interface ExpenseListProps {
    expenses: Expense[];
    onEdit: (expense: Expense) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    DOMAIN: "Domínio",
    ADS: "Tráfego/Ads",
    TOOLS: "Ferramentas",
    HUMAN_RESOURCES: "Recursos Humanos",
    OTHER: "Outros",
};

export function ExpenseList({ expenses, onEdit, onDelete, loading }: ExpenseListProps) {
    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Carregando despesas...</div>;
    }

    if (expenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/10 h-[300px]">
                <p className="text-muted-foreground mb-2">Nenhuma despesa registrada.</p>
                <p className="text-xs text-muted-foreground">Adicione despesas para acompanhar os custos do projeto.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell className="font-medium">
                                {format(new Date(expense.occurred_at), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>{expense.title}</TableCell>
                            <TableCell>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                    {CATEGORY_LABELS[expense.category] || expense.category}
                                </div>
                            </TableCell>
                            <TableCell>{expense.vendor || "—"}</TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(expense.amount_cents)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => onEdit(expense)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => onDelete(expense.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
