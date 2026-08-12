import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';

const dataset = [
  { month: 'Jan', completed: 42, pending: 12 },
  { month: 'Feb', completed: 35, pending: 18 },
  { month: 'Mar', completed: 48, pending: 15 },
  { month: 'Apr', completed: 52, pending: 10 },
  { month: 'May', completed: 44, pending: 14 },
  { month: 'Jun', completed: 58, pending: 9 },
];

export default function BarChartPreview() {
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <BarChart
        dataset={dataset}
        xAxis={[{ scaleType: 'band', dataKey: 'month' }]}
        yAxis={[{ width: 42 }]}
        series={[
          { dataKey: 'completed', label: 'Completed', color: '#2a9d8f' },
          { dataKey: 'pending', label: 'Pending', color: '#e9c46a' },
        ]}
        margin={{ top: 24, right: 18, bottom: 34, left: 0 }}
      />
    </Box>
  );
}
