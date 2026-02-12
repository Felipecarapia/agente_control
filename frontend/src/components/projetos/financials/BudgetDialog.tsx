
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";

interface BudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        budget_cents: number;
        expected_revenue_cents: number;
        actual_revenue_cents: number;
    };
    onSave: (data: {
        budget_cents: number;
        expected_revenue_cents: number;
        actual_revenue_cents: number;
    }) => Promise<void>;
}

export function BudgetDialog({
    open,
    onOpenChange,
    initialData,
    onSave,
}: BudgetDialogProps) {
    const [budget, setBudget] = useState("");
    const [expected, setExpected] = useState("");
    const [actual, setActual] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && initialData) {
            setBudget((initialData.budget_cents / 100).toFixed(2));
            setExpected((initialData.expected_revenue_cents / 100).toFixed(2));
            setActual((initialData.actual_revenue_cents / 100).toFixed(2));
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                budget_cents: Math.round(parseFloat(budget || "0") * 100),
                expected_revenue_cents: Math.round(parseFloat(expected || "0") * 100),
                actual_revenue_cents: Math.round(parseFloat(actual || "0") * 100),
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save budget", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Definir Orçamento e Metas</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="budget" className="text-right">
                            Orçamento
                        </Label>
                        <div className="col-span-3 relative">
                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="budget"
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-9"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expected" className="text-right">
                            Receita Prevista
                        </Label>
                        <div className="col-span-3 relative">
                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="expected"
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-9"
                                value={expected}
                                onChange={(e) => setExpected(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="actual" className="text-right">
                            Receita Real
                        </Label>
                        <div className="col-span-3 relative">
                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="actual"
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-9"
                                value={actual}
                                onChange={(e) => setActual(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
