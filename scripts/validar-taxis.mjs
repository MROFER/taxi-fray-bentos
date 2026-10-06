// Corta el build si una tarjeta de taxi (o su página) cargada desde el panel (/admin) tiene un dato mal cargado,
// así no se publica un sitio roto. Los archivos están en src/content/tarjetas.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
  if (p.portada && !existsSync(join('.', p.portada))) errores.push(`${donde}: no se encuentra la foto de portada ${p.portada}.`);
  if (p.portadaY != null && !(p.portadaY >= 0 && p.portadaY <= 100)) errores.push(`${donde}: el encuadre de la portada va de 0 a 100.`);
}

if (errores.length) {
  console.error('Hay datos de taxis para corregir en el panel:\n- ' + errores.join('\n- '));
  process.exit(1);
}
console.log(`Taxis OK: ${tarjetas.length} tarjetas, ${direcciones.size} páginas.`);
