// Re-exportar do api-client para compatibilidade
export { apiClient, setToken, clearToken, isAuthenticated, API_URL } from "./api-client";
export type { ApiError, ApiResponse } from "./api-client";

// Importar apiClient para usar internamente
import { apiClient } from "./api-client";

// Função de compatibilidade - redireciona para apiClient
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiClient<T>(path, options);
}

// Função específica para upload de imagens de proposta
export async function uploadPropostaImage(
  propostaId: string,
  file: File
): Promise<{ url: string }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const formData = new FormData();
  formData.append("file", file);
  
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const res = await fetch(`${API_URL}/api/v1/propostas/${propostaId}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error("Não autorizado");
  }
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || "Erro na requisição");
  }
  
  return res.json();
}
