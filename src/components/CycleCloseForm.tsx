'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CycleCloseFormProps {
  onSubmit: (payload: { topic: string; account: string; closing_doc: string }) => Promise<void>
}

const ACCOUNTS = ['ThisWeek', 'Archie', 'Gufo']

export default function CycleCloseForm({ onSubmit }: CycleCloseFormProps) {
  const [topic, setTopic] = useState('')
  const [account, setAccount] = useState('')
  const [closingDoc, setClosingDoc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = topic.trim() && account && closingDoc.trim() && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    await onSubmit({ topic: topic.trim(), account, closing_doc: closingDoc.trim() })
    setSubmitting(false)
  }

  return (
    <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <p className="text-xs font-bold text-accent uppercase tracking-wide">Cierre de ciclo</p>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Tema estudiado"
        className="w-full rounded-md bg-surface2 border border-[#262626] px-2 py-1.5 text-xs text-[#FAFAFA] placeholder:text-[#52525B]"
      />
      <div className="flex gap-2 flex-wrap">
        {ACCOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAccount(a)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95',
              account === a ? 'bg-accent text-black' : 'bg-surface2 text-[#A1A1AA]'
            )}
          >
            {a}
          </button>
        ))}
      </div>
      <textarea
        value={closingDoc}
        onChange={(e) => setClosingDoc(e.target.value)}
        placeholder="Qué vas a implementar y cuándo"
        rows={3}
        className="w-full rounded-md bg-surface2 border border-[#262626] px-2 py-1.5 text-xs text-[#FAFAFA] placeholder:text-[#52525B] resize-none"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-lg bg-accent text-black text-xs font-bold py-2 disabled:opacity-40 active:scale-95 transition-all"
      >
        {submitting ? 'Guardando…' : 'Cerrar ciclo'}
      </button>
    </div>
  )
}
