"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Save,
  Plus,
  Trash2,
  Paperclip,
  MessageSquare,
  User,
  Calendar,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BlockEditor } from "./BlockEditor";
import { TaskComments } from "./TaskComments";
import { TaskAttachments } from "./TaskAttachments";

type TaskProperty = {
  id: string;
  key: string;
  name: string;
  type: string;
  config_json?: any;
};

type TaskBlock = {
  id: string;
  type: string;
  content_json?: any;
  order_index: number;
};

type TaskComment = {
  id: string;
  content: string;
  author_user_id: string | null;
  author_nome: string | null;
  created_at: string;
};

type TaskAttachment = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  url: string | null;
  created_at: string;
};

type TaskWithNotion = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string | null;
  data_vencimento: string | null;
  responsavel_id: string | null;
  is_recurring: boolean;
  property_values: Array<{
    id: string;
    property_id: string;
    value_json?: any;
  }>;
  blocks: TaskBlock[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
};

interface TaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  properties: TaskProperty[];
  usuarios: Array<{ id: string; nome: string }>;
  projetos: Array<{ id: string; nome: string }>;
  onSave?: () => void;
}

export function TaskDrawer({
  open,
  onOpenChange,
  taskId,
  properties,
  usuarios,
  projetos,
  onSave,
}: TaskDrawerProps) {
  const [task, setTask] = useState<TaskWithNotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("pendente");
  const [prioridade, setPrioridade] = useState<string>("none");
  const [dataVencimento, setDataVencimento] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [blocks, setBlocks] = useState<TaskBlock[]>([]);
  const [propertyValues, setPropertyValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && taskId) {
      loadTask();
    } else if (!open) {
      setTask(null);
      setBlocks([]);
      setPropertyValues({});
    }
  }, [open, taskId]);

  async function loadTask() {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await api<TaskWithNotion>(`/api/v1/tarefas/${taskId}/notion`);
      setTask(data);
      setTitle(data.titulo);
      setStatus(data.status);
      setPrioridade(data.prioridade || "none");
      setDataVencimento(data.data_vencimento || "");
      setResponsavelId(data.responsavel_id);
      setIsRecurring(data.is_recurring);
      setBlocks(data.blocks || []);
      
      // Carregar property values
      const values: Record<string, any> = {};
      data.property_values.forEach((pv) => {
        values[pv.property_id] = pv.value_json;
      });
      setPropertyValues(values);
    } catch (e) {
      console.error("Erro ao carregar tarefa:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveTask() {
    if (!taskId) return;
    setSaving(true);
    try {
      // Salvar dados básicos
      await api(`/api/v1/tarefas/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          titulo: title,
          status,
          prioridade: prioridade && prioridade !== "none" ? prioridade : null,
          data_vencimento: dataVencimento || null,
          responsavel_id: responsavelId,
          is_recurring: isRecurring,
        }),
      });

      // Salvar blocks
      await api(`/api/v1/task-notion/tasks/${taskId}/blocks`, {
        method: "PUT",
        body: JSON.stringify(blocks),
      });

      // Salvar property values
      for (const [propertyId, valueJson] of Object.entries(propertyValues)) {
        await api(`/api/v1/task-notion/property-values`, {
          method: "POST",
          body: JSON.stringify({
            task_id: taskId,
            property_id: propertyId,
            value_json: valueJson,
          }),
        });
      }

      onSave?.();
      onOpenChange(false);
    } catch (e) {
      console.error("Erro ao salvar tarefa:", e);
      alert("Erro ao salvar tarefa");
    } finally {
      setSaving(false);
    }
  }

  function updatePropertyValue(propertyId: string, value: any) {
    setPropertyValues((prev) => ({
      ...prev,
      [propertyId]: value,
    }));
  }

  function getPropertyValue(propertyId: string): any {
    return propertyValues[propertyId] || null;
  }

  function renderProperty(property: TaskProperty) {
    const value = getPropertyValue(property.id);
    const currentValue = value?.value || value;

    switch (property.type) {
      case "TEXT":
        return (
          <Input
            value={currentValue || ""}
            onChange={(e) =>
              updatePropertyValue(property.id, { value: e.target.value })
            }
            placeholder={property.name}
          />
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={currentValue || ""}
            onChange={(e) =>
              updatePropertyValue(property.id, {
                value: parseFloat(e.target.value) || 0,
              })
            }
            placeholder={property.name}
          />
        );

      case "SELECT":
        const options = property.config_json?.options || [];
        return (
          <Select
            value={currentValue || ""}
            onValueChange={(val) =>
              updatePropertyValue(property.id, { value: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={property.name} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "MULTI_SELECT":
        const multiOptions = property.config_json?.options || [];
        const selectedValues = Array.isArray(currentValue)
          ? currentValue
          : currentValue
          ? [currentValue]
          : [];
        return (
          <div className="space-y-2">
            {multiOptions.map((opt: string) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedValues.includes(opt)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt);
                    updatePropertyValue(property.id, { value: newValues });
                  }}
                />
                <Label>{opt}</Label>
              </div>
            ))}
          </div>
        );

      case "DATE":
        return (
          <Input
            type="date"
            value={currentValue ? new Date(currentValue).toISOString().split("T")[0] : ""}
            onChange={(e) =>
              updatePropertyValue(property.id, { value: e.target.value })
            }
          />
        );

      case "CHECKBOX":
        return (
          <Checkbox
            checked={currentValue === true}
            onCheckedChange={(checked) =>
              updatePropertyValue(property.id, { value: checked })
            }
          />
        );

      default:
        return (
          <Input
            value={currentValue || ""}
            onChange={(e) =>
              updatePropertyValue(property.id, { value: e.target.value })
            }
            placeholder={property.name}
          />
        );
    }
  }

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0"
              placeholder="Título da tarefa"
            />
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status e informações básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={responsavelId?.toString() || "none"}
                onValueChange={(val) =>
                  setResponsavelId(val && val !== "none" ? val : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Propriedades customizáveis */}
          {properties.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">Propriedades</h3>
              {properties.map((property) => (
                <div key={property.id} className="space-y-2">
                  <Label>{property.name}</Label>
                  {renderProperty(property)}
                </div>
              ))}
            </div>
          )}

          {/* Editor de blocos */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-sm">Conteúdo</h3>
            <BlockEditor 
              blocks={blocks.map(b => ({ ...b, id: b.id || "" }))} 
              onChange={(newBlocks) => setBlocks(newBlocks.map(b => ({ ...b, id: b.id || "" })))} 
            />
          </div>

          {/* Anexos */}
          {task && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </h3>
              <TaskAttachments
                taskId={task.id}
                attachments={task.attachments}
                onUploadComplete={loadTask}
              />
            </div>
          )}

          {/* Comentários */}
          {task && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentários
              </h3>
              <TaskComments
                taskId={task.id}
                comments={task.comments}
                usuarios={usuarios}
                onCommentAdded={loadTask}
              />
            </div>
          )}

          {/* Recorrência */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Tarefa recorrente
              </Label>
            </div>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={saveTask} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

