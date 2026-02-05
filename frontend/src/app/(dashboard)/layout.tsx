"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, clearToken } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FolderKanban,
  ListTodo,
  FileText,
  FileSignature,
  LogOut,
  Search,
  Bell,
  ChevronUp,
  Sparkles,
} from "lucide-react";

const navGroups = [
  {
    title: "Principal",
    desc: "Visão geral",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Gestão",
    desc: "Clientes, projetos e entregas",
    items: [
      { href: "/dashboard/clientes", label: "Clientes", icon: UserCircle },
      { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/dashboard/tarefas", label: "Tarefas", icon: ListTodo },
      { href: "/dashboard/propostas", label: "Propostas", icon: FileText },
      { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature },
    ],
  },
  {
    title: "Configurações",
    desc: "Administração",
    items: [{ href: "/dashboard/configuracoes/usuarios", label: "Usuários", icon: Users }],
  },
];

const pathToTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/clientes": "Clientes",
  "/dashboard/projetos": "Projetos",
  "/dashboard/tarefas": "Tarefas",
  "/dashboard/propostas": "Propostas",
  "/dashboard/contratos": "Contratos",
  "/dashboard/configuracoes/usuarios": "Usuários",
};

function getPageTitle(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (pathname.startsWith("/dashboard/clientes")) return "Clientes";
  if (pathname.startsWith("/dashboard/projetos")) return "Projetos";
  if (pathname.startsWith("/dashboard/tarefas")) return "Tarefas";
  if (pathname.startsWith("/dashboard/propostas")) return "Propostas";
  if (pathname.startsWith("/dashboard/contratos")) return "Contratos";
  if (pathname.startsWith("/dashboard/configuracoes")) return "Configurações";
  return "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    if (userOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [userOpen]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
    router.refresh();
  }

  if (!isAuthenticated()) {
    return null;
  }

  const pageTitle = getPageTitle(pathname);
  const isBuilder = pathname?.includes("/builder");

  // Builder: tela inteira, sem sidebar e sem header do dashboard (estilo Elementor)
  if (isBuilder) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar fixa escura (estilo FUSE) */}
      <aside className="sidebar w-[260px] flex-shrink-0 flex flex-col border-r border-white/10">
        <div className="p-5 flex items-center gap-2 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-accent))] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg text-white">Sistemaxi CRM</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="sidebar-section-title px-3">{group.title}</p>
              <p className="sidebar-section-desc px-3">{group.desc}</p>
              <ul className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                          active ? "active" : ""
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="rounded-lg bg-white/5 px-3 py-2.5">
            <p className="text-xs font-medium text-white/90">Precisa de ajuda?</p>
            <a
              href="#"
              className="text-xs text-[hsl(var(--sidebar-accent))] hover:underline"
            >
              Documentação →
            </a>
          </div>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserOpen(!userOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Usuário</p>
                <p className="text-xs text-white/60 truncate">admin@sistemaxi.com</p>
              </div>
              <ChevronUp
                className={`h-4 w-4 text-white/60 transition-transform ${userOpen ? "" : "rotate-180"}`}
              />
            </button>
            {userOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg bg-[hsl(222_47%_15%)] border border-white/10 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Área principal: header + conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 h-14 px-6 flex items-center justify-between border-b border-border bg-card shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
