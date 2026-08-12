import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';

const dataset = [
  { category: 'Contracts', value: 28 },
  { category: 'Legal Opinion', value: 19 },
  { category: 'Compliance', value: 16 },
  { category: 'Permits', value: 12 },
  { category: 'Disputes', value: 7 },
];

export default function HorizontalBarChartPreview() {
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <BarChart
        dataset={dataset}
        layout="horizontal"
        yAxis={[{ scaleType: 'band', dataKey: 'category', width: 112 }]}
        xAxis={[{ min: 0 }]}
        series={[{ dataKey: 'value', label: 'Open Tickets', color: '#2d4a8c' }]}
        margin={{ top: 24, right: 20, bottom: 28, left: 0 }}
      />
    </Box>
  );
}
