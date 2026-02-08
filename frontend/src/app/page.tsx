"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticação antes de redirecionar
    if (isAuthenticated()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Retornar null enquanto redireciona (evita flash)
  return null;
}
