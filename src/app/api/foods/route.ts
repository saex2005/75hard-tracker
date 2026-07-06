import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function isValidMacro(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, brand, kcal_100, protein_100, carbs_100, fat_100, serving_g } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name requerido' }, { status: 400 })
  }
  if (!isValidMacro(kcal_100) || !isValidMacro(protein_100) || !isValidMacro(carbs_100) || !isValidMacro(fat_100)) {
    return NextResponse.json(
      { error: 'kcal_100, protein_100, carbs_100 y fat_100 requeridos (números ≥ 0)' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('foods')
    .insert({
      source: 'custom',
      name: name.trim(),
      brand: typeof brand === 'string' && brand.trim() ? brand.trim() : null,
      kcal_100,
      protein_100,
      carbs_100,
      fat_100,
      serving_g: isValidMacro(serving_g) && serving_g > 0 ? serving_g : null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
