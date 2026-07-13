import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type OffNutriments = {
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
}

type OffResponse = {
  status: number
  product?: {
    product_name?: string
    brands?: string
    nutriments?: OffNutriments
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

// GET /api/foods/barcode/:code
// 1. Busca el barcode en la base local (instantáneo).
// 2. Si no está, consulta Open Food Facts en vivo por ese código exacto.
//    Si trae macros completos, lo guarda en la base (source: 'off') y lo devuelve.
// 3. Si tampoco está ahí, devuelve found:false + lo que OFF haya dado de
//    nombre/marca (si algo) para precargar el formulario de "crear alimento".
export async function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code?.trim()
  if (!code || !/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'código de barras inválido' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: local, error: localError } = await supabase
    .from('foods')
    .select('*')
    .eq('barcode', code)
    .maybeSingle()

  if (localError) {
    return NextResponse.json({ error: localError.message }, { status: 500 })
  }
  if (local) {
    return NextResponse.json({ found: true, food: local, origin: 'local' })
  }

  // No está local — consultar Open Food Facts en vivo por el código exacto
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,status`,
      { headers: { 'User-Agent': '75HardTracker/1.0 - app personal (contacto: santiago)' } }
    )
    if (!offRes.ok) throw new Error(`OFF respondió ${offRes.status}`)
    const off: OffResponse = await offRes.json()

    if (off.status !== 1 || !off.product) {
      return NextResponse.json({ found: false, barcode: code })
    }

    const n = off.product.nutriments ?? {}
    const kcal_100 = n['energy-kcal_100g']
    const protein_100 = n.proteins_100g
    const carbs_100 = n.carbohydrates_100g
    const fat_100 = n.fat_100g

    if (!isFiniteNumber(kcal_100) || !isFiniteNumber(protein_100) || !isFiniteNumber(carbs_100) || !isFiniteNumber(fat_100)) {
      // OFF tiene el producto pero sin macros completos — igual sirve el nombre para precargar el form
      return NextResponse.json({
        found: false,
        barcode: code,
        offName: off.product.product_name || null,
        offBrand: off.product.brands || null,
      })
    }

    const { data: created, error: insertError } = await supabase
      .from('foods')
      .insert({
        source: 'off',
        barcode: code,
        name: off.product.product_name?.trim() || `Producto ${code}`,
        brand: off.product.brands?.trim() || null,
        kcal_100,
        protein_100,
        carbs_100,
        fat_100,
        source_ref: `https://world.openfoodfacts.org/product/${code}`,
      })
      .select()
      .single()

    if (insertError) {
      // Puede haber una carrera (otro request ya lo insertó) — buscarlo de nuevo antes de fallar
      const { data: retry } = await supabase.from('foods').select('*').eq('barcode', code).maybeSingle()
      if (retry) return NextResponse.json({ found: true, food: retry, origin: 'local' })
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ found: true, food: created, origin: 'off' })
  } catch {
    return NextResponse.json({ found: false, barcode: code })
  }
}
