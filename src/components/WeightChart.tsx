'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { WeightCheckpoint } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface WeightChartProps {
  data: WeightCheckpoint[]
}

export default function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#52525B] text-sm">
        Sin datos de peso todavía
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    peso: Number(d.weight_kg),
  }))

  const weights = chartData.map((d) => d.peso)
  const minWeight = Math.floor(Math.min(...weights)) - 1
  const maxWeight = Math.ceil(Math.max(...weights)) + 1

  return (
    <div
      role="img"
      aria-label={`Gráfica de evolución de peso. Primer registro: ${chartData[0].peso} kg. Último registro: ${chartData[chartData.length - 1].peso} kg.`}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#A1A1AA', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#262626' }}
          />
          <YAxis
            domain={[minWeight, maxWeight]}
            tick={{ fill: '#A1A1AA', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit=" kg"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#141414',
              border: '1px solid #262626',
              borderRadius: '8px',
              color: '#FAFAFA',
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value)} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#F97316"
            strokeWidth={2}
            dot={{ fill: '#F97316', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#F97316', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* Tabla alternativa para lectores de pantalla */}
      <table className="sr-only">
        <caption>Evolución de peso</caption>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Peso</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{row.peso} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
