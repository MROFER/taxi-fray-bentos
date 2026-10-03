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
    'Conectá con servicios de taxi habilitados en Fray Bentos. Pedí un taxi cuando lo necesites o reservá tu traslado en la ciudad, Las Cañas, Puente Internacional San Martín y otros destinos.',
  themeColor: '#1B1A17',

  /** Teléfono general en formato internacional, sin espacios (ej. "+59899123456"). PENDIENTE. */
  phone: '',
  /** Cómo se muestra el teléfono (ej. "099 123 456"). PENDIENTE. */
  phoneDisplay: '',
  /** Correo de contacto. */
  email: 'contacto@taxifraybentos.com.uy',

  /**
   * Endpoint que recibe el formulario de alta de choferes. En Hostinger es api/alta.php (PHP + MySQL),
   * se activa con la variable PUBLIC_ALTA_ENDPOINT en el build (ver .github/workflows/deploy.yml).
   * Vacío = modo demostración: el formulario valida pero no envía nada (así queda en GitHub Pages, que no corre PHP).
   */
  altaEndpoint: (import.meta.env.PUBLIC_ALTA_ENDPOINT as string | undefined) ?? '',

  geo: {
    region: 'UY-RN',
    placename: 'Fray Bentos, Río Negro, Uruguay',
    // Centro aproximado de la ciudad (Plaza Constitución).
    lat: -33.117,
    lon: -58.311,
  },
} as const;

/** Inicio del sitio (con la base de publicación) y enlaces a sus secciones, que funcionan desde cualquier página. */
export const INICIO = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const enInicio = (seccion: string) => `${INICIO}#${seccion}`;

export const NAV = [
  { href: enInicio('taxis'), label: 'Taxis' },
  { href: enInicio('paradas'), label: 'Paradas' },
  { href: enInicio('tarifas'), label: 'Tarifas' },
  { href: enInicio('choferes'), label: 'Para choferes' },
  { href: enInicio('preguntas'), label: 'Preguntas' },
] as const;

/** Páginas legales (enlazadas desde el footer). */
export const LEGALES = [
  { href: `${INICIO}aviso-legal/`, label: 'Aviso legal' },
  { href: `${INICIO}privacidad/`, label: 'Privacidad' },
  { href: `${INICIO}cookies/`, label: 'Cookies' },
  { href: `${INICIO}condiciones/`, label: 'Condiciones' },
] as const;
