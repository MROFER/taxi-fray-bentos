export interface Taxi {
  id: string;
  servicio: string;
  /** Se muestra bajo el nombre; \n parte el renglón. */
  nota: string;
  /** Placa municipal. PENDIENTE: "JTX ____" se muestra como a definir. */
  placa: string;
  /** Una línea por renglón. */
  vehiculo: readonly string[];
  /** Cantidad de plazas; vacío = a definir. */
  plazas: string;
  valijas: string;
  aBordo: readonly string[];
  /** Número con código de país, sin + ni espacios (ej. "59899123456"). Vacío = a definir. */
  whatsapp: string;
  /** Tarjeta de muestra del diseño (no es un taxi real): se ve en la página pero no se informa a buscadores ni IAs. */
  ejemplo?: boolean;
}

/** Un taxi por fila del tablero. Las tarjetas de ejemplo muestran textos entre corchetes. PENDIENTE: WhatsApp y fotos reales. */
export const TAXIS: readonly Taxi[] = [
  {
    id: 'lechuzas',
    servicio: 'Taxi Lechuzas',
    nota: 'Todos los destinos · 24/7\nInmediatos · Reservas',
    placa: 'JTX 0212',
    vehiculo: ['Nissan Versa', 'Drive'],
    plazas: '4',
    valijas: '3 grandes',
    aBordo: ['USB-C', 'Mascotas'],
    whatsapp: '',
  },
  {
    id: 'confort',
    ejemplo: true,
    servicio: '[Nombre del servicio]',
    nota: '[Destinos · Horario]',
    placa: 'JTX ____',
    vehiculo: ['[Marca y modelo]'],
    plazas: '',
    valijas: '[Cantidad]',
    aBordo: ['[Extras]'],
    whatsapp: '',
  },
  {
    id: 'van-xl',
    ejemplo: true,
    servicio: '[Nombre del servicio]',
    nota: '[Destinos · Horario]',
    placa: 'JTX ____',
    vehiculo: ['[Marca y modelo]'],
    plazas: '',
    valijas: '[Cantidad]',
    aBordo: ['[Extras]'],
    whatsapp: '',
  },
];

/** Taxis reales (sin las tarjetas de muestra). */
export const TAXIS_REALES = TAXIS.filter((t) => !t.ejemplo);

export const mensajeAhora = (t: Taxi) => `Hola ${t.servicio}, necesito un taxi ahora. Estoy en: `;
export const mensajeReserva = (t: Taxi) =>
  `Hola ${t.servicio}, quiero reservar un taxi para más tarde.\nFecha y hora: \nDesde: \nHasta: `;

export const whatsappUrl = (numero: string, texto: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

