/**
 * Datos generales del sitio. Todo lo que dice PENDIENTE hay que completarlo
 * antes de publicar: mientras esté vacío, la página lo muestra como
 * "a definir" y no lo publica en los datos estructurados (JSON-LD).
 */
export const SITE = {
  name: 'Taxi Fray Bentos',
  url: 'https://taxifraybentos.com.uy',
  domain: 'taxifraybentos.com.uy',
  locale: 'es_UY',
  lang: 'es-UY',
  title: 'Taxi en Fray Bentos las 24 horas · Tarifas y WhatsApp',
  description:
    'Pedí un taxi habilitado en Fray Bentos por WhatsApp, las 24 horas. Calculá la tarifa oficial de Río Negro y reservá viajes a Las Cañas, la Terminal y el Puente San Martín.',
  themeColor: '#1B1A17',

  /** Teléfono general en formato internacional, sin espacios (ej. "+59899123456"). PENDIENTE. */
  phone: '',
  /** Cómo se muestra el teléfono (ej. "099 123 456"). PENDIENTE. */
  phoneDisplay: '',
  /** Correo de contacto. PENDIENTE (opcional). */
  email: '',

  /**
   * Endpoint que recibe el formulario de alta de choferes (Formspree, Netlify Forms, API propia…).
   * Vacío = modo demostración: el formulario valida pero no envía nada.
   */
  altaEndpoint: '',

  geo: {
    region: 'UY-RN',
    placename: 'Fray Bentos, Río Negro, Uruguay',
    // Centro aproximado de la ciudad (Plaza Constitución).
    lat: -33.117,
    lon: -58.311,
  },
} as const;

export const NAV = [
  { href: '#tarifas', label: 'Tarifas' },
  { href: '#taxis', label: 'Taxis' },
  { href: '#paradas', label: 'Paradas' },
  { href: '#preguntas', label: 'Preguntas' },
  { href: '#choferes', label: 'Choferes' },
] as const;
