import type { APIRoute } from 'astro';
import { SITE, NAV } from '@/config/site';
import { TARIFA, pesos } from '@/data/tarifa';
import { TAXIS } from '@/data/taxis';
import { PARADAS } from '@/data/paradas';
import { FAQ } from '@/data/faq';
import { COBERTURA, SERVICIOS } from '@/data/cobertura';

/**
 * /llms.txt: resumen en Markdown para asistentes de IA (propuesta llmstxt.org).
 * Se genera desde los mismos datos que la página, así nunca queda desactualizado.
 */
export const GET: APIRoute = () => {
  const url = (hash: string) => `${SITE.url}/${hash}`;
  const n = TARIFA.horarioNocturno;
  const md = `# ${SITE.name}

> ${SITE.description}

Directorio de taxis habilitados por la Intendencia de Río Negro en Fray Bentos, Uruguay. Servicio las 24 horas. Cada taxi se pide directo por WhatsApp, para ahora o con reserva.${SITE.phone ? `\nTeléfono: ${SITE.phoneDisplay || SITE.phone}` : ''}

## Tarifa oficial vigente (pesos uruguayos)

- Bajada de bandera: ${pesos(TARIFA.bandera)} (incluye los primeros ${TARIFA.metrosBandera} m)
- Ficha cada 100 m en ciudad: ${pesos(TARIFA.ficha)}
- Hora de espera: ${pesos(TARIFA.horaEspera)}
- Kilómetro fuera de la planta urbana: ${pesos(TARIFA.kmExtra)}
- Recargo de ${n.desde}:00 a ${n.hasta}:00, domingos y feriados: hasta ${Math.round(TARIFA.nocturno * 100)} %
- Valija extra: hasta ${pesos(TARIFA.valija)} (la primera va sin cargo)
- Fuente: ${TARIFA.fuente}
- El valor a pagar es el que marca el taxímetro a bordo.

## Servicios

${TAXIS.map((t) => `- ${t.servicio}: ${t.nota.toLowerCase()}. Vehículo: ${t.vehiculo.join(' ')}. Valijas: ${t.valijas}.`).join('\n')}
${SERVICIOS.map((s) => `- ${s}`).join('\n')}

## Cobertura

${COBERTURA.map((c) => `- ${c}`).join('\n')}

## Paradas de taxi en Fray Bentos

${PARADAS.filter((p) => !p.extremo).map((p) => `- ${p.lugar}: ${p.direccion}`).join('\n')}

## Preguntas frecuentes

${FAQ.map((f) => `### ${f.pregunta}\n\n${f.respuesta}`).join('\n\n')}

## Secciones

${NAV.map((s) => `- [${s.label}](${url(s.href)})`).join('\n')}
`;
  return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
