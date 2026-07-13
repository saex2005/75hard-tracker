// Backup completo de Supabase: exporta las 9 tablas a un JSON con timestamp
// en 75hard-app/backups/ (carpeta gitignoreada — es data personal, no va al repo).
//
// Uso:
//   cd 75hard-app
//   set -a; source .env.local; set +a
//   npx tsx scripts/backup-supabase.ts
//
// No hay backup automático de Supabase en el plan free — correr esto antes
// de cambios grandes en el schema, o cada tanto para no perder el historial
// del reto (días, chat, gym, pesos) si algo se rompe.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (cargar .env.local)')
  process.exit(1)
}

const TABLES = [
  'days',
  'challenge_state',
  'weight_checkpoints',
  'gym_logs',
  'food_logs',
  'foods',
  'chat_messages',
  'assistant_memories',
  'push_subscriptions',
] as const

async function backup() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const backupDir = join(__dirname, '../backups')
  mkdirSync(backupDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dump: Record<string, unknown[]> = {}

  for (const table of TABLES) {
    // Supabase pagina de a 1000 filas por default — traer todo en páginas.
    const rows: unknown[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
      if (error) {
        console.error(`✗ ${table}: ${error.message}`)
        break
      }
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }
    dump[table] = rows
    console.log(`✓ ${table}: ${rows.length} filas`)
  }

  const outPath = join(backupDir, `backup-${timestamp}.json`)
  writeFileSync(outPath, JSON.stringify(dump, null, 2))
  console.log(`\nBackup guardado en: ${outPath}`)
}

backup()
