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
  macros: { kcal: number; protein: number; carbs: number; fat: number }
}

export const RECIPES: Recipe[] = [
  // ── Almuerzo / Cena (batch original) ──
  {
    name: 'Bowl criollo',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['130 g de pollo', '250 g de arroz', '150 g de verduras asadas'],
    extras: ['Tomate y cebolla crudos picados', 'Vinagre', '10 g de aceite (el de la comida)'],
    steps: [
      'Picar tomate y cebolla, mezclar con vinagre y una pizca de sal → salsa criolla',
      'Armar el bowl: arroz abajo, pollo y verduras arriba',
      'Salsa criolla y aceite en crudo recién al momento de comer',
    ],
    macros: { kcal: 685, protein: 49, carbs: 82, fat: 16 },
  },
  {
    name: 'Bowl limón y orégano',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['130 g de pollo desmenuzado', '250 g de arroz', '150 g de verduras asadas'],
    extras: ['Jugo de ½ limón', 'Orégano y pimienta', '10 g de aceite'],
    steps: [
      'Desmenuzar el pollo frío con las manos o dos tenedores',
      'Mezclar todo en el tupper',
      'Limón, orégano y aceite al comer — va bien frío si no hay microondas',
    ],
    macros: { kcal: 685, protein: 49, carbs: 82, fat: 16 },
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
    macros: { kcal: 572, protein: 48, carbs: 57, fat: 17 },
  },
  {
    name: 'Pollo a la mostaza',
    meal: 'Almuerzo o cena',
    time: '5 min',
    batch: ['140 g de pollo', '225 g de papa', '150 g de verduras asadas'],
    extras: ['1 cda de mostaza (sin miel) + 1 cda de agua', 'Pimentón', '10 g de aceite'],
    steps: [
      'Mezclar mostaza, agua y pimentón → salsa liviana',
      'Calentar pollo, papa y verduras en microondas',
      'Salsa por arriba y aceite en crudo al final',
    ],
    macros: { kcal: 570, protein: 49, carbs: 56, fat: 16 },
  },
  {
    name: 'Arroz salteado',
    meal: 'Cena',
    time: '10 min',
    batch: ['120 g de arroz', '110 g de pollo', '150 g de verduras picadas', '1 huevo duro picado'],
    extras: ['Ajo en polvo, jengibre (si hay) y pimienta', '10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite: verduras 2 min a fuego fuerte',
      'Sumar pollo y arroz hasta que tome calor y un poco de dorado',
      'Apagar, mezclar el huevo picado y las especias, aceite en crudo al servir',
    ],
    macros: { kcal: 568, protein: 46, carbs: 45, fat: 20 },
  },
  {
    name: 'Merluza al limón con puré',
    meal: 'Cena',
    time: '10 min',
    batch: ['200 g de merluza', '300 g de papa'],
    extras: ['Limón', 'Ajo y perejil (provenzal)', 'Ensalada de hojas + tomate', '10 g de aceite'],
    steps: [
      'Pisar la papa caliente con el aceite en crudo → puré',
      'Calentar la merluza con provenzal (microondas o sartén sin aceite)',
      'Limón por arriba y ensalada de ½ plato al lado',
    ],
    macros: { kcal: 558, protein: 51, carbs: 60, fat: 13 },
  },
  {
    name: 'Carne al chimichurri',
    meal: 'Cena',
    time: '10 min',
    batch: ['160 g de nalga o cuadrada', '200 g de papa o batata'],
    extras: ['Chimichurri seco (orégano, ají molido, ajo en polvo, perejil)', 'Vinagre', 'Ensalada', '10 g de aceite'],
    steps: [
      'Hidratar el chimichurri 5 min en vinagre + el aceite de la comida',
      'Calentar carne y papa',
      'Chimichurri por arriba, ensalada de ½ plato',
    ],
    macros: { kcal: 530, protein: 51, carbs: 38, fat: 19 },
  },
  {
    name: 'Wok especiado',
    meal: 'Cena',
    time: '10 min',
    batch: ['130 g de pollo o carne', '200 g de verduras asadas', '120 g de arroz o papa'],
    extras: ['Curry o comino + pimentón ahumado', '10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite, todo junto a fuego fuerte 5 min',
      'Especias al final para que no se quemen',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 534, protein: 46, carbs: 49, fat: 15 },
  },
  {
    name: 'Ensalada tibia de batata y atún',
    meal: 'Cena',
    time: '5 min',
    batch: ['250 g de batata', '3 latas de atún (240 g)'],
    extras: ['Hojas verdes + tomate', 'Mostaza (sin miel) + vinagre', '10 g de aceite'],
    steps: [
      'Calentar la batata en cubos, el resto va frío',
      'Mezclar mostaza + vinagre + aceite → vinagreta',
      'Todo al bowl, vinagreta por arriba',
    ],
    macros: { kcal: 552, protein: 59, carbs: 54, fat: 12 },
  },

  // ── Desayuno (~650 kcal / 35 g P) ──
  {
    name: 'Panqueque proteico de avena',
    meal: 'Desayuno',
    time: '10 min',
    batch: [],
    extras: ['4 huevos', '40 g de avena (seca)', '1 banana', 'Canela (opcional)'],
    steps: [
      'Batir los huevos con la avena hasta integrar',
      'Cocinar en sartén antiadherente sin aceite, tipo panqueque, dorando de los dos lados',
      'Servir con la banana en rodajas arriba y canela si querés',
    ],
    macros: { kcal: 599, protein: 34, carbs: 57, fat: 26 },
  },
  {
    name: 'Panqueques de banana con whey',
    meal: 'Desayuno',
    time: '10 min',
    batch: [],
    extras: ['3 huevos', '2 bananas', '1 scoop de whey'],
    steps: [
      'Pisar las bananas hasta puré, batir con los huevos',
      'Cocinar en sartén antiadherente sin aceite, panqueques chicos',
      'Whey batido aparte con agua o leche descremada',
    ],
    macros: { kcal: 592, protein: 48, carbs: 58, fat: 20 },
  },
  {
    name: 'Tostadas con palta y huevo poché',
    meal: 'Desayuno',
    time: '10 min',
    batch: [],
    extras: ['3 huevos', '4 tostadas integrales (100 g)', '¼ palta (42 g)', '20 g de queso untable'],
    steps: [
      'Pochar los huevos en agua hirviendo con un chorrito de vinagre, 3 min',
      'Tostar el pan, untar con el queso',
      'Palta pisada o en láminas arriba, huevo poché encima, sal y pimienta',
    ],
    macros: { kcal: 597, protein: 34, carbs: 48, fat: 29 },
  },
  {
    name: 'Yogur con frutos secos y whey',
    meal: 'Desayuno',
    time: '5 min',
    batch: [],
    extras: ['200 g de yogur griego', '20 g de frutos secos', '2 tostadas integrales', '1 banana', '1 scoop de whey'],
    steps: [
      'Mezclar el yogur con el whey hasta disolver',
      'Sumar los frutos secos y la banana en rodajas',
      'Las tostadas aparte, simples o con lo que quede de queso untable',
    ],
    macros: { kcal: 636, protein: 49, carbs: 68, fat: 20 },
  },
  {
    name: 'Bowl de yogur con avena tostada',
    meal: 'Desayuno',
    time: '10 min',
    batch: [],
    extras: ['250 g de yogur griego', '40 g de avena tostada en sartén seca', '1 manzana', '20 g de frutos secos', '½ scoop de whey'],
    steps: [
      'Tostar la avena en sartén seca (sin aceite) 2-3 min hasta que dore, dejar enfriar',
      'Mezclar el whey con el yogur',
      'Sumar la avena tostada, la manzana en cubos y los frutos secos arriba',
    ],
    macros: { kcal: 641, protein: 38, carbs: 77, fat: 23 },
  },

  // ── Almuerzo (~700 kcal / 50 g P) ──
  {
    name: 'Wok de pollo al jengibre',
    meal: 'Almuerzo',
    time: '10 min',
    batch: ['130 g de pollo', '200 g de arroz', '200 g de verduras'],
    extras: ['Jengibre y salsa de soja sin azúcar (chequear etiqueta)', '10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite, verduras y pollo en tiras a fuego fuerte',
      'Sumar el arroz, jengibre y un chorrito de soja, saltear 2-3 min',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 638, protein: 48, carbs: 71, fat: 16 },
  },
  {
    name: 'Merluza con papas y huevo',
    meal: 'Almuerzo',
    time: '10 min',
    batch: ['200 g de merluza', '300 g de papa'],
    extras: ['1 huevo duro', 'Ensalada de hojas y tomate', '10 g de aceite'],
    steps: [
      'Hervir o calentar la papa en cubos',
      'Calentar la merluza (microondas o sartén sin aceite)',
      'Armar el plato con el huevo duro en cuartos, ensalada y aceite en crudo',
    ],
    macros: { kcal: 643, protein: 58, carbs: 61, fat: 19 },
  },
  {
    name: 'Cuadrada al chimichurri con batata',
    meal: 'Almuerzo',
    time: '10 min',
    batch: ['200 g de nalga o cuadrada', '300 g de batata'],
    extras: ['Chimichurri seco', 'Ensalada de hojas', '10 g de aceite'],
    steps: [
      'Hidratar el chimichurri en vinagre y el aceite de la comida',
      'Calentar la carne y la batata',
      'Chimichurri por arriba, ensalada al costado',
    ],
    macros: { kcal: 665, protein: 64, carbs: 53, fat: 21 },
  },
  {
    name: 'Poke bowl de atún',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['200 g de atún al natural', '200 g de arroz'],
    extras: ['1 huevo duro', '50 g de palta', 'Pepino y tomate', 'Limón', '5 g de aceite'],
    steps: [
      'Armar el bowl con el arroz de base',
      'Atún escurrido, huevo en cuartos, palta y vegetales frescos arriba',
      'Limón y aceite en crudo al servir',
    ],
    macros: { kcal: 697, protein: 60, carbs: 69, fat: 20 },
  },
  {
    name: 'Pollo al curry seco',
    meal: 'Almuerzo',
    time: '10 min',
    batch: ['130 g de pollo', '250 g de arroz integral', '200 g de verduras asadas'],
    extras: ['Curry en polvo', '10 g de aceite'],
    steps: [
      'Saltear el pollo desmenuzado en sartén antiadherente sin aceite con curry',
      'Sumar el arroz y las verduras, mezclar bien',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 658, protein: 49, carbs: 73, fat: 17 },
  },
  {
    name: 'Ensalada tibia de pollo y batata',
    meal: 'Almuerzo',
    time: '10 min',
    batch: ['200 g de pollo', '250 g de batata'],
    extras: ['1 huevo duro', 'Hojas verdes', '10 g de aceite'],
    steps: [
      'Calentar el pollo y la batata en cubos',
      'Sumar el huevo duro en cuartos y las hojas verdes',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 695, protein: 72, carbs: 45, fat: 23 },
  },
  {
    name: 'Bowl de arroz, pollo y huevo',
    meal: 'Almuerzo',
    time: '5 min',
    batch: ['150 g de arroz', '100 g de pollo desmenuzado'],
    extras: ['2 huevos', '1 banana aparte'],
    steps: [
      'Calentar el arroz y el pollo del meal prep',
      'Revolver los huevos en sartén antiadherente sin aceite',
      'Servir todo junto, la banana aparte de postre si querés',
    ],
    macros: { kcal: 637, protein: 50, carbs: 71, fat: 16 },
  },

  // ── Merienda (~450 kcal / 30 g P) — un solo combo, sin sumar de más ──
  {
    name: 'Batido proteico',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['250 ml de leche descremada', '1 scoop de whey', '1 banana', '30 g de avena'],
    steps: [
      'Licuar todo junto hasta que quede cremoso',
      'Tomar frío, ideal post-cardio',
    ],
    macros: { kcal: 431, protein: 39, carbs: 62, fat: 5 },
  },
  {
    name: 'Tostadas con atún',
    meal: 'Merienda',
    time: '5 min',
    batch: ['120 g de atún al natural'],
    extras: ['3 tostadas integrales', 'Tomate en rodajas', '1 banana'],
    steps: [
      'Tostar el pan',
      'Atún escurrido encima con tomate y una pizca de sal',
      'Banana aparte',
    ],
    macros: { kcal: 428, protein: 37, carbs: 63, fat: 4 },
  },
  {
    name: 'Tostadas con jamón y queso',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['2 tostadas integrales', '100 g de jamón cocido light (sin azúcar en etiqueta)', '80 g de queso descremado', '1 manzana grande'],
    steps: [
      'Tostar el pan, armar el sándwich con jamón y queso',
      'La manzana entera aparte',
    ],
    macros: { kcal: 432, protein: 30, carbs: 56, fat: 11 },
  },
  {
    name: 'Yogur con frutos rojos',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['200 g de yogur griego', '½ scoop de whey', '100 g de frutillas', '20 g de frutos secos', '1 banana'],
    steps: [
      'Mezclar el yogur con el whey hasta disolver',
      'Sumar las frutillas cortadas, la banana en rodajas y los frutos secos',
    ],
    macros: { kcal: 483, protein: 32, carbs: 54, fat: 18 },
  },
  {
    name: 'Wrap de pavita',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['1 wrap integral', '80 g de pavita o jamón', '30 g de queso untable', 'Hojas verdes', '1 mandarina', '20 g de frutos secos'],
    steps: [
      'Untar el wrap con el queso, sumar la pavita y las hojas verdes',
      'Enrollar y cortar al medio',
      'Mandarina y frutos secos aparte',
    ],
    macros: { kcal: 442, protein: 28, carbs: 46, fat: 17 },
  },
  {
    name: 'Queso magro con jamón y pera',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['100 g de queso magro tipo cottage o descremado', '2 tostadas integrales', '80 g de jamón cocido light', '1 pera'],
    steps: [
      'Tostar el pan, armar con el queso y el jamón',
      'La pera entera aparte',
    ],
    macros: { kcal: 419, protein: 30, carbs: 49, fat: 12 },
  },
  {
    name: 'Chocolatada proteica',
    meal: 'Merienda',
    time: '5 min',
    batch: [],
    extras: ['250 ml de leche descremada', '1 scoop de whey', 'Cacao amargo sin azúcar', '1 banana', '20 g de avena'],
    steps: [
      'Licuar todo junto',
    ],
    macros: { kcal: 408, protein: 38, carbs: 57, fat: 4 },
  },

  // ── Cena (~550 kcal / 50 g P) ──
  {
    name: 'Merluza al limón con puré de batata',
    meal: 'Cena',
    time: '10 min',
    batch: ['250 g de merluza', '250 g de batata'],
    extras: ['Verduras al vapor', '10 g de aceite'],
    steps: [
      'Pisar la batata caliente con el aceite en crudo → puré',
      'Calentar la merluza con limón (microondas o sartén sin aceite)',
      'Servir con las verduras al vapor',
    ],
    macros: { kcal: 543, protein: 61, carbs: 44, fat: 14 },
  },
  {
    name: 'Cuadrada al chimichurri con arroz',
    meal: 'Cena',
    time: '10 min',
    batch: ['200 g de nalga o cuadrada', '150 g de arroz'],
    extras: ['Ensalada', '5 g de aceite'],
    steps: [
      'Chimichurri hidratado en vinagre y el aceite de la comida',
      'Calentar la carne y el arroz',
      'Chimichurri por arriba, ensalada al costado',
    ],
    macros: { kcal: 587, protein: 64, carbs: 42, fat: 16 },
  },
  {
    name: 'Tortilla de atún y papa',
    meal: 'Cena',
    time: '10 min',
    batch: ['140 g de atún al natural', '200 g de papa'],
    extras: ['2 huevos', '10 g de aceite'],
    steps: [
      'Hervir la papa en rodajas finas',
      'Batir los huevos con el atún escurrido y la papa',
      'Cuajar en sartén antiadherente sin aceite, aceite en crudo al servir',
    ],
    macros: { kcal: 591, protein: 50, carbs: 47, fat: 23 },
  },
  {
    name: 'Wok liviano de pollo',
    meal: 'Cena',
    time: '10 min',
    batch: ['130 g de pollo', '150 g de arroz', '200 g de verduras'],
    extras: ['10 g de aceite'],
    steps: [
      'Sartén antiadherente sin aceite, verduras y pollo a fuego fuerte',
      'Sumar el arroz, mezclar 2-3 min',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 573, protein: 47, carbs: 57, fat: 16 },
  },
  {
    name: 'Ensalada fría de huevo y pollo',
    meal: 'Cena',
    time: '5 min',
    batch: ['2 huevos duros', '80 g de pollo desmenuzado', '200 g de papa'],
    extras: ['60 g de jamón light', 'Hojas verdes', '5 g de aceite o vinagreta'],
    steps: [
      'Papa hervida en cubos, fría',
      'Sumar huevo en cuartos, pollo y jamón',
      'Hojas verdes y vinagreta o aceite en crudo',
    ],
    macros: { kcal: 580, protein: 52, carbs: 42, fat: 22 },
  },
  {
    name: 'Pollo a la plancha con ensalada de garbanzos',
    meal: 'Cena',
    time: '10 min',
    batch: ['140 g de pollo', '150 g de garbanzos cocidos (del freezer)'],
    extras: ['Hojas verdes y tomate', '10 g de aceite'],
    steps: [
      'Pollo a la plancha en sartén antiadherente sin aceite',
      'Garbanzos con hojas verdes y tomate',
      'Aceite en crudo al servir',
    ],
    macros: { kcal: 567, protein: 57, carbs: 41, fat: 19 },
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
