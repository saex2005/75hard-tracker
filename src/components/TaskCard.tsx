'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  icon: string
  label: string
  done: boolean
  children?: React.ReactNode
  onToggle?: () => void
  disabled?: boolean
}

const SWIPE_THRESHOLD = 72
const DRAG_MAX = 120
const DIRECTION_LOCK_PX = 6

export default function TaskCard({ icon, label, done, children, onToggle, disabled }: TaskCardProps) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const active = useRef(false)
  const dragXRef = useRef(0)

  function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!onToggle || disabled) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, select, a')) return
    active.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    isHorizontal.current = null
    dragXRef.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!active.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current

    if (isHorizontal.current === null) {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return
      isHorizontal.current = Math.abs(dx) >= Math.abs(dy)
    }

    if (!isHorizontal.current) {
      active.current = false
      setIsDragging(false)
      setDragX(0)
      dragXRef.current = 0
      return
    }

    e.preventDefault()
    const clamped = clamp(dx, -DRAG_MAX, DRAG_MAX)
    dragXRef.current = clamped
    setDragX(clamped)
    setIsDragging(true)
  }

  function onPointerUp() {
    if (!active.current) return
    active.current = false
    setIsDragging(false)

    if (Math.abs(dragXRef.current) >= SWIPE_THRESHOLD && onToggle && !disabled) {
      onToggle()
    }

    dragXRef.current = 0
    setDragX(0)
  }

  function onPointerCancel() {
    active.current = false
    setIsDragging(false)
    dragXRef.current = 0
    setDragX(0)
  }

  const absDrag = Math.abs(dragX)
  const hintOpacity = Math.min(absDrag / SWIPE_THRESHOLD, 1)
  const showGreenHint = dragX > 0 && !done
  const showOrangeHint = dragX < 0 && done

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        backgroundColor:
          showGreenHint
            ? `rgba(34, 197, 94, ${hintOpacity * 0.15})`
            : showOrangeHint
            ? `rgba(249, 115, 22, ${hintOpacity * 0.15})`
            : undefined,
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
        className={cn(
          'rounded-xl border p-4 transition-colors duration-300',
          done
            ? 'bg-green-500/5 border-green-500/25'
            : 'bg-surface border-[#262626]'
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={done}
            aria-label={`Marcar ${label} como ${done ? 'incompleto' : 'completado'}`}
            className={cn(
              'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150',
              'active:scale-95',
              done
                ? 'bg-green-500 border-green-500'
                : 'border-[#52525B] bg-transparent hover:border-[#A1A1AA]',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {done && (
              <svg
                className="w-3.5 h-3.5 text-black"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 7L5.5 10L11.5 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <span className="text-base" aria-hidden="true">{icon}</span>

          <span className="font-semibold text-sm flex-1 text-[#FAFAFA]">
            {label}
          </span>
        </div>

        {children && (
          <div className="mt-3 pl-9">{children}</div>
        )}
      </div>
    </div>
  )
}
