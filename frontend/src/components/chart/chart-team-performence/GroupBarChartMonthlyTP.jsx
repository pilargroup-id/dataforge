import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import { BarChart } from '@mui/x-charts/BarChart'

const palette = ['#2a9d8f', '#e9c46a', '#f4a261', '#457b9d', '#e76f51', '#8d99ae']

const defaultMembers = [
  {
    id: 'nabila-putri',
    name: 'Nabila Putri',
    role: 'Legal Officer',
    sla: '95%',
    monthlyPerformance: [
      { month: 'Jan', year: 2026, monthIndex: 1, completed: 34, pending: 8 },
      { month: 'Feb', year: 2026, monthIndex: 2, completed: 36, pending: 7 },
      { month: 'Mar', year: 2026, monthIndex: 3, completed: 39, pending: 6 },
      { month: 'Apr', year: 2026, monthIndex: 4, completed: 44, pending: 7 },
      { month: 'May', year: 2026, monthIndex: 5, completed: 46, pending: 5 },
    ],
  },
  {
    id: 'mira-kartika',
    name: 'Mira Kartika',
    role: 'Contract Analyst',
    sla: '93%',
    monthlyPerformance: [
      { month: 'Jan', year: 2026, monthIndex: 1, completed: 28, pending: 10 },
      { month: 'Feb', year: 2026, monthIndex: 2, completed: 30, pending: 9 },
      { month: 'Mar', year: 2026, monthIndex: 3, completed: 32, pending: 8 },
      { month: 'Apr', year: 2026, monthIndex: 4, completed: 35, pending: 8 },
      { month: 'May', year: 2026, monthIndex: 5, completed: 38, pending: 7 },
    ],
  },
]

function getSeriesDataKey(memberId) {
  return `member_${String(memberId).replace(/[^a-zA-Z0-9]+/g, '_')}`
}

function formatMonthLabel(month, year) {
  return [month, year].filter(Boolean).join(' ')
}

function getPerformanceTotals(monthlyPerformance) {
  return monthlyPerformance.reduce(
    (totals, item) => ({
      completed: totals.completed + (item.completed ?? 0),
      pending: totals.pending + (item.pending ?? 0),
    }),
    { completed: 0, pending: 0 },
  )
}

function getTotalTickets(totals) {
  return (totals.completed ?? 0) + (totals.pending ?? 0)
}

function buildChartModel(members, hiddenKeys) {
  const hiddenKeySet = new Set(hiddenKeys)
  const normalizedMembers = members.map((member, index) => {
    const totals = getPerformanceTotals(member.monthlyPerformance ?? [])

    return {
      ...member,
      totals,
      color: member.color ?? palette[index % palette.length],
      dataKey: getSeriesDataKey(member.id ?? member.name ?? index),
      legendDescription:
        member.legendDescription ?? `Total Ticket: ${getTotalTickets(totals)}`,
    }
  })
  const rowsByMonthKey = new Map()

  normalizedMembers.forEach((member) => {
    member.monthlyPerformance?.forEach((item) => {
      const monthKey = `${item.year ?? 0}-${String(item.monthIndex ?? 0).padStart(2, '0')}`
      const currentRow = rowsByMonthKey.get(monthKey) ?? {
        month: item.month,
        monthLabel: formatMonthLabel(item.month, item.year),
        monthIndex: item.monthIndex ?? 0,
        year: item.year ?? 0,
      }

      currentRow[member.dataKey] = item.completed ?? 0
      rowsByMonthKey.set(monthKey, currentRow)
    })
  })

  const dataset = Array.from(rowsByMonthKey.values())
    .sort((leftRow, rightRow) => {
      if (leftRow.year !== rightRow.year) {
        return leftRow.year - rightRow.year
      }

      return leftRow.monthIndex - rightRow.monthIndex
    })
    .map((row) => {
      const normalizedRow = { ...row }

      normalizedMembers.forEach((member) => {
        normalizedRow[member.dataKey] ??= 0
      })

      return normalizedRow
    })

  const legendItems = normalizedMembers.map((member) => ({
    dataKey: member.dataKey,
    name: member.name,
    color: member.color,
    description: member.legendDescription,
    hidden: hiddenKeySet.has(member.dataKey),
  }))
  const series = normalizedMembers
    .filter((member) => !hiddenKeySet.has(member.dataKey))
    .map((member) => ({
      dataKey: member.dataKey,
      label: member.name,
      color: member.color,
      valueFormatter: (value) => `${value ?? 0} Ticket`,
    }))

  return {
    dataset,
    legendItems,
    series,
  }
}

export default function GroupBarChartTP({
  members = defaultMembers,
  height = 420,
  emptyMessage = 'Belum ada data monthly performance untuk tahun yang dipilih.',
}) {
  const [hiddenSeriesKeys, setHiddenSeriesKeys] = useState([])
  const { dataset, legendItems, series } = useMemo(
    () => buildChartModel(members, hiddenSeriesKeys),
    [hiddenSeriesKeys, members],
  )

  const handleToggleSeries = (dataKey) => {
    setHiddenSeriesKeys((currentKeys) => {
      if (currentKeys.includes(dataKey)) {
        return currentKeys.filter((currentKey) => currentKey !== dataKey)
      }

      return [...currentKeys, dataKey]
    })
  }

  return (
    <div className="team-performance-chart">
      {members.length === 0 ? (
        <div className="team-performance-chart__empty">{emptyMessage}</div>
      ) : series.length > 0 ? (
        <>
          <div className="team-performance-chart__legend" aria-label="Team performance legend">
            {legendItems.map((item) => (
              <button
                key={item.dataKey}
                type="button"
                className={[
                  'team-performance-chart__legend-item',
                  item.hidden ? 'team-performance-chart__legend-item--hidden' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={!item.hidden}
                onClick={() => handleToggleSeries(item.dataKey)}
              >
                <span
                  className="team-performance-chart__legend-swatch"
                  aria-hidden="true"
                  style={{ backgroundColor: item.color }}
                />
                <span className="team-performance-chart__legend-label">{item.name}</span>
                <span className="team-performance-chart__legend-tooltip">{item.description}</span>
              </button>
            ))}
          </div>

          <Box sx={{ width: '100%', height }}>
            <BarChart
              dataset={dataset}
              series={series}
              xAxis={[
                {
                  scaleType: 'band',
                  dataKey: 'monthLabel',
                  valueFormatter: (value, context) => {
                    const normalizedValue = String(value ?? '')

                    if (context.location === 'tick') {
                      return normalizedValue.replace(/\s+\d{4}$/, '')
                    }

                    return normalizedValue
                  },
                },
              ]}
              yAxis={[{ width: 42 }]}
              grid={{ horizontal: true }}
              axisHighlight={{ x: 'band' }}
              borderRadius={6}
              hideLegend
              margin={{ top: 24, right: 18, bottom: 34, left: 0 }}
              slotProps={{
                tooltip: {
                  trigger: 'axis',
                  anchor: 'pointer',
                  placement: 'top-end',
                  sort: 'none',
                },
              }}
            />
          </Box>
        </>
      ) : (
        <div className="team-performance-chart__empty">
          Semua nama sedang di-disable. Klik salah satu nama untuk menampilkan chart kembali.
        </div>
      )}
    </div>
  )
}
