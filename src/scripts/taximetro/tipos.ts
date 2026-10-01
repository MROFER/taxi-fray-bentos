/** Forma de lo que devuelve calcularRangos() (calculadora/src/motor.js), para TypeScript. */
export interface Rango {
  codigo: string;
  nombre: string;
  recargo: boolean;
  derivados: { bajada: number; ficha: number; K: number; H: number; vt: number; d: number; s: number };
  esperaS: number;
  min: { fichas: number; importe: number; total: number };
  max: { fichas: number; importe: number; total: number };
  valijas: { cantidad: number; cobradas: number; importe: number };
}
