import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// 7 ciclos de 14 días desde el 23/09/2026 → 31/12/2026 (100 días exactos).
// El último ciclo absorbe los 2 días sobrantes (16 días en vez de 14).
const CYCLES = [
  { cycle_number: 1, start_date: '2026-09-23', end_date: '2026-10-06' },
  { cycle_number: 2, start_date: '2026-10-07', end_date: '2026-10-20' },
  { cycle_number: 3, start_date: '2026-10-21', end_date: '2026-11-03' },
  { cycle_number: 4, start_date: '2026-11-04', end_date: '2026-11-17' },
  { cycle_number: 5, start_date: '2026-11-18', end_date: '2026-12-01' },
  { cycle_number: 6, start_date: '2026-12-02', end_date: '2026-12-15' },
  { cycle_number: 7, start_date: '2026-12-16', end_date: '2026-12-31' },
]

async function seed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const { error } = await supabase
    .from('study_cycles')
    .upsert(CYCLES, { onConflict: 'cycle_number' })

  if (error) {
    console.error('Error al seedear study_cycles:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${CYCLES.length} ciclos de estudio seedeados (23/09/2026 → 31/12/2026)`)
}

seed()
