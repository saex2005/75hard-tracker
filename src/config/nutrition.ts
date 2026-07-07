export const DAILY_MACROS = {
  kcal: 2350,
  protein: 170,
  carbs: 260,
  fat: 70,
  deficit: 500,
}

export const MEALS = [
  {
    time: '6:45',
    name: 'Pre-cardio',
    kcal: null as number | null,
    protein: null as number | null,
    note: 'Cardio en ayunas',
    items: ['Café solo o con 50 ml de leche descremada'],
  },
  {
    time: '8:15',
    name: 'Desayuno',
    kcal: 650,
    protein: 35,
    note: 'Post-cardio',
    items: [
      '3 huevos revueltos (~165 g)',
      '80 g de avena (seco) + 1 banana (~120 g) + canela',
    ],
  },
  {
    time: '13:00',
    name: 'Almuerzo',
    kcal: 700,
    protein: 50,
    note: 'Tupper en la fábrica',
    items: [
      '200 g de pollo o carne magra cocidos',
      '250 g de arroz cocido o 250 g de papa',
      '200 g de verduras asadas',
      '10 g de aceite de oliva (1 cda) o 50 g de palta (¼)',
    ],
  },
  {
    time: '16:45',
    name: 'Merienda',
    kcal: 450,
    protein: 30,
    note: 'Pre-pesas',
    items: [
      '200 g de yogur griego + 40 g de avena (seco)',
      'o: 2 tostadas integrales + 30 g de queso untable + 40 g de pavita',
      '1 fruta (~150 g) + 20 g de frutos secos (2-3 veces/semana)',
    ],
  },
  {
    time: '20:30',
    name: 'Cena',
    kcal: 550,
    protein: 50,
    note: 'Post-pesas',
    items: [
      '200 g de proteína cocida (pollo, cuadrada, merluza o 2 latas atún)',
      '200 g de papa o batata',
      '150-200 g de ensalada o verduras',
      '10 g de aceite de oliva (1 cda)',
    ],
  },
]

// Quick-add: las 4 comidas del plan con macros completos.
// C y G distribuidos para que la suma cierre en DAILY_MACROS (2350/170/260/70).
export const QUICK_MEALS = [
  { meal: 'desayuno', label: 'Desayuno del plan', kcal: 650, protein: 35, carbs: 80, fat: 20 },
  { meal: 'almuerzo', label: 'Almuerzo del plan', kcal: 700, protein: 52, carbs: 80, fat: 20 },
  { meal: 'merienda', label: 'Merienda del plan', kcal: 450, protein: 30, carbs: 55, fat: 12 },
  { meal: 'cena', label: 'Cena del plan', kcal: 550, protein: 53, carbs: 45, fat: 18 },
] as const

export type MealPrepSession = {
  day: string
  time: string
  covers: string
  items: { name: string; raw: string; portions: string }[]
  tips: string[]
}

export const MEAL_PREP: MealPrepSession[] = [
  {
    day: 'Domingo',
    time: '20:30–21:30',
    covers: 'Lunes a jueves',
    items: [
      { name: 'Pollo o nalga/cuadrada (horno 40 min)', raw: '1,6 kg', portions: '5-6 porciones de 200 g' },
      { name: 'Atún al natural o merluza', raw: '4 latas o 400 g', portions: '2-3 porciones' },
      { name: 'Arroz', raw: '350 g seco', portions: '4 porciones de 250 g' },
      { name: 'Papa hervida', raw: '1,2 kg', portions: '4-5 porciones de 200-250 g' },
      { name: 'Verduras al horno (zapallito, morrón, cebolla, zanahoria)', raw: '1,6 kg (2 bandejas)', portions: '8 porciones de 150-200 g' },
      { name: 'Huevos duros de backup', raw: '8 unidades', portions: '—' },
    ],
    tips: [
      'Pollo y verduras al horno juntos: pollo 40 min, verduras 25-30 min',
      'Arroz y papa en paralelo en la hornalla',
      'Dividir en tuppers apenas termina — cenar algo de la tanda',
    ],
  },
  {
    day: 'Miércoles',
    time: '20:30–21:30',
    covers: 'Viernes a lunes',
    items: [
      { name: 'Pollo o nalga/cuadrada (horno 40 min)', raw: '1,6 kg', portions: '5-6 porciones de 200 g' },
      { name: 'Atún al natural o merluza', raw: '4 latas o 400 g', portions: '2-3 porciones' },
      { name: 'Arroz', raw: '350 g seco', portions: '4 porciones de 250 g' },
      { name: 'Papa hervida', raw: '1,2 kg', portions: '4-5 porciones de 200-250 g' },
      { name: 'Verduras al horno (zapallito, morrón, cebolla, zanahoria)', raw: '1,6 kg (2 bandejas)', portions: '8 porciones de 150-200 g' },
      { name: 'Huevos duros de backup', raw: '8 unidades', portions: '—' },
    ],
    tips: [
      'Misma lógica que el domingo',
      'Si sobró algo de la tanda anterior, ajustar proteína o carbo',
      'Tener siempre latas de atún como backup de proteína de emergencia',
    ],
  },
]

export const SHOPPING_LIST = [
  {
    category: 'Proteína',
    items: [
      { name: 'Pollo (pechuga o pata/muslo) o nalga/cuadrada', qty: '3,2 kg' },
      { name: 'Atún al natural (lata 170 g)', qty: '8 latas' },
      { name: 'Merluza (alternativa al atún)', qty: '800 g' },
    ],
  },
  {
    category: 'Huevos',
    items: [
      { name: 'Huevos', qty: '~40 unidades' },
    ],
  },
  {
    category: 'Carbohidratos',
    items: [
      { name: 'Arroz (seco)', qty: '800 g' },
      { name: 'Papa o batata', qty: '3 kg' },
      { name: 'Avena', qty: '1 kg' },
      { name: 'Pan integral', qty: '16 rebanadas (~480 g)' },
    ],
  },
  {
    category: 'Verduras',
    items: [
      { name: 'Zapallito, morrón, cebolla, zanahoria', qty: '3,2 kg' },
      { name: 'Tomate + hojas verdes', qty: '1,6 kg' },
    ],
  },
  {
    category: 'Frutas',
    items: [
      { name: 'Bananas', qty: '8 unidades' },
      { name: 'Frutas variadas (manzana, pera, naranja)', qty: '8-12 unidades' },
    ],
  },
  {
    category: 'Lácteos',
    items: [
      { name: 'Yogur griego natural', qty: '1,6 kg' },
      { name: 'Queso untable descremado', qty: '240 g' },
      { name: 'Pavita (fetas)', qty: '320 g (16 fetas)' },
    ],
  },
  {
    category: 'Grasas',
    items: [
      { name: 'Aceite de oliva', qty: '~160 ml' },
      { name: 'Palta', qty: '2-4 unidades' },
      { name: 'Frutos secos', qty: '200 g' },
    ],
  },
  {
    category: 'Extras',
    items: [
      { name: 'Café, canela, condimentos', qty: 'stock permanente' },
    ],
  },
]

// Recetas: cómo combinar lo ya cocinado en el batch.
// Todo cumple las reglas binarias: sin azúcar, aceite solo en crudo, nada ambiguo.
export type Recipe = {
  name: string
  meal: string
  time: string
  batch: string[]
  extras: string[]
  steps: string[]
}

export const RECIPES: Recipe[] = [
  {
    name: 'Bowl criollo',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['200 g de pollo', '250 g de arroz', '150 g de verduras asadas'],
    extras: ['Tomate y cebolla crudos picados', 'Vinagre', '10 g de aceite (el de la comida)'],
    steps: [
      'Picar tomate y cebolla, mezclar con vinagre y una pizca de sal → salsa criolla',
      'Armar el bowl: arroz abajo, pollo y verduras arriba',
      'Salsa criolla y aceite en crudo recién al momento de comer',
    ],
  },
  {
    name: 'Bowl limón y orégano',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['200 g de pollo desmenuzado', '250 g de arroz', '150 g de verduras asadas'],
    extras: ['Jugo de ½ limón', 'Orégano y pimienta', '10 g de aceite'],
    steps: [
      'Desmenuzar el pollo frío con las manos o dos tenedores',
      'Mezclar todo en el tupper',
      'Limón, orégano y aceite al comer — va bien frío si no hay microondas',
    ],
  },
  {
    name: 'Ensalada de atún y papa',
    meal: 'Almuerzo o cena',
    time: '5 min',
    batch: ['2 latas de atún (160 g)', '250 g de papa en cubos', '1 huevo duro de backup'],
    extras: ['Tomate', 'Vinagre y pimienta', '10 g de aceite'],
    steps: [
      'Cortar la papa fría en cubos, sumar el atún escurrido y el tomate',
      'Huevo duro en cuartos arriba (suma ~6 g de proteína extra)',
      'Vinagre, pimienta y aceite en crudo al servir',
    ],
  },
  {
    name: 'Pollo a la mostaza',
    meal: 'Almuerzo o cena',
    time: '5 min',
    batch: ['200 g de pollo', '200-250 g de papa', '150 g de verduras asadas'],
    extras: ['1 cda de mostaza (sin miel) + 1 cda de agua', 'Pimentón', '10 g de aceite'],
    steps: [
      'Mezclar mostaza, agua y pimentón → salsa liviana',
      'Calentar pollo, papa y verduras en microondas',
      'Salsa por arriba y aceite en crudo al final',
    ],
  },
  {
    name: 'Arroz salteado',
    meal: 'Cena',
    time: '10 min',
    batch: ['250 g de arroz', '200 g de pollo', '150 g de verduras picadas', '1 huevo duro picado'],
    extras: ['Ajo en polvo, jengibre (si hay) y pimienta', '10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite: verduras 2 min a fuego fuerte',
      'Sumar pollo y arroz hasta que tome calor y un poco de dorado',
      'Apagar, mezclar el huevo picado y las especias, aceite en crudo al servir',
    ],
  },
  {
    name: 'Merluza al limón con puré',
    meal: 'Cena',
    time: '10 min',
    batch: ['200 g de merluza', '200 g de papa'],
    extras: ['Limón', 'Ajo y perejil (provenzal)', 'Ensalada de hojas + tomate', '10 g de aceite'],
    steps: [
      'Pisar la papa caliente con el aceite en crudo → puré',
      'Calentar la merluza con provenzal (microondas o sartén sin aceite)',
      'Limón por arriba y ensalada de ½ plato al lado',
    ],
  },
  {
    name: 'Carne al chimichurri',
    meal: 'Cena',
    time: '10 min',
    batch: ['200 g de nalga o cuadrada', '200 g de papa o batata'],
    extras: ['Chimichurri seco (orégano, ají molido, ajo en polvo, perejil)', 'Vinagre', 'Ensalada', '10 g de aceite'],
    steps: [
      'Hidratar el chimichurri 5 min en vinagre + el aceite de la comida',
      'Calentar carne y papa',
      'Chimichurri por arriba, ensalada de ½ plato',
    ],
  },
  {
    name: 'Wok especiado',
    meal: 'Cena',
    time: '10 min',
    batch: ['200 g de pollo o carne', '200 g de verduras asadas', '250 g de arroz o 200 g de papa'],
    extras: ['Curry o comino + pimentón ahumado', '10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite, todo junto a fuego fuerte 5 min',
      'Especias al final para que no se quemen',
      'Aceite en crudo al servir',
    ],
  },
  {
    name: 'Ensalada tibia de batata y atún',
    meal: 'Cena',
    time: '5 min',
    batch: ['200 g de batata', '2 latas de atún (160 g)'],
    extras: ['Hojas verdes + tomate', 'Mostaza (sin miel) + vinagre', '10 g de aceite'],
    steps: [
      'Calentar la batata en cubos, el resto va frío',
      'Mezclar mostaza + vinagre + aceite → vinagreta',
      'Todo al bowl, vinagreta por arriba',
    ],
  },
]

export const SEASONINGS = [
  { name: 'Salsa criolla', pair: 'Pollo · carne · atún', how: 'Tomate y cebolla picados + vinagre + el aceite de la comida' },
  { name: 'Chimichurri', pair: 'Carne · pollo', how: 'Orégano + ají molido + ajo en polvo + perejil, hidratado en vinagre y el aceite' },
  { name: 'Limón y pimienta', pair: 'Merluza · atún · pollo', how: 'Jugo de limón + pimienta negra' },
  { name: 'Mostaza aligerada', pair: 'Pollo · carne', how: '1 cda de mostaza (sin miel) + 1 cda de agua + pimentón' },
  { name: 'Provenzal', pair: 'Merluza · papa', how: 'Ajo picado o en polvo + perejil' },
  { name: 'Especiado seco', pair: 'Wok · verduras', how: 'Curry o comino + pimentón ahumado' },
  { name: 'Vinagreta', pair: 'Ensaladas', how: 'Vinagre o aceto (etiqueta sin azúcar) + el aceite en crudo' },
]

export const RECIPE_RULES = [
  'El aceite de cada comida (10 g) va siempre en crudo al servir — nunca a la sartén',
  'Condimentos secos, limón y vinagre son libres: no suman macros',
  'Recalentar en microondas o sartén antiadherente sin aceite',
  'El condimento seco viaja en el tupper; salsa y aceite se agregan al comer para que no se empape',
  'Aderezo con azúcar en la etiqueta = no entra (regla 8)',
]

export const EMERGENCY_MEALS = [
  {
    name: 'Atún + arroz + huevo duro',
    items: ['Atún al natural (1-2 latas)', 'Arroz de reserva', 'Huevo duro de backup'],
  },
  {
    name: 'Omelette de 4 huevos',
    items: ['4 huevos', 'Queso untable descremado', 'Tostadas integrales'],
  },
  {
    name: 'Licuado proteico rápido',
    items: ['200 g yogur griego', '80 g avena', '1 banana'],
  },
]

export const DIET_RULES = [
  '4 comidas fijas, nada fuera de ellas',
  'Cero delivery',
  'Cero gaseosa azucarada',
  'Cero alcohol',
  'Cero sushi — queda para el día 76',
  'Proteína en cada comida',
  'Meal prep domingo y miércoles, sin excepción',
  'Si es ambiguo, no se come',
]
