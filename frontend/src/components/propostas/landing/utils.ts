/**
 * Converte snake_case para camelCase (ex: titulo_highlight -> tituloHighlight).
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Lê uma string do objeto data (vindo da API/estado). Garante que o valor seja lido
 * mesmo com variações de chave (snake_case ou camelCase).
 */
export function getDataString(
  data: Record<string, unknown> | undefined | null,
  key: string
): string {
  if (!data || typeof data !== "object") return "";
  const val =
    data[key] ??
    (data as Record<string, unknown>)[key] ??
    (data as Record<string, unknown>)[toCamelCase(key)];
  if (val == null) return "";
  return typeof val === "string" ? val.trim() : String(val).trim();
}

/**
 * Encontra o trecho em destaque no texto (case-insensitive).
 * Retorna { index, length } para usar em slice, ou null se não encontrar.
 * Normaliza espaços no highlight para aumentar chance de match.
 */
export function findHighlightMatch(
  text: string,
  highlight: string | undefined | null
): { index: number; length: number } | null {
  const h = (highlight ?? "").trim().replace(/\s+/g, " ");
  if (!h || !text) return null;
  const textLower = text.toLowerCase();
  const hLower = h.toLowerCase();
  let index = textLower.indexOf(hLower);
  if (index === -1) {
    // Tenta só a primeira palavra do highlight (ex: "frequentes:" -> "frequentes")
    const firstWord = hLower.split(/\s/)[0];
    if (firstWord && firstWord.length >= 2) {
      index = textLower.indexOf(firstWord);
      if (index !== -1) return { index, length: firstWord.length };
    }
    return null;
  }
  return { index, length: h.length };
}

/**
 * Se o highlight não for encontrado no texto, tenta remover pontuação final
 * (ex: "frequentes:" vira "frequentes") para aumentar chance de match.
 */
export function findHighlightMatchRelaxed(
  text: string,
  highlight: string | undefined | null
): { index: number; length: number } | null {
  let match = findHighlightMatch(text, highlight);
  if (match) return match;
  const h = (highlight ?? "").trim();
  if (!h || !text) return null;
  const withoutPunctuation = h.replace(/[.:,;!?]+$/, "").trim();
  if (withoutPunctuation && withoutPunctuation !== h) {
    match = findHighlightMatch(text, withoutPunctuation);
  }
  return match;
}
