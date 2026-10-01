// Utilidades de texto compartidas por la página, las pruebas y el script de extracción.

/** Minúsculas, sin acentos ni signos: "Colón" → "colon", "F. J. M. de Haedo" → "f j m de haedo". */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

/** Palabras de un texto ya normalizado. */
export function palabras(texto) {
  const n = normalizar(texto);
  return n ? n.split(' ') : [];
}
