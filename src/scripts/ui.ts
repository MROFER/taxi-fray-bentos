/** Utilidades de UI compartidas entre componentes. */

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer: number | undefined;
export function toast(texto: string) {
  const el = $('toast');
  el.textContent = texto;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('on'), 3800);
}

/** Reinicia una animación CSS de una clase (ej. el destello de un campo). */
export function replay(el: HTMLElement, clase: string) {
  el.classList.remove(clase);
  void el.offsetWidth;
  el.classList.add(clase);
}
