"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Search,
  Menu,
  X,
  Bell,
  Shield,
  TrendingUp,
  ChevronUp,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Target,
  Bot,
  Megaphone,
  MessageSquareMore,
  DollarSign,
  CreditCard,
  Wallet,
  BarChart3,
  Repeat,
  Building2,
  FolderTree,
  UsersRound,
  MonitorCog,
  ChevronRight,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationToastManager } from "@/components/notifications/NotificationToast";
import { Toaster } from "@/components/ui/toaster";
import { TopLoadingBar } from "@/components/ui/top-loading-bar";
import { ProfileMenu } from "@/components/profile/ProfileMenu";
import { api } from "@/lib/api";

const navGroups = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/notificacoes", label: "Notificações", icon: Bell },
      { href: "/dashboard/analytics/inteligencia-vendas", label: "Inteligência de Vendas", icon: TrendingUp },
    ],
  },
  {
    title: "Gestão",
    items: [
      { href: "/dashboard/leads", label: "Leads", icon: Target },
      { href: "/dashboard/clientes", label: "Clientes", icon: UserCircle },
      { href: "/dashboard/funil", label: "Funil de Vendas", icon: TrendingUp },
      { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/dashboard/tarefas", label: "Tarefas", icon: ListTodo },
      { href: "/dashboard/propostas", label: "Propostas", icon: FileText },
      { href: "/dashboard/contratos", label: "Contratos", icon: FileSignature },
    ],
  },
  {
    title: "Automação",
    items: [
      { href: "/dashboard/agentes", label: "Agentes de IA", icon: Bot },
      { href: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/dashboard/cliente-area", label: "Área do Cliente", icon: MonitorCog },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/dashboard/financeiro", label: "Relatórios", icon: BarChart3 },
      { href: "/dashboard/financeiro/contas-pagar", label: "Contas a Pagar", icon: CreditCard },
      { href: "/dashboard/financeiro/contas-receber", label: "Contas a Receber", icon: Wallet },
      { href: "/dashboard/financeiro/despesas-fixas", label: "Despesas Fixas", icon: Repeat },
      { href: "/dashboard/financeiro/contas-bancarias", label: "Contas Bancárias", icon: Building2 },
      { href: "/dashboard/financeiro/centros-custo", label: "Centros de Custo", icon: FolderTree },
    ],
  },
  {
    title: "RH",
    items: [
      { href: "/dashboard/rh", label: "Funcionários", icon: UsersRound },
    ],
  },
  {
    title: "Config",
    items: [
      { href: "/dashboard/configuracoes/usuarios", label: "Usuários", icon: Users },
      { href: "/dashboard/configuracoes/roles", label: "Roles & Permissões", icon: Shield },
      { href: "/dashboard/configuracoes/whatsapp", label: "WhatsApp", icon: MessageSquareMore },
    ],
  },
];

const pathToTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/notificacoes": "Notificações",
  "/dashboard/mensagens": "Mensagens",
  "/dashboard/leads": "Leads",
  "/dashboard/clientes": "Clientes",
  "/dashboard/funil": "Funil de Vendas",
  "/dashboard/projetos": "Projetos",
  "/dashboard/tarefas": "Tarefas",
  "/dashboard/propostas": "Propostas",
  "/dashboard/contratos": "Contratos",
  "/dashboard/agentes": "Agentes de IA",
  "/dashboard/campanhas": "Campanhas",
  "/dashboard/financeiro": "Relatórios Financeiros",
  "/dashboard/financeiro/contas-pagar": "Contas a Pagar",
  "/dashboard/financeiro/contas-receber": "Contas a Receber",
  "/dashboard/financeiro/despesas-fixas": "Despesas Fixas",
  "/dashboard/financeiro/contas-bancarias": "Contas Bancárias",
  "/dashboard/financeiro/centros-custo": "Centros de Custo",
  "/dashboard/rh": "Recursos Humanos",
  "/dashboard/configuracoes/usuarios": "Usuários",
  "/dashboard/configuracoes/roles": "Roles e Permissões",
  "/dashboard/configuracoes/whatsapp": "WhatsApp",
  "/dashboard/cliente-area": "Área do Cliente",
};

function getPageTitle(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (pathname.startsWith("/dashboard/clientes")) return "Clientes";
  if (pathname.startsWith("/dashboard/funil")) return "Funil de Vendas";
  if (pathname.startsWith("/dashboard/projetos")) return "Projetos";
  if (pathname.startsWith("/dashboard/tarefas")) return "Tarefas";
  if (pathname.startsWith("/dashboard/propostas")) return "Propostas";
  if (pathname.startsWith("/dashboard/contratos")) return "Contratos";
  if (pathname.startsWith("/dashboard/mensagens")) return "Mensagens";
  if (pathname.startsWith("/dashboard/agentes")) return "Agentes de IA";
  if (pathname.startsWith("/dashboard/campanhas")) return "Campanhas";
  if (pathname.startsWith("/dashboard/financeiro")) return "Financeiro";
  if (pathname.startsWith("/dashboard/rh")) return "Recursos Humanos";
  if (pathname.startsWith("/dashboard/configuracoes/whatsapp")) return "WhatsApp";
  if (pathname.startsWith("/dashboard/configuracoes/roles")) return "Roles e Permissões";
  if (pathname.startsWith("/dashboard/cliente-area")) return "Área do Cliente";
  if (pathname.startsWith("/dashboard/configuracoes")) return "Configurações";
  return "Dashboard";
}

interface UserInfo {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  roles?: Array<{ id: string; key: string; name: string }>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    const timer = setTimeout(() => {
      async function loadUserInfo() {
        try {
          setLoadingUser(true);
          try {
            const data = await api<UserInfo>("/api/v1/profile/me");
            if (data) setUserInfo(data);
          } catch (e) {
            try {
              const data = await api<UserInfo>("/api/v1/auth/me");
              if (data) setUserInfo(data);
            } catch (e2) {}
          }
        } catch (e) {
        } finally {
          setLoadingUser(false);
        }
      }
      loadUserInfo();
    }, 100);
    return () => clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.replace("/login");
    }
  }, [router, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
            <p className="text-xs text-muted-foreground tracking-widest uppercase font-medium">Carregando</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  const pageTitle = getPageTitle(pathname);
  const isBuilder = pathname?.includes("/builder");

  if (isBuilder) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==========================================
          SIDEBAR — BLACK ABSOLUTE
          ========================================== */}
      <aside
        className={`sidebar fixed lg:static inset-y-0 left-0 z-50 w-[256px] flex-shrink-0 flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center px-5 h-[60px] border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            {/* Wordmark Control.IA */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="w-2.5 h-2.5 rounded-sm bg-white" />
              </div>
              <span
                className="text-white font-bold tracking-tight"
                style={{ fontSize: "1rem", letterSpacing: "-0.03em" }}
              >
                Control<span style={{ color: "rgba(255,255,255,0.45)" }}>.IA</span>
              </span>
            </div>
          </div>
          {/* Mobile close */}
          <button
            className="lg:hidden ml-auto text-white/30 hover:text-white/60 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3">
          {navGroups.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? "pt-4" : ""}>
              {/* Section label */}
              <p className="sidebar-section-title px-2.5 pb-1.5">{group.title}</p>

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const hasMoreSpecific = group.items.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.startsWith(item.href + "/") &&
                      (pathname === other.href || pathname.startsWith(other.href + "/"))
                  );
                  const active = hasMoreSpecific
                    ? false
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`sidebar-link flex items-center gap-2.5 px-2.5 py-2 ${active ? "active" : ""}`}
                      >
                        <Icon
                          className={`h-[15px] w-[15px] flex-shrink-0 transition-colors ${
                            active
                              ? "text-white"
                              : "text-white/30 group-hover:text-white/60"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <span className="ml-auto w-1 h-1 rounded-full bg-white/60 flex-shrink-0" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Divider between sections */}
              {gi < navGroups.length - 1 && (
                <div className="mt-4 border-t border-white/[0.05]" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer user area */}
        <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
          <ProfileMenu userInfo={userInfo} />
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="header-glass flex-shrink-0 h-[60px] px-4 lg:px-6 flex items-center justify-between z-30 relative">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Page title */}
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-foreground tracking-tight">{pageTitle}</h1>

              {/* Live clock pill — only on dashboard */}
              {pageTitle === "Dashboard" && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-foreground/5 rounded-full border border-foreground/8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Live</span>
                  <span className="text-[11px] font-mono font-semibold text-foreground/80">
                    {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hidden sm:flex h-9 w-9"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background page-transition">
          {children}
        </main>
      </div>

      <NotificationToastManager />
      <Toaster />
    </div>
  );
}
