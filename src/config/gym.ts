// Rutina EG Coaching — MICROCICLO 1 (fuente: inbox/MICROCICLO 1.pdf del workspace)
// Split de 4 sesiones repartido en 6 días de gym (rutina-diaria.md):
// Lun Torso · Mar Piernas · Mié Empujes · Jue Tracción · Vie Torso · Sáb Empujes · Dom descanso

export type SessionKey = 'torso' | 'piernas' | 'empujes' | 'traccion' | 'descanso'

export type Exercise = {
  code: string // orden en la planilla (B1, C1...)
  name: string
  sets: string // "2/1" = 2 series top + 1 backoff
  reps: string
  rest: string
  rir: string
  notes: string
}

export type GymSession = {
  key: SessionKey
  label: string
  warmup: { name: string; sets: string; reps: string }[]
  exercises: Exercise[]
}

export const SESSION_LABELS: Record<SessionKey, string> = {
  torso: 'Torso',
  piernas: 'Piernas',
  empujes: 'Empujes',
  traccion: 'Tracción',
  descanso: 'Descanso / Caminata',
}

// getDay(): 0=Dom, 1=Lun ... 6=Sáb
const WEEKDAY_SESSION: SessionKey[] = [
  'descanso', // domingo
  'torso', // lunes
  'piernas', // martes
  'empujes', // miércoles
  'traccion', // jueves
  'torso', // viernes (repetido)
  'empujes', // sábado (repetido)
]

export function getSessionForDate(dateISO: string): SessionKey {
  const day = new Date(`${dateISO}T00:00:00`).getDay()
  return WEEKDAY_SESSION[day]
}

export const GYM_SESSIONS: Record<Exclude<SessionKey, 'descanso'>, GymSession> = {
  torso: {
    key: 'torso',
    label: 'Sesión 1 — Torso',
    warmup: [],
    exercises: [
      {
        code: 'B1',
        name: 'Vuelos laterales sentado',
        sets: '2/1',
        reps: '(8-12) (12-16)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'No mover mucho el tronco, llevar hombro-codo-muñeca en misma línea, rotación de muñeca levemente hacia adentro y llevarlos ligeramente en diagonal, excéntrica controlada',
      },
      {
        code: 'C1',
        name: 'Press plano c/ mancuernas',
        sets: '2/1',
        reps: '(5-9) (9-12)',
        rest: '3',
        rir: '2-1',
        notes: 'Hombro a 45 grados, ligera retracción escapular y excéntrica controlada',
      },
      {
        code: 'D1',
        name: 'Aperturas en polea',
        sets: '3',
        reps: '(10-15)',
        rest: '2-3',
        rir: '2-0',
        notes:
          'Ligera inclinación hacia adelante, busca juntar los codos en la ejecución, excéntrica controlada',
      },
      {
        code: 'E1',
        name: 'Vuelos laterales polea media cruzado',
        sets: '3',
        reps: '(9-14)',
        rest: '1:30 a 3',
        rir: '1-0',
        notes:
          'Polea a la altura de la cadera, brazo estirado, saco pecho y llevo el brazo en diagonal hacia arriba, excéntrica controlada',
      },
      {
        code: 'F1',
        name: 'Jalón al pecho',
        sets: '2/1',
        reps: '(8-12) (12-16)',
        rest: '2-3',
        rir: '2-1',
        notes:
          'Ligera inclinación hacia atrás, llevar la barra al pecho, 0 balanceo, excéntrica controlada',
      },
      {
        code: 'G1',
        name: 'Remo hammer unilateral',
        sets: '2',
        reps: '(9-14)',
        rest: '2-3',
        rir: '2-0',
        notes:
          'Ligera inclinación hacia el lado que estás trabajando, llevá el codo a la cadera y no descuelgues la escápula, excéntrica controlada',
      },
      {
        code: 'H1',
        name: 'Banco Scott unilateral',
        sets: '2',
        reps: '(8-12)',
        rir: '2-0',
        rest: '1:30 a 3',
        notes: 'Hacer full ROM, estirá por completo, excéntrica de 2 segundos',
      },
      {
        code: 'I1',
        name: 'Tríceps katana',
        sets: '3',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Que el codo quede siempre apuntando para arriba, no mover el hombro, excéntrica controlada',
      },
    ],
  },
  piernas: {
    key: 'piernas',
    label: 'Sesión 2 — Piernas',
    warmup: [
      { name: 'Mov. cadera estocada lateral', sets: '2', reps: '8 c/lado' },
      { name: 'Sentadilla de copa isométrica', sets: '2', reps: '20 seg' },
    ],
    exercises: [
      {
        code: 'B1',
        name: 'Curl isquios acostado',
        sets: '3',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Realizar pausa en contracción + excéntrica muy controlada y full rango recorrido',
      },
      {
        code: 'C1',
        name: 'Sentadilla hack',
        sets: '2',
        reps: '(6-8) (8-12)',
        rest: '3-5',
        rir: '2-1',
        notes:
          'Pies al ancho de hombro o un poco más, puntas un poco hacia afuera, intentar mantener el tronco lo más recto posible, no levantar talones y evitar meter las rodillas hacia adentro, no rebotar abajo y excéntrica de 3 segundos',
      },
      {
        code: 'D1',
        name: 'Prensa 45',
        sets: '2',
        reps: '(6-10) (10-14)',
        rest: '3-4',
        rir: '2-1',
        notes: 'Mismo set-up de pies que en la sentadilla, buscá el mayor ROM, excéntrica controlada',
      },
      {
        code: 'E1',
        name: 'Cuadricera',
        sets: '3',
        reps: '(9-14)',
        rest: '2-3',
        rir: '2-0',
        notes: 'Buscá hacer el mayor ROM, excéntrica de 2 segundos',
      },
      {
        code: 'F1',
        name: 'Aductores en máquina',
        sets: '3',
        reps: '(10-16)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Estirar por completo, pausa de 1/2 segundo en contracción, excéntrica de 3 segundos',
      },
      {
        code: 'G1',
        name: 'Gemelos de pie',
        sets: '2',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Buscá estirar por completo abajo, pausa de 1 segundo arriba y excéntrica de 3 segundos',
      },
      {
        code: 'H1',
        name: 'Hiperextensiones para espalda baja',
        sets: '2',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-1',
        notes: 'Poner a la altura de la cadera, pausa de 1/2 segundo y excéntrica de 2 segundos',
      },
    ],
  },
  empujes: {
    key: 'empujes',
    label: 'Sesión 3 — Empujes',
    warmup: [
      { name: 'Pull over unilateral con banda', sets: '2', reps: '10 c/lado' },
      { name: 'Band pull apart', sets: '2', reps: '12' },
    ],
    exercises: [
      {
        code: 'B1',
        name: 'Vuelos laterales c/ mancuerna de pie',
        sets: '2/1',
        reps: '(8-12) (15-20)',
        rest: '2-3',
        rir: '2-0',
        notes:
          'No mover mucho el tronco, llevar hombro-codo-muñeca en misma línea, rotación de muñeca levemente hacia adentro y llevarlos ligeramente en diagonal, excéntrica controlada',
      },
      {
        code: 'C1',
        name: 'Press inclinado bajo en Smith',
        sets: '2/1',
        reps: '(6-8) (8-12)',
        rest: '3',
        rir: '2-1',
        notes:
          'Banco a 30 grados, retracción escapular, poné los codos a 45 grados y alineá la muñeca con el codo, excéntrica controlada',
      },
      {
        code: 'D1',
        name: 'Fondos en máquina',
        sets: '2/1',
        reps: '(6-10) (10-14)',
        rest: '3',
        rir: '2-1',
        notes:
          'Inclinate hacia adelante, codos ligeramente abiertos, hacerlo unilateral si queda más cómodo, excéntrica controlada',
      },
      {
        code: 'E1',
        name: 'Peck deck',
        sets: '2',
        reps: '(9-14)',
        rest: '2-3',
        rir: '2-0',
        notes:
          'Pensá en juntar los codos en la concéntrica, brazo alineado con el hombro. Excéntrica 2" + 1/2" pausa en estiramiento',
      },
      {
        code: 'F1',
        name: 'Vuelos laterales en polea',
        sets: '3',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Polea a la altura de la rodilla, no mover el tronco, llevar hombro-codo-muñeca en misma línea, rotación de muñeca levemente hacia adentro y llevar el brazo ligeramente en diagonal, usar tobillera para este ejercicio, excéntrica controlada',
      },
      {
        code: 'G1',
        name: 'Extensión de tríceps cruzada polea doble',
        sets: '2/1',
        reps: '(6-10) (10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes: 'Dejar los codos a 45 grados, no mover el hombro, excéntrica controlada',
      },
      {
        code: 'H1',
        name: 'Extensión de tríceps unilateral',
        sets: '2',
        reps: '(8-12) (12-16)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Ligera inclinación hacia adelante, no mover el hombro en la ejecución y full ROM, excéntrica controlada',
      },
    ],
  },
  traccion: {
    key: 'traccion',
    label: 'Sesión 4 — Tracción',
    warmup: [
      { name: 'Pull over unilateral con banda', sets: '2', reps: '10 c/lado' },
      { name: 'Band pull apart', sets: '2', reps: '12' },
    ],
    exercises: [
      {
        code: 'B1',
        name: 'Peso muerto rumano',
        sets: '2',
        reps: '(6-8)',
        rest: '3-5',
        rir: '2-0',
        notes:
          'Mantener espalda recta, intentar no flexionar rodillas, pies al ancho de hombro al igual que el agarre, llevar la barra lo más cerca de la pierna. 1/2 segundo de pausa en contracción y 2 segundos de bajada',
      },
      {
        code: 'C1',
        name: 'Remo T en máquina',
        sets: '2',
        reps: '(6-10)',
        rest: '3',
        rir: '2-1',
        notes:
          'Enfoque en protracción-retracción escapular, no despegar el pecho del banco y excéntrica controlada',
      },
      {
        code: 'D1',
        name: 'Jalón al pecho',
        sets: '2/1',
        reps: '(6-10) (10-14)',
        rest: '2-3',
        rir: '2-1',
        notes:
          'Ligera inclinación hacia atrás, llevar la barra al pecho, 0 balanceo, excéntrica controlada',
      },
      {
        code: 'E1',
        name: 'Remo máquina agarre abierto',
        sets: '2',
        reps: '(9-14)',
        rest: '2-3',
        rir: '2-0',
        notes:
          'Llevar la barra al esternón, pensá en juntar las escápulas, pausa de 1/2 en contracción y excéntrica de 2 segundos',
      },
      {
        code: 'F1',
        name: 'Pull over unilateral',
        sets: '2',
        reps: '(9-14)',
        rest: '2-3',
        rir: '2-0',
        notes: 'Inclinado hacia adelante, clavá el codo a la cadera, excéntrica de 2 segundos',
      },
      {
        code: 'G1',
        name: 'Posterior en polea',
        sets: '2',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-1',
        notes:
          'Polea a la altura del hombro. Mano a la altura de la polea y vos un paso hacia atrás, excéntrica controlada',
      },
      {
        code: 'H1',
        name: 'Curl de bíceps en polea',
        sets: '2',
        reps: '(8-12) (12-16)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Polea abajo de todo, hacé unos pasos para atrás si es necesario para ejecutarlo en full ROM, excéntrica de 2 segundos',
      },
      {
        code: 'I1',
        name: 'Curl bayesian',
        sets: '2',
        reps: '(10-15)',
        rest: '1:30 a 3',
        rir: '2-0',
        notes:
          'Hacé 2 pasos hacia adelante y estirá el codo, no mover en lo absoluto el hombro en la ejecución, excéntrica controlada',
      },
    ],
  },
}
