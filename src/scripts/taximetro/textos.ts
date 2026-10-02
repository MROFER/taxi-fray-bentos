/** Textos del resultado. Portado de calculadora/src/app.js (mismo contenido, otro diseño). */
import type { Rango } from './tipos';

export const pesos = (x: number, decimales = 0) =>
  '$ ' + x.toLocaleString('es-UY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
export const escapar = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function textoValijas({ cantidad, cobradas, importe }: Rango['valijas']) {
  const cuantas = cantidad === 1 ? '1 valija' : `${cantidad} valijas`;
  if (!cobradas) return `Con ${cuantas}: sin costo extra.`;
  return (
    `Incluye ${pesos(importe, 2)} por ${cuantas}` +
    (cobradas < cantidad
      ? ` (se cobra${cobradas === 1 ? '' : 'n'} ${cobradas}; ${cantidad - cobradas === 1 ? 'la primera es gratis' : `las primeras ${cantidad - cobradas} son gratis`}).`
      : '.')
  );
}
