"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ArrowLeft,
  Play,
  Loader2,
  MapPin,
  Phone,
  Globe,
  Star,
  UserPlus,
  Check,
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  config_json: Record<string, unknown> | null;
  total_leads_found: number;
  created_at: string | null;
};

type CampaignLead = {
  id: string;
  campaign_id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  rating: number | null;
  source: string;
  status: string;
  found_at: string | null;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  running: { label: "Executando", color: "bg-blue-500/20 text-blue-400" },
  paused: { label: "Pausada", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "Concluída", color: "bg-green-500/20 text-green-400" },
  failed: { label: "Falhou", color: "bg-red-500/20 text-red-400" },
};

const leadStatusLabels: Record<string, { label: string; color: string }> = {
  found: { label: "Encontrado", color: "bg-blue-500/20 text-blue-400" },
  queued: { label: "Na Fila", color: "bg-yellow-500/20 text-yellow-400" },
  contacted: { label: "Contactado", color: "bg-purple-500/20 text-purple-400" },
  responded: { label: "Respondeu", color: "bg-green-500/20 text-green-400" },
  converted: { label: "Convertido", color: "bg-emerald-500/20 text-emerald-400" },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [prospectResult, setProspectResult] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [campaignData, leadsData] = await Promise.all([
        api<Campaign>(`/api/v1/campaigns/${id}`),
        api<CampaignLead[]>(`/api/v1/campaigns/${id}/leads`).catch(() => []),
      ]);
      setCampaign(campaignData);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch {
      router.push("/dashboard/campanhas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function runProspecting() {
    setRunning(true);
    setProspectResult(null);
    try {
      const result = await api<{ message: string; new_leads: number; total_found: number }>(
        `/api/v1/campaigns/${id}/run`,
        { method: "POST" }
      );
      setProspectResult(result.message);
      loadData();
    } catch (e: any) {
      setProspectResult(`Erro: ${e?.message || "Falha na prospecção"}`);
      loadData();
    } finally {
      setRunning(false);
    }
  }

  async function convertLead(leadId: string) {
    setConvertingId(leadId);
    try {
      await api(`/api/v1/campaigns/${id}/leads/${leadId}/convert`, { method: "POST" });
      loadData();
    } catch (e: any) {
      alert(`Erro: ${e?.message || "Falha ao converter lead"}`);
    } finally {
      setConvertingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const config = campaign.config_json || {};
  const statusInfo = statusLabels[campaign.status] || statusLabels.draft;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/campanhas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground text-sm">{campaign.description || "Sem descrição"}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Info e ações */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tipo</p>
            <p className="text-lg font-semibold capitalize">{campaign.type.replace("_", " ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Leads Encontrados</p>
            <p className="text-lg font-semibold">{leads.length}</p>
          </CardContent>
        </Card>
        {config.city && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Cidade</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {config.city as string}{config.state ? `, ${config.state}` : ""}
              </p>
            </CardContent>
          </Card>
        )}
        {config.activity && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Atividade</p>
              <p className="text-lg font-semibold">{config.activity as string}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botão executar prospecção */}
      {campaign.type === "prospecting" && (
        <div className="flex items-center gap-4">
          <Button onClick={runProspecting} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {running ? "Buscando leads..." : "Executar Prospecção"}
          </Button>
          {prospectResult && (
            <p className="text-sm text-muted-foreground">{prospectResult}</p>
          )}
        </div>
      )}

      {/* Tabela de leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Encontrados ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum lead encontrado ainda. Execute a prospecção para buscar leads.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const lStatus = leadStatusLabels[lead.status] || leadStatusLabels.found;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.business_name}</p>
                          {lead.address && <p className="text-xs text-muted-foreground">{lead.address}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.phone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{lead.city || "-"}{lead.state ? `, ${lead.state}` : ""}</TableCell>
                      <TableCell className="text-sm">{lead.category || "-"}</TableCell>
                      <TableCell>
                        {lead.rating ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 text-yellow-400" /> {lead.rating.toFixed(1)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${lStatus.color}`}>
                          {lStatus.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lead.status === "converted" ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <Check className="h-3 w-3" /> Convertido
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => convertLead(lead.id)}
                            disabled={convertingId === lead.id}
                          >
                            {convertingId === lead.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3 mr-1" />
                            )}
                            Converter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
