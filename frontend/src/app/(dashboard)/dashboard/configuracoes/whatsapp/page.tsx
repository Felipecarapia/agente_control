"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Wifi, WifiOff, QrCode, RefreshCw, Loader2 } from "lucide-react";

type WhatsAppConnection = {
  id: string;
  name: string;
  phone_number: string | null;
  provider: string;
  api_url: string;
  api_key: string;
  instance_name: string | null;
  status: string;
  webhook_url: string | null;
  created_at: string | null;
};

const statusBadge: Record<string, { label: string; color: string }> = {
  connected: { label: "Conectado", color: "bg-green-500/20 text-green-400" },
  connecting: { label: "Conectando...", color: "bg-yellow-500/20 text-yellow-400" },
  disconnected: { label: "Desconectado", color: "bg-red-500/20 text-red-400" },
};

export default function WhatsAppConfigPage() {
  const [list, setList] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    provider: "evolution",
    api_url: "",
    api_key: "",
    instance_name: "",
    webhook_url: "",
  });

  async function loadList() {
    setLoading(true);
    try {
      const data = await api<WhatsAppConnection[]>("/api/v1/whatsapp/connections");
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ name: "", phone_number: "", provider: "evolution", api_url: "", api_key: "", instance_name: "", webhook_url: "" });
    setOpen(true);
  }

  function openEdit(c: WhatsAppConnection) {
    setEditId(c.id);
    setForm({
      name: c.name,
      phone_number: c.phone_number || "",
      provider: c.provider,
      api_url: c.api_url,
      api_key: c.api_key,
      instance_name: c.instance_name || "",
      webhook_url: c.webhook_url || "",
    });
    setOpen(true);
  }

  async function save() {
    try {
      const body = { ...form };
      if (editId) {
        await api(`/api/v1/whatsapp/connections/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/whatsapp/connections", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      loadList();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e?.message || "Erro desconhecido"}`);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/whatsapp/connections/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      alert(`Erro ao excluir: ${e?.message || "Erro desconhecido"}`);
    }
  }

  async function connect(c: WhatsAppConnection) {
    setConnectingId(c.id);
    try {
      const result = await api<{ qr_code?: string; status: string }>(`/api/v1/whatsapp/connections/${c.id}/connect`, { method: "POST" });
      if (result.qr_code) {
        setQrCode(result.qr_code);
        setQrOpen(true);
      }
      loadList();
    } catch (e: any) {
      alert(`Erro ao conectar: ${e?.message || "Erro desconhecido"}`);
    } finally {
      setConnectingId(null);
    }
  }

  async function disconnect(c: WhatsAppConnection) {
    try {
      await api(`/api/v1/whatsapp/connections/${c.id}/disconnect`, { method: "POST" });
      loadList();
    } catch (e: any) {
      alert(`Erro ao desconectar: ${e?.message || "Erro desconhecido"}`);
    }
  }

  async function checkStatus(c: WhatsAppConnection) {
    try {
      await api(`/api/v1/whatsapp/connections/${c.id}/status`);
      loadList();
    } catch {
      // silenciar
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conexões WhatsApp</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conexão
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma conexão</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecte um número WhatsApp para seus agentes utilizarem.
            </p>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const badge = statusBadge[c.status] || statusBadge.disconnected;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Provider: <span className="text-foreground capitalize">{c.provider}</span></p>
                    {c.phone_number && <p>Telefone: <span className="text-foreground">{c.phone_number}</span></p>}
                    {c.instance_name && <p>Instância: <span className="text-foreground">{c.instance_name}</span></p>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {c.status === "connected" ? (
                      <Button variant="outline" size="sm" onClick={() => disconnect(c)}>
                        <WifiOff className="h-3 w-3 mr-1" /> Desconectar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => connect(c)} disabled={connectingId === c.id}>
                        {connectingId === c.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Wifi className="h-3 w-3 mr-1" />
                        )}
                        Conectar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => checkStatus(c)}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Conexão" : "Nova Conexão WhatsApp"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: WhatsApp Comercial" />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="5511999999999" />
            </div>
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="official">API Oficial (Meta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>API URL</Label>
              <Input value={form.api_url} onChange={(e) => setForm((f) => ({ ...f, api_url: e.target.value }))} placeholder="https://api.evolution.com.br" />
            </div>
            <div className="grid gap-2">
              <Label>API Key</Label>
              <Input value={form.api_key} onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))} type="password" placeholder="Sua chave de API" />
            </div>
            {form.provider === "evolution" && (
              <div className="grid gap-2">
                <Label>Nome da Instância (opcional)</Label>
                <Input value={form.instance_name} onChange={(e) => setForm((f) => ({ ...f, instance_name: e.target.value }))} placeholder="crm_comercial" />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Webhook URL (opcional)</Label>
              <Input value={form.webhook_url} onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))} placeholder="https://seudominio.com/api/v1/whatsapp/webhook" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Escaneie o QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {qrCode ? (
              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-64 h-64" />
            ) : (
              <p className="text-muted-foreground">Nenhum QR Code disponível</p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Abra o WhatsApp no celular e escaneie este código
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A conexão será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
