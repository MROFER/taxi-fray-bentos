export interface Taxi {
  id: string;
  servicio: string;
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
}

/** Un taxi por fila del tablero. PENDIENTE: placas JTX, WhatsApp, plazas de la Van XL y fotos reales. */
export const TAXIS: readonly Taxi[] = [
  {
    id: 'standard',
    servicio: 'Standard',
    nota: 'Ciudad, todos los días',
    placa: 'JTX ____',
    vehiculo: ['Toyota Prius o', 'Corolla Hybrid'],
    plazas: '4',
    valijas: '2 medianas',
    aBordo: ['Wi-Fi'],
    whatsapp: '',
  },
  {
    id: 'confort',
    servicio: 'Confort',
    nota: 'Ejecutivo y aeropuerto',
    placa: 'JTX ____',
    vehiculo: ['Mercedes-Benz Clase E', 'o Tesla Model 3'],
    plazas: '4',
    valijas: '3 grandes',
    aBordo: ['Mascotas', 'USB-C', 'Agua'],
    whatsapp: '',
  },
  {
    id: 'van-xl',
    servicio: 'Van XL',
    nota: 'Familias y grupos',
    placa: 'JTX ____',
    vehiculo: ['Mercedes-Benz Vito o', 'Toyota Proace Verso'],
    plazas: '',
    valijas: '3 grandes',
    aBordo: ['Sillas infantiles'],
    whatsapp: '',
  },
];

export const mensajeAhora = (t: Taxi) => `Hola, necesito un taxi ${t.servicio} ahora. Estoy en: `;
export const mensajeReserva = (t: Taxi) =>
  `Hola, quiero reservar el taxi ${t.servicio} para más tarde.\nFecha y hora: \nDesde: \nHasta: `;

export const whatsappUrl = (numero: string, texto: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

