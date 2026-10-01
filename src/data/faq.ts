import { TARIFA, pesos } from './tarifa';
import { PARADAS } from './paradas';

export interface Pregunta {
  pregunta: string;
  /** Texto plano: se usa igual en la página y en el JSON-LD (FAQPage). */
  respuesta: string;
}

const n = TARIFA.horarioNocturno;
const hora = (h: number) => String(h).padStart(2, '0') + ':00';

/**
 * Preguntas frecuentes. Respuestas cortas y directas, con el dato primero:
 * es el formato que citan los buscadores y los asistentes (Google, Gemini, ChatGPT, Claude).
 * Solo usan datos que ya están en la página; no agregar afirmaciones sin confirmar.
 */
export const FAQ: readonly Pregunta[] = [
  {
    pregunta: '¿Cuánto cuesta un taxi en Fray Bentos?',
    respuesta: `La bajada de bandera cuesta ${pesos(TARIFA.bandera)} e incluye los primeros ${TARIFA.metrosBandera} metros. Después, cada 100 metros en la ciudad suma una ficha de ${pesos(TARIFA.ficha)}. Es la tarifa oficial de la Intendencia de Río Negro y el valor a pagar es el que marca el taxímetro.`,
  },
  {
    pregunta: '¿Hay taxis las 24 horas en Fray Bentos?',
    respuesta:
      'Sí. Podés pedir un taxi a cualquier hora por WhatsApp o reservarlo para más tarde, con choferes habilitados por la Intendencia de Río Negro.',
  },
  {
    pregunta: '¿Hay recargo nocturno en los taxis de Río Negro?',
    respuesta: `Sí. De ${hora(n.desde)} a ${hora(n.hasta)}, los domingos y los feriados se aplica un recargo de hasta ${Math.round(TARIFA.nocturno * 100)} % sobre la tarifa.`,
  },
  {
    pregunta: '¿Cuánto se paga por las valijas?',
    respuesta: `La primera valija va sin cargo. Cada valija extra se cobra un máximo de ${pesos(TARIFA.valija)}.`,
  },
  {
    pregunta: '¿Puedo ir en taxi al Balneario Las Cañas o al Puente San Martín?',
    respuesta: `Sí. Hacemos viajes a Las Cañas, al Puente Internacional Libertador General San Martín y a otros destinos de Río Negro. Fuera de la planta urbana, el kilómetro cuesta ${pesos(TARIFA.kmExtra)}.`,
  },
  {
    pregunta: '¿Cuánto cuesta la hora de espera del taxi?',
    respuesta: `La hora de espera cuesta ${pesos(TARIFA.horaEspera)}, según la tarifa oficial vigente.`,
  },
  {
    pregunta: '¿Dónde hay paradas de taxi en Fray Bentos?',
    respuesta:
      'Hay paradas en ' +
      PARADAS.filter((p) => !p.extremo)
        .map((p) => `${p.lugar} (${p.direccion})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' y $1') +
      '.',
  },
  {
    pregunta: '¿Cómo pido un taxi en Fray Bentos?',
    respuesta:
      'Elegí el taxi según lo que lleves (Standard, Confort o Van XL) y escribile directo por WhatsApp: podés pedirlo ahora o reservarlo para más tarde.',
  },
];
