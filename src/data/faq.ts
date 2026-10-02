import { TARIFA, pesos } from './tarifa';
import { PARADAS } from './paradas';
import { VIAJES, rango } from './viajes';

export interface Pregunta {
  pregunta: string;
  /** Texto plano: se usa igual en la página y en el JSON-LD (FAQPage). */
  respuesta: string;
}

const n = TARIFA.horarioNocturno;
const hora = (h: number) => String(h).padStart(2, '0') + ':00';

/**
 * Preguntas frecuentes, escritas como las hace la gente en Google o a un asistente de IA
 * ("¿cuánto cuesta un taxi de Fray Bentos a Las Cañas?"). Respuestas cortas, con el dato primero.
 * Los precios salen de la calculadora (ver viajes.ts); no agregar afirmaciones sin confirmar.
 */
const recargo = `${Math.round(TARIFA.nocturno * 100)} %`;
const km = (x: number) => x.toLocaleString('es-UY');
const aclaracion = 'Es una estimación con la tarifa oficial: el valor a pagar es el que marca el taxímetro.';
const { lasCanas, puente, utec } = VIAJES;

export const FAQ: readonly Pregunta[] = [
  {
    pregunta: '¿Cuánto cuesta un taxi de Fray Bentos a Las Cañas?',
    respuesta: `Desde el centro de Fray Bentos (Plaza Constitución) hasta el Balneario Las Cañas son unos ${km(lasCanas.km)} km. De día, de lunes a sábado, el viaje sale entre ${rango(lasCanas.dia)}; de noche, domingos y feriados, entre ${rango(lasCanas.noche)}. ${aclaracion}`,
  },
  {
    pregunta: '¿Cuánto cuesta un taxi de Las Cañas a Fray Bentos?',
    respuesta: `Prácticamente lo mismo que a la ida, porque es el mismo recorrido de unos ${km(lasCanas.km)} km: entre ${rango(lasCanas.dia)} de día y entre ${rango(lasCanas.noche)} de noche, domingos y feriados, hasta el centro. Para tu dirección exacta, usá la calculadora de la página.`,
  },
  {
    pregunta: '¿Cuánto cuesta un taxi al Puente Internacional San Martín?',
    respuesta: `Desde el centro de Fray Bentos hasta el puesto de frontera del Puente San Martín son unos ${km(puente.km)} km. De día, de lunes a sábado, sale entre ${rango(puente.dia)}; de noche, domingos y feriados, entre ${rango(puente.noche)}. ${aclaracion}`,
  },
  {
    pregunta: '¿Cuánto cuesta un taxi dentro de Fray Bentos?',
    respuesta: `La bajada de bandera cuesta ${pesos(TARIFA.bandera)} e incluye los primeros ${TARIFA.metrosBandera} metros; después, cada ${TARIFA.metrosPorFicha} metros suma una ficha de ${pesos(TARIFA.ficha)}. Por ejemplo, del centro a la UTEC (unos ${km(utec.km)} km) el viaje sale entre ${rango(utec.dia)} de día.`,
  },
  {
    pregunta: '¿La tarifa del taxi cambia de noche?',
    respuesta: `Sí. De ${hora(n.desde)} a ${hora(n.hasta)} se cobra la Tarifa 2, que tiene un recargo del ${recargo} sobre la bajada de bandera, el kilómetro y la hora de espera.`,
  },
  {
    pregunta: '¿La tarifa es diferente los domingos y feriados?',
    respuesta: `Sí. Los domingos y feriados se cobra todo el día la Tarifa 2, con el mismo recargo del ${recargo} que de noche. El recargo no se acumula: un domingo a la noche también es ${recargo}.`,
  },
  {
    pregunta: '¿Cómo pido un taxi en Fray Bentos?',
    respuesta:
      'Elegí el taxi según lo que lleves (Standard, Confort o Van XL) y escribile directo por WhatsApp: podés pedirlo ahora o reservarlo para más tarde. También podés tomarlo en una de las paradas de la ciudad.',
  },
  {
    pregunta: '¿Cuánto se paga por las valijas en el taxi?',
    respuesta: `La primera valija va sin cargo. Cada valija extra se cobra hasta ${pesos(TARIFA.valija)}, también de noche, porque las valijas no llevan recargo.`,
  },
  {
    pregunta: '¿Puedo tomar un taxi para ir a otra ciudad, como Gualeguaychú?',
    respuesta: `Sí. Podés subirte a un taxi en Fray Bentos e ir al destino que quieras, también a otra ciudad o a Gualeguaychú. Lo que el taxi no puede hacer es levantar pasajeros nuevos fuera de Fray Bentos, que incluye la ciudad, Las Cañas y el Puente San Martín. Fuera de la planta urbana, el kilómetro cuesta ${pesos(TARIFA.kmExtra)} de día.`,
  },
  {
    pregunta: '¿Hay taxis las 24 horas en Fray Bentos?',
    respuesta:
      'Sí. Podés pedir un taxi a cualquier hora por WhatsApp o reservarlo para más tarde, con choferes habilitados por la Intendencia de Río Negro.',
  },
  {
    pregunta: '¿Cuánto cobra el taxi por esperarme?',
    respuesta: `La hora de espera cuesta ${pesos(TARIFA.horaEspera)} de día; de noche, domingos y feriados lleva el recargo del ${recargo}. El taxímetro la cuenta por tiempo mientras el auto está parado o va muy despacio.`,
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
];
