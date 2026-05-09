"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bot, Loader2, MessageCircle, Plus, Search, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TenantData = {
  nome_negocio: string;
  plano: "basic" | "pro" | "enterprise";
};

type Perfil = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
};

type ModuleInfo = {
  limits: Record<string, number>;
  usage: Record<string, number>;
};

export default function ClienteAreaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [profiles, setProfiles] = useState<Perfil[]>([]);
  const [moduleAgents, setModuleAgents] = useState<ModuleInfo | null>(null);
  const [moduleWhatsapp, setModuleWhatsapp] = useState<ModuleInfo | null>(null);
  const [moduleCampaigns, setModuleCampaigns] = useState<ModuleInfo | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [profileForm, setProfileForm] = useState({ nome: "", email: "", password: "" });

  useEffect(() => {
    loadData();
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesQuery = !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? p.ativo : !p.ativo;
      return matchesQuery && matchesStatus;
    });
  }, [profiles, query, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [tenantData, users, agentsInfo, waInfo, campInfo] = await Promise.all([
        api<TenantData>("/api/v1/tenant/me"),
        api<Perfil[]>("/api/v1/usuarios").catch(() => []),
        api<ModuleInfo>("/api/v1/agents/module-info").catch(() => null),
        api<ModuleInfo>("/api/v1/whatsapp/module-info").catch(() => null),
        api<ModuleInfo>("/api/v1/campaigns/module-info").catch(() => null),
      ]);
      setTenant(tenantData);
      setProfiles(Array.isArray(users) ? users : []);
      setModuleAgents(agentsInfo);
      setModuleWhatsapp(waInfo);
      setModuleCampaigns(campInfo);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao carregar área do cliente",
      });
    } finally {
      setLoading(false);
    }
  }

  async function createProfile() {
    if (!profileForm.nome.trim() || !profileForm.email.trim() || !profileForm.password.trim()) return;
    setCreatingProfile(true);
    try {
      await api("/api/v1/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: profileForm.nome,
          email: profileForm.email,
          password: profileForm.password,
          ativo: true,
        }),
      });
      setProfileForm({ nome: "", email: "", password: "" });
      await loadData();
      toast({ title: "Sucesso", description: "Perfil criado." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao criar perfil" });
    } finally {
      setCreatingProfile(false);
    }
  }

  async function toggleProfileStatus(p: Perfil) {
    try {
      await api(`/api/v1/usuarios/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !p.ativo }),
      });
      await loadData();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao atualizar perfil" });
    }
  }

  function percent(usage: number, limit: number) {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((usage / limit) * 100));
  }

  if (loading) {
    return (
      <div className="flex min-h-[460px] items-center justify-center text-muted-foreground">
        Carregando área do cliente...
      </div>
    );
  }

  const agentsUsage = moduleAgents?.usage?.ai_agents ?? 0;
  const agentsLimit = moduleAgents?.limits?.ai_agents ?? 0;
  const waUsage = moduleWhatsapp?.usage?.whatsapp_connections ?? 0;
  const waLimit = moduleWhatsapp?.limits?.whatsapp_connections ?? 0;
  const campUsage = moduleCampaigns?.usage?.campaigns_active ?? 0;
  const campLimit = moduleCampaigns?.limits?.campaigns_active ?? 0;

  const metricCards = [
    {
      title: "Agentes IA",
      icon: Bot,
      usage: agentsUsage,
      limit: agentsLimit,
      barClass: "bg-cyan-500",
    },
    {
      title: "WhatsApp",
      icon: MessageCircle,
      usage: waUsage,
      limit: waLimit,
      barClass: "bg-emerald-500",
    },
    {
      title: "Campanhas",
      icon: Target,
      usage: campUsage,
      limit: campLimit,
      barClass: "bg-violet-500",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border bg-card px-6 py-5">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -top-16 right-8 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-16 left-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Tenant Security Active
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{tenant?.nome_negocio || "Área do Cliente"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestão de perfis e capacidade do plano</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{tenant?.plano || "-"}</Badge>
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" />
              Enterprise View
            </Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {metricCards.map((m, idx) => {
          const p = percent(m.usage, m.limit);
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span>{m.title}</span>
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-3xl font-semibold leading-none">{m.usage}</span>
                    <span className="text-sm text-muted-foreground">de {m.limit}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <motion.div
                      className={`h-2 rounded-full ${m.barClass}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{p}% utilizado</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Perfis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={profileForm.nome} onChange={(e) => setProfileForm((s) => ({ ...s, nome: e.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Email</Label>
              <Input value={profileForm.email} onChange={(e) => setProfileForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial</Label>
              <Input type="password" value={profileForm.password} onChange={(e) => setProfileForm((s) => ({ ...s, password: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={createProfile} disabled={creatingProfile}>
                {creatingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Adicionar
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome ou email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="inline-flex rounded-md border p-1">
              <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 text-xs rounded ${statusFilter === "all" ? "bg-muted font-medium" : "text-muted-foreground"}`}>Todos</button>
              <button onClick={() => setStatusFilter("active")} className={`px-3 py-1.5 text-xs rounded ${statusFilter === "active" ? "bg-muted font-medium" : "text-muted-foreground"}`}>Ativos</button>
              <button onClick={() => setStatusFilter("inactive")} className={`px-3 py-1.5 text-xs rounded ${statusFilter === "inactive" ? "bg-muted font-medium" : "text-muted-foreground"}`}>Inativos</button>
            </div>
            <div className="flex items-center justify-end text-xs text-muted-foreground">{filteredProfiles.length} perfil(is)</div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Perfil</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Nenhum perfil encontrado.</td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => (
                    <tr key={p.id} className="border-t transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => toggleProfileStatus(p)}>
                          {p.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

