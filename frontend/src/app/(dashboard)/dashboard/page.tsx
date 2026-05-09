"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, FolderKanban, ListTodo,
  TrendingUp, ArrowUpRight, ArrowDownRight,
  DollarSign, Target, Calendar, Clock,
  MoreVertical, Download, Filter, RefreshCw, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { OverdueTasksMonitor } from "@/components/productivity/OverdueTasksMonitor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter, SheetTrigger
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const revenueData = [
  { name: "Jan", total: 4500 },
  { name: "Fev", total: 5200 },
  { name: "Mar", total: 4800 },
  { name: "Abr", total: 6100 },
  { name: "Mai", total: 5900 },
  { name: "Jun", total: 7200 },
];

const distributionData = [
  { name: "Vendas",      value: 400, color: "hsl(0 0% 80%)" },
  { name: "Consultoria", value: 300, color: "hsl(0 0% 55%)" },
  { name: "Suporte",     value: 200, color: "hsl(0 0% 30%)" },
  { name: "Outros",      value: 100, color: "hsl(0 0% 16%)" },
];

const colorMap: Record<string, { accent: string; bg: string }> = {
  blue:    { accent: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  emerald: { accent: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  violet:  { accent: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  amber:   { accent: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
};

const StatCard = ({ title, value, change, trend, icon: Icon, color, index }: any) => {
  const c = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        {/* Top shimmer line */}
        <div
          className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${c.accent}70, transparent)` }}
        />
        {/* Ghost icon */}
        <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
          <Icon className="w-24 h-24" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ background: c.bg }}>
              <Icon className="w-4 h-4" style={{ color: c.accent }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">MTD</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight" style={{ letterSpacing: "-0.04em" }}>{value}</p>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{
                background: trend === "up" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                color: trend === "up" ? "#34d399" : "#f87171",
              }}
            >
              {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </span>
            <span className="text-[10px] text-muted-foreground">vs. mês anterior</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filterDate, setFilterDate] = useState("30d");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const tableData = [
    { id: "CRM-001", client: "AlphaClean SaaS",  value: "R$ 45.000", status: "Em Progresso", date: "20/04/2024" },
    { id: "CRM-002", client: "Vitus Tech",        value: "R$ 12.800", status: "Concluído",    date: "18/04/2024" },
    { id: "CRM-003", client: "Gleice Imóveis",    value: "R$ 89.200", status: "Pendente",     date: "15/04/2024" },
    { id: "CRM-004", client: "SellHuub Corp",     value: "R$ 32.500", status: "Em Progresso", date: "12/04/2024" },
    { id: "CRM-005", client: "Beesystem AI",      value: "R$ 67.400", status: "Cancelado",    date: "10/04/2024" },
  ];

  const statusStyle: Record<string, { bg: string; color: string }> = {
    "Concluído":    { bg: "rgba(52,211,153,0.1)",  color: "#34d399" },
    "Em Progresso": { bg: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    "Pendente":     { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    "Cancelado":    { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = "ID,Cliente,Valor,Status,Data\n";
      const rows = tableData.map(r => `${r.id},${r.client},${r.value},${r.status},${r.date}`).join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `export-crm-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExporting(false);
      toast({ title: "Exportação concluída", description: "A planilha foi baixada com sucesso." });
    }, 1500);
  };

  const priorityTasks = [
    { id: 1, title: "Finalizar proposta AlphaClean", due: "Hoje",    priority: "Alta",  desc: "Revisar todos os termos contratuais e enviar para aprovação.", client: "AlphaClean SaaS", category: "Vendas"   },
    { id: 2, title: "Reunião de kickoff Vitus",       due: "Amanhã", priority: "Média", desc: "Apresentar cronograma e alinhar expectativas técnicas.",        client: "Vitus Tech",       category: "Projetos"  },
    { id: 3, title: "Revisar contratos Gleice",       due: "2 dias", priority: "Alta",  desc: "Validar cláusulas de renovação e anexos técnicos.",            client: "Gleice Imóveis",   category: "Jurídico"  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <h2 className="font-bold text-foreground" style={{ fontSize: "1.4rem", letterSpacing: "-0.035em" }}>
            Visão Geral
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Métricas em tempo real da sua operação</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Filter className="w-3.5 h-3.5" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border/50 bg-card/95 backdrop-blur-xl">
              <SheetHeader>
                <SheetTitle>Filtros Avançados</SheetTitle>
                <SheetDescription>Refine as métricas e dados exibidos.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={filterDate} onValueChange={setFilterDate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      <SelectItem value="year">Este ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Mínimo</Label>
                  <Input type="number" placeholder="R$ 0,00" />
                </div>
              </div>
              <SheetFooter>
                <Button className="w-full">Aplicar Filtros</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button size="sm" className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </motion.div>
      </div>

      {/* Overdue monitor */}
      <OverdueTasksMonitor />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} title="Faturamento Total" value="R$ 142.384" change="+12.5%" trend="up"   icon={DollarSign}  color="blue"    />
        <StatCard index={1} title="Novos Leads"       value="842"        change="+18.2%" trend="up"   icon={Target}      color="emerald" />
        <StatCard index={2} title="Projetos Ativos"   value="24"         change="-4.3%"  trend="down" icon={FolderKanban} color="violet" />
        <StatCard index={3} title="Taxa de Conversão" value="3.2%"       change="+1.1%"  trend="up"   icon={TrendingUp}  color="amber"   />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-7">
        {/* Area chart */}
        <Card className="lg:col-span-4 border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold" style={{ letterSpacing: "-0.02em" }}>Desempenho de Vendas</CardTitle>
              <CardDescription className="text-xs mt-0.5">Crescimento mensal de faturamento</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "10px",
                      boxShadow: "0 8px 30px -4px rgba(0,0,0,0.3)",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--foreground))" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie + legend */}
        <Card className="lg:col-span-3 border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ letterSpacing: "-0.02em" }}>Distribuição de Receita</CardTitle>
            <CardDescription className="text-xs mt-0.5">Por categoria de serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value">
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {distributionData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  <span className="text-xs font-bold ml-auto">{Math.round(item.value / 10)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks & Activity */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Priority tasks */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ letterSpacing: "-0.02em" }}>
              <ListTodo className="w-4 h-4 text-muted-foreground" />
              Tarefas Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {priorityTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/40 transition-colors group cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-0.5 h-7 rounded-full flex-shrink-0"
                    style={{ background: task.priority === "Alta" ? "#f87171" : "#fbbf24" }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {task.due}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ml-2"
                  style={{
                    background: task.priority === "Alta" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                    color: task.priority === "Alta" ? "#f87171" : "#fbbf24",
                  }}
                >
                  {task.priority}
                </span>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ letterSpacing: "-0.02em" }}>
              <Users className="w-4 h-4 text-muted-foreground" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { user: "Lucas Nunes",  action: "aprovou a proposta",  target: "AlphaClean SaaS",    time: "Há 10 min",  init: "L" },
              { user: "Sistema",      action: "gerou novo lead",      target: "Gleice Albuquerque", time: "Há 25 min",  init: "S" },
              { user: "Vinícius",     action: "concluiu a tarefa",    target: "Setup de Banco",     time: "Há 1 hora",  init: "V" },
            ].map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3 items-start"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                >
                  {a.init}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{a.user}</span>
                    {" "}{a.action}{" "}
                    <span className="font-medium text-foreground/70">{a.target}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions table */}
      <Card className="border-border/60 bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold" style={{ letterSpacing: "-0.02em" }}>Transações Recentes</CardTitle>
            <CardDescription className="text-xs mt-0.5">Últimos negócios registrados no sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["ID", "Cliente", "Valor", "Status", "Data"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{row.id}</td>
                    <td className="px-5 py-3 font-medium">{row.client}</td>
                    <td className="px-5 py-3 font-semibold font-mono">{row.value}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={statusStyle[row.status] || { bg: "transparent", color: "inherit" }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Task detail modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[480px] border-border/60 bg-card">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      background: selectedTask.priority === "Alta" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                      color: selectedTask.priority === "Alta" ? "#f87171" : "#fbbf24",
                    }}
                  >
                    Prioridade {selectedTask.priority}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {selectedTask.due}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold" style={{ letterSpacing: "-0.03em" }}>
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription className="text-sm pt-1">{selectedTask.desc}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50 my-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cliente</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" /> {selectedTask.client}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Categoria</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" /> {selectedTask.category}
                  </p>
                </div>
              </div>

              <DialogFooter className="sm:justify-between items-center gap-3">
                <p className="text-xs text-muted-foreground italic">Criada há 2 horas por Sistema</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTask(null)}>Fechar</Button>
                  <Button size="sm">Concluir Tarefa</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
