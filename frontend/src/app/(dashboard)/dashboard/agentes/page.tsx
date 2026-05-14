"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Bot } from "lucide-react";

type AIAgent = { id: string; name: string };

export default function AgentesPage() {
  const router = useRouter();

  useEffect(() => {
    async function initSofia() {
      try {
        const agents = await api<AIAgent[]>("/api/v1/agents");
        
        if (Array.isArray(agents) && agents.length > 0) {
          // Já existe, redireciona para o primeiro agente (Sofia)
          router.push(`/dashboard/agentes/${agents[0].id}`);
        } else {
          // Não existe, cria automaticamente em background
          const body = {
            name: "Sofia Agent",
            description: "Agente principal do CRM",
            system_prompt: "Você é a Sofia, assistente comercial focada em atendimento humanizado e conversão.",
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 1024,
            is_active: true,
          };
          const newAgent = await api<AIAgent>("/api/v1/agents", { 
            method: "POST", 
            body: JSON.stringify(body) 
          });
          router.push(`/dashboard/agentes/${newAgent.id}`);
        }
      } catch (err: any) {
        console.error("Erro ao inicializar Sofia:", err);
        alert(`Erro ao tentar carregar seus agentes: ${err.message || 'Falha de conexão'}. Você tem a funcionalidade de Agentes liberada em seu Plano?`);
        // Pode redirecionar para fora ou destrancar a tela se quiser
        router.push("/dashboard/clientes");
      }
    }
    initSofia();
  }, [router]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted shadow-inner animate-pulse">
          <Bot className="h-10 w-10 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Inicializando Módulo da Sofia...</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acessando os parâmetros centrais da Inteligência Artificial.
          </p>
        </div>
      </div>
    </div>
  );
}
