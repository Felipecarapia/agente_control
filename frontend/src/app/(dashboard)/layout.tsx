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
    desc: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/notificacoes", label: "Notificações", icon: Bell },
      { href: "/dashboard/analytics/inteligencia-vendas", label: "Inteligência de Vendas", icon: TrendingUp },
    ],
  },
  {
    title: "Gestão",
    desc: "Clientes, projetos e entregas",
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
    title: "Configurações",
    desc: "Administração",
    items: [
      { href: "/dashboard/configuracoes/usuarios", label: "Usuários", icon: Users },
      { href: "/dashboard/configuracoes/roles", label: "Roles e Permissões", icon: Shield },
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
  "/dashboard/configuracoes/usuarios": "Usuários",
  "/dashboard/configuracoes/roles": "Roles e Permissões",
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
  if (pathname.startsWith("/dashboard/configuracoes")) return "Configurações";
  if (pathname.startsWith("/dashboard/configuracoes/roles")) return "Roles e Permissões";
  return "Dashboard";
}

interface UserInfo {
  id: number;
  email: string;
  nome: string;
  ativo: boolean;
  roles?: Array<{ id: number; key: string; name: string }>;
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Buscar informações do usuário atual (com delay para não bloquear render inicial)
  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    
    // Pequeno delay para não bloquear render inicial
    const timer = setTimeout(() => {
      async function loadUserInfo() {
        try {
          setLoadingUser(true);
          // Tentar endpoint novo primeiro
          try {
            const data = await api<UserInfo>("/api/v1/profile/me");
            if (data) {
              setUserInfo(data);
            }
          } catch (e) {
            // Se falhar, tentar endpoint antigo como fallback
            try {
              const data = await api<UserInfo>("/api/v1/auth/me");
              if (data) {
                setUserInfo(data);
              }
            } catch (e2) {
              // Silenciar erros - usuário pode não ter perfil completo ainda
            }
          }
        } catch (e) {
          // Silenciar erros de timeout/rede
        } finally {
          setLoadingUser(false);
        }
      }
      loadUserInfo();
    }, 100); // Delay de 100ms para não bloquear render
    
    return () => clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.replace("/login");
    }
  }, [router, mounted]);

  // Evita erro de hidratação: só verifica autenticação após montar no cliente
  if (!mounted) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
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
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar fixa escura (estilo FUSE) */}
      <aside
        className={`sidebar fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 flex flex-col border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 flex items-center justify-center border-b border-white/10 min-h-[80px]">
          <div className="flex items-center justify-center w-full h-full relative">
            <Image 
              src="https://i.imgur.com/e9Gntop.png" 
              alt="Sistemaxi CRM" 
              width={220}
              height={60}
              className="w-full h-full object-contain object-center"
              priority
              unoptimized
            />
          </div>
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
                        onClick={() => setSidebarOpen(false)}
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
          <ProfileMenu userInfo={userInfo} />
        </div>
      </aside>

      {/* Área principal: header + conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="flex-shrink-0 h-14 px-4 lg:px-6 flex items-center justify-between border-b border-border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>
      <NotificationToastManager />
      <Toaster />
    </div>
  );
}
