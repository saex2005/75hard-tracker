'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Hoy', icon: '⬛' },
  { href: '/historia', label: 'Historial', icon: '📋' },
  { href: '/fotos', label: 'Fotos', icon: '📸' },
  { href: '/stats', label: 'Stats', icon: '📊' },
  { href: '/peso', label: 'Peso', icon: '⚖️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-[#262626] pb-safe"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch h-16 max-w-md mx-auto">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center h-full gap-0.5 transition-colors duration-150',
                  active ? 'text-accent' : 'text-[#52525B] hover:text-[#A1A1AA]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg leading-none" aria-hidden="true">{icon}</span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
