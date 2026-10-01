# Cómo actualizar las tarifas

1. **Cuándo:** cada vez que salga una resolución nueva (MEF o Intendencia de Río Negro) que cambie algún valor.
2. **Qué archivo:** solo `calculadora/src/config.js` (dentro del proyecto de la landing). No hace falta tocar ningún otro: la landing (ticket, preguntas frecuentes, datos para Google) toma los valores de ahí.
3. **Cómo:** en GitHub, abrí `calculadora/src/config.js`, tocá el lápiz (✏️ *Edit this file*), cambiá los números y guardá con *Commit changes*.
4. **Qué campos:** `bajada`, `ficha`, `metros_por_ficha_urbano`, `km_extraurbano`, `hora_espera`, `recargo_pct`, `valija_adicional`, `valijas_incluidas` (cuántas valijas no se cobran; hoy 1), `distancia_incluida_m`. Actualizá también `vigencia` (fecha desde la que rigen, formato `AAAA-MM-DD`) y `fuente` (número de resolución).
5. **Formato:** decimales con **punto**, no con coma: `100.56` ✅ — `100,56` ❌. Sin signo `$`.
6. **Validación:** si un valor queda mal (vacío, cero, negativo, con coma, recargo fuera de 0–100), la página **no muestra montos** y muestra un recuadro rojo que dice qué campo corregir.
7. **Publicación:** al guardar el cambio en GitHub, la landing se vuelve a compilar y publicar sola (en Cloudflare Pages: *Build command* `npm run build`, *Build output directory* `dist`). Si un valor queda mal, la compilación falla y queda publicada la versión anterior.
8. **Comprobar:** abrí la página, calculá un viaje conocido y mirá debajo del taxímetro: "Tarifas vigentes desde …" tiene que mostrar la fecha nueva.
9. Los valores derivados (metros por ficha extraurbano, velocidad de transición, segundos por ficha) **no se cargan**: se calculan solos.
10. Si alguien técnico está disponible, que corra `npm test` antes de publicar (las pruebas usan los valores actuales, así que con valores nuevos algunos importes esperados de `tests/motor.test.mjs` van a cambiar: es normal, hay que actualizarlos).
