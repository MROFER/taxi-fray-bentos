import { SITE, INICIO } from '@/config/site';

/**
 * Los taxis se cargan desde el panel de administración (/admin), que guarda un archivo JSON por tarjeta en
 * src/content/tarjetas/<id>.json. Cada tarjeta es un vehículo de la sección Taxis del inicio y puede tener,
 * dentro, su página propia (bloque "pagina"): se crea al activarla y vive en /taxis/<direccion>/.
 * La tarjeta se puede ocultar del inicio sin que su página deje de existir.
 * scripts/validar-taxis.mjs revisa estos archivos antes de cada build.
 */

/** Un servicio es el taxi como lo conoce la gente (ej. "Taxi Lechuzas"). Si tiene página, vive en /taxis/<slug>/. */
export interface Servicio {
  /** Parte de la dirección de su página: /taxis/<slug>/ (el nombre del archivo). No cambiarla una vez publicada. */
  slug: string;
  /** Nombre del servicio: el título de su página y el saludo de WhatsApp. */
  nombre: string;
  /** Nombre que se ve en su página. Igual a nombre (se mantiene por compatibilidad). */
  nombrePagina: string;
  /** Nombre comercial que se le da a Google (título de la página y datos estructurados). Vacío = nombre. */
  empresa: string;
  /** Se muestra bajo el nombre; \n parte el renglón. */
  nota: string;
  /** Texto de presentación de su página. Vacío = se arma uno con los datos del servicio. */
  descripcion: string;
  /** Foto de portada (ruta dentro de src/assets/taxis). Vacío = se busca src/assets/taxis/<slug>.* */
  portada?: string;
  /** Encuadre vertical de la foto de portada: 0 = se ve la parte de arriba, 100 = la de abajo. Sin valor = 50. */
  portadaY?: number;
  /** WhatsApp del servicio, con código de país, sin + ni espacios (ej. "59899123456"). Vacío = a definir. */
  whatsapp: string;
  /** Enlace "Escribir una reseña" de su Perfil de Empresa de Google (activa el QR de reseñas). */
  resenaGoogle?: string;
  /** Tarjeta de muestra del diseño (no es un taxi real): no tiene página y no se informa a buscadores ni IAs. */
  ejemplo?: boolean;
  /** Tiene página propia publicada: se enlaza desde su tarjeta, lleva "Destacado" y sale más en el dado. */
  personalizada?: boolean;
}

/** Cuántas veces más chances tiene en el dado un servicio con página propia frente a uno sin ella. */
export const PESO_DADO_PERSONALIZADA = 3;
export const pesoDado = (s: Servicio) => (s.personalizada ? PESO_DADO_PERSONALIZADA : 1);

export interface Taxi {
  id: string;
  servicio: Servicio;
  /** Nombre y nota que muestra la tarjeta. */
  nombre: string;
  nota: string;
  /** Placa municipal. PENDIENTE: "JTX ____" se muestra como a definir. */
  placa: string;
  /** Una línea por renglón. */
  vehiculo: readonly string[];
  /** Cantidad de plazas; vacío = a definir. */
  plazas: string;
  valijas: string;
  aBordo: readonly string[];
  /** WhatsApp propio de este vehículo, si no usa el del servicio. */
  whatsapp?: string;
}

interface TarjetaJson {
  publicada?: boolean;
  orden?: number;
  nombre: string;
  nota?: string;
  placa?: string;
  vehiculo?: string[];
  plazas?: string;
  valijas?: string;
  aBordo?: string[];
  whatsapp?: string;
  ejemplo?: boolean;
  pagina?: {
    activa?: boolean;
    direccion?: string;
    empresa?: string;
    descripcion?: string;
    portada?: string;
    portadaY?: number;
    resenaGoogle?: string;
  };
}

const archivo = (ruta: string) => ruta.replace(/^.*\/|\.json$/g, '');
const lineas = (v: unknown) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []).map(String).filter(Boolean);

const tarjetasJson = import.meta.glob<TarjetaJson>('/src/content/tarjetas/*.json', { eager: true, import: 'default' });
const tarjetas = Object.entries(tarjetasJson)
  .map(([ruta, t]) => ({ id: archivo(ruta), t }))
  .sort((a, b) => (a.t.orden ?? 99) - (b.t.orden ?? 99) || a.id.localeCompare(b.id));

/** Páginas activas, por dirección. Si dos tarjetas usan la misma dirección, comparten la página (la primera la define). */
const PAGINAS = new Map<string, Servicio>();
for (const { t } of tarjetas) {
  const p = t.pagina;
  if (t.ejemplo || !p?.activa || !p.direccion || PAGINAS.has(p.direccion)) continue;
  PAGINAS.set(p.direccion, {
    slug: p.direccion,
    nombre: t.nombre,
    nombrePagina: t.nombre,
    empresa: p.empresa ?? '',
    nota: t.nota ?? '',
    descripcion: p.descripcion ?? '',
    portada: p.portada || undefined,
    portadaY: typeof p.portadaY === 'number' ? p.portadaY : undefined,
    whatsapp: t.whatsapp ?? '',
    resenaGoogle: p.resenaGoogle || undefined,
    personalizada: true,
  });
}

/** Todas las tarjetas, publicadas u ocultas (las ocultas igual aparecen en la página de su taxi). */
const TODAS: readonly Taxi[] = tarjetas.map(({ id, t }) => {
  const pagina = !t.ejemplo && t.pagina?.activa && t.pagina.direccion ? PAGINAS.get(t.pagina.direccion) : undefined;
  // Sin página, la tarjeta es su propio servicio (no se enlaza ni se informa a Google como página).
  const servicio: Servicio = pagina ?? {
    slug: id,
    nombre: t.nombre,
    nombrePagina: t.nombre,
    empresa: '',
    nota: t.nota ?? '',
    descripcion: '',
    whatsapp: t.whatsapp ?? '',
    ejemplo: Boolean(t.ejemplo),
  };
  return {
    id,
    servicio,
    nombre: t.nombre,
    nota: t.nota ?? '',
    placa: t.placa || 'JTX ____',
    vehiculo: lineas(t.vehiculo),
    plazas: t.plazas ?? '',
    valijas: t.valijas ?? '',
    aBordo: lineas(t.aBordo),
    whatsapp: t.whatsapp || undefined,
  };
});
const ocultas = new Set(tarjetas.filter(({ t }) => t.publicada === false).map(({ id }) => id));

/** Tarjetas publicadas en la sección Taxis del inicio, en el orden elegido en el panel. */
export const TAXIS: readonly Taxi[] = TODAS.filter((t) => !ocultas.has(t.id));

/** Vehículos reales (sin las tarjetas de muestra). */
export const TAXIS_REALES = TAXIS.filter((t) => !t.servicio.ejemplo);

/**
 * Servicios con página propia publicada: los del tablero primero (en su orden) y después los que no tienen tarjeta.
 * Son los que tienen /taxis/<slug>/ y los que se informan a Google y a las IAs.
 */
export const SERVICIOS_TAXI: readonly Servicio[] = [
  ...new Set([...TAXIS_REALES.map((t) => t.servicio).filter((s) => s.personalizada), ...PAGINAS.values()]),
];

export const vehiculosDe = (s: Servicio) => TODAS.filter((t) => t.servicio === s);
export const paginaDe = (s: Servicio) => `${INICIO}taxis/${s.slug}/`;
/** Número al que escribir: el del vehículo, o si no tiene, el del servicio. */
export const numeroDe = (t: Taxi) => t.whatsapp || t.servicio.whatsapp;

export const nombrePaginaDe = (s: Servicio) => s.nombrePagina || s.nombre;
export const empresaDe = (s: Servicio) => s.empresa || nombrePaginaDe(s);
/** Todos los nombres con los que se conoce al servicio, sin repetir (para Google: alternateName). */
export const otrosNombresDe = (s: Servicio) =>
  [...new Set([nombrePaginaDe(s), s.nombre])].filter((n) => n !== empresaDe(s));

/** Presentación del servicio en su página (y en su descripción para Google) cuando no tiene una propia. */
export const descripcionDe = (s: Servicio) =>
  s.descripcion ||
  `${nombrePaginaDe(s)}${s.empresa ? ` (${s.empresa})` : ''} es un servicio de taxi habilitado en Fray Bentos, Río Negro. Pedilo por WhatsApp para viajar ahora o reservá tu traslado: en la ciudad, a Las Cañas, al Puente San Martín y a cualquier destino.`;

// Mensajes que se abren en WhatsApp. En WhatsApp *texto* se ve en negrita: "reservar" va así para que el chofer
// distinga de un vistazo una reserva de un pedido inmediato.
export const mensajeAhora = (t: Taxi) =>
  `Hola ${t.nombre}, te escribo desde ${SITE.domain}. Necesito un taxi ahora.\n📍 Estoy en: \n🏁 Voy a: `;
export const mensajeReserva = (t: Taxi) =>
  `Hola ${t.nombre}, te escribo desde ${SITE.domain}. Quiero *reservar* un viaje.\n📅 Día y hora: \n📍 Desde: \n🏁 Hasta: \n👥 Pasajeros: \n🧳 Valijas: `;
export const whatsappUrl = (numero: string, texto: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
