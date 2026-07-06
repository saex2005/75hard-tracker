/**
 * Carga generic-foods-ar.json en la tabla `foods` con source='generic'.
 * Idempotente: borra los generic existentes y recarga.
 *
 * Uso: cd 75hard-app && npx ts-node scripts/seed-generic-foods.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Database } from '../src/lib/supabase'

const envPath = join(__dirname, '../.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL / key en .env.local')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

type GenericFood = {
  name: string
  kcal_100: number
  protein_100: number
  carbs_100: number
  fat_100: number
  fiber_100?: number
  serving_g?: number
  serving_name?: string
  source_ref: string
}

async function main() {
  const raw = readFileSync(join(__dirname, 'data/generic-foods-ar.json'), 'utf8')
  const foods: GenericFood[] = JSON.parse(raw)

  // Validación básica antes de tocar la DB
  for (const f of foods) {
    if (!f.name || typeof f.kcal_100 !== 'number' || typeof f.protein_100 !== 'number' ||
        typeof f.carbs_100 !== 'number' || typeof f.fat_100 !== 'number') {
      console.error(`ERROR: alimento inválido en el JSON: ${JSON.stringify(f)}`)
      process.exit(1)
    }
  }

  console.log(`Seed de ${foods.length} alimentos genéricos...`)

  // Idempotente: borrar los generic existentes y recargar
  const { error: delError } = await supabase.from('foods').delete().eq('source', 'generic')
  if (delError) {
    console.error(`ERROR borrando generics existentes: ${delError.message}`)
    process.exit(1)
  }

  const rows = foods.map((f) => ({
    source: 'generic' as const,
    barcode: null,
    name: f.name,
    brand: null,
    kcal_100: f.kcal_100,
    protein_100: f.protein_100,
    carbs_100: f.carbs_100,
    fat_100: f.fat_100,
    fiber_100: f.fiber_100 ?? null,
    serving_g: f.serving_g ?? null,
    serving_name: f.serving_name ?? null,
    source_ref: f.source_ref,
  }))

  const { error } = await supabase.from('foods').insert(rows)
  if (error) {
    console.error(`ERROR insertando: ${error.message}`)
    process.exit(1)
  }

  console.log(`OK — ${rows.length} alimentos genéricos cargados.`)
}

main().catch((err) => {
  console.error(`ERROR: ${err.message || err}`)
  process.exit(1)
})
