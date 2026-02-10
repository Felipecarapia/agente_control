"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, FolderKanban, ListTodo, FileText, FileSignature } from "lucide-react";
import { ProductivityWidget } from "@/components/productivity/ProductivityWidget";
import { OverdueTasksMonitor } from "@/components/productivity/OverdueTasksMonitor";

const modules = [
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, count: "—" },
  { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban, count: "—" },
  { href: "/dashboard/tarefas", label: "Tarefas", icon: ListTodo, count: "—" },
  { href: "/dashboard/propostas", label: "Propostas", icon: FileText, count: "—" },
  { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature, count: "—" },
];

export default function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 lg:space-y-6"
    >
      {/* Monitor de Tarefas Atrasadas (invisível, apenas notifica) */}
      <OverdueTasksMonitor />

      <p className="text-muted-foreground text-sm">Visão geral do CRM. Use o menu para acessar os módulos.</p>

      {/* Widget de Produtividade */}
      <div className="mb-6">
        <ProductivityWidget />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}>
              <Card className="shadow-sm border-border/80 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                <CardHeader className="pb-2 flex flex-row items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-semibold">{m.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Acessar módulo</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
