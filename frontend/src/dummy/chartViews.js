import BarChartPreview from '../components/chart/BarChart.jsx'
import DonutChartPreview from '../components/chart/DonutChart.jsx'
import HorizontalBarChartPreview from '../components/chart/HorizontalBarChart.jsx'
import LineChartPreview from '../components/chart/LineChart.jsx'
import PieChartPreview from '../components/chart/PieChart.jsx'

export const chartViews = [
  {
    title: 'Line Chart',
    eyebrow: 'Monthly Trend',
    Component: LineChartPreview,
    wide: true,
  },
  {
    title: 'Bar Chart',
    eyebrow: 'Case Progress',
    Component: BarChartPreview,
  },
  {
    title: 'Horizontal Bar',
    eyebrow: 'Category Split',
    Component: HorizontalBarChartPreview,
  },
  {
    title: 'Donut Chart',
    eyebrow: 'Distribution',
    Component: DonutChartPreview,
  },
  {
    title: 'Pie Chart',
    eyebrow: 'Comparison',
    Component: PieChartPreview,
  },
]
