/**
 * Mapa de la calculadora (Leaflet + teselas de OpenStreetMap) dentro del <dialog> del taxímetro.
 * Leaflet se descarga solo la primera vez que se abre el mapa.
 */
import type * as Leaflet from 'leaflet';
import { CERCO_URBANO } from '@calc/cerco-urbano.js';
import { calles } from '@calc/direcciones.js';

export type LatLon = [number, number];
export type Clave = 'origen' | 'destino';

const CENTRO_INICIAL: LatLon = [-33.123, -58.3];

let L: typeof Leaflet;
let mapa: Leaflet.Map | null = null;
let lineaRuta: Leaflet.Polyline | null = null;
const marcadores: Partial<Record<Clave, Leaflet.Marker>> = {};
const pendientes: Partial<Record<Clave, LatLon>> = {};
let alTocar: ((p: LatLon) => void) | null = null;
let alArrastrar: (clave: Clave, p: LatLon) => void = () => {};
let rutaPendiente: { geometria: LatLon[]; emergencia: boolean } | null = null;

function cargarCss(href: string) {
  return new Promise<void>((listo) => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    link.onload = link.onerror = () => listo();
    document.head.append(link);
  });
}

async function asegurarMapa(contenedor: HTMLElement) {
  if (mapa) return mapa;
  const [mod, css] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css?url')]);
  await cargarCss(css.default);
  L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);

  mapa = L.map(contenedor, { zoomControl: true }).setView(CENTRO_INICIAL, 14);
  const teselas = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
  }).addTo(mapa);
  // Si las imágenes del mapa no cargan (sin conexión, red que las bloquea, vista previa),
  // se dibujan las calles con los datos de OpenStreetMap que ya trae la calculadora.
  teselas.once('tileerror', () => dibujarCalles(mapa!));
  // Área urbana: adentro se cobra tarifa urbana.
  L.polygon(CERCO_URBANO as LatLon[], {
    color: '#F2B705', weight: 2, dashArray: '6 6', fillOpacity: 0.05, interactive: false,
  }).addTo(mapa);
  mapa.on('click', (e: Leaflet.LeafletMouseEvent) => alTocar?.([e.latlng.lat, e.latlng.lng]));

  for (const clave of ['origen', 'destino'] as const) {
    const p = pendientes[clave];
    if (p) ponerMarcador(clave, p);
  }
  if (rutaPendiente) dibujarRuta(rutaPendiente.geometria, rutaPendiente.emergencia);
  return mapa;
}

function dibujarCalles(m: Leaflet.Map) {
  const lienzo = L.canvas({ padding: 0.5 });
  const lineas = calles.map((c) =>
    L.polyline(c.g as LatLon[][], { renderer: lienzo, color: '#8C8576', weight: 2.5, opacity: 0.9, interactive: false }),
  );
  L.layerGroup(lineas).addTo(m).eachLayer((l) => (l as Leaflet.Polyline).bringToBack());
  // Nombres de calle desde zoom 16, en el punto medio de cada una.
  const nombres = L.layerGroup(
    calles.map((c) =>
      L.marker(c.p as LatLon, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: 'calle-nombre', html: `<span>${c.n.replace(/</g, '&lt;')}</span>`, iconSize: [0, 0] }),
      }),
    ),
  );
  const actualizar = () => (m.getZoom() >= 16 ? nombres.addTo(m) : nombres.remove());
  m.on('zoomend', actualizar);
  actualizar();
}

const icono = (letra: 'A' | 'B') =>
  L.divIcon({ className: '', html: `<div class="pin pin-${letra.toLowerCase()}"><span>${letra}</span></div>`, iconSize: [32, 32], iconAnchor: [16, 34] });

function ponerMarcador(clave: Clave, punto: LatLon) {
  if (!mapa) return;
  let m = marcadores[clave];
  if (!m) {
    m = L.marker(punto, {
      draggable: true,
      icon: icono(clave === 'origen' ? 'A' : 'B'),
      title: clave === 'origen' ? 'Salida' : 'Llegada',
      keyboard: true,
    }).addTo(mapa);
    m.on('dragend', () => {
      const ll = m!.getLatLng();
      alArrastrar(clave, [ll.lat, ll.lng]);
    });
    marcadores[clave] = m;
  } else {
    m.setLatLng(punto);
  }
}

/** Ubica (o mueve) el punto A o B. Si el mapa todavía no se abrió, queda anotado. */
export function marcar(clave: Clave, punto: LatLon) {
  pendientes[clave] = punto;
  ponerMarcador(clave, punto);
}

export function borrarRuta() {
  rutaPendiente = null;
  if (lineaRuta && mapa) mapa.removeLayer(lineaRuta);
  lineaRuta = null;
}

export function dibujarRuta(geometria: LatLon[], emergencia: boolean) {
  rutaPendiente = { geometria, emergencia };
  if (!mapa) return;
  if (lineaRuta) mapa.removeLayer(lineaRuta);
  lineaRuta = L.polyline(geometria, { color: '#2F5D7C', weight: 5, opacity: 0.9, dashArray: emergencia ? '8 8' : undefined }).addTo(mapa);
}

export function alMoverPunto(fn: (clave: Clave, p: LatLon) => void) {
  alArrastrar = fn;
}

/**
 * Abre el mapa en el contenedor ya visible.
 * @param tocar si se pasa, el próximo toque en el mapa ubica un punto.
 */
export async function mostrar(contenedor: HTMLElement, tocar: ((p: LatLon) => void) | null) {
  const m = await asegurarMapa(contenedor);
  alTocar = tocar;
  contenedor.classList.toggle('marcando', Boolean(tocar));
  m.invalidateSize();
  if (lineaRuta) {
    m.fitBounds(lineaRuta.getBounds().pad(0.15), { maxZoom: 16 });
  } else {
    const puntos = Object.values(pendientes);
    if (puntos.length === 2) m.fitBounds(L.latLngBounds(puntos).pad(0.25), { maxZoom: 16 });
    else if (puntos.length === 1) m.setView(puntos[0]!, Math.max(m.getZoom(), 15));
  }
}

export function dejarDeTocar() {
  alTocar = null;
}
