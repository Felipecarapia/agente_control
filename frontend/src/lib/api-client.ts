/**
 * API Client robusto para comunicação com o backend.
 * Suporta respostas padronizadas {ok: true, data: ...} e {ok: false, error: ...}.
 * Inclui tratamento de erros, retry, e gerenciamento de tokens.
 */

// Em produção, usa string vazia para fazer as chamadas via proxy do Next.js (rewrites)
// Em desenvolvimento, usa a variável NEXT_PUBLIC_API_URL ou localhost:8000
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
  requestId?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  meta?: any;
}

// Gerenciamento de token
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// Criar erro padronizado
function createApiError(
  message: string,
  status: number = 0,
  responseBody?: any,
  requestId?: string
): ApiError {
  const error: ApiError = {
    code: "UNKNOWN",
    message,
    status,
    requestId,
  };

  // Tentar extrair informações do responseBody padronizado
  if (responseBody && typeof responseBody === "object") {
    if (responseBody.error) {
      error.code = responseBody.error.code || "UNKNOWN";
      error.message = responseBody.error.message || message;
      error.details = responseBody.error.details;
      error.requestId = responseBody.requestId || requestId;
    } else if (responseBody.detail) {
      // Formato FastAPI padrão
      error.message = responseBody.detail;
    }
  }

  // Mapear códigos de status HTTP para códigos de erro
  if (status >= 400 && status < 500) {
    if (status === 401) {
      error.code = "UNAUTHORIZED";
      if (typeof window !== "undefined") {
        clearToken();
        window.location.href = "/login";
      }
    } else if (status === 403) {
      error.code = "FORBIDDEN";
    } else if (status === 404) {
      error.code = "NOT_FOUND";
    } else if (status === 409) {
      error.code = "CONFLICT";
    } else if (status === 400) {
      error.code = "VALIDATION_ERROR";
    }
  } else if (status === 0) {
    error.code = "NETWORK_ERROR";
  } else if (status >= 500) {
    error.code = "INTERNAL_ERROR";
  }

  return error;
}

/**
 * Cliente API principal.
 * Faz requisições HTTP padronizadas e retorna dados extraídos do formato {ok: true, data: ...}.
 */
export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  // Gerar request ID único
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);
    const responseBody = await response.json().catch(() => ({}));

    // Extrair requestId do header ou do body
    const responseRequestId =
      response.headers.get("X-Request-ID") || responseBody.requestId || requestId;

    // Verificar se a resposta está no formato padronizado
    if (responseBody.ok === false) {
      // Erro padronizado do backend
      const error = createApiError(
        responseBody.error?.message || "Erro na requisição",
        response.status,
        responseBody,
        responseRequestId
      );
      throw error;
    }

    if (!response.ok) {
      // Erro HTTP não padronizado
      const error = createApiError(
        responseBody.error?.message || responseBody.detail || response.statusText || "Erro na requisição",
        response.status,
        responseBody,
        responseRequestId
      );
      throw error;
    }

    // Sucesso: extrair data do formato padronizado {ok: true, data: ...}
    if (responseBody.ok === true && "data" in responseBody) {
      return responseBody.data as T;
    }

    // Fallback: se não estiver no formato padronizado, retornar o body inteiro
    return responseBody as T;
  } catch (error: any) {
    // Erro de rede ou timeout
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const apiError = createApiError(
        "Erro de conexão. Verifique se o backend está rodando.",
        0,
        undefined,
        requestId
      );
      throw apiError;
    }

    // Re-throw se já for ApiError
    if (error.code && error.message) {
      throw error;
    }

    // Converter erro genérico em ApiError
    throw createApiError(
      error.message || "Erro desconhecido",
      0,
      undefined,
      requestId
    );
  }
}
