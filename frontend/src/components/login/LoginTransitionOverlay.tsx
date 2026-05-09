"use client";

import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
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
            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 justify-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  <div className="w-5 h-5 rounded bg-white" />
                </div>
                <span className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.05em" }}>
                  Control<span style={{ color: "rgba(255,255,255,0.4)" }}>.IA</span>
                </span>
              </div>
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
              {/* Progress bar — white/neutral */}
              <div className="h-px bg-white/10 rounded-full overflow-hidden mb-6">
                <motion.div
                  className="h-full bg-white/50 rounded-full"
                  initial={{ width: "0%", x: "-100%" }}
                  animate={{ x: ["0%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
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




