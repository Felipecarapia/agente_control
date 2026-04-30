
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, Users, FolderKanban, ListTodo, 
  FileText, FileSignature, Activity, Zap, Cpu, Sparkles 
} from "lucide-react";
import { ProductivityWidget } from "@/components/productivity/ProductivityWidget";
import { OverdueTasksMonitor } from "@/components/productivity/OverdueTasksMonitor";
import { ProjectDashboardV2 } from "@/components/dashboard/v2/ProjectDashboardV2";
import { Button } from "@/components/ui/button";

const modules = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, desc: "Gestão de carteira", color: "from-blue-500/20 to-cyan-500/20", border: "hover:border-cyan-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)]" },
  { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban, desc: "Workflows & Kanban", color: "from-violet-500/20 to-purple-500/20", border: "hover:border-purple-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]" },
  { href: "/dashboard/tarefas", label: "Tarefas", icon: ListTodo, desc: "Produtividade", color: "from-emerald-500/20 to-green-500/20", border: "hover:border-green-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.4)]" },
  { href: "/dashboard/propostas", label: "Propostas", icon: FileText, desc: "Orçamentos e envios", color: "from-orange-500/20 to-amber-500/20", border: "hover:border-amber-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]" },
  { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature, desc: "Assinaturas e docs", color: "from-rose-500/20 to-red-500/20", border: "hover:border-red-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]" },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity, desc: "Métricas avançadas", color: "from-indigo-500/20 to-blue-500/20", border: "hover:border-indigo-500/50", glow: "group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)]" },
];

export default function DashboardPage() {
  const [isV2, setIsV2] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      {/* Elementos Tecnológicos de Fundo (Glows, Gradients) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-violet-500/5 blur-[100px] mix-blend-screen" />
        
        {/* Grid lines sutis para dar ar tech */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.02] dark:opacity-[0.05]" />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Header da Dashboard */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 backdrop-blur-md border border-border/50 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-cyan-500 to-violet-500 bg-clip-text text-transparent">
                Command Center
              </h2>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block" />
              Sistema Operacional CRM Online
            </p>
          </div>
          <Button 
            variant="default" 
            size="lg" 
            onClick={() => setIsV2(!isV2)}
            className="relative overflow-hidden group bg-primary/90 hover:bg-primary transition-all duration-300"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            <span className="relative flex items-center gap-2">
              {isV2 ? <LayoutDashboard className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {isV2 ? "Voltar ao Hub" : "Ativar Modo Avançado"}
            </span>
          </Button>
        </motion.div>

        {/* Monitor de Tarefas Atrasadas (invisível, apenas notifica) */}
        <OverdueTasksMonitor />

        <AnimatePresence mode="wait">
          {isV2 ? (
            <motion.div
              key="v2"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl relative"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 rounded-3xl pointer-events-none" />
               <ProjectDashboardV2 onToggleVersion={() => setIsV2(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="hub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Seção de Módulos (Navegação Tech) */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground/80">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Módulos do Sistema
                </h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {modules.map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <motion.div
                        key={m.href}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <Link href={m.href} className="block h-full outline-none">
                          <Card className={`group relative h-full overflow-hidden border border-border/50 bg-card/40 backdrop-blur-md transition-all duration-500 cursor-pointer ${m.border} ${m.glow} hover:-translate-y-2`}>
                            {/* Background Gradient animado */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            {/* Elemento de brilho superior */}
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full relative z-10">
                              <div className="mb-4 p-3 rounded-2xl bg-background/50 border border-white/5 backdrop-blur-lg group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Icon className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
                              </div>
                              <CardTitle className="text-lg font-bold mb-1 tracking-wide">{m.label}</CardTitle>
                              <p className="text-xs text-muted-foreground font-medium">{m.desc}</p>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Widget de Produtividade com design integrado */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-cyan-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
                <div className="relative bg-card/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-cyan-500 to-violet-500" />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-foreground/80">
                      <Activity className="w-5 h-5 text-primary" />
                      Status Operacional
                    </h3>
                    <ProductivityWidget />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

