// Corta el build si calculadora/src/config.js tiene un valor mal cargado (así no se publica una tarifa rota).
import { CONFIG, validarConfig } from '../calculadora/src/config.js';

const errores = validarConfig(CONFIG);
if (errores.length) {
  console.error('Error en calculadora/src/config.js:\n- ' + errores.join('\n- '));
  process.exit(1);
}
console.log(`Tarifas OK (vigentes desde ${CONFIG.vigencia}).`);
