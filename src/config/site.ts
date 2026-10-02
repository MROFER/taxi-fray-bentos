/**
 * Datos generales del sitio. Todo lo que dice PENDIENTE hay que completarlo
 * antes de publicar: mientras esté vacío, la página lo muestra como
 * "a definir" y no lo publica en los datos estructurados (JSON-LD).
 */
export const SITE = {
  name: 'Taxi Fray Bentos',
  /** Dirección pública sin barra final (sale de `site` + `base` en astro.config.mjs). */
  url: new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href.replace(/\/$/, ''),
  /** Dominio propio del sitio (se muestra en textos; no depende de dónde esté publicado). */
  domain: 'www.taxifraybentos.com.uy',
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
  /** Correo de contacto. */
  email: 'contacto@taxifraybentos.com.uy',

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
  { href: '#taxis', label: 'Taxis' },
  { href: '#paradas', label: 'Paradas' },
  { href: '#tarifas', label: 'Tarifas' },
  { href: '#choferes', label: 'Para choferes' },
  { href: '#preguntas', label: 'Preguntas' },
] as const;
