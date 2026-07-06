'use client'

import { useCallback, useEffect, useState } from 'react'
import { DAILY_MACROS, MEALS, MEAL_PREP, SHOPPING_LIST, EMERGENCY_MEALS, QUICK_MEALS } from '@/config/nutrition'
import { cn, todayISO } from '@/lib/utils'
import type { FoodLog } from '@/lib/supabase'
import MacroBars from '@/components/MacroBars'
import FoodSearch, { type NewLogEntry } from '@/components/FoodSearch'
import FoodLogList from '@/components/FoodLogList'

type Tab = 'registro' | 'comidas' | 'mealprep' | 'compras' | 'emergencias'

const TABS: { id: Tab; label: string }[] = [
  { id: 'registro', label: 'Registro' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'mealprep', label: 'Meal Prep' },
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
        {activeTab === 'comidas' && <TabComidas />}
        {activeTab === 'mealprep' && <TabMealPrep />}
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

function TabComidas() {
  return (
    <div className="space-y-3 pb-4">
      {MEALS.map((meal) => (
        <div key={meal.name} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] font-mono text-[#52525B]">{meal.time}</p>
              <p className="text-base font-bold">{meal.name}</p>
              <p className="text-xs text-[#52525B] font-medium">{meal.note}</p>
            </div>
            {meal.kcal !== null && (
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-black tabular-nums text-[#FAFAFA]">{meal.kcal} kcal</p>
                <p className="text-xs text-accent font-mono tabular-nums">{meal.protein}g P</p>
              </div>
            )}
          </div>
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
      {/* Método del plato */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">Método del plato</p>
        <div className="space-y-1">
          {[
            ['½ plato', 'verduras'],
            ['¼ plato', 'proteína'],
            ['¼ plato', 'arroz / papa / legumbres'],
          ].map(([fraccion, contenido]) => (
            <div key={fraccion} className="flex items-center gap-2">
              <span className="text-sm font-black text-accent tabular-nums w-14 shrink-0">{fraccion}</span>
              <span className="text-sm text-[#A1A1AA] font-medium">{contenido}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#52525B] font-medium mt-2">
          El plato ocupa ¾ de su capacidad. Sin carbo → proteína pasa a medio plato.
        </p>
      </div>
    </div>
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
