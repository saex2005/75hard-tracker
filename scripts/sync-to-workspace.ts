import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { format, parseISO, differenceInDays } from 'date-fns'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const WORKSPACE_FILE = join(__dirname, '../../context/current-data.md')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

async function sync() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const [{ data: cs }, { data: days }, { data: weights }] = await Promise.all([
    supabase.from('challenge_state').select('*').eq('id', 1).single(),
    supabase.from('days').select('*').order('day_number', { ascending: false }).limit(10),
    supabase.from('weight_checkpoints').select('*').order('date', { ascending: false }).limit(5),
  ])

  if (!cs) {
    console.error('No se encontró challenge_state')
    process.exit(1)
  }

  const dayNumber = differenceInDays(new Date(), parseISO(cs.current_run_start)) + 1
  const completedDays = days?.filter((d) => d.completed).length ?? 0

  const dayLog = days
    ?.slice(0, 7)
    .map((d) => {
      const status = d.completed ? '✓' : '✗'
      return `| ${format(parseISO(d.date), 'dd/MM')} | Día ${d.day_number} | ${status} | ${tasks(d)} |`
    })
    .join('\n') ?? ''

  const weightLog = weights
    ?.map((w) => `| ${format(parseISO(w.date), 'dd/MM')} | ${w.weight_kg} kg | ${w.notes ?? ''} |`)
    .join('\n') ?? ''

  const latestWeight = weights?.[0]?.weight_kg

  const content = `# Estado actual — 75 Hard

*Actualizado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}*

---

## Progreso del reto

- **Día actual:** ${dayNumber} de 75
- **Días completados:** ${completedDays}
- **Mejor racha:** ${cs.best_streak} días
- **Reintentos:** ${cs.total_restarts}
- **Inicio de racha actual:** ${format(parseISO(cs.current_run_start), 'dd/MM/yyyy')}

---

## Log reciente (últimos 7 días)

| Fecha | Día | Estado | Tasks |
|-------|-----|--------|-------|
${dayLog}

---

## Peso

${latestWeight ? `**Último registro:** ${latestWeight} kg` : 'Sin registros de peso todavía'}

| Fecha | Peso | Notas |
|-------|------|-------|
${weightLog}

---

*Generado con: \`npx ts-node scripts/sync-to-workspace.ts\`*
`

  writeFileSync(WORKSPACE_FILE, content, 'utf8')
  console.log(`✓ context/current-data.md actualizado (Día ${dayNumber})`)
}

function tasks(d: Record<string, unknown>): string {
  const t = []
  if (d.gym_done) t.push('gym')
  if (d.cardio_done) t.push('cardio')
  if (Number(d.water_bottles) >= 4) t.push('agua')
  if (d.diet_done) t.push('dieta')
  if (d.insight_done) t.push('insightmkt')
  if (d.reading_done) t.push('lectura')
  if (d.photo_url) t.push('foto')
  return `${t.length}/7 ${t.join(', ')}`
}

sync().catch(console.error)
