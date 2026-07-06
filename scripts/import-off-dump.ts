/**
 * Import de Open Food Facts Argentina desde el dump oficial CSV (~0.9 GB gz).
 * Reemplaza a import-off-argentina.ts (la paginación profunda del search API
 * devuelve 503 del lado de OFF — verificado 2026-07-06).
 *
 * - Streamea el CSV gzip sin escribirlo a disco (fetch → gunzip → readline)
 * - Filtra productos con countries_tags que incluya argentina
 * - Solo importa los que tienen los 4 macros completos por 100g
 * - Upsert por barcode (idempotente, compatible con lo ya importado por API)
 *
 * Uso: cd 75hard-app && npx tsx scripts/import-off-dump.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createGunzip } from 'zlib'
import { createInterface } from 'readline'
import { Readable } from 'stream'
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

const DUMP_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz'
const USER_AGENT = '75HardTracker/1.0 (ccollatti@gmail.com)'

type FoodInsert = Database['public']['Tables']['foods']['Insert']

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function parseServing(s?: string): number | null {
  if (!s) return null
  const m = s.match(/([\d.,]+)\s*(g|ml)/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null
}

async function upsertBatch(rows: FoodInsert[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from('foods').upsert(batch, { onConflict: 'barcode' })
    if (error) throw new Error(`Upsert falló: ${error.message}`)
  }
}

async function main() {
  console.log('Descargando y filtrando el dump de OFF (streaming, ~0.9 GB)...')
  const res = await fetch(DUMP_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`Descarga falló: HTTP ${res.status}`)

  const gunzip = createGunzip()
  Readable.fromWeb(res.body as import('stream/web').ReadableStream).pipe(gunzip)
  const rl = createInterface({ input: gunzip, crlfDelay: Infinity })

  let cols: Record<string, number> | null = null
  let lines = 0
  let argentina = 0
  const foods: FoodInsert[] = []
  const seen = new Set<string>()

  for await (const line of rl) {
    if (!cols) {
      // Header: mapear nombre de columna → índice
      const header = line.split('\t')
      cols = {}
      header.forEach((name, i) => (cols![name] = i))
      for (const required of ['code', 'product_name', 'brands', 'countries_tags', 'energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'fat_100g']) {
        if (!(required in cols)) throw new Error(`Columna faltante en el dump: ${required}`)
      }
      continue
    }

    lines++
    if (lines % 500000 === 0) {
      console.log(`  ${(lines / 1e6).toFixed(1)}M líneas — ${argentina} AR encontrados, ${foods.length} con macros completos`)
    }

    // Pre-filtro barato antes de splitear la línea entera
    if (!line.includes('argentina')) continue

    const f = line.split('\t')
    const countries = f[cols['countries_tags']]
    if (!countries || !countries.includes('en:argentina')) continue
    argentina++

    const code = f[cols['code']]
    const name = (f[cols['product_name']] || '').trim()
    if (!code || !name || seen.has(code)) continue

    // kcal directo, o convertido desde energy_100g (kJ) si la etiqueta no declaraba kcal
    let kcal = parseNum(f[cols['energy-kcal_100g']])
    if (kcal === null && cols['energy_100g'] !== undefined) {
      const kj = parseNum(f[cols['energy_100g']])
      if (kj !== null && kj >= 0) kcal = kj / 4.184
    }
    const protein = parseNum(f[cols['proteins_100g']])
    const carbs = parseNum(f[cols['carbohydrates_100g']])
    const fat = parseNum(f[cols['fat_100g']])

    if (
      kcal === null || protein === null || carbs === null || fat === null ||
      kcal < 0 || protein < 0 || carbs < 0 || fat < 0 || kcal > 950
    ) continue

    seen.add(code)
    const brandsRaw = f[cols['brands']]
    const servingRaw = cols['serving_size'] !== undefined ? f[cols['serving_size']] : undefined
    const fiber = cols['fiber_100g'] !== undefined ? parseNum(f[cols['fiber_100g']]) : null
    const servingG = parseServing(servingRaw)

    foods.push({
      source: 'off',
      barcode: code,
      name,
      brand: brandsRaw ? brandsRaw.split(',')[0].trim() || null : null,
      kcal_100: round1(kcal),
      protein_100: round1(protein),
      carbs_100: round1(carbs),
      fat_100: round1(fat),
      fiber_100: fiber !== null && fiber >= 0 ? round1(fiber) : null,
      serving_g: servingG,
      serving_name: servingG && servingRaw ? servingRaw.trim() : null,
      source_ref: `https://ar.openfoodfacts.org/producto/${code}`,
    })
  }

  console.log(`\nDump procesado: ${lines} líneas totales`)
  console.log(`Argentina: ${argentina} productos, ${foods.length} con macros completos (${Math.round((foods.length / Math.max(argentina, 1)) * 100)}%)`)

  console.log('Subiendo a Supabase...')
  await upsertBatch(foods)

  const { count } = await supabase.from('foods').select('*', { count: 'exact', head: true }).eq('source', 'off')

  console.log('\n========== REPORTE FINAL ==========')
  console.log(`Productos AR en el dump:       ${argentina}`)
  console.log(`Con macros completos (subidos): ${foods.length}`)
  console.log(`Total OFF en la tabla foods:    ${count}`)
  console.log('===================================')
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message || err}`)
  process.exit(1)
})
