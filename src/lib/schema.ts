/**
 * Datos estructurados (schema.org, JSON-LD) para buscadores y asistentes de IA.
 * Se arman desde los mismos datos que muestra la página, así nunca se contradicen.
 */
import { SITE } from '@/config/site';
import { TARIFA } from '@/data/tarifa';
import { FAQ } from '@/data/faq';
import { PARADAS } from '@/data/paradas';
import { LOCALIDADES, SERVICIOS } from '@/data/cobertura';
import { SERVICIOS_TAXI, paginaDe, nombrePaginaDe } from '@/data/taxis';

const id = (frag: string) => `${SITE.url}/#${frag}`;

const direccionFrayBentos = {
  '@type': 'PostalAddress',
  addressLocality: 'Fray Bentos',
  addressRegion: 'Río Negro',
  addressCountry: 'UY',
} as const;

const precio = (nombre: string, valor: number, unidad?: string) => ({
  '@type': 'UnitPriceSpecification',
  name: nombre,
  price: valor.toFixed(2),
  priceCurrency: 'UYU',
  ...(unidad ? { unitText: unidad } : {}),
});

export function buildSchema() {
  const contacto = {
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
    ...(SITE.email ? { email: SITE.email } : {}),
  };

  const organizacion = {
    '@type': 'Organization',
    '@id': id('organizacion'),
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon-512.png`,
    areaServed: { '@id': id('fray-bentos') },
    ...(SITE.instagram ? { sameAs: [SITE.instagram] } : {}),
    ...contacto,
  };

  const ciudad = {
    '@type': 'City',
    '@id': id('fray-bentos'),
    name: 'Fray Bentos',
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Río Negro, Uruguay' },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lon },
  };

  const servicio = {
    '@type': 'TaxiService',
    '@id': id('servicio'),
    name: 'Taxi en Fray Bentos',
    description: SITE.description,
    provider: { '@id': id('organizacion') },
    areaServed: LOCALIDADES.map((name) => ({ '@type': 'Place', name, address: { ...direccionFrayBentos, addressLocality: name } })),
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios',
      itemListElement: SERVICIOS.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
    },
    offers: {
      '@type': 'Offer',
      name: 'Tarifa oficial de taxi, Río Negro',
      description: TARIFA.fuente,
      priceSpecification: [
        precio('Bajada de bandera (incluye 250 m)', TARIFA.bandera),
        precio('Ficha cada 100 m', TARIFA.ficha, '100 m'),
        precio('Hora de espera', TARIFA.horaEspera, 'hora'),
        precio('Kilómetro extra urbano', TARIFA.kmExtra, 'km'),
        precio('Valija extra', TARIFA.valija, 'valija'),
      ],
    },
    ...contacto,
  };

  const paradas = PARADAS.filter((p) => !p.extremo).map((p) => ({
    '@type': 'TaxiStand',
    name: `Parada de taxis ${p.lugar}`,
    address: { ...direccionFrayBentos, streetAddress: p.direccion },
    containedInPlace: { '@id': id('fray-bentos') },
  }));

  const preguntas = {
    '@type': 'FAQPage',
    '@id': id('preguntas'),
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  };

  // Cada taxi tiene su página: la lista le muestra a Google cuáles son y dónde están.
  const taxis = {
    '@type': 'ItemList',
    '@id': id('taxis'),
    name: 'Taxis en Fray Bentos',
    itemListElement: SERVICIOS_TAXI.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: nombrePaginaDe(t),
      url: new URL(paginaDe(t), `${SITE.url}/`).href,
    })),
  };

  const sitio = {
    '@type': 'WebSite',
    '@id': id('sitio'),
    url: SITE.url,
    name: SITE.name,
    inLanguage: SITE.lang,
    publisher: { '@id': id('organizacion') },
  };

  const pagina = {
    '@type': 'WebPage',
    '@id': `${SITE.url}/`,
    url: `${SITE.url}/`,
    name: SITE.title,
    description: SITE.description,
    inLanguage: SITE.lang,
    isPartOf: { '@id': id('sitio') },
    about: { '@id': id('servicio') },
    mainEntity: { '@id': id('servicio') },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [sitio, pagina, organizacion, ciudad, servicio, taxis, ...paradas, preguntas],
  };
}
