"use client";

import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2 } from "lucide-react";
import Image from "next/image";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@/components/ui/button";

interface LoginTransitionOverlayProps {
  open: boolean;
  onRetry?: () => void;
  showTimeoutMessage?: boolean;
}

export function LoginTransitionOverlay({
  open,
  onRetry,
  showTimeoutMessage = false,
}: LoginTransitionOverlayProps) {
  const { logoUrl, companyName, loading: brandingLoading } = useBranding();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          aria-live="polite"
          aria-label="Carregando"
        >
          {/* Backdrop com blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          {/* Conteúdo centralizado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center justify-center text-center px-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              {brandingLoading ? (
                <div className="h-16 w-48 bg-white/10 rounded-lg animate-pulse" />
              ) : logoUrl ? (
                <motion.div
                  animate={{
                    filter: [
                      "brightness(1)",
                      "brightness(1.1)",
                      "brightness(1)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <Image
                    src={logoUrl}
                    alt={companyName || "Sistemaxi CRM"}
                    width={192}
                    height={64}
                    className="h-16 w-auto object-contain"
                    priority
                    unoptimized
                  />
                </motion.div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-white">
                    {companyName || "Sistemaxi CRM"}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Texto principal */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl md:text-3xl font-bold text-white mb-3"
            >
              {showTimeoutMessage
                ? "Ainda estamos tentando..."
                : "Conectando seu painel..."}
            </motion.h2>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-sm md:text-base text-white/70 mb-8"
            >
              Organização hoje. Crescimento amanhã.
            </motion.p>

            {/* Loader */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="w-full max-w-xs"
            >
              {/* Barra de progresso animada */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: ["0%", "100%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>

              {/* Spinner alternativo (caso queira usar) */}
              {showTimeoutMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mb-4"
                >
                  <Loader2 className="h-6 w-6 text-white/60 animate-spin" />
                </motion.div>
              )}
            </motion.div>

            {/* Botão de retry (se timeout) */}
            {showTimeoutMessage && onRetry && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="mt-4"
              >
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Tentar novamente
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}




