"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Phone, Mail, Calendar } from "lucide-react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

interface ProfileData {
  id: number;
  email: string;
  nome: string;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  presence_status?: string | null;
  notification_prefs?: {
    toasts?: boolean;
    sound?: boolean;
    muteCategories?: string[];
  } | null;
  roles?: Array<{ id: number; key: string; name: string }>;
  created_at?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api<ProfileData>("/api/v1/profile/me");
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }

  function handleAvatarUpdate(newUrl: string) {
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl || null });
    }
    // Recarregar para garantir sincronização
    loadProfile();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">{error || "Perfil não encontrado"}</div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header com banner e avatar */}
      <Card className="border-border/80 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600" />
        <CardContent className="p-6 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-background overflow-hidden bg-muted">
                <Image
                  src={
                    profile.avatar_url
                      ? profile.avatar_url  // Next.js faz proxy via rewrite
                      : "https://i.imgur.com/PrOd6nf.png"
                  }
                  alt={profile.nome}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              {profile.presence_status && (
                <div
                  className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-background ${
                    statusColors[profile.presence_status] || statusColors.offline
                  }`}
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{profile.nome}</h1>
                {profile.roles && profile.roles.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {profile.roles.map((role) => (
                      <Badge key={role.id} variant="secondary">
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mb-4">{profile.bio || "Sem biografia"}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Membro desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/perfil/editar">
                <Edit className="h-4 w-4 mr-2" />
                Editar Perfil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
              <p className="capitalize">{profile.presence_status || "offline"}</p>
            </div>
            {profile.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Telefone</p>
                <p>{profile.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências de Notificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Receber toasts</span>
              <Badge variant={profile.notification_prefs?.toasts ? "default" : "secondary"}>
                {profile.notification_prefs?.toasts ? "Ativado" : "Desativado"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Som</span>
              <Badge variant={profile.notification_prefs?.sound ? "default" : "secondary"}>
                {profile.notification_prefs?.sound ? "Ativado" : "Desativado"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

