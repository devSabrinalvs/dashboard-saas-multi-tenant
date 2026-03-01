/**
 * Converte uma string arbitrária em um slug URL-safe.
 *
 * Exemplos:
 *   "Minha Empresa"  → "minha-empresa"
 *   "Açaí & Cia."    → "acai-cia"
 *   "  Hello  World" → "hello-world"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD") // decompõe caracteres acentuados (ã → a + combining)
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove tudo exceto letras, números, espaços e hífens
    .trim()
    .replace(/\s+/g, "-") // espaços → hífens
    .replace(/-+/g, "-") // colapsa múltiplos hífens
    .replace(/^-|-$/g, "") // remove hífens no início/fim
    .slice(0, 40); // limite máximo
}
