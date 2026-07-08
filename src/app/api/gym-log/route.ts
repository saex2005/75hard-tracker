import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// gym_logs no está en el tipo Database (tabla nueva) — cliente sin genérico
// hasta regenerar tipos. Validación manual abajo.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type GymLog = {
  id: string
  date: string
  session: string
  exercise: string
  set_num: number
  weight: number
  reps: number
  created_at: string
}

const SESSIONS = ['torso', 'piernas', 'empujes', 'traccion']

// GET ?date=YYYY-MM-DD → sets de ese día
// GET ?session=torso&before=YYYY-MM-DD → sets de la última sesión previa (progresión)
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  const session = request.nextUrl.searchParams.get('session')
  const before = request.nextUrl.searchParams.get('before')

  const supabase = getSupabase()

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date inválida (YYYY-MM-DD)' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('gym_logs')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  if (session && before) {
    if (!SESSIONS.includes(session) || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
      return NextResponse.json({ error: 'session o before inválidos' }, { status: 400 })
    }
    // Última fecha previa con registros de esa sesión, y todos sus sets
    const { data: last, error: e1 } = await supabase
      .from('gym_logs')
      .select('date')
      .eq('session', session)
      .lt('date', before)
      .order('date', { ascending: false })
      .limit(1)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    if (!last || last.length === 0) return NextResponse.json([])

    const { data, error } = await supabase
      .from('gym_logs')
      .select('*')
      .eq('session', session)
      .eq('date', last[0].date)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  return NextResponse.json({ error: 'usar ?date= o ?session=&before=' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { date, session, exercise, set_num, weight, reps } = body

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date requerida (YYYY-MM-DD)' }, { status: 400 })
  }
  if (!SESSIONS.includes(session)) {
    return NextResponse.json({ error: `session debe ser: ${SESSIONS.join(', ')}` }, { status: 400 })
  }
  if (!exercise || typeof exercise !== 'string') {
    return NextResponse.json({ error: 'exercise requerido' }, { status: 400 })
  }
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 600) {
    return NextResponse.json({ error: 'weight inválido (0-600 kg)' }, { status: 400 })
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > 100) {
    return NextResponse.json({ error: 'reps inválidas (1-100)' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('gym_logs')
    .insert({
      date,
      session,
      exercise: exercise.trim(),
      set_num: Number.isInteger(set_num) && set_num > 0 ? set_num : 1,
      weight,
      reps,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const supabase = getSupabase()
  const { data, error } = await supabase.from('gym_logs').delete().eq('id', id).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
