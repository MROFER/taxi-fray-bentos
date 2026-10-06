import type { APIRoute } from 'astro';
import { SITE } from '@/config/site';

/**
 * Se permite explícitamente a los buscadores y a los rastreadores de asistentes de IA,
 * para que la página pueda aparecer citada en sus respuestas (GEO/AEO).
 */
const bots = [
  'Googlebot',
  'Google-Extended',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
];

export const GET: APIRoute = () =>
  new Response(
    [
      ...bots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /admin/\n`),
      'User-agent: *\nAllow: /\nDisallow: /admin/\n',
      `Sitemap: ${`${SITE.url}/sitemap-index.xml`}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
