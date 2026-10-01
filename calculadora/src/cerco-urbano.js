// Cerco urbano: dentro se cobra tarifa urbana (T1/T2); si la ruta sale del cerco, extraurbana (T3/T4).
// Límites definidos por el dueño del proyecto (ver README, sección "Cerco urbano").
// Para ajustarlo a ojo: `npm run servir`, abrir http://localhost:8080/herramientas/editar-cerco.html,
// mover los puntos y tocar "Aplicar y guardar" (reescribe la lista de abajo y guarda una copia de la anterior
// en herramientas/respaldos/). Los comentarios de cada punto son las notas que se ven en el editor.
//
// Cada punto es [latitud, longitud]. El polígono se cierra solo (el último punto se une con el primero).
// Los puntos sobre el río Uruguay solo sirven para cerrar el polígono.

export const CERCO_URBANO = [
  [-33.11168, -58.34015], // río, al norte del Barrio Anglo
  [-33.12174, -58.34117], // Mirador La Barranca (prueba)
  [-33.12900, -58.33700], // sur del Barrio Anglo (UTEC queda adentro)
  [-33.13500, -58.33200], // noroeste de Barrio El Molino
  [-33.14500, -58.33200], // Camino José Batlle y Ordóñez pasando El Molino (Hotel Medialuna: A CONFIRMAR)
  [-33.15142, -58.29343], // cruce Camino La Feria y Bohanes
  [-33.14927, -58.28960],
  [-33.14646, -58.28655], // Camino La Feria
  [-33.14499, -58.28445], // cruce Camino La Feria y Av. José Gervasio Artigas (empieza Ramal 10 de Ruta 2)
  [-33.14434, -58.28342], // Camino La Feria
  [-33.14107, -58.27904],
  [-33.13762, -58.27492], // Camino La Feria
  [-33.13302, -58.27565], // cruce Camino La Feria y Vladimir Roslik (fin del tramo urbano de Roslik)
  [-33.12871, -58.27565],
  [-33.12458, -58.27586], // Continuación Camino a La Feria (A CONFIRMAR: borde este hacia el río)
  [-33.10930, -58.27663], // río
  [-33.10491, -58.30959],
];

// Margen para los puntos que están justo sobre el borde (por ejemplo, un destino en el propio Camino La Feria).
export const TOLERANCIA_CERCO_M = 40;

// Lugares de control: el editor avisa (y `npm test` falla) si un cambio del cerco los deja del lado equivocado.
export const LUGARES_DE_CONTROL = {
  dentro: {
    'Plaza Constitución': [-33.1166, -58.3130],
    'UTEC': [-33.11782, -58.33032],
    'Barrio Anglo': [-33.11928, -58.32702],
    'Barrio El Molino': [-33.13983, -58.32551],
    'Cruce Camino La Feria y Bohanes': [-33.15142, -58.29343],
    'Cruce Camino La Feria y Vladimir Roslik': [-33.13314, -58.27671],
  },
  fuera: {
    'Las Cañas': [-33.1646, -58.3559],
    'Planta UPM (acceso)': [-33.1335, -58.2536],
    'Puente San Martín': [-33.1076, -58.2469],
    'Camino La Feria pasando Bohanes': [-33.1553, -58.3044],
    'Ramal 10': [-33.1530, -58.2732],
  },
};

// Vías que, además, muestran el aviso de que el cruce a Argentina no está resuelto.
export const VIAS_PUENTE = ['puente internacional'];
