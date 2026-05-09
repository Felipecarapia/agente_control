"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { login } from "@/lib/auth";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { LoginTransitionOverlay } from "@/components/login/LoginTransitionOverlay";

// Partículas com posições fixas (evita hidratação)
const PARTICLES = [
  { x: 18, y: 22, s: 1 }, { x: 72, y: 8, s: 2 }, { x: 45, y: 65, s: 1 },
  { x: 88, y: 35, s: 1 }, { x: 6, y: 78, s: 2 }, { x: 55, y: 18, s: 1 },
  { x: 32, y: 90, s: 1 }, { x: 94, y: 55, s: 2 }, { x: 14, y: 45, s: 1 },
  { x: 67, y: 72, s: 1 }, { x: 38, y: 30, s: 2 }, { x: 80, y: 88, s: 1 },
  { x: 24, y: 14, s: 1 }, { x: 58, y: 42, s: 1 }, { x: 76, y: 20, s: 2 },
];

// Grid lines decorativas
const GRID_COLS = 8;
const GRID_ROWS = 6;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowTimeoutMessage(false);
    setLoading(true);
    setShowOverlay(true);

    const timeoutId = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, 12000);

    try {
      await login({ email, password });
      await new Promise((resolve) => setTimeout(resolve, 700));
      clearTimeout(timeoutId);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      clearTimeout(timeoutId);
      setShowOverlay(false);
      setError(err instanceof Error ? err.message : "Credenciais inválidas");
      setLoading(false);
    }
  }

  function handleRetry() {
    setShowOverlay(false);
    setShowTimeoutMessage(false);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "hsl(0 0% 4%)" }}>

      {/* ============================================
          PAINEL ESQUERDO — ARTE CONCEITUAL (55%)
          ============================================ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden"
        style={{ background: "hsl(0 0% 4%)" }}
      >
        {/* Grid decorativo */}
        {mounted && (
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
            {Array.from({ length: GRID_COLS }).map((_, i) => (
              <div
                key={`col-${i}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(i / GRID_COLS) * 100}%`,
                  width: "1px",
                  background: "hsl(0 0% 100%)",
                }}
              />
            ))}
            {Array.from({ length: GRID_ROWS }).map((_, i) => (
              <div
                key={`row-${i}`}
                className="absolute left-0 right-0"
                style={{
                  top: `${(i / GRID_ROWS) * 100}%`,
                  height: "1px",
                  background: "hsl(0 0% 100%)",
                }}
              />
            ))}
          </div>
        )}

        {/* Partículas */}
        {mounted && PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s === 2 ? "2px" : "1px",
              height: p.s === 2 ? "2px" : "1px",
              background: "rgba(255,255,255,0.4)",
            }}
            animate={{
              y: [0, (i % 2 === 0 ? -20 : 20)],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Glows ambiente */}
        <div
          className="absolute"
          style={{
            top: "15%",
            left: "10%",
            width: "320px",
            height: "320px",
            background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "10%",
            right: "5%",
            width: "280px",
            height: "280px",
            background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />

        {/* Conteúdo principal */}
        <div className="relative z-10 flex flex-col justify-between px-14 py-14 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)" }}
              >
                <div className="w-3 h-3 rounded-sm bg-white" />
              </div>
              <span className="text-white font-bold" style={{ fontSize: "1.1rem", letterSpacing: "-0.04em" }}>
                Control<span style={{ color: "rgba(255,255,255,0.4)" }}>.IA</span>
              </span>
            </div>
          </motion.div>

          {/* Headline + texto */}
          <div>
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-2 mb-8"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }} />
                <span className="text-white/60 text-[10px] font-bold tracking-[0.12em] uppercase">Sistema Operacional</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-white leading-[1.05] mb-6"
              style={{ fontSize: "clamp(2.5rem, 4.5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.04em" }}
            >
              Centro de
              <br />
              <span style={{ color: "rgba(255,255,255,0.45)" }}>controle</span> total
              <br />
              da operação.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="text-white/40 leading-relaxed mb-12"
              style={{ fontSize: "1rem", maxWidth: "380px", fontWeight: 400 }}
            >
              Gerencie leads, projetos, contratos e equipes em uma única plataforma de alto desempenho.
            </motion.p>

            {/* Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 mt-1 w-px h-12" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)" }} />
              <div>
                <p className="text-white/80 font-semibold" style={{ fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                  O crescimento não é sorte. É sistema.
                </p>
                <p className="text-white/25 text-sm mt-1">Princípio Control.IA</p>
              </div>
            </motion.div>
          </div>

          {/* Métricas decorativas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex items-center gap-8"
          >
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "256-bit", label: "Criptografia" },
              { value: "LGPD", label: "Conformidade" },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-white text-lg font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>{m.value}</p>
                <p className="text-white/30 text-xs font-medium mt-0.5">{m.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Borda de separação luminosa */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)" }}
        />
      </motion.div>

      {/* ============================================
          PAINEL DIREITO — FORMULÁRIO (45%)
          ============================================ */}
      <div
        className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 relative"
        style={{ background: "hsl(0 0% 5.5%)" }}
      >
        {/* Ruído de fundo sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-white" />
            </div>
            <span className="text-white font-bold" style={{ fontSize: "1rem", letterSpacing: "-0.04em" }}>
              Control<span style={{ color: "rgba(255,255,255,0.4)" }}>.IA</span>
            </span>
          </div>

          {/* Cabeçalho do form */}
          <div className="mb-10">
            <h2 className="text-white font-bold mb-2" style={{ fontSize: "1.75rem", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Acesse sua conta
            </h2>
            <p className="text-white/35" style={{ fontSize: "0.875rem" }}>
              Bem-vindo de volta. Insira suas credenciais.
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-white/50 text-xs font-semibold tracking-[0.06em] uppercase">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                  style={{ color: focusedField === "email" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}
                />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: focusedField === "email"
                      ? "1px solid rgba(255,255,255,0.25)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "email" ? "0 0 0 3px rgba(255,255,255,0.04)" : "none",
                  }}
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-white/50 text-xs font-semibold tracking-[0.06em] uppercase">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200"
                  style={{ color: focusedField === "password" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-11 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: focusedField === "password"
                      ? "1px solid rgba(255,255,255,0.25)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "password" ? "0 0 0 3px rgba(255,255,255,0.04)" : "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "rgb(239,68,68)" }} />
                  <p className="text-sm" style={{ color: "rgb(239,68,68)" }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-sm relative overflow-hidden group transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "hsl(0 0% 96%)",
                color: "hsl(0 0% 5%)",
                letterSpacing: "-0.01em",
              }}
            >
              {/* Hover effect */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: "rgba(0,0,0,0.06)" }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.span
                      className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/70"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer segurança */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/20 text-xs text-center" style={{ letterSpacing: "0.02em" }}>
              Acesso protegido por criptografia 256-bit · Conforme LGPD
            </p>
          </div>
        </motion.div>
      </div>

      {/* Overlay pós-login */}
      <LoginTransitionOverlay
        open={showOverlay}
        onRetry={handleRetry}
        showTimeoutMessage={showTimeoutMessage}
      />
    </div>
  );
}
