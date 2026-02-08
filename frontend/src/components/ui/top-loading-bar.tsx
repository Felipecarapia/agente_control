"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export function TopLoadingBar() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset loading state quando a rota muda
    setLoading(true);
    setProgress(0);

    // Simular progresso
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    // Completar quando a página carregar
    const timeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[10000] h-1 bg-background/50"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            exit={{ width: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}




