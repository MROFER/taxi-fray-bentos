/**
 * Carga diferida de la calculadora. El HTML del taxímetro viene listo del build; el motor, las calles
 * de OpenStreetMap (~190 KB) y el mapa recién se descargan cuando la persona empieza a usarlo.
 */
type App = typeof import('./app');

let pendiente: Promise<App> | null = null;

export function cargarTaximetro(): Promise<App> {
  pendiente ??= import('./app');
  return pendiente;
}
