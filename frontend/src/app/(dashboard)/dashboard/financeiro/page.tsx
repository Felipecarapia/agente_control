"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  TrendingUp, TrendingDown, DollarSign, Building2, Loader2, AlertTriangle, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";

type DashboardData = {
  receita_total_mes: number;
  despesas_total_mes: number;
  lucro_liquido_mes: number;
  saldo_contas_bancarias: number;
  receitas_despesas_mensal: Array<{
    mes: string;
    receitas: number;
    despesas: number;
    lucro: number;
  }>;
  despesas_por_categoria: Array<{
    categoria: string;
    valor: number;
  }>;
  fluxo_caixa_mensal: Array<{
    mes: string;
    receitas: number;
    despesas: number;
    lucro: number;
  }>;
  contas_vencendo: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    tipo: string;
  }>;
  dre_receitas: number;
  dre_despesas: number;
  dre_resultado: number;
};

const COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

const categoriaLabels: Record<string, string> = {
  fornecedor: "Fornecedor",
  aluguel: "Aluguel",
  salario: "Salário",
  imposto: "Imposto",
  servico: "Serviço",
  software: "Software",
  marketing: "Marketing",
  infraestrutura: "Infraestrutura",
  outros: "Outros",
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMes(mesStr: string) {
  const [ano, mes] = mesStr.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardFinanceiroPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await api<DashboardData>("/api/v1/financeiro/dashboard");
      if (result) setData(result);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Não foi possível carregar os dados do dashboard.</p>
      </div>
    );
  }

  const barData = data.receitas_despesas_mensal.map((item) => ({
    ...item,
    mes: formatMes(item.mes),
  }));

  const lineData = data.fluxo_caixa_mensal.map((item) => ({
    ...item,
    mes: formatMes(item.mes),
    saldo: item.lucro,
  }));

  const pieData = data.despesas_por_categoria.map((item) => ({
    name: categoriaLabels[item.categoria] || item.categoria,
    value: item.valor,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios Financeiros</h1>
        <p className="text-muted-foreground text-sm">Visão geral da saúde financeira da empresa</p>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita do Mês</p>
                <p className="text-xl font-bold">{formatCurrency(data.receita_total_mes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas do Mês</p>
                <p className="text-xl font-bold">{formatCurrency(data.despesas_total_mes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${data.lucro_liquido_mes >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                <DollarSign className={`h-5 w-5 ${data.lucro_liquido_mes >= 0 ? "text-emerald-400" : "text-red-400"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-xl font-bold ${data.lucro_liquido_mes >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(data.lucro_liquido_mes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Bancário</p>
                <p className="text-xl font-bold">{formatCurrency(data.saldo_contas_bancarias)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Barras + Pizza */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico de barras - Receitas vs Despesas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receitas vs Despesas (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Despesas por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem despesas no mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de linha - Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo de Caixa Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="saldo" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* DRE Simplificado + Contas a Vencer */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* DRE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DRE Simplificado (Mês Atual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm font-medium text-green-400">( + ) Receitas</span>
                <span className="font-semibold text-green-400">{formatCurrency(data.dre_receitas)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-sm font-medium text-red-400">( - ) Despesas</span>
                <span className="font-semibold text-red-400">{formatCurrency(data.dre_despesas)}</span>
              </div>
              <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3">
                <span className="text-sm font-bold">( = ) Resultado</span>
                <span className={`text-lg font-bold ${data.dre_resultado >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(data.dre_resultado)}
                </span>
              </div>
              {data.dre_resultado < 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Resultado negativo no mês. Revise suas despesas.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contas a vencer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas a Vencer (Próximos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.contas_vencendo.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma conta vencendo nos próximos 7 dias.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contas_vencendo.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell className="text-sm font-medium">{conta.descricao}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          conta.tipo === "pagar" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                        }`}>
                          {conta.tipo === "pagar" ? "Pagar" : "Receber"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(conta.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(conta.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
