/**
 * API Client robusto com tratamento de erros padronizado.
 * Diferencia TIMEOUT vs NETWORK_ERROR e loga adequadamente.
 */

export type ApiResponse<T = any> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    request_id?: string;
  };
  requestId?: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
  cause?: "TIMEOUT" | "NETWORK_ERROR" | "HTTP_ERROR" | "UNKNOWN";
  status?: number;
  url?: string;
  method?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Timeout padrão: 30 segundos
const DEFAULT_TIMEOUT = 30000;

/**
 * Obtém o token de autenticação do localStorage
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Define o token de autenticação
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

/**
 * Remove o token de autenticação
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Cria um AbortController com timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Diferencia TIMEOUT vs NETWORK_ERROR
 */
function determineErrorCause(error: any, url: string, method: string): ApiError["cause"] {
  // AbortError geralmente indica timeout
  if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
    return "TIMEOUT";
  }
  
  // TypeError geralmente indica problema de rede (CORS, DNS, etc)
  if (error instanceof TypeError) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "NETWORK_ERROR";
    }
  }
  
  // Se não conseguir determinar, retornar UNKNOWN
  return "UNKNOWN";
}

/**
 * Cria um erro padronizado
 */
function createApiError(
  error: any,
  url: string,
  method: string,
  status?: number,
  responseBody?: any
): ApiError {
  const cause = determineErrorCause(error, url, method);
  const requestId = responseBody?.error?.request_id || responseBody?.requestId || 
                   (typeof error?.response?.headers?.get === "function" 
                     ? error.response.headers.get("X-Request-ID") 
                     : null);
  
  let code = "UNKNOWN_ERROR";
  let message = "Erro desconhecido";
  
  if (status === 0) {
    // HTTP: 0 - diferenciar TIMEOUT vs NETWORK_ERROR
    if (cause === "TIMEOUT") {
      code = "TIMEOUT";
      message = "A requisição expirou. Tente novamente.";
    } else if (cause === "NETWORK_ERROR") {
      code = "NETWORK_ERROR";
      message = "Erro de conexão. Verifique sua internet e se o servidor está online.";
    } else {
      code = "NETWORK_ERROR";
      message = "Erro de conexão com o servidor.";
    }
  } else if (status) {
    // Status HTTP conhecido
    if (responseBody?.ok === false && responseBody?.error) {
      // Resposta padronizada do backend
      code = responseBody.error.code || `HTTP_${status}`;
      message = responseBody.error.message || `Erro ${status}`;
    } else if (responseBody?.detail) {
      // FastAPI error format
      code = `HTTP_${status}`;
      message = responseBody.detail;
    } else {
      code = `HTTP_${status}`;
      message = `Erro ${status}: ${responseBody?.message || error?.message || "Erro na requisição"}`;
    }
    
    // Mensagens específicas por status
    if (status === 401) {
      code = "UNAUTHORIZED";
      message = "Sessão expirada. Faça login novamente.";
    } else if (status === 403) {
      code = "FORBIDDEN";
      message = "Você não tem permissão para realizar esta ação.";
    } else if (status === 404) {
      code = "NOT_FOUND";
      message = "Recurso não encontrado.";
    } else if (status === 500) {
      code = "INTERNAL_ERROR";
      message = "Erro interno do servidor. Tente novamente mais tarde.";
    }
  } else if (error instanceof Error) {
    message = error.message;
  }
  
  const apiError: ApiError = {
    code,
    message,
    cause,
    status: status || 0,
    url,
    method,
    requestId,
  };
  
  if (responseBody?.error?.details) {
    apiError.details = responseBody.error.details;
  }
  
  // NUNCA logar erros para recursos opcionais (task-notion/databases/default)
  // Este é um recurso opcional que pode não existir - não é um erro
  const isTaskNotionDefault = url.includes("/task-notion/databases/default");
  
  // Silenciar TODOS os erros para recursos opcionais
  if (!isTaskNotionDefault) {
    console.error(`[API Error] ${method} ${url}`, {
      code: apiError.code,
      message: apiError.message,
      cause: apiError.cause,
      status: apiError.status,
      requestId: apiError.requestId,
      details: apiError.details,
      originalError: error,
    });
  }
  
  return apiError;
}

/**
 * Cliente API principal
 */
export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const method = options.method || "GET";
  const token = getToken();
  
  // Headers padrão
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  
  // Adicionar token se existir
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  
  // Timeout
  const timeout = (options as any).timeout || DEFAULT_TIMEOUT;
  const controller = createTimeoutController(timeout);
  
  let response: Response | null = null;
  let responseBody: any = null;
  
  try {
    // Fazer requisição
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    // Tentar parsear resposta
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      responseBody = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => "");
      responseBody = text ? { message: text } : {};
    }
    
    // Extrair request ID do header
    const requestId = response.headers.get("X-Request-ID");
    if (requestId && responseBody) {
      if (typeof responseBody === "object") {
        responseBody.requestId = requestId;
      }
    }
    
    // Verificar se é recurso opcional antes de processar resposta
    const isTaskNotionDefault = url.includes("/task-notion/databases/default");
    
    // Verificar se é resposta de sucesso
    if (response.ok) {
      // Verificar formato padronizado
      if (responseBody?.ok === true) {
        // Formato padronizado: { ok: true, data: ... }
        // data pode ser null (ex: task-notion/databases/default quando não existe)
        return responseBody.data as T;
      } else if (responseBody?.ok === false) {
        // Erro padronizado: { ok: false, error: ... }
        // Se for task-notion/databases/default, SEMPRE retornar null (recurso opcional)
        if (isTaskNotionDefault) {
          return null as T;
        }
        const error = createApiError(
          new Error(responseBody.error?.message || "Erro na resposta"),
          url,
          method,
          response.status,
          responseBody
        );
        throw error;
      } else {
        // Resposta não padronizada (compatibilidade)
        return responseBody as T;
      }
    } else {
      // Status HTTP de erro
      // Se for task-notion/databases/default, SEMPRE retornar null (recurso opcional)
      if (isTaskNotionDefault) {
        return null as T;
      }
      
      const error = createApiError(
        new Error(responseBody?.error?.message || responseBody?.detail || response.statusText),
        url,
        method,
        response.status,
        responseBody
      );
      
      // Se for 401, limpar token e redirecionar
      if (response.status === 401) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      
      throw error;
    }
  } catch (error: any) {
    // Se for recurso opcional (task-notion/databases/default), retornar null silenciosamente
    const isTaskNotionDefault = url.includes("/task-notion/databases/default");
    if (isTaskNotionDefault) {
      return null as T;
    }
    
    // Se for AbortError (timeout), criar erro específico
    if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
      const timeoutError = createApiError(error, url, method, 0);
      throw timeoutError;
    }
    
    // Se já for ApiError, re-lançar
    if (error.code && error.cause) {
      throw error;
    }
    
    // Se não tiver response, é erro de rede
    if (!response) {
      const networkError = createApiError(error, url, method, 0);
      throw networkError;
    }
    
    // Erro inesperado
    const apiError = createApiError(error, url, method, response.status, responseBody);
    throw apiError;
  }
}

// Exportar API_URL para uso externo
export { API_URL };
