"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserCircle, Users, FileText, ListTodo, DollarSign } from "lucide-react";

type Cliente = {
  id: number;
  tipo: string;
  nome: string;
  razao_social: string | null;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

const emptyForm = {
  tipo: "pf" as "pf" | "pj",
  nome: "",
  razao_social: "",
  cpf: "",
  cnpj: "",
  rg: "",
  inscricao_estadual: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(id)) return;
    api<Cliente>(`/api/v1/clientes/${id}`)
      .then((c) => {
        setForm({
          tipo: (c.tipo || "pf") as "pf" | "pj",
          nome: c.nome || "",
          razao_social: c.razao_social || "",
          cpf: c.cpf || "",
          cnpj: c.cnpj || "",
          rg: c.rg || "",
          inscricao_estadual: c.inscricao_estadual || "",
          email: c.email || "",
          telefone: c.telefone || "",
          celular: c.celular || "",
          cep: c.cep || "",
          endereco: c.endereco || "",
          numero: c.numero || "",
          complemento: c.complemento || "",
          bairro: c.bairro || "",
          cidade: c.cidade || "",
          estado: c.estado || "",
        });
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      await api(`/api/v1/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tipo: form.tipo,
          nome: form.nome,
          razao_social: form.tipo === "pj" ? form.razao_social || null : null,
          cpf: form.tipo === "pf" ? form.cpf || null : null,
          cnpj: form.tipo === "pj" ? form.cnpj || null : null,
          rg: form.tipo === "pf" ? form.rg || null : null,
          inscricao_estadual: form.tipo === "pj" ? form.inscricao_estadual || null : null,
          email: form.email || null,
          telefone: form.telefone || null,
          celular: form.celular || null,
          cep: form.cep || null,
          endereco: form.endereco || null,
          numero: form.numero || null,
          complemento: form.complemento || null,
          bairro: form.bairro || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
        }),
      });
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const isPj = form.tipo === "pj";

  if (loadErr) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-destructive">{loadErr}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cliente: {form.nome || "..."}</h1>
          <p className="text-muted-foreground">Cadastro e informações do cliente</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dados" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-2">
            <Users className="h-4 w-4" />
            Time
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <form onSubmit={submit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados do cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as "pf" | "pj" }))}
                  >
                    <option value="pf">Pessoa física</option>
                    <option value="pj">Pessoa jurídica</option>
                  </select>
                </div>

                {isPj ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="razao_social">Razão social</Label>
                      <Input id="razao_social" value={form.razao_social} onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome fantasia</Label>
                      <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="inscricao_estadual">Inscrição estadual</Label>
                        <Input id="inscricao_estadual" value={form.inscricao_estadual} onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input id="rg" value={form.rg} onChange={(e) => setForm((f) => ({ ...f, rg: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}

                <hr className="border-border" />
                <div className="text-sm font-medium text-muted-foreground">Contato</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 0000-0000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input id="celular" value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <hr className="border-border" />
                <div className="text-sm font-medium text-muted-foreground">Endereço</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2 grid gap-2">
                    <Label htmlFor="endereco">Logradouro</Label>
                    <Input id="endereco" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" value={form.complemento} onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
                  </div>
                  <div className="grid gap-2 max-w-[120px]">
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2 mt-6">
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/clientes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time</CardTitle>
              <p className="text-sm text-muted-foreground">Equipe e contatos vinculados a este cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: gestão de membros do time do cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <p className="text-sm text-muted-foreground">Documentos anexados ao cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: upload e listagem de documentos.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarefas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
              <p className="text-sm text-muted-foreground">Tarefas relacionadas a este cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: listagem de tarefas por projeto vinculado ao cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
              <p className="text-sm text-muted-foreground">Propostas, contratos e movimentação financeira.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: resumo financeiro e histórico do cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
