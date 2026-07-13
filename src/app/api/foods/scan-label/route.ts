import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extraer_macros',
  description: 'Extrae los datos nutricionales de la foto de una etiqueta de "Información Nutricional" argentina.',
  input_schema: {
    type: 'object',
    properties: {
      product_name: { type: ['string', 'null'], description: 'Nombre del producto si es legible en la foto (envase, no la tabla), sino null' },
      brand: { type: ['string', 'null'], description: 'Marca si es legible, sino null' },
      kcal_100: {
        type: ['number', 'null'],
        description:
          'Calorías (kcal, no kJ) cada 100g o 100ml. Si la etiqueta declara el valor solo "por porción", convertilo a 100g/100ml usando el tamaño de porción indicado. null si no se puede leer con confianza (borroso, cortado, ambiguo) — no inventar.',
      },
      protein_100: { type: ['number', 'null'], description: 'Proteínas en gramos cada 100g/100ml, mismo criterio de conversión que kcal_100' },
      carbs_100: { type: ['number', 'null'], description: 'Carbohidratos totales en gramos cada 100g/100ml' },
      fat_100: { type: ['number', 'null'], description: 'Grasas totales en gramos cada 100g/100ml' },
      notas: { type: ['string', 'null'], description: 'Cualquier ambigüedad relevante: por qué un campo quedó null, si hubo que convertir desde porción, etc.' },
    },
    required: ['product_name', 'brand', 'kcal_100', 'protein_100', 'carbs_100', 'fat_100', 'notas'],
  },
}

// POST /api/foods/scan-label — { image: dataURL base64, barcode?: string }
// Lee la etiqueta con Claude vision. Si logra los 4 macros, guarda el
// alimento en la base (source: 'custom') y lo devuelve listo para usar.
// Si no, devuelve lo que sí pudo leer para precargar el formulario manual.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.API_PRIVATE_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta la API key de Anthropic en el server' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const image: string = body?.image ?? ''
  const barcode: string | undefined = typeof body?.barcode === 'string' ? body.barcode : undefined

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    return NextResponse.json({ error: 'imagen inválida (esperado data URL base64)' }, { status: 400 })
  }
  const [, mediaType, base64Data] = match
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) {
    return NextResponse.json({ error: `tipo de imagen no soportado: ${mediaType}` }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  let extracted: {
    product_name: string | null
    brand: string | null
    kcal_100: number | null
    protein_100: number | null
    carbs_100: number | null
    fat_100: number | null
  }
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extraer_macros' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64Data },
            },
            {
              type: 'text',
              text: 'Esta es la foto de la etiqueta de "Información Nutricional" de un producto argentino. Extraé los datos con la herramienta extraer_macros. Regla dura: si un valor no se lee con confianza (borroso, cortado, tapado), devolvé null en ese campo — nunca inventes ni aproximes un número.',
            },
          ],
        },
      ],
    })

    const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (!toolUse) throw new Error('Claude no devolvió la extracción')
    extracted = toolUse.input as typeof extracted
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo leer la etiqueta: ${err instanceof Error ? err.message : 'error desconocido'}` },
      { status: 500 }
    )
  }

  const { kcal_100, protein_100, carbs_100, fat_100 } = extracted
  const complete =
    isFiniteNumber(kcal_100) && isFiniteNumber(protein_100) && isFiniteNumber(carbs_100) && isFiniteNumber(fat_100)

  if (!complete) {
    // Foto no alcanzó para los 4 macros — se devuelve lo que sí se pudo leer
    // para precargar el formulario manual (paso final, con esto no se pierde nada)
    return NextResponse.json({
      found: false,
      scannedName: extracted.product_name,
      scannedBrand: extracted.brand,
      scannedKcal: isFiniteNumber(kcal_100) ? kcal_100 : null,
      scannedProtein: isFiniteNumber(protein_100) ? protein_100 : null,
      scannedCarbs: isFiniteNumber(carbs_100) ? carbs_100 : null,
      scannedFat: isFiniteNumber(fat_100) ? fat_100 : null,
    })
  }

  const supabase = getSupabase()
  const cleanBarcode = barcode && /^\d{6,14}$/.test(barcode) ? barcode : null
  const { data: created, error: insertError } = await supabase
    .from('foods')
    .insert({
      source: 'custom',
      barcode: cleanBarcode,
      name: extracted.product_name?.trim() || (cleanBarcode ? `Producto ${cleanBarcode}` : 'Producto escaneado'),
      brand: extracted.brand?.trim() || null,
      kcal_100,
      protein_100,
      carbs_100,
      fat_100,
      source_ref: 'Leído de etiqueta por IA (Claude vision)',
    })
    .select()
    .single()

  if (insertError) {
    // Carrera con otro request que ya insertó el mismo barcode — no es fatal
    if (insertError.code === '23505' && cleanBarcode) {
      const { data: existing } = await supabase.from('foods').select('*').eq('barcode', cleanBarcode).maybeSingle()
      if (existing) return NextResponse.json({ found: true, food: existing })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ found: true, food: created })
}
