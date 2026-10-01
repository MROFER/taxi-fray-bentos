/** Textos del resultado. Portado de calculadora/src/app.js (mismo contenido, otro diseño). */
import { CONFIG } from '@calc/config.js';
import type { obtenerRuta } from '@calc/ruta.js';
import type { detectarModalidad } from '@calc/modalidad.js';

import type { Rango } from './tipos';

type Rangos = Rango[];

export const pesos = (x: number, decimales = 0) =>
  '$ ' + x.toLocaleString('es-UY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const num = (x: number, decimales = 2) =>
  x.toLocaleString('es-UY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
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

export function detalleTecnico(
  ruta: Awaited<ReturnType<typeof obtenerRuta>>,
  modalidad: ReturnType<typeof detectarModalidad>,
  rangos: Rangos,
  valijas: number,
) {
  const primera =
    CONFIG.primera_ficha_en === 'C'
      ? `al cumplirse los ${num(CONFIG.distancia_incluida_m, 0)} m incluidos`
      : `una ficha después de los ${num(CONFIG.distancia_incluida_m, 0)} m incluidos`;
  const espera = rangos[0]!.esperaS;
  const filas: [string, (t: Rango) => string][] = [
    ['Bajada de bandera', (t) => pesos(t.derivados.bajada, 2)],
    ['Valor de la ficha', (t) => pesos(t.derivados.ficha, 2)],
    ['Precio por km', (t) => pesos(t.derivados.K, 2)],
    ['Hora de espera', (t) => pesos(t.derivados.H, 2)],
    ['Velocidad de transición', (t) => `${num(t.derivados.vt)} km/h`],
    ['Metros por ficha', (t) => `${num(t.derivados.d)} m`],
    ['Segundos por ficha', (t) => `${num(t.derivados.s)} s`],
    ['Fichas (mín. / máx.)', (t) => `${t.min.fichas} / ${t.max.fichas}`],
    ['Reloj mínimo', (t) => pesos(t.min.importe, 2)],
    ['Reloj máximo', (t) => pesos(t.max.importe, 2)],
    ...(valijas
      ? ([
          [`Valijas (${valijas}, se cobran ${rangos[0]!.valijas.cobradas})`, (t: Rango) => pesos(t.valijas.importe, 2)],
          ['Total mínimo', (t: Rango) => pesos(t.min.total, 2)],
          ['Total máximo', (t: Rango) => pesos(t.max.total, 2)],
        ] as [string, (t: Rango) => string][])
      : []),
  ];
  const tabla = `<div class="tabla-scroll"><table>
      <thead><tr><th></th>${rangos.map((t) => `<th scope="col">Tarifa ${t.codigo.slice(1)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(([n, f]) => `<tr><th scope="row">${n}</th>${rangos.map((t) => `<td>${f(t)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

  return `
    <p>El taxímetro arranca con la bajada de bandera, que incluye los primeros ${num(CONFIG.distancia_incluida_m, 0)} m.
       Después suma una ficha de ${pesos(CONFIG.ficha, 2)} cada cierta distancia o cada cierto tiempo:
       cuando el auto va más rápido que la <em>velocidad de transición</em> cuenta distancia, y cuando va más lento
       (o está parado) cuenta tiempo. Nunca las dos cosas a la vez.</p>
    <p><strong>Mínimo:</strong> la ruta sin demoras. <strong>Máximo:</strong> la misma ruta con
       ${num(espera, 0)} segundos de espera extra (semáforos, tránsito)${
         modalidad.modalidad === 'urbana' ? `: ${num(CONFIG.espera_urbano_s_por_km, 0)} s por cada km de viaje` : ''
       }.</p>
    <p>La tarifa de noche, domingos y feriados tiene un recargo del ${num(CONFIG.recargo_pct, 0)} %
       sobre la bajada, el precio por km y la hora de espera.</p>
    ${tabla}
    <p>Distancia de la ruta: ${num(ruta.distancia_m / 1000, 2)} km${ruta.emergencia ? ' (estimada en línea recta)' : ''}.
       Primera ficha: ${primera}. Los montos se redondean al peso: el mínimo hacia abajo y el máximo hacia arriba.</p>
    <p>${CONFIG.valijas_incluidas === 1 ? 'La primera valija no se cobra.' : `Las primeras ${CONFIG.valijas_incluidas} valijas no se cobran.`}
       Cada una de las demás suma hasta ${pesos(CONFIG.valija_adicional, 2)}, también de noche y en feriados (no lleva recargo).
       Para no quedarse corto, se suma el valor máximo.</p>
    <p>Fuente de los valores: ${escapar(CONFIG.fuente)}.</p>`;
}
