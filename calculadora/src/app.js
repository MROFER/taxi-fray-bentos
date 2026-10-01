// Interfaz de la página. La lógica de cálculo está en motor.js, ruta.js, modalidad.js y direcciones.js.

import { CONFIG, validarConfig } from './config.js';
import { calcularRangos, redondearRango } from './motor.js';
import { obtenerRuta } from './ruta.js';
import { detectarModalidad } from './modalidad.js';
import { CERCO_URBANO } from './cerco-urbano.js';
import { sugerirDirecciones, calleSinCruce, buscarNumero, puntoDeCalle, calles } from './direcciones.js';

const TEXTOS = {
  emergencia: 'Estimación más aproximada: no pudimos calcular la ruta exacta.',
  sinCalle: 'No encontramos esa calle. Marcá el punto en el mapa.',
};

const NOMBRES = { origen: 'de salida', destino: 'de llegada' };
const CENTRO_INICIAL = [-33.1230, -58.3000];

const erroresConfig = validarConfig(CONFIG);
const $ = (sel, raiz = document) => raiz.querySelector(sel);

// ---------- Mapa ----------

const mapa = L.map('mapa', { zoomControl: true }).setView(CENTRO_INICIAL, 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
}).addTo(mapa);

// Área urbana: dentro se cobra tarifa urbana.
L.polygon(CERCO_URBANO, {
  color: '#b8860b', weight: 2, dashArray: '6 6', fillOpacity: 0.04, interactive: false,
}).addTo(mapa);

const icono = (letra) => L.divIcon({
  className: '',
  html: `<div class="pin pin-${letra.toLowerCase()}"><span>${letra}</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 34],
});

let lineaRuta = null;
let calleResaltada = { origen: null, destino: null };
let marcandoEn = null; // 'origen' | 'destino' | null

// ---------- Puntos de salida y llegada ----------

const puntos = {};

for (const clave of ['origen', 'destino']) {
  const raiz = $(`[data-punto="${clave}"]`);
  const p = puntos[clave] = {
    clave,
    raiz,
    punto: null,          // [lat, lon]
    marcador: null,
    campo: $('.direccion', raiz),
    lista: $('.sugerencias', raiz),
    estado: $('.estado', raiz),
    marcar: $('.marcar', raiz),
    sugerencias: [],
    activa: -1,
  };

  p.campo.addEventListener('input', () => mostrarSugerencias(p));
  p.campo.addEventListener('keydown', (e) => teclasSugerencias(p, e));
  p.campo.addEventListener('blur', () => setTimeout(() => cerrarSugerencias(p), 150));
  p.campo.addEventListener('focus', () => { if (p.campo.value && !p.punto) mostrarSugerencias(p); });
  p.marcar.addEventListener('click', () => empezarAMarcar(clave));
}

function mostrarSugerencias(p, limpiarAviso = true) {
  const texto = p.campo.value;
  p.sugerencias = sugerirDirecciones(texto);
  p.activa = -1;
  p.lista.innerHTML = '';
  if (!p.sugerencias.length) {
    cerrarSugerencias(p);
    const sinCruce = calleSinCruce(texto);
    if (sinCruce) avisar(p, `${sinCruce.calle} y ${sinCruce.otra} no se cruzan. Probá con otra esquina o marcá el punto en el mapa.`, true);
    else if (texto.trim().length >= 3) avisar(p, TEXTOS.sinCalle, true);
    else if (limpiarAviso) avisar(p, '');
    return;
  }
  if (limpiarAviso) avisar(p, '');
  p.sugerencias.forEach((s, i) => {
    const li = document.createElement('li');
    li.id = `${p.clave}-op-${i}`;
    li.setAttribute('role', 'option');
    li.textContent = s.tipo === 'numero' && !s.encontrado ? `${s.nombre} (número no cargado)` : s.nombre;
    li.addEventListener('mousedown', (e) => { e.preventDefault(); elegirSugerencia(p, s); });
    p.lista.append(li);
  });
  p.lista.hidden = false;
  p.campo.setAttribute('aria-expanded', 'true');
}

function cerrarSugerencias(p) {
  p.lista.hidden = true;
  p.campo.setAttribute('aria-expanded', 'false');
  p.campo.removeAttribute('aria-activedescendant');
}

function teclasSugerencias(p, e) {
  if (p.lista.hidden || !p.sugerencias.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = p.sugerencias.length;
    p.activa = (p.activa + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    [...p.lista.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === p.activa)));
    p.campo.setAttribute('aria-activedescendant', `${p.clave}-op-${p.activa}`);
    p.lista.children[p.activa].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    elegirSugerencia(p, p.sugerencias[Math.max(p.activa, 0)]);
  } else if (e.key === 'Escape') {
    cerrarSugerencias(p);
  }
}

/**
 * Cascada: número de puerta exacto → esquina → punto medio de la calle.
 * Si solo se eligió la calle, el campo queda abierto para seguir con el número o la esquina.
 */
function elegirSugerencia(p, s) {
  const calle = calles[s.indice].n;
  resaltarCalle(p, s.indice);

  if (s.tipo === 'esquina') {
    terminar(p, s.nombre);
    fijarPunto(p, s.punto, `Ubicado en la esquina de ${s.nombre}.`);
  } else if (s.tipo === 'numero' && s.encontrado) {
    terminar(p, s.nombre);
    fijarPunto(p, buscarNumero(s.indice, s.numero), `Ubicado en ${s.nombre}. Si no es ahí, mové el punto en el mapa.`);
  } else if (s.tipo === 'numero') {
    seguir(p, `${calle} y `);
    fijarPunto(p, puntoDeCalle(s.indice),
      `No tenemos cargado el número ${s.numero} de ${calle}. Elegí la esquina más cercana de la lista.`, true);
  } else {
    seguir(p, `${calle} `);
    fijarPunto(p, puntoDeCalle(s.indice),
      `Punto aproximado sobre ${calle}. Escribí el número (${calle} 1234) o elegí la esquina de la lista.`, true);
  }
}

function terminar(p, texto) {
  p.campo.value = texto;
  cerrarSugerencias(p);
}

/** Deja el texto listo para completar y muestra las esquinas de la calle. */
function seguir(p, texto) {
  p.campo.value = texto;
  p.campo.focus();
  p.campo.setSelectionRange(texto.length, texto.length);
  mostrarSugerencias(p, false);
}

function fijarPunto(p, lugar, mensaje, alerta = false) {
  p.punto = lugar;
  if (!p.marcador) {
    p.marcador = L.marker(lugar, {
      draggable: true,
      icon: icono(p.clave === 'origen' ? 'A' : 'B'),
      title: p.clave === 'origen' ? 'Salida' : 'Llegada',
      keyboard: true,
    }).addTo(mapa);
    p.marcador.on('dragend', () => {
      p.punto = [p.marcador.getLatLng().lat, p.marcador.getLatLng().lng];
      avisar(p, 'Punto ajustado a mano en el mapa.');
      puntosCambiaron();
    });
  } else {
    p.marcador.setLatLng(lugar);
  }
  avisar(p, mensaje, alerta);
  encuadrar();
  puntosCambiaron();
}

function avisar(p, mensaje, alerta = false) {
  p.estado.textContent = mensaje;
  p.estado.classList.toggle('alerta', Boolean(mensaje) && alerta);
}

function resaltarCalle(p, indice) {
  if (calleResaltada[p.clave]) mapa.removeLayer(calleResaltada[p.clave]);
  calleResaltada[p.clave] = L.polyline(calles[indice].g, {
    color: p.clave === 'origen' ? '#1f6feb' : '#c2410c', weight: 6, opacity: 0.35, interactive: false,
  }).addTo(mapa);
}

function encuadrar() {
  const conPunto = Object.values(puntos).filter((p) => p.punto);
  if (conPunto.length === 2) {
    mapa.fitBounds(L.latLngBounds(conPunto.map((p) => p.punto)).pad(0.25), { maxZoom: 16 });
  } else if (conPunto.length === 1) {
    mapa.setView(conPunto[0].punto, Math.max(mapa.getZoom(), 16));
  }
}

// ---------- Marcar en el mapa ----------

function empezarAMarcar(clave) {
  if (marcandoEn === clave) { terminarDeMarcar(); return; }
  terminarDeMarcar();
  marcandoEn = clave;
  const p = puntos[clave];
  p.raiz.classList.add('marcando');
  p.marcar.classList.add('activo');
  p.marcar.textContent = 'Tocá el mapa… (cancelar)';
  $('#mapa').classList.add('marcando');
  $('#ayuda-mapa').textContent = `Tocá el mapa en el punto ${NOMBRES[clave]}.`;
  if (window.matchMedia('(max-width: 899px)').matches) $('#mapa').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function terminarDeMarcar() {
  if (!marcandoEn) return;
  const p = puntos[marcandoEn];
  p.raiz.classList.remove('marcando');
  p.marcar.classList.remove('activo');
  p.marcar.textContent = 'Marcar en el mapa';
  $('#mapa').classList.remove('marcando');
  $('#ayuda-mapa').textContent = 'Podés arrastrar los puntos A y B para ajustarlos. La línea punteada marca el área urbana.';
  marcandoEn = null;
}

mapa.on('click', (e) => {
  if (!marcandoEn) return;
  const p = puntos[marcandoEn];
  terminarDeMarcar();
  fijarPunto(p, [e.latlng.lat, e.latlng.lng], 'Marcado en el mapa. Podés arrastrar el punto para ajustarlo.');
  if (window.matchMedia('(max-width: 899px)').matches) p.raiz.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ---------- Cálculo ----------

const boton = $('#calcular');
const falta = $('#falta');
const resultado = $('#resultado');

// ---------- Valijas ----------

const VALIJAS_MAX = 10;
let valijas = 0;
let ultimoViaje = null; // { ruta, modalidad }: para recalcular al cambiar las valijas sin pedir la ruta de nuevo

function cambiarValijas(delta) {
  valijas = Math.min(VALIJAS_MAX, Math.max(0, valijas + delta));
  $('#valijas-cantidad').textContent = String(valijas);
  $('#valijas-menos').disabled = valijas === 0;
  $('#valijas-mas').disabled = valijas === VALIJAS_MAX;
  if (ultimoViaje && !resultado.hidden) mostrarResultado(ultimoViaje.ruta, ultimoViaje.modalidad, false);
}
$('#valijas-menos').addEventListener('click', () => cambiarValijas(-1));
$('#valijas-mas').addEventListener('click', () => cambiarValijas(1));

function puntosCambiaron() {
  resultado.hidden = true;
  ultimoViaje = null;
  if (lineaRuta) { mapa.removeLayer(lineaRuta); lineaRuta = null; }
  const faltan = Object.values(puntos).filter((p) => !p.punto).map((p) => NOMBRES[p.clave]);
  boton.disabled = faltan.length > 0 || erroresConfig.length > 0;
  falta.hidden = faltan.length === 0;
  falta.textContent = faltan.length === 2
    ? 'Falta elegir el punto de salida y el de llegada.'
    : `Falta elegir el punto ${faltan[0]}.`;
}

$('#formulario').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (boton.disabled) return;
  boton.disabled = true;
  boton.textContent = 'Calculando…';
  try {
    const ruta = await obtenerRuta(puntos.origen.punto, puntos.destino.punto);
    const modalidad = detectarModalidad(ruta);
    ultimoViaje = { ruta, modalidad };
    dibujarRuta(ruta);
    mostrarResultado(ruta, modalidad);
  } finally {
    boton.textContent = 'Calcular';
    boton.disabled = false;
  }
});

function dibujarRuta(ruta) {
  if (lineaRuta) mapa.removeLayer(lineaRuta);
  lineaRuta = L.polyline(ruta.geometria, {
    color: getComputedStyle(document.documentElement).getPropertyValue('--ruta').trim() || '#1d4ed8',
    weight: 5,
    opacity: 0.8,
    dashArray: ruta.emergencia ? '8 8' : null,
  }).addTo(mapa);
  mapa.fitBounds(lineaRuta.getBounds().pad(0.15), { maxZoom: 16 });
}

const pesos = (x, decimales = 0) =>
  '$ ' + x.toLocaleString('es-UY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const num = (x, decimales = 2) =>
  x.toLocaleString('es-UY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mostrarResultado(ruta, modalidad, desplazar = true) {
  const rangos = calcularRangos(ruta.tramos, ruta.distancia_m, modalidad.modalidad, CONFIG, valijas);
  const abierto = resultado.querySelector('details')?.open;
  const km = ruta.distancia_m / 1000;
  const minutos = Math.round(ruta.duracion_s / 60);
  const tiempo = minutos <= 1 ? 'un minuto o menos' : `unos ${minutos} min`;
  const tipo = modalidad.modalidad === 'urbana' ? 'Viaje urbano' : 'Viaje extraurbano';

  const avisos = [];
  if (ruta.emergencia) avisos.push(TEXTOS.emergencia);
  if (modalidad.modalidad === 'extraurbana') {
    avisos.push(modalidad.via
      ? `Se cobra como viaje extraurbano porque sale del área urbana por ${escapar(modalidad.via)}.`
      : 'Se cobra como viaje extraurbano porque sale del área urbana.');
  }
  if (modalidad.usaPuente) {
    avisos.push('Este viaje cruza el Puente Internacional. Las condiciones del servicio de taxi para ese cruce no están definidas: consultalo con el conductor antes de viajar.');
  }

  const tarjetas = rangos.map((t) => {
    const { desde, hasta } = redondearRango(t.min.total, t.max.total);
    return `<article class="tarifa">
        <h3>${escapar(t.nombre)}</h3>
        <p class="rango">de <strong>${pesos(desde)}</strong> a <strong>${pesos(hasta)}</strong></p>
        <p class="codigo">Tarifa ${t.codigo.slice(1)}</p>
      </article>`;
  }).join('');

  resultado.innerHTML = `
    <h2>Cuánto apartar</h2>
    <p class="resumen">${tipo} · ${num(km, 1)} km · ${tiempo} sin demoras</p>
    <div class="tarifas">${tarjetas}</div>
    ${valijas ? `<p class="extras">${textoValijas(rangos[0].valijas)}</p>` : ''}
    ${avisos.length ? `<ul class="avisos">${avisos.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}
    <details>
      <summary>Cómo se calcula</summary>
      ${detalleTecnico(ruta, modalidad, rangos)}
    </details>`;
  resultado.hidden = false;
  if (abierto) resultado.querySelector('details').open = true;
  if (desplazar) resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function textoValijas({ cantidad, cobradas, importe }) {
  const cuantas = cantidad === 1 ? '1 valija' : `${cantidad} valijas`;
  if (!cobradas) return `Con ${cuantas}: sin costo extra.`;
  return `Incluye ${pesos(importe, 2)} por ${cuantas}` +
    (cobradas < cantidad ? ` (se cobra${cobradas === 1 ? '' : 'n'} ${cobradas}; ${cantidad - cobradas === 1 ? 'la primera es gratis' : `las primeras ${cantidad - cobradas} son gratis`}).` : '.');
}

function detalleTecnico(ruta, modalidad, rangos) {
  const primera = CONFIG.primera_ficha_en === 'C'
    ? `al cumplirse los ${num(CONFIG.distancia_incluida_m, 0)} m incluidos`
    : `una ficha después de los ${num(CONFIG.distancia_incluida_m, 0)} m incluidos`;
  const espera = rangos[0].esperaS;
  const filas = [
    ['Bajada de bandera', (t) => pesos(t.derivados.bajada, 2)],
    ['Valor de la ficha', (t) => pesos(t.derivados.ficha, 2)],
    ['Precio por km', (t) => pesos(t.derivados.K, 2)],
    ['Hora de espera', (t) => pesos(t.derivados.H, 2)],
    ['Velocidad de transición', (t) => `${num(t.derivados.vt)} km/h`],
    ['Metros por ficha', (t) => `${num(t.derivados.d)} m`],
    ['Segundos por ficha', (t) => `${num(t.derivados.s)} s`],
    ['Fichas (mínimo / máximo)', (t) => `${t.min.fichas} / ${t.max.fichas}`],
    ['Reloj mínimo', (t) => pesos(t.min.importe, 2)],
    ['Reloj máximo', (t) => pesos(t.max.importe, 2)],
    ...(valijas ? [
      [`Valijas (${valijas}, se cobran ${rangos[0].valijas.cobradas})`, (t) => pesos(t.valijas.importe, 2)],
      ['Total mínimo', (t) => pesos(t.min.total, 2)],
      ['Total máximo', (t) => pesos(t.max.total, 2)],
    ] : []),
  ];
  const tabla = `<div class="tabla-scroll"><table>
      <thead><tr><th></th>${rangos.map((t) => `<th>Tarifa ${t.codigo.slice(1)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(([n, f]) => `<tr><td>${n}</td>${rangos.map((t) => `<td>${f(t)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

  return `<div class="tecnico">
    <p>El taxímetro arranca con la bajada de bandera, que incluye los primeros ${num(CONFIG.distancia_incluida_m, 0)} m.
       Después suma una ficha de ${pesos(CONFIG.ficha, 2)} cada cierta distancia o cada cierto tiempo:
       cuando el auto va más rápido que la <em>velocidad de transición</em> cuenta distancia, y cuando va más lento
       (o está parado) cuenta tiempo. Nunca las dos cosas a la vez.</p>
    <p><strong>Mínimo:</strong> la ruta sin demoras. <strong>Máximo:</strong> la misma ruta con
       ${num(espera, 0)} segundos de espera extra (semáforos, tránsito)${modalidad.modalidad === 'urbana'
         ? `: ${num(CONFIG.espera_urbano_s_por_km, 0)} s por cada km de viaje` : ''}.</p>
    <p>La tarifa de noche, domingos y feriados tiene un recargo del ${num(CONFIG.recargo_pct, 0)} %
       sobre la bajada, el precio por km y la hora de espera.</p>
    ${tabla}
    <p>Distancia de la ruta: ${num(ruta.distancia_m / 1000, 2)} km${ruta.emergencia ? ' (estimada en línea recta)' : ''}.
       Primera ficha: ${primera}. Los montos se redondean al peso: el mínimo hacia abajo y el máximo hacia arriba.</p>
    <p>${CONFIG.valijas_incluidas === 1 ? 'La primera valija no se cobra.' : `Las primeras ${CONFIG.valijas_incluidas} valijas no se cobran.`}
       Cada una de las demás suma hasta ${pesos(CONFIG.valija_adicional, 2)}, también de noche y en feriados (no lleva recargo).
       Para no quedarse corto, se suma el valor máximo.</p>
    <p>Fuente de los valores: ${escapar(CONFIG.fuente)}.</p>
  </div>`;
}

// ---------- Inicio ----------

$('#valijas-ayuda').textContent = CONFIG.valijas_incluidas > 0
  ? `${CONFIG.valijas_incluidas === 1 ? 'La primera no se cobra' : `Las primeras ${CONFIG.valijas_incluidas} no se cobran`}; las demás, hasta ${pesos(CONFIG.valija_adicional, 2)} cada una`
  : `Hasta ${pesos(CONFIG.valija_adicional, 2)} cada una`;
const [anio, mes, dia] = CONFIG.vigencia.split('-');
$('#vigencia').textContent = `Tarifas vigentes desde ${dia}/${mes}/${anio}.`;

if (erroresConfig.length) {
  const caja = $('#error-config');
  caja.innerHTML = `<strong>La calculadora no está disponible por un error en la configuración de tarifas.</strong>
    <p>Para quien mantiene la página: revisar <code>src/config.js</code>.</p>
    <ul>${erroresConfig.map((e) => `<li>${escapar(e)}</li>`).join('')}</ul>`;
  caja.hidden = false;
}
puntosCambiaron();
window.calculadoraLista = true;
