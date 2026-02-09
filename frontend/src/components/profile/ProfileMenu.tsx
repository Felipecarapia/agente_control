"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Settings,
  Bell,
  LogOut,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { clearToken } from "@/lib/api";

interface ProfileMenuProps {
  userInfo: {
    id: string;
    nome: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  onClose?: () => void;
}

export function ProfileMenu({ userInfo, onClose }: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open, onClose]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
    router.refresh();
  }

  const avatarUrl = userInfo?.avatar_url || "https://i.imgur.com/PrOd6nf.png";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-white/15 flex-shrink-0">
          <Image
            src={avatarUrl}
            alt={userInfo?.nome || "Usuário"}
            width={36}
            height={36}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {userInfo?.nome || "Usuário"}
          </p>
          <p className="text-xs text-white/60 truncate">
            {userInfo?.email || ""}
          </p>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-white/60 transition-transform flex-shrink-0 ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-1 rounded-lg bg-[hsl(222_47%_15%)] border border-white/10 py-1 shadow-xl z-50"
          >
            <Link
              href="/dashboard/perfil"
              onClick={() => {
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              <User className="h-4 w-4" />
              Meu Perfil
            </Link>
            <Link
              href="/dashboard/perfil/editar"
              onClick={() => {
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Editar Perfil
            </Link>
            <Link
              href="/dashboard/notificacoes"
              onClick={() => {
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              <Bell className="h-4 w-4" />
              Notificações
            </Link>
            <div className="border-t border-white/10 my-1" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

