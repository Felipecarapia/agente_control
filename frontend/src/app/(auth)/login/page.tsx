"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { login } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Lock, Shield, Sparkles } from "lucide-react";
import Image from "next/image";
import { LoginTransitionOverlay } from "@/components/login/LoginTransitionOverlay";
import { useBranding } from "@/hooks/useBranding";

// Posições fixas para as partículas (evita erro de hidratação)
const PARTICLE_POSITIONS = [
  { x: 27.69, y: 23.49 },
  { x: 4.63, y: 1.95 },
  { x: 35.27, y: 61.28 },
  { x: 94.39, y: 4.78 },
  { x: 78.66, y: 33.90 },
  { x: 33.58, y: 63.99 },
  { x: 32.86, y: 15.44 },
  { x: 54.77, y: 40.68 },
  { x: 2.43, y: 66.14 },
  { x: 50.35, y: 33.18 },
  { x: 43.96, y: 36.22 },
  { x: 60.37, y: 6.20 },
  { x: 37.15, y: 27.98 },
  { x: 83.26, y: 59.59 },
  { x: 71.28, y: 36.26 },
  { x: 54.57, y: 55.02 },
  { x: 25.44, y: 38.42 },
  { x: 63.24, y: 48.64 },
  { x: 29.06, y: 99.87 },
  { x: 61.02, y: 21.04 },
];

export default function LoginPage() {
  const router = useRouter();
  const { logoUrl, companyName, loading: brandingLoading } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Garantir que só renderiza no cliente (evita erro de hidratação)
  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowTimeoutMessage(false);
    setLoading(true);
    setShowOverlay(true);

    // Timeout de segurança (12 segundos)
    const timeoutId = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, 12000);

    try {
      await login({ email, password });
      
      // Manter overlay por no mínimo 700ms para experiência premium
      await new Promise((resolve) => setTimeout(resolve, 700));
      
      // Limpar timeout
      clearTimeout(timeoutId);
      
      // Navegar para dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      // Limpar timeout
      clearTimeout(timeoutId);
      
      // Fechar overlay imediatamente em caso de erro
      setShowOverlay(false);
      setError(err instanceof Error ? err.message : "Falha no login");
      setLoading(false);
    }
  }

  function handleRetry() {
    setShowOverlay(false);
    setShowTimeoutMessage(false);
    setLoading(false);
    // Form fica habilitado novamente
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* LADO ESQUERDO - Experiência Visual (60%) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-[60%] relative overflow-hidden"
      >
        {/* Gradiente de fundo premium */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-purple-950 to-teal-950">
          {/* Efeitos de luz suaves */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Partículas animadas sutis */}
        {mounted && (
          <div className="absolute inset-0 overflow-hidden">
            {PARTICLE_POSITIONS.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/10 rounded-full"
                initial={{
                  x: `${pos.x}%`,
                  y: `${pos.y}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [`${pos.y}%`, `${pos.y + (i % 2 === 0 ? 10 : -10)}%`],
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            {brandingLoading ? (
              <div className="h-12 w-48 bg-white/10 rounded-lg animate-pulse" />
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt={companyName || "Sistemaxi CRM"}
                width={192}
                height={48}
                className="h-12 w-auto object-contain"
                priority
                unoptimized
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">{companyName || "Sistemaxi CRM"}</span>
              </div>
            )}
          </motion.div>

          {/* Texto principal */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-5xl xl:text-6xl font-bold mb-6 leading-tight"
          >
            Seja bem-vindo ao{" "}
            <span className="relative inline-block">
              <span className="relative z-10">CRM da Sistemaxi</span>
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 blur-xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            </span>
          </motion.h1>

          {/* Subtexto elegante */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xl text-white/80 mb-8 leading-relaxed"
          >
            Você está entrando no centro de controle da sua operação.
          </motion.p>

          {/* Linha emocional */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-lg text-white/70 mb-12 leading-relaxed"
          >
            Se você tem acesso a isso, é porque faz parte de quem constrói resultados.
          </motion.p>

          {/* Frase motivadora */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="relative"
          >
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
            <p className="text-2xl font-semibold text-white pl-6">
              O crescimento não é sorte. É sistema.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* LADO DIREITO - Formulário (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-4 sm:p-8 bg-background relative">
        {/* Hero compacto para mobile */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:hidden absolute top-8 left-0 right-0 px-4 text-center z-10"
        >
          <div className="mb-4">
            {brandingLoading ? (
              <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse mx-auto" />
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt={companyName || "Sistemaxi CRM"}
                width={160}
                height={40}
                className="h-10 w-auto mx-auto object-contain"
                priority
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xl font-bold">{companyName || "Sistemaxi CRM"}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">Seja bem-vindo</h1>
          <p className="text-sm text-muted-foreground">
            O crescimento não é sorte. É sistema.
          </p>
        </motion.div>

        {/* Card de Login Premium */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md mt-16 lg:mt-0"
        >
          <Card className="border-border/50 shadow-2xl backdrop-blur-sm bg-card/95">
            <CardContent className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Entrar</h2>
                <p className="text-sm text-muted-foreground">
                  Entre com seu email e senha para acessar o sistema
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 h-12 border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Campo Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10 h-12 border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Mensagem de erro */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Botão de Login */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                {/* Mensagem de segurança */}
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">
                    Seu acesso é protegido e monitorado.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Overlay de transição pós-login */}
      <LoginTransitionOverlay
        open={showOverlay}
        onRetry={handleRetry}
        showTimeoutMessage={showTimeoutMessage}
      />
    </div>
  );
}
