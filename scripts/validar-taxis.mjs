// Corta el build si una tarjeta de taxi (o su página) cargada desde el panel (/admin) tiene un dato mal cargado,
// así no se publica un sitio roto. Los archivos están en src/content/tarjetas.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NOMBRE_RED = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', web: 'un sitio web' };

const leer = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return { id: f.replace(/\.json$/, ''), datos: JSON.parse(readFileSync(join(dir, f), 'utf8')) };
          } catch (e) {
            return { id: f.replace(/\.json$/, ''), error: `no se puede leer (${e.message})` };
          }
        })
    : [];

const errores = [];
const slugValido = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const whatsappValido = (n) => !n || /^\d{8,15}$/.test(n);

const tarjetas = leer('src/content/tarjetas');
const direcciones = new Map();

for (const { id, datos: t, error } of tarjetas) {
  const donde = `Tarjeta "${t?.nombre || id}"`;
  if (error) { errores.push(`${donde}: ${error}`); continue; }
  if (!t.nombre?.trim()) errores.push(`${donde}: falta el nombre.`);
  if (!whatsappValido(t.whatsapp)) errores.push(`${donde}: el WhatsApp va con código de país y solo números (ej. 59899123456).`);
  const p = t.pagina;
  if (t.ejemplo || !p?.activa) continue;
  if (!p.direccion) errores.push(`${donde}: tiene la página activada pero le falta la dirección (ej. taxi-lechuzas).`);
  else if (!slugValido.test(p.direccion)) errores.push(`${donde}: la dirección de la página solo puede tener minúsculas, números y guiones (ej. taxi-lechuzas).`);
  else if (direcciones.has(p.direccion) && direcciones.get(p.direccion) !== t.nombre)
    errores.push(`${donde}: la dirección "${p.direccion}" ya la usa "${direcciones.get(p.direccion)}".`);
  else direcciones.set(p.direccion, t.nombre);
  if (p.resenaGoogle && !/^https:\/\/\S+$/.test(p.resenaGoogle)) errores.push(`${donde}: el enlace de reseñas tiene que empezar con https://`);
  if (p.portada && !/\.(jpe?g|png|webp)$/i.test(p.portada)) errores.push(`${donde}: la foto de portada tiene que ser JPG, PNG o WebP (las HEIC del iPhone no sirven: compartila como JPG).`);
  else if (p.portada && !existsSync(join('.', p.portada))) errores.push(`${donde}: no se encuentra la foto de portada ${p.portada}.`);
  else if (p.portada && statSync(join('.', p.portada)).size > 15 * 1024 * 1024) errores.push(`${donde}: la foto de portada pesa más de 15 MB; subí una más liviana.`);
  for (const r of p.redes ?? []) {
    const dominio = { instagram: /(^|\.)instagram\.com$/, facebook: /(^|\.)(facebook\.com|fb\.com)$/, tiktok: /(^|\.)tiktok\.com$/, youtube: /(^|\.)(youtube\.com|youtu\.be)$/, web: /./ }[r.red];
    let host = '';
    try { host = new URL(r.enlace).hostname; } catch {}
    if (!dominio) errores.push(`${donde}: la red "${r.red}" no está en la lista.`);
    else if (!/^https:\/\/\S+$/.test(r.enlace ?? '') || !host) errores.push(`${donde}: el enlace de ${NOMBRE_RED[r.red] ?? r.red} tiene que ser una dirección completa que empiece con https://`);
    else if (!dominio.test(host)) errores.push(`${donde}: el enlace "${r.enlace}" no es de ${NOMBRE_RED[r.red]}.`);
  }
  if (p.portadaY != null && !(p.portadaY >= 0 && p.portadaY <= 100)) errores.push(`${donde}: el encuadre de la portada va de 0 a 100.`);
}

if (errores.length) {
  console.error('Hay datos de taxis para corregir en el panel:\n- ' + errores.join('\n- '));
  process.exit(1);
}
console.log(`Taxis OK: ${tarjetas.length} tarjetas, ${direcciones.size} páginas.`);
