
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CornerDownLeft, DollarSign, Calendar as CalIcon } from "lucide-react";

interface ExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expenseToEdit?: any; // strict typing could be better but 'any' or shared interface is fine for now
    onSave: (data: any) => Promise<void>;
}

const CATEGORIES = [
    { value: "DOMAIN", label: "Domínio" },
    { value: "ADS", label: "Tráfego/Ads" },
    { value: "TOOLS", label: "Ferramentas" },
    { value: "HUMAN_RESOURCES", label: "Recursos Humanos" },
    { value: "OTHER", label: "Outros" },
];

export function ExpenseDialog({
    open,
    onOpenChange,
    expenseToEdit,
    onSave,
}: ExpenseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        category: "OTHER",
        amount: "",
        occurred_at: format(new Date(), "yyyy-MM-dd"),
        vendor: "",
        notes: "",
    });

    useEffect(() => {
        if (open) {
            if (expenseToEdit) {
                setFormData({
                    title: expenseToEdit.title,
                    category: expenseToEdit.category,
                    amount: (expenseToEdit.amount_cents / 100).toFixed(2),
                    occurred_at: format(new Date(expenseToEdit.occurred_at), "yyyy-MM-dd"), // ensure correct format for input type=date
                    vendor: expenseToEdit.vendor || "",
                    notes: expenseToEdit.notes || "",
                });
            } else {
                setFormData({
                    title: "",
                    category: "OTHER",
                    amount: "",
                    occurred_at: format(new Date(), "yyyy-MM-dd"),
                    vendor: "",
                    notes: "",
                });
            }
        }
    }, [open, expenseToEdit]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                amount_cents: Math.round(parseFloat(formData.amount || "0") * 100),
            };
            // Remove 'amount' string field from payload before sending? 
            // Actually onSave expects { ... , amount_cents }
            // So I'll structure it:
            const submitData: any = {
                title: formData.title,
                category: formData.category,
                amount_cents: payload.amount_cents,
                occurred_at: formData.occurred_at,
                vendor: formData.vendor || null,
                notes: formData.notes || null,
            };

            if (expenseToEdit) {
                submitData.id = expenseToEdit.id;
            }

            await onSave(submitData);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save expense", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {expenseToEdit ? "Editar Despesa" : "Nova Despesa"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="occurred_at">Data</Label>
                            <Input
                                id="occurred_at"
                                type="date"
                                value={formData.occurred_at}
                                onChange={(e) => handleChange("occurred_at", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => handleChange("category", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Descrição / Título</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            placeholder="Ex: Pagamento Hospedagem"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 relative">
                            <Label htmlFor="amount">Valor (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="pl-9"
                                    value={formData.amount}
                                    onChange={(e) => handleChange("amount", e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor">Fornecedor (Opcional)</Label>
                            <Input
                                id="vendor"
                                value={formData.vendor}
                                onChange={(e) => handleChange("vendor", e.target.value)}
                                placeholder="Ex: AWS, Facebook"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Detalhes adicionais..."
                            className="resize-none h-20"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : expenseToEdit ? "Atualizar" : "Adicionar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
