import { SITE, INICIO } from '@/config/site';

/**
 * Un servicio es el taxi como lo conoce la gente (ej. "Taxi Lechuzas") y tiene su propia página en /taxis/<slug>/.
 * Un servicio puede tener varios vehículos: cada vehículo es una tarjeta en la sección Taxis, y todas las tarjetas
 * del mismo servicio llevan a la misma página.
 */
export interface Servicio {
  /** Parte de la dirección de su página: /taxis/<slug>/. No cambiarla una vez publicada (Google ya la conoce). */
  slug: string;
  /** Nombre corto: el de la tarjeta y el saludo de WhatsApp. */
  nombre: string;
  /** Nombre que se ve en su página (título grande y migas). Vacío = el nombre corto. */
  nombrePagina: string;
  /** Nombre comercial de la empresa: el que se le da a Google (título de la página y datos estructurados). Vacío = nombrePagina. */
  empresa: string;
  /** Se muestra bajo el nombre; \n parte el renglón. */
  nota: string;
  /** Texto de presentación de su página. Vacío = se arma uno con los datos del servicio. */
  descripcion: string;
  /** Encuadre vertical de la foto de portada: 0 = se ve la parte de arriba, 100 = la de abajo. Sin valor = 50. */
  portadaY?: number;
  /** WhatsApp del servicio, con código de país, sin + ni espacios (ej. "59899123456"). Vacío = a definir. */
  whatsapp: string;
  /** Tarjeta de muestra del diseño (no es un taxi real): no tiene página y no se informa a buscadores ni IAs. */
  ejemplo?: boolean;
}

export interface Taxi {
  id: string;
  servicio: Servicio;
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

const LECHUZAS: Servicio = {
  slug: 'taxi-lechuzas',
  nombre: 'Taxi Lechuzas',
  nombrePagina: '',
  empresa: 'Lechuzas Viajes Uruguay',
  portadaY: 48,
  nota: 'Todos los destinos · 24/7\nInmediatos · Reservas',
  descripcion: '',
  whatsapp: '',
};

const MUESTRA = (slug: string): Servicio => ({
  slug,
  nombre: '[Nombre del servicio]',
  nombrePagina: '',
  empresa: '',
  nota: '[Destinos · Horario]',
  descripcion: '',
  whatsapp: '',
  ejemplo: true,
});

/** Un vehículo por fila del tablero. Las tarjetas de ejemplo muestran textos entre corchetes. PENDIENTE: WhatsApp y fotos reales. */
export const TAXIS: readonly Taxi[] = [
  {
    id: 'lechuzas-jtx-0212',
    servicio: LECHUZAS,
    placa: 'JTX 0212',
    vehiculo: ['Nissan Versa', 'Drive'],
    plazas: '4',
    valijas: '3 grandes',
    aBordo: ['USB-C', 'Mascotas'],
  },
  {
    id: 'confort',
    servicio: MUESTRA('confort'),
    placa: 'JTX ____',
    vehiculo: ['[Marca y modelo]'],
    plazas: '',
    valijas: '[Cantidad]',
    aBordo: ['[Extras]'],
  },
  {
    id: 'van-xl',
    servicio: MUESTRA('van-xl'),
    placa: 'JTX ____',
    vehiculo: ['[Marca y modelo]'],
    plazas: '',
    valijas: '[Cantidad]',
    aBordo: ['[Extras]'],
  },
];

/** Vehículos reales (sin las tarjetas de muestra). */
export const TAXIS_REALES = TAXIS.filter((t) => !t.servicio.ejemplo);

/** Servicios reales, una vez cada uno aunque tengan varios vehículos, en el orden del tablero. */
export const SERVICIOS_TAXI: readonly Servicio[] = [...new Set(TAXIS_REALES.map((t) => t.servicio))];

export const vehiculosDe = (s: Servicio) => TAXIS.filter((t) => t.servicio === s);
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
  `Hola ${t.servicio.nombre}, te escribo desde ${SITE.domain}. Necesito un taxi ahora.\n📍 Estoy en: \n🏁 Voy a: `;
export const mensajeReserva = (t: Taxi) =>
  `Hola ${t.servicio.nombre}, te escribo desde ${SITE.domain}. Quiero *reservar* un viaje.\n📅 Día y hora: \n📍 Desde: \n🏁 Hasta: \n👥 Pasajeros: \n🧳 Valijas: `;
export const whatsappUrl = (numero: string, texto: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
