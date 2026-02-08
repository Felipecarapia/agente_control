/**
 * Utilitário para retry com backoff exponencial.
 * Para em 401/403 (auth errors).
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1s
  maxDelay: 10000, // 10s
  backoffFactor: 2,
  shouldRetry: (error: any) => {
    // Não retry em erros de autenticação
    if (error?.status === 401 || error?.status === 403) {
      return false;
    }
    if (error?.code === "UNAUTHORIZED" || error?.code === "FORBIDDEN") {
      return false;
    }
    // Retry em erros de rede/timeout
    if (error?.status === 0 || error?.code === "NETWORK_ERROR" || error?.code === "TIMEOUT") {
      return true;
    }
    // Retry em 500 (erro do servidor)
    if (error?.status === 500 || error?.code === "INTERNAL_ERROR") {
      return true;
    }
    // Não retry em outros erros
    return false;
  },
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Se não deve retry, lançar erro imediatamente
      if (!opts.shouldRetry(error)) {
        throw error;
      }

      // Se é a última tentativa, lançar erro
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Aguardar antes de retry (backoff exponencial)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError;
}

