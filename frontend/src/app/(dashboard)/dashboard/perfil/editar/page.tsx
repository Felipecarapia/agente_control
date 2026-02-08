"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
}

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    nome: "",
    bio: "",
    phone: "",
    presence_status: "online" as "online" | "away" | "busy" | "offline",
    toasts: true,
    sound: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api<ProfileData>("/api/v1/profile/me");
      setProfile(data);
      setForm({
        nome: data.nome,
        bio: data.bio || "",
        phone: data.phone || "",
        presence_status: (data.presence_status as any) || "online",
        toasts: data.notification_prefs?.toasts ?? true,
        sound: data.notification_prefs?.sound ?? false,
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao carregar perfil",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api("/api/v1/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          nome: form.nome,
          bio: form.bio || null,
          phone: form.phone || null,
          presence_status: form.presence_status,
          notification_prefs: {
            toasts: form.toasts,
            sound: form.sound,
            muteCategories: [],
          },
        }),
      });

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      router.push("/dashboard/perfil");
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao salvar perfil",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUpdate(newUrl: string) {
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl || null });
      // Atualizar também o form para garantir sincronização
      // O avatar_url não precisa estar no form, mas vamos garantir que está atualizado
    }
    // Recarregar perfil para garantir que está sincronizado
    loadProfile();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/perfil">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar Perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatarUrl={profile?.avatar_url}
            onUploadComplete={handleAvatarUpdate}
            onRemove={() => {
              if (profile) {
                setProfile({ ...profile, avatar_url: null });
              }
              loadProfile();
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={160}
              rows={3}
              placeholder="Conte um pouco sobre você..."
            />
            <p className="text-xs text-muted-foreground">
              {form.bio.length}/160 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.presence_status}
              onValueChange={(value: any) =>
                setForm({ ...form, presence_status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="away">Ausente</SelectItem>
                <SelectItem value="busy">Ocupado</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Receber toasts</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar notificações em tempo real
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.toasts}
              onChange={(e) => setForm({ ...form, toasts: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Som</Label>
              <p className="text-sm text-muted-foreground">
                Tocar som ao receber notificações
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.sound}
              onChange={(e) => setForm({ ...form, sound: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/perfil">Cancelar</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

