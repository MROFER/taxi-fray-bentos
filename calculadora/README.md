# Calculadora de tarifa de taxi — Fray Bentos / Río Negro

Página estática (sin backend) que estima **cuánto apartar** para un viaje en taxi.
No reemplaza al taxímetro: el monto real es el que marca el aparato.

- Para cambiar tarifas: [LEEME-ACTUALIZAR-TARIFAS.md](LEEME-ACTUALIZAR-TARIFAS.md).
- Probar en la computadora: `npm run servir` y abrir http://localhost:8080
- Pruebas automáticas: `npm test`
- Regenerar calles y números desde OpenStreetMap: `npm run extraer-osm`

No hay paso de compilación ni dependencias: el sitio es la carpeta tal cual.
En Cloudflare Pages: *Build command* vacío, *Build output directory* `/`.

## Estructura

```
index.html, estilos.css      la página
src/config.js                valores tarifarios + validación (lo único que se toca al cambiar tarifas)
src/motor.js                 cálculo del taxímetro (Decreto 456/001, Res. MEF 111/026)
src/ruta.js                  obtenerRuta(origen, destino): OSRM + ruta de emergencia
src/modalidad.js             urbano / extraurbano: ¿la ruta sale del cerco urbano?
src/cerco-urbano.js          polígono del área urbana (editable con herramientas/editar-cerco.html)
src/direcciones.js           búsqueda de calles, esquinas y números sobre los datos embebidos
src/app.js                   interfaz
data/*.js                    calles, esquinas y números (generados, © colaboradores de OpenStreetMap)
scripts/extraer-osm.mjs      genera data/ desde Overpass API
scripts/servir.mjs           servidor local de prueba
herramientas/editar-cerco.html  editor visual del cerco urbano (npm run servir → /herramientas/editar-cerco.html)
tests/                       pruebas (motor, modalidad con rutas reales de OSRM, direcciones)
```

Diferencias con la estructura sugerida en el traspaso:
- No hay carpeta `public/`: la raíz del repositorio es el sitio, así no hace falta un paso de compilación.
- Los datos van como módulos `data/*.js` (no `.json`) para que el navegador los importe directamente,
  embebidos, sin `fetch` ni caché.

## Medición de datos OSM (extracción del 30/09/2026)

| | |
|---|---|
| Calles (nombres distintos) | 188 (373 tramos) |
| Esquinas | 587 |
| Números de puerta | 4.825, en 120 de las 188 calles |

La cobertura de números es buena en el casco urbano, así que la cascada va a encontrar el número exacto
en muchos casos. No parece necesario interpolar números por ahora.
55 números se descartaron porque su calle no coincide con ninguna vía con nombre
(50 de ellos dicen "Ruta 2").

## Cerco urbano

Reemplaza a la detección por nombres de vías del traspaso original (decisión del dueño, 30/09/2026).
Si algún punto de la ruta queda fuera del cerco (con un margen de 40 m para lo que está justo sobre el borde),
el viaje es extraurbano. Límites:

- **Oeste:** camino costero pasando el Barrio Anglo (Sociedad Nativista, Mirador La Barranca). UTEC y el Anglo quedan adentro.
- **Camino a Las Cañas (Batlle y Ordóñez):** Barrio El Molino (Hotel Medialuna y viviendas lindantes). Pasando El Molino, OSM lo llama "Continuación Batlle".
- **Sur:** Camino La Feria desde el cruce con Bohanes hasta el cruce con Vladimir Roslik, pasando por el cruce con la Av. Artigas (ahí empieza Ramal 10 de Ruta 2).
- **Vladimir Roslik:** urbana hasta el cruce con Camino La Feria. UPM, Las Cañas y el Puente San Martín son extraurbanos.

Sociedad Nativista, Mirador La Barranca y Hotel Medialuna **no están en OpenStreetMap**: esos tramos del borde
son aproximados.

### Cómo modificar el cerco

1. En esta carpeta, correr `npm run servir`.
2. Abrir http://localhost:8080/herramientas/editar-cerco.html
3. Arrastrar los puntos amarillos; arrastrar un punto blanco para agregar uno; tocar un punto para ponerle una
   nota o borrarlo. La lista "Lugares de control" avisa si algún lugar queda del lado equivocado.
4. Tocar **Aplicar y guardar**: se reescribe `src/cerco-urbano.js` y se guarda una copia del anterior en
   `herramientas/respaldos/` (esa carpeta no se sube a GitHub).
5. Subir el cambio a GitHub para que se publique.

Sin el servidor local (por ejemplo, abriendo el editor desde la página publicada) no se puede guardar:
usar "Copiar a mano" y pegar el resultado en `src/cerco-urbano.js` desde GitHub.
Si un lugar de control deja de ser válido (por ejemplo, se decide que UPM es urbano), se cambia en
`LUGARES_DE_CONTROL` del mismo archivo.

## Decisiones tomadas al construir (revisables)

- **Ruta de emergencia:** sin ruta real, se decide la modalidad con la línea recta entre origen y destino.
- **Redondeo:** mínimo hacia abajo y máximo hacia arriba al peso (era una propuesta; está en `redondearRango`).
- **Viaje mixto:** si la ruta sale del cerco, se cobra **todo** el viaje con tarifa extraurbana (ver punto abierto 13).

## Puntos abiertos

1. **Primera ficha** a los 250 m (`"C"`, por defecto) o a los 350 m (`"C+d"`). Parámetro `primera_ficha_en`.
2. **Alcance del recargo:** se aplica a bajada, km y hora. Confirmar con la Intendencia.
3. **Cortesía de 250 m en extraurbano:** se asume igual que en urbano.
4. **Modos acumulativos:** se asume modo excluyente (456/001 §5.3).
5. **Puente San Martín:** si la ruta lo cruza, se muestra un aviso de que el servicio no está definido.
6. ~~Ramal 15 / UPM~~: resuelto con el cerco (urbana hasta Camino La Feria).
7. ~~Cobertura de números de puerta~~: medida (ver arriba).
8. **Vigencia:** verificar periódicamente si hay una resolución posterior.
9. **Selector manual de modalidad:** no implementado.
10. **OSRM público:** sin garantía; hay ruta de emergencia.
11. ~~Camino Las Cañas / Ruta Panorámica sin nombre en OSM~~: ya no importa, el cerco decide por ubicación.
12. **Borde del cerco:** ubicar con precisión la Sociedad Nativista, el Mirador La Barranca y el Hotel Medialuna, y
    confirmar el borde este (de Roslik y Camino La Feria hacia el río).
13. **Viaje mixto:** ¿el taxista cambia de tarifa al cruzar el límite (tramo urbano a T1/T2 y el resto a T3/T4)
    o cobra todo el viaje como extraurbano? Hoy se cobra todo como extraurbano.
