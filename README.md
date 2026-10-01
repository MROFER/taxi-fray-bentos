# Taxi Fray Bentos · Landing

Landing en **Astro** (salida 100 % estática), HTML semántico, CSS por componente y TypeScript solo donde hay interacción.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # astro check + validación de tarifas + build a dist/
npm run preview   # sirve dist/
npm test          # pruebas de la calculadora (motor, cerco urbano, direcciones)
npm run extraer-osm   # regenera calles/esquinas/números desde OpenStreetMap
npm run editar-cerco  # editor visual del cerco urbano: http://localhost:8080/herramientas/editar-cerco.html
```

## Calculadora

El taxímetro del hero es la **calculadora real** (carpeta `calculadora/`, copiada tal cual de "Calculadora Taximetro"):
motor del taxímetro (Decreto 456/001, Res. MEF 111/026), rutas por OSRM con ruta de emergencia, cerco urbano
y búsqueda de calles, esquinas y números de OpenStreetMap. La landing solo aporta el diseño:
`src/components/ui/Taximetro.astro` (HTML y estilos) y `src/scripts/taximetro/` (conecta la interfaz con `calculadora/src`).

- **Tarifas:** se cambian solo en `calculadora/src/config.js` (ver `calculadora/LEEME-ACTUALIZAR-TARIFAS.md`).
  El ticket, los pasos, las preguntas frecuentes, el JSON-LD y `/llms.txt` toman los valores de ahí.
- **Carga diferida:** el motor y las calles (~60 KB gzip) se descargan cuando la persona empieza a usar el
  taxímetro, y Leaflet (~45 KB gzip) recién al abrir el mapa. La carga inicial de la página no cambia.
- **Paradas:** cada parada se ubica en el build con las mismas calles de OSM (`consulta` en `src/data/paradas.ts`);
  si una no se encuentra, el build falla.
- `calculadora/index.html` y `estilos.css` son la página original; quedan para el editor del cerco y como referencia.

## Estructura

```
src/
├── config/site.ts          # Nombre, dominio, teléfono, endpoint del formulario, geo  ← EDITAR
├── data/                   # Fuente única de contenido (la usan página, JSON-LD y llms.txt)
│   ├── tarifa.ts           #   Lee la tarifa de calculadora/src/config.js + formato de pesos
│   ├── taxis.ts            #   Tablero de taxis (placas, WhatsApp, plazas)            ← EDITAR
│   ├── paradas.ts          #   Paradas de taxi (y cómo ubicarlas en el mapa)
│   ├── faq.ts              #   Preguntas frecuentes (se arman con los datos de arriba)
│   └── cobertura.ts        #   Servicios y zonas
├── lib/
│   └── schema.ts           # JSON-LD (TaxiService, TaxiStand, FAQPage, Organization…)
├── scripts/
│   ├── ui.ts               # Utilidades compartidas (toast, $, animaciones)
│   └── taximetro/          # Interfaz del taxímetro: carga diferida, mapa Leaflet, textos del resultado
├── styles/                 # tokens.css (paleta/tipos) + global.css (base, botones, utilidades)
├── layouts/BaseLayout.astro
├── components/
│   ├── seo/                # Head (meta, OG, geo, JSON-LD) y Fonts (fuentes autoalojadas)
│   ├── layout/             # Header, Footer, Logo
│   ├── sections/           # Hero, Tarifas, Flota, Paradas, Preguntas, Choferes, InstalarApp
│   └── ui/                 # Taximetro (+ diálogo del mapa), Ticket, Placa, Toast
└── pages/
    ├── index.astro
    ├── 404.astro
    ├── robots.txt.ts       # Permite buscadores y bots de IA + sitemap
    └── llms.txt.ts         # Resumen en Markdown para asistentes de IA
public/                     # favicon, íconos PWA, og.png, manifest, _headers
calculadora/                # La calculadora real: src/ (motor, ruta, modalidad, direcciones, config),
                            # data/ (calles OSM), tests/, scripts/, herramientas/editar-cerco.html
```

## Pendiente antes de publicar

- `src/data/taxis.ts`: placas JTX, **WhatsApp de cada taxi**, plazas de la Van XL. Con el número cargado, los botones pasan a ser links `wa.me` (sin JS); mientras falte, muestran un aviso.
- `src/config/site.ts`: teléfono (`phone`, `phoneDisplay`) y correo. Con teléfono, el botón del menú pasa a "llamar" y se agrega al JSON-LD.
- `src/config/site.ts` → `altaEndpoint`: a dónde se envía el formulario de choferes (Formspree, Netlify Forms, API propia). Vacío = modo demostración.
- Páginas legales (aviso legal, privacidad, cookies, condiciones): hoy los links del footer apuntan al inicio.
- Fotos reales de los autos.
- `public/og.png` tiene el precio de la bajada escrito: regenerarla si cambia la tarifa.
- Dar de alta el sitio en Google Search Console y crear/actualizar el **Perfil de Empresa de Google** (pesa mucho en búsquedas locales y en las respuestas de Gemini).

## Decisiones de rendimiento

- Todo el contenido se renderiza en el build: el tablero de taxis y las paradas ya vienen en el HTML (antes se armaban con JS y no los veían los buscadores).
- CSS inline en el `<head>` (una página, ~18 KB gzip en total con el HTML). Sin frameworks de UI.
- JS inicial: ~3 KB. La calculadora y el mapa se cargan recién al usarlos. Sin JS la página se lee completa y los links de WhatsApp funcionan.
- Fuentes autoalojadas, solo subset latin, `font-display: swap` y precarga de las dos del primer pantallazo. Sin Google Fonts.
- Lighthouse (móvil, local): Rendimiento 99 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100 · CLS 0 · TBT 0 ms.

## SEO, GEO y AEO

- `title`, `description`, canonical, Open Graph/Twitter, `lang="es-UY"`, meta geo (UY-RN) y sitemap.
- H1 con la búsqueda principal visible ("Taxi en Fray Bentos").
- JSON-LD generado desde los datos: `TaxiService` (tarifa, horario 24 h, zonas), `TaxiStand` por parada, `FAQPage`, `Organization`, `WebSite`.
- Sección de preguntas frecuentes con respuestas cortas y el dato primero, el formato que citan Google, Gemini, ChatGPT y Claude.
- `/llms.txt` y `robots.txt` que habilita explícitamente a los rastreadores de IA.

## Móvil

- Tablero de taxis en tarjetas (sin scroll horizontal), paradas en línea vertical, botones a todo el ancho.
- Áreas táctiles de 44–48 px, `inputmode`/`autocomplete` en el formulario, safe areas de iPhone.
- Mapa en `<dialog>` nativo (foco atrapado y Esc). Manifest + íconos para "Agregar a inicio"; en Android usa el aviso de instalación nativo si está disponible.

## Deploy

Cada push a `main` se publica solo en GitHub Pages (`.github/workflows/deploy.yml`): https://mrofer.github.io/taxi-fray-bentos/

Con dominio propio, cambiar en el workflow `SITE_URL` por el dominio y `BASE_PATH` por `/`. También sale como sitio estático en `dist/` para Netlify, Cloudflare Pages, Vercel o cualquier hosting (`public/_headers` trae el cacheo para Netlify/Cloudflare).
