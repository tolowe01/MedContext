'use client'

import {
  LineChart,
  Line,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import type { DailyLog } from '@/lib/types'

interface TrendSparklineProps {
  logs: DailyLog[]
  mini?: boolean
}

const SYSTOLIC_COLOR = '#3A9BD5'
const DIASTOLIC_COLOR = '#7FB3D3'
const DOT_ALERT = '#DC2626'
const DOT_OK = '#4A9B8E'

function buildData(logs: DailyLog[]) {
  return [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => ({
      date: l.log_date,
      systolic: l.systolic,
      diastolic: l.diastolic,
    }))
}

interface DotProps {
  cx?: number
  cy?: number
  value?: number
  threshold: number
}

function ThresholdDot({ cx, cy, value, threshold }: DotProps) {
  if (cx == null || cy == null || value == null) return null
  const color = value > threshold ? DOT_ALERT : DOT_OK
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />
}

export default function TrendSparkline({ logs, mini = false }: TrendSparklineProps) {
  const data = buildData(logs)

  if (mini) {
    return (
      <LineChart width={80} height={24} data={data}>
        <Line
          type="monotone"
          dataKey="systolic"
          stroke={SYSTOLIC_COLOR}
          strokeWidth={1.5}
          dot={(props) => (
            <ThresholdDot key={props.index} cx={props.cx} cy={props.cy} value={props.value} threshold={140} />
          )}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="diastolic"
          stroke={DIASTOLIC_COLOR}
          strokeWidth={1.5}
          dot={(props) => (
            <ThresholdDot key={props.index} cx={props.cx} cy={props.cy} value={props.value} threshold={90} />
          )}
          isAnimationActive={false}
        />
      </LineChart>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" />
        <YAxis domain={[60, 200]} tick={{ fontSize: 11, fill: '#94A3B8' }} width={36} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}
          labelStyle={{ color: '#1E293B', fontSize: 11 }}
          itemStyle={{ fontSize: 11 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={140} stroke={SYSTOLIC_COLOR} strokeDasharray="4 2" label={{ value: '140', fill: SYSTOLIC_COLOR, fontSize: 10 }} />
        <ReferenceLine y={90} stroke={DIASTOLIC_COLOR} strokeDasharray="4 2" label={{ value: '90', fill: DIASTOLIC_COLOR, fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="systolic"
          stroke={SYSTOLIC_COLOR}
          strokeWidth={2}
          name="Systolic"
          dot={(props) => (
            <ThresholdDot key={props.index} cx={props.cx} cy={props.cy} value={props.value} threshold={140} />
          )}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="diastolic"
          stroke={DIASTOLIC_COLOR}
          strokeWidth={2}
          name="Diastolic"
          dot={(props) => (
            <ThresholdDot key={props.index} cx={props.cx} cy={props.cy} value={props.value} threshold={90} />
          )}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
