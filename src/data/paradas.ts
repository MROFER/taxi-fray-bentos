export interface Parada {
  etiqueta: string;
  /** Nombre del lugar (lo que se muestra). */
  lugar: string;
  direccion: string;
  /**
   * Cómo buscarla en las calles de OpenStreetMap de la calculadora: una esquina ("calle y calle")
   * o una calle sola (se usa su punto medio). Se resuelve en el build; si no se encuentra, el build falla.
   */
  consulta: string;
  extremo?: boolean;
}

export const PARADAS: readonly Parada[] = [
  { etiqueta: 'Costa', lugar: 'Rambla Costanera', direccion: 'Paseo del Puerto', consulta: 'Rambla Doctor Ángel Cuervo', extremo: true },
  { etiqueta: 'Parada 1', lugar: 'Plaza Constitución', direccion: '18 de Julio y Treinta y Tres', consulta: '18 de Julio y Treinta y Tres' },
  { etiqueta: 'Parada 2', lugar: 'Banco República (BROU)', direccion: 'Libertador J. A. Lavalleja y 25 de Mayo', consulta: 'Lavalleja y 25 de Mayo' },
  { etiqueta: 'Parada 3', lugar: 'Plaza Artigas', direccion: '18 de Julio y Las Piedras', consulta: '18 de Julio y Las Piedras' },
  { etiqueta: 'Parada 4', lugar: 'Hospital Dr. Ángel M. Cuervo', direccion: 'Pte. Manuel Oribe y Echeverría', consulta: 'Oribe y Echeverría' },
  { etiqueta: 'Parada 5', lugar: 'Terminal de Ómnibus', direccion: '18 de Julio y Juan Manuel Blanes', consulta: '18 de Julio y Blanes' },
  { etiqueta: 'Salida', lugar: 'Ruta 2 · Salida', direccion: 'Hacia el Puente y la frontera', consulta: 'Artigas y Ramal 10', extremo: true },
];
