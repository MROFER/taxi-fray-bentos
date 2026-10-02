/**
 * Interfaz del taxímetro de la landing. Toda la lógica de cálculo es la de la calculadora
 * (calculadora/src: motor, ruta, modalidad, direcciones); acá solo se conecta con el diseño.
 */
import { CONFIG, validarConfig } from '@calc/config.js';
import { calcularRangos, redondearRango } from '@calc/motor.js';
import { obtenerRuta } from '@calc/ruta.js';
import { detectarModalidad } from '@calc/modalidad.js';
import { sugerirDirecciones, calleSinCruce, buscarNumero, puntoDeCalle, calles } from '@calc/direcciones.js';
import * as mapa from './mapa';
import type { Clave, LatLon } from './mapa';
import { textoValijas, escapar, pesos } from './textos';
import { $, reduceMotion, replay } from '@/scripts/ui';
import type { Rango } from './tipos';

type Ruta = Awaited<ReturnType<typeof obtenerRuta>>;
type Modalidad = ReturnType<typeof detectarModalidad>;
type Sugerencia = ReturnType<typeof sugerirDirecciones>[number];

const TEXTOS = {
  emergencia: 'Estimación más aproximada: no pudimos calcular la ruta exacta.',
  sinCalle: 'No encontramos esa calle. Marcala en el mapa.',
};
const NOMBRES: Record<Clave, string> = { origen: 'de salida', destino: 'de llegada' };
const VALIJAS_MAX = 10;

const erroresConfig = validarConfig(CONFIG);
const form = $<HTMLFormElement>('pedir');
const boton = $<HTMLButtonElement>('calcBtn');
const falta = $('falta');
const dialog = $<HTMLDialogElement>('mapa');
const lienzo = $('mapaLeaflet');

// ---------- Puntos A y B ----------

interface Punto {
  clave: Clave;
  punto: LatLon | null;
  raiz: HTMLElement;
  campo: HTMLInputElement;
  lista: HTMLUListElement;
  estado: HTMLElement;
  sugerencias: Sugerencia[];
  activa: number;
}

const puntos = {} as Record<Clave, Punto>;
for (const clave of ['origen', 'destino'] as const) {
  const raiz = form.querySelector<HTMLElement>(`[data-punto="${clave}"]`)!;
  const p: Punto = (puntos[clave] = {
    clave,
    punto: null,
    raiz,
    campo: raiz.querySelector('input')!,
    lista: raiz.querySelector('.sugerencias')!,
    estado: raiz.querySelector('.estado')!,
    sugerencias: [],
    activa: -1,
  });
  p.campo.addEventListener('input', () => {
    if (p.punto) soltarPunto(p);
    mostrarSugerencias(p);
  });
  p.campo.addEventListener('keydown', (e) => teclasSugerencias(p, e));
  p.campo.addEventListener('blur', () => setTimeout(() => cerrarSugerencias(p), 150));
  p.campo.addEventListener('focus', () => {
    if (p.campo.value && !p.punto) mostrarSugerencias(p);
  });
  raiz.querySelector('.map-link')!.addEventListener('click', () => abrirMapa(clave));
}

function mostrarSugerencias(p: Punto, limpiarAviso = true) {
  const texto = p.campo.value;
  p.sugerencias = sugerirDirecciones(texto);
  p.activa = -1;
  p.lista.replaceChildren();
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
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      elegirSugerencia(p, s);
    });
    p.lista.append(li);
  });
  p.lista.hidden = false;
  p.campo.setAttribute('aria-expanded', 'true');
}

function cerrarSugerencias(p: Punto) {
  p.lista.hidden = true;
  p.campo.setAttribute('aria-expanded', 'false');
  p.campo.removeAttribute('aria-activedescendant');
}

function teclasSugerencias(p: Punto, e: KeyboardEvent) {
  if (p.lista.hidden || !p.sugerencias.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = p.sugerencias.length;
    p.activa = (p.activa + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    [...p.lista.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === p.activa)));
    p.campo.setAttribute('aria-activedescendant', `${p.clave}-op-${p.activa}`);
    p.lista.children[p.activa]!.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    elegirSugerencia(p, p.sugerencias[Math.max(p.activa, 0)]!);
  } else if (e.key === 'Escape') {
    cerrarSugerencias(p);
  }
}

/**
 * Lugar de referencia, o cascada: número de puerta exacto → esquina → punto medio de la calle.
 * Si solo se eligió la calle, el campo queda abierto para seguir con el número o la esquina.
 */
function elegirSugerencia(p: Punto, s: Sugerencia) {
  if (s.tipo === 'lugar') {
    terminar(p, s.nombre);
    fijarPunto(p, s.punto as LatLon, `Ubicado en ${s.nombre}. Si no es ahí, mové el punto en el mapa.`);
    return;
  }
  const calle = calles[s.indice!]!.n;
  if (s.tipo === 'esquina') {
    terminar(p, s.nombre);
    fijarPunto(p, s.punto as LatLon, `Ubicado en la esquina de ${s.nombre}.`);
  } else if (s.tipo === 'numero' && s.encontrado) {
    terminar(p, s.nombre);
    fijarPunto(p, buscarNumero(s.indice, s.numero!) as LatLon, `Ubicado en ${s.nombre}. Si no es ahí, mové el punto en el mapa.`);
  } else if (s.tipo === 'numero') {
    seguir(p, `${calle} y `);
    fijarPunto(p, puntoDeCalle(s.indice) as LatLon, `No tenemos cargado el número ${s.numero} de ${calle}. Elegí la esquina más cercana de la lista.`, true);
  } else {
    seguir(p, `${calle} `);
    fijarPunto(p, puntoDeCalle(s.indice) as LatLon, `Punto aproximado sobre ${calle}. Escribí el número (${calle} 1234) o elegí la esquina de la lista.`, true);
  }
}

function terminar(p: Punto, texto: string) {
  p.campo.value = texto;
  cerrarSugerencias(p);
}

function seguir(p: Punto, texto: string) {
  p.campo.value = texto;
  p.campo.focus();
  p.campo.setSelectionRange(texto.length, texto.length);
  mostrarSugerencias(p, false);
}

function fijarPunto(p: Punto, lugar: LatLon, mensaje: string, alerta = false) {
  p.punto = lugar;
  mapa.marcar(p.clave, lugar);
  avisar(p, mensaje, alerta);
  puntosCambiaron();
}

/** Al reescribir la dirección, el punto anterior deja de valer. */
function soltarPunto(p: Punto) {
  p.punto = null;
  puntosCambiaron();
}

function avisar(p: Punto, mensaje: string, alerta = false) {
  p.estado.textContent = mensaje;
  p.estado.classList.toggle('alerta', Boolean(mensaje) && alerta);
}

// ---------- Mapa ----------

mapa.alMoverPunto((clave, punto) => {
  const p = puntos[clave];
  p.punto = punto;
  if (!p.campo.value) p.campo.value = 'Punto marcado en el mapa';
  avisar(p, 'Punto ajustado a mano en el mapa.');
  puntosCambiaron();
});

function abrirMapa(clave: Clave | null) {
  $('mapaTit').textContent = clave === 'origen' ? 'Marcá el punto de salida' : clave === 'destino' ? 'Marcá el destino' : 'Tu recorrido';
  $('mapaAyuda').textContent = clave
    ? `Tocá el mapa en el punto ${NOMBRES[clave]}. La línea punteada marca el área urbana.`
    : 'Podés arrastrar los puntos A y B para ajustarlos. La línea punteada marca el área urbana.';
  dialog.showModal();
  void mapa.mostrar(
    lienzo,
    clave
      ? (lugar) => {
          const p = puntos[clave];
          p.campo.value = 'Punto marcado en el mapa';
          cerrarSugerencias(p);
          fijarPunto(p, lugar, 'Marcado en el mapa. Podés arrastrar el punto para ajustarlo.');
          mapa.dejarDeTocar();
          setTimeout(() => {
            dialog.close();
            replay(p.campo, 'flash');
          }, 350);
        }
      : null,
  );
}

$('mapaCerrar').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => mapa.dejarDeTocar());
$('verRuta').addEventListener('click', () => abrirMapa(null));

// ---------- Valijas ----------

let valijas = 0;
const cant = $('valijas-cantidad');
const menos = $<HTMLButtonElement>('valijas-menos');
const mas = $<HTMLButtonElement>('valijas-mas');

function cambiarValijas(delta: number) {
  valijas = Math.min(VALIJAS_MAX, Math.max(0, valijas + delta));
  cant.textContent = String(valijas);
  menos.disabled = valijas === 0;
  mas.disabled = valijas === VALIJAS_MAX;
  if (ultimoViaje) mostrarResultado(ultimoViaje.ruta, ultimoViaje.modalidad);
}
menos.addEventListener('click', () => cambiarValijas(-1));
mas.addEventListener('click', () => cambiarValijas(1));

// ---------- Cálculo ----------

let ultimoViaje: { ruta: Ruta; modalidad: Modalidad } | null = null;

function puntosCambiaron() {
  ultimoViaje = null;
  mapa.borrarRuta();
  reiniciarPantalla();
  const faltan = Object.values(puntos).filter((p) => !p.punto).map((p) => NOMBRES[p.clave]);
  boton.disabled = faltan.length > 0 || erroresConfig.length > 0;
  falta.hidden = faltan.length === 0;
  falta.textContent = faltan.length === 2 ? 'Falta elegir el punto de salida y el de llegada.' : `Falta elegir el punto ${faltan[0]}.`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (boton.disabled) return;
  boton.disabled = true;
  boton.textContent = 'Calculando…';
  $('modo').textContent = 'Buscando ruta';
  try {
    const ruta = await obtenerRuta(puntos.origen.punto!, puntos.destino.punto!);
    const modalidad = detectarModalidad(ruta);
    ultimoViaje = { ruta, modalidad };
    mapa.dibujarRuta(ruta.geometria as LatLon[], ruta.emergencia);
    mostrarResultado(ruta, modalidad);
  } finally {
    boton.textContent = 'Calcular tarifa';
    boton.disabled = false;
  }
});

const km = (m: number, dec = 1) => (m / 1000).toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function reiniciarPantalla() {
  $('modo').textContent = 'Libre';
  $('tarifaTipo').textContent = 'SIN VIAJE';
  $('amount').textContent = pesos(0, 2);
  $('kmShow').textContent = '— KM';
  $('amount').hidden = false;
  $('rangos').hidden = true;
  $('breakdown').innerHTML = '<dt>Elegí de dónde salís y a dónde vas</dt><dd></dd>';
  $('breakdown').hidden = false;
  $('avisos').hidden = true;
  $('resultadoExtra').hidden = true;
}

/**
 * Como en la calculadora: se muestran los dos rangos (de día y de noche, domingos y feriados)
 * y la persona decide cuál tomar como referencia.
 */
function mostrarResultado(ruta: Ruta, modalidad: Modalidad) {
  const rangos = calcularRangos(ruta.tramos, ruta.distancia_m, modalidad.modalidad, CONFIG, valijas) as Rango[];
  const urbano = modalidad.modalidad === 'urbana';
  const minutos = Math.round(ruta.duracion_s / 60);

  $('modo').textContent = 'Ocupado';
  $('tarifaTipo').textContent = urbano ? 'VIAJE URBANO' : 'VIAJE EXTRAURBANO';
  $('kmShow').textContent = `≈ ${km(ruta.distancia_m)} KM · ${Math.max(1, minutos)} MIN`;

  $('amount').hidden = true;
  const lista = $('rangos');
  lista.innerHTML = rangos
    .map((t) => {
      const { desde, hasta } = redondearRango(t.min.total, t.max.total);
      return `<div class="rango"><dt><span class="cod">Tarifa ${t.codigo.slice(1)}</span> ${escapar(t.nombre)}</dt>` +
        `<dd>de <strong>${pesos(desde)}</strong> a <strong>${pesos(hasta)}</strong></dd></div>`;
    })
    .join('');
  lista.hidden = false;
  if (lista.isConnected && !reduceMotion()) replay(lista, 'encendido');

  const bd = $('breakdown');
  bd.innerHTML = valijas ? `<dt class="nota">${textoValijas(rangos[0]!.valijas)}</dt><dd></dd>` : '';
  bd.hidden = !valijas;

  const avisos: string[] = [];
  if (ruta.emergencia) avisos.push(TEXTOS.emergencia);
  if (!urbano) {
    avisos.push(
      modalidad.via
        ? `Se cobra como viaje extraurbano porque sale del área urbana por ${escapar(modalidad.via)}.`
        : 'Se cobra como viaje extraurbano porque sale del área urbana.',
    );
  }
  if (modalidad.usaPuente) {
    avisos.push('Este viaje cruza el Puente Internacional. Las condiciones del servicio de taxi para ese cruce no están definidas: consultalo con el conductor antes de viajar.');
  }
  const ul = $('avisos');
  ul.innerHTML = avisos.map((a) => `<li>${a}</li>`).join('');
  ul.hidden = !avisos.length;

  $('resultadoExtra').hidden = false;
}

// ---------- Paradas (sección de abajo) ----------

/** Carga una parada como punto de salida. */
export function salirDesde(nombre: string, punto: LatLon) {
  const p = puntos.origen;
  p.campo.value = nombre;
  cerrarSugerencias(p);
  fijarPunto(p, punto, `Salida desde la parada ${nombre}.`);
  replay(p.campo, 'flash');
}

// ---------- Inicio ----------

if (erroresConfig.length) {
  const caja = $('error-config');
  caja.innerHTML = `<strong>La calculadora no está disponible por un error en la configuración de tarifas.</strong>
    <p>Para quien mantiene la página: revisar <code>calculadora/src/config.js</code>.</p>
    <ul>${erroresConfig.map((e: string) => `<li>${escapar(e)}</li>`).join('')}</ul>`;
  caja.hidden = false;
}
menos.disabled = true;
puntosCambiaron();
form.dataset.listo = '';
