'use client'

import { useCallback, useEffect, useState } from 'react'
import { DAILY_MACROS, MEAL_PREP, SHOPPING_LIST, EMERGENCY_MEALS, QUICK_MEALS, RECIPES, SEASONINGS, RECIPE_RULES } from '@/config/nutrition'
import type { Recipe } from '@/config/nutrition'
import { cn, todayISO, isDayComplete } from '@/lib/utils'
import { supabase, type FoodLog, type MealSlot } from '@/lib/supabase'
import MacroBars from '@/components/MacroBars'
import FoodSearch, { type NewLogEntry } from '@/components/FoodSearch'
import FoodLogList from '@/components/FoodLogList'

// Comidas fijas del día — si las 4 tienen al menos un registro hoy, se
// marca sola la task de dieta en el checklist (home). No desmarca sola si
// borrás un registro después: la regla binaria la seguís definiendo vos.
const REQUIRED_MEALS: MealSlot[] = ['desayuno', 'almuerzo', 'merienda', 'cena']

async function checkAndMarkDiet(date: string) {
  try {
    const res = await fetch(`/api/food-log?date=${date}`)
    if (!res.ok) return
    const logs: FoodLog[] = await res.json()
    const covered = new Set(logs.map((l) => l.meal))
    if (!REQUIRED_MEALS.every((m) => covered.has(m))) return

    const { data: day } = await supabase.from('days').select('*').eq('date', date).single()
    if (!day || day.diet_done) return

    const completed = isDayComplete({ ...day, diet_done: true })
    const { error } = await supabase.from('days').update({ diet_done: true, completed }).eq('id', day.id)
    if (error) return

    if (completed && !day.completed) {
      const { data: cs } = await supabase.from('challenge_state').select('*').eq('id', 1).single()
      if (cs && day.day_number > cs.best_streak) {
        await supabase.from('challenge_state').update({ best_streak: day.day_number }).eq('id', 1)
      }
    }
  } catch {
    // no bloquea el registro de comida si esto falla — se puede marcar manual
  }
}

type Tab = 'registro' | 'mealprep' | 'recetas' | 'compras' | 'emergencias'

const TABS: { id: Tab; label: string }[] = [
  { id: 'registro', label: 'Registro' },
  { id: 'mealprep', label: 'Meal Prep' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'compras', label: 'Compras' },
  { id: 'emergencias', label: 'Emergencias' },
]

export default function NutricionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('registro')

  return (
    <main className="max-w-md mx-auto pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-black tracking-tight mb-4">Nutrición</h1>
        {/* Macros del día */}
        <div className="grid grid-cols-4 gap-2">
          <MacroChip label="kcal" value={DAILY_MACROS.kcal.toString()} />
          <MacroChip label="proteína" value={`${DAILY_MACROS.protein}g`} accent />
          <MacroChip label="carbos" value={`${DAILY_MACROS.carbs}g`} />
          <MacroChip label="grasas" value={`${DAILY_MACROS.fat}g`} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262626] px-4 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 shrink-0 px-2 pb-2 text-xs font-semibold tracking-wide transition-colors duration-150 whitespace-nowrap',
              activeTab === tab.id
                ? 'border-b-2 border-accent text-[#FAFAFA]'
                : 'text-[#52525B]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-4 space-y-3">
        {activeTab === 'registro' && <TabRegistro />}
        {activeTab === 'mealprep' && <TabMealPrep />}
        {activeTab === 'recetas' && <TabRecetas />}
        {activeTab === 'compras' && <TabCompras />}
        {activeTab === 'emergencias' && <TabEmergencias />}
      </div>
    </main>
  )
}

function TabRegistro() {
  const [entries, setEntries] = useState<FoodLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const date = todayISO()

  useEffect(() => {
    let cancelled = false
    fetch(`/api/food-log?date=${date}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FoodLog[]) => {
        if (!cancelled) {
          setEntries(data)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [date])

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // UI optimista: agrega local con id temporal, revierte si la API falla
  const addEntry = useCallback(
    async (entry: NewLogEntry) => {
      const tempId = `temp-${Date.now()}`
      const optimistic: FoodLog = {
        id: tempId,
        date,
        created_at: new Date().toISOString(),
        ...entry,
      }
      setEntries((prev) => [...prev, optimistic])

      try {
        const res = await fetch('/api/food-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, ...entry }),
        })
        if (!res.ok) throw new Error()
        const saved: FoodLog = await res.json()
        setEntries((prev) => prev.map((e) => (e.id === tempId ? saved : e)))
        checkAndMarkDiet(date)
      } catch {
        setEntries((prev) => prev.filter((e) => e.id !== tempId))
      }
    },
    [date]
  )

  const deleteEntry = useCallback(async (id: string) => {
    let removed: FoodLog | undefined
    setEntries((prev) => {
      removed = prev.find((e) => e.id === id)
      return prev.filter((e) => e.id !== id)
    })
    if (id.startsWith('temp-')) return

    try {
      const res = await fetch(`/api/food-log?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      if (removed) setEntries((prev) => [...prev, removed!])
    }
  }, [])

  // Quick-add: 1 tap registra la comida completa del plan (no duplica)
  const quickAdd = useCallback(
    (qm: (typeof QUICK_MEALS)[number]) => {
      addEntry({
        meal: qm.meal,
        food_id: null,
        food_name: qm.label,
        grams: 1, // placeholder — la comida del plan no se mide en gramos
        kcal: qm.kcal,
        protein: qm.protein,
        carbs: qm.carbs,
        fat: qm.fat,
      })
    },
    [addEntry]
  )

  return (
    <div className="space-y-4 pb-4">
      <MacroBars totals={totals} />

      {/* Quick-add de las comidas del plan */}
      <div>
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">
          Comidas del plan
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_MEALS.map((qm) => {
            const done = entries.some((e) => e.meal === qm.meal && e.food_name === qm.label)
            return (
              <button
                key={qm.meal}
                onClick={() => !done && quickAdd(qm)}
                disabled={done}
                className={cn(
                  'h-12 rounded-xl text-xs font-semibold border transition-transform active:scale-[0.98]',
                  done
                    ? 'border-green-500/30 bg-green-500/5 text-green-500'
                    : 'border-[#262626] bg-[#141414] text-[#A1A1AA]'
                )}
              >
                {qm.label.replace(' del plan', '')}
                <span className="block text-[10px] font-mono tabular-nums text-[#52525B]">
                  {done ? 'registrado' : `${qm.kcal} kcal · ${qm.protein}P`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <FoodSearch onAdd={addEntry} />

      {loaded ? (
        <FoodLogList entries={entries} onDelete={deleteEntry} />
      ) : (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 bg-[#141414] border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}

function MacroChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 text-center">
      <p className={cn('text-base font-black tabular-nums tracking-tight', accent ? 'text-accent' : 'text-[#FAFAFA]')}>
        {value}
      </p>
      <p className="text-[10px] font-medium text-[#52525B] mt-0.5">{label}</p>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
      {children}
    </h2>
  )
}

function TabMealPrep() {
  return (
    <div className="space-y-4 pb-4">
      {MEAL_PREP.map((session) => (
        <div key={session.day} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-lg font-black">{session.day}</p>
            <p className="text-xs font-mono text-[#52525B]">{session.time}</p>
          </div>
          <p className="text-xs text-[#52525B] font-medium mb-4">Cubre: {session.covers}</p>

          {/* Ingredientes */}
          <SectionHeader>Qué cocinar</SectionHeader>
          <div className="space-y-2 mb-4">
            {session.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-[#1C1C1C] last:border-0">
                <span className="text-sm text-[#A1A1AA] font-medium flex-1">{item.name}</span>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono tabular-nums text-[#FAFAFA]">{item.raw}</p>
                  <p className="text-xs text-[#52525B] font-medium">{item.portions}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <SectionHeader>Tips</SectionHeader>
          <ul className="space-y-1.5">
            {session.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent mt-0.5 shrink-0 text-xs">›</span>
                <span className="text-sm text-[#A1A1AA] font-medium">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const RECIPE_FILTERS = ['Todas', 'Desayuno', 'Almuerzo', 'Merienda', 'Cena'] as const
type RecipeFilter = (typeof RECIPE_FILTERS)[number]

// Qué meal slot(s) del tracker corresponden a cada receta. Las 9 originales
// "Almuerzo o cena" ofrecen los dos botones — el resto es 1 a 1.
const MEAL_SLOTS: Record<string, MealSlot[]> = {
  Desayuno: ['desayuno'],
  Almuerzo: ['almuerzo'],
  Merienda: ['merienda'],
  Cena: ['cena'],
  'Almuerzo o cena': ['almuerzo', 'cena'],
}
const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  extra: 'Extra',
}

function TabRecetas() {
  const [filter, setFilter] = useState<RecipeFilter>('Todas')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())
  const date = todayISO()

  useEffect(() => {
    let cancelled = false
    fetch(`/api/food-log?date=${date}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: FoodLog[]) => {
        if (!cancelled) setLoggedToday(new Set(data.map((e) => `${e.meal}:${e.food_name}`)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [date])

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const registrar = useCallback(
    async (recipe: Recipe, meal: MealSlot) => {
      const key = `${meal}:${recipe.name}`
      setPending((prev) => new Set(prev).add(key))
      try {
        const res = await fetch('/api/food-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            meal,
            food_id: null,
            food_name: recipe.name,
            grams: 1, // la receta se registra como comida completa, no por gramaje
            kcal: recipe.macros.kcal,
            protein: recipe.macros.protein,
            carbs: recipe.macros.carbs,
            fat: recipe.macros.fat,
          }),
        })
        if (!res.ok) throw new Error()
        setLoggedToday((prev) => new Set(prev).add(key))
        checkAndMarkDiet(date)
      } catch {
        // se puede reintentar tocando el botón de nuevo
      } finally {
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [date]
  )

  const visible = filter === 'Todas' ? RECIPES : RECIPES.filter((r) => r.meal.includes(filter))

  return (
    <div className="space-y-4 pb-4">
      <p className="text-xs text-[#52525B] font-medium">
        {RECIPES.length} recetas — combinaciones de lo ya cocinado en el batch, más variantes de desayuno y merienda. Tocá una para ver el armado.
      </p>

      {/* Filtro por comida */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {RECIPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150',
              filter === f
                ? 'bg-accent text-black'
                : 'bg-[#141414] border border-[#262626] text-[#A1A1AA]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.map((recipe) => {
        const isOpen = expanded.has(recipe.name)
        const slots = MEAL_SLOTS[recipe.meal] ?? ['extra']
        return (
          <div key={recipe.name} className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
            {/* Header — toca el texto para expandir, los botones registran */}
            <div className="flex items-start justify-between gap-2 p-4">
              <button onClick={() => toggle(recipe.name)} className="min-w-0 flex-1 text-left">
                <p className="text-base font-bold">{recipe.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-accent font-semibold">{recipe.meal}</p>
                  <span className="text-[#3F3F46]">·</span>
                  <p className="text-[11px] font-mono text-[#52525B]">{recipe.time}</p>
                  <span className={cn('text-[#52525B] text-sm transition-transform duration-150', isOpen && 'rotate-45')}>
                    +
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#71717A] mt-1.5">
                  {recipe.macros.kcal} kcal · {recipe.macros.protein}P · {recipe.macros.carbs}C · {recipe.macros.fat}G
                </p>
              </button>

              <div className="flex flex-col gap-1.5 shrink-0">
                {slots.map((meal) => {
                  const key = `${meal}:${recipe.name}`
                  const done = loggedToday.has(key)
                  const isPending = pending.has(key)
                  return (
                    <button
                      key={meal}
                      onClick={() => !done && !isPending && registrar(recipe, meal)}
                      disabled={done || isPending}
                      className={cn(
                        'h-8 px-3 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-colors duration-150',
                        done
                          ? 'border-green-500/30 bg-green-500/5 text-green-500'
                          : 'border-[#262626] bg-[#0A0A0A] text-[#A1A1AA] active:scale-[0.97]'
                      )}
                    >
                      {done
                        ? `${slots.length > 1 ? MEAL_SLOT_LABEL[meal] + ' ' : ''}✓`
                        : isPending
                          ? '...'
                          : slots.length > 1
                            ? `+ ${MEAL_SLOT_LABEL[meal]}`
                            : '+ Registrar'}
                    </button>
                  )
                })}
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4">
                {recipe.batch.length > 0 && (
                  <>
                    <SectionHeader>Del batch</SectionHeader>
                    <ul className="space-y-1 mb-3">
                      {recipe.batch.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#3F3F46] mt-1 shrink-0">—</span>
                          <span className="text-sm text-[#A1A1AA] font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <SectionHeader>Frescos y condimentos</SectionHeader>
                <ul className="space-y-1 mb-3">
                  {recipe.extras.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#3F3F46] mt-1 shrink-0">—</span>
                      <span className="text-sm text-[#A1A1AA] font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <SectionHeader>Armado</SectionHeader>
                <ol className="space-y-1.5">
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-xs font-black text-accent tabular-nums mt-0.5 shrink-0 w-4">{i + 1}.</span>
                      <span className="text-sm text-[#A1A1AA] font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      })}

      {/* Banco de condimentos */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
        <SectionHeader>Banco de condimentos</SectionHeader>
        <div className="space-y-2.5">
          {SEASONINGS.map((s) => (
            <div key={s.name} className="py-1.5 border-b border-[#1C1C1C] last:border-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[#FAFAFA]">{s.name}</p>
                <p className="text-[11px] text-accent font-medium shrink-0">{s.pair}</p>
              </div>
              <p className="text-xs text-[#52525B] font-medium mt-0.5">{s.how}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reglas de armado */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
        <SectionHeader>Reglas de armado</SectionHeader>
        <ul className="space-y-1.5">
          {RECIPE_RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0 text-xs">›</span>
              <span className="text-sm text-[#A1A1AA] font-medium">{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TabCompras() {
  return (
    <div className="space-y-4 pb-4">
      <p className="text-xs text-[#52525B] font-medium">
        Cantidades para 7 días — basadas en 2 meal preps semanales (domingo + miércoles).
      </p>
      {SHOPPING_LIST.map((section) => (
        <div key={section.category} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <SectionHeader>{section.category}</SectionHeader>
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-[#1C1C1C] last:border-0">
                <span className="text-sm text-[#A1A1AA] font-medium flex-1">{item.name}</span>
                <span className="text-sm font-mono tabular-nums text-accent shrink-0">{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TabEmergencias() {
  return (
    <div className="space-y-3 pb-4">
      <p className="text-xs text-[#52525B] font-medium mb-1">
        Día desarmado, sin batch, menos de 15 min.
      </p>
      {EMERGENCY_MEALS.map((meal) => (
        <div key={meal.name} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <p className="text-base font-bold mb-3">{meal.name}</p>
          <ul className="space-y-1.5">
            {meal.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#3F3F46] mt-1 shrink-0">—</span>
                <span className="text-sm text-[#A1A1AA] font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {/* Regla 8 */}
      <div className="bg-[#1A0A0A] border border-red-500/20 rounded-xl p-4">
        <p className="text-xs font-bold text-red-500 tracking-wide uppercase mb-1">Regla 8</p>
        <p className="text-sm text-[#A1A1AA] font-medium">
          Si es ambiguo, no se come. Un fallo de dieta = Día 1.
        </p>
      </div>
    </div>
  )
}
