'use client'

import { useState } from 'react'
import { DAILY_MACROS, MEALS, MEAL_PREP, SHOPPING_LIST, EMERGENCY_MEALS } from '@/config/nutrition'
import { cn } from '@/lib/utils'

type Tab = 'comidas' | 'mealprep' | 'compras' | 'emergencias'

const TABS: { id: Tab; label: string }[] = [
  { id: 'comidas', label: 'Comidas' },
  { id: 'mealprep', label: 'Meal Prep' },
  { id: 'compras', label: 'Compras' },
  { id: 'emergencias', label: 'Emergencias' },
]

export default function NutricionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('comidas')

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
      <div className="flex border-b border-[#262626] px-4 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 pb-2 text-xs font-semibold tracking-wide transition-colors duration-150',
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
        {activeTab === 'comidas' && <TabComidas />}
        {activeTab === 'mealprep' && <TabMealPrep />}
        {activeTab === 'compras' && <TabCompras />}
        {activeTab === 'emergencias' && <TabEmergencias />}
      </div>
    </main>
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
