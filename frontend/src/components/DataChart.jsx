import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './DataChart.css'

function DataChart({ data }) {
  // Simple chart: try to find numeric columns and plot them
  // This is a basic implementation - customize based on your actual data structure
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Take first 20 rows for chart readability
    const sampleData = data.slice(0, 20)
    
    // Try to find numeric columns (this is a simple heuristic)
    const numericColumns = Object.keys(data[0]).filter(key => {
      const value = data[0][key]
      return typeof value === 'number' && !isNaN(value)
    })
    
    // If we have numeric data, prepare it for charting
    if (numericColumns.length > 0) {
      return sampleData.map((row, idx) => {
        const chartRow = { index: idx }
        numericColumns.forEach(col => {
          chartRow[col] = row[col]
        })
        return chartRow
      })
    }
    
    return []
  }, [data])

  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return []
    return Object.keys(data[0]).filter(key => {
      const value = data[0][key]
      return typeof value === 'number' && !isNaN(value)
    })
  }, [data])

  if (chartData.length === 0 || numericColumns.length === 0) {
    return (
      <div className="chart-container">
        <h2>Data Visualization</h2>
        <div className="chart-placeholder">
          No numeric data available for charting. Charts work best with numeric columns.
        </div>
      </div>
    )
  }

  // Use first numeric column for visualization
  const primaryColumn = numericColumns[0]

  return (
    <div className="chart-container">
      <h2>Data Visualization</h2>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={primaryColumn} 
              stroke="#667eea" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {numericColumns.length > 1 && (
        <div className="chart-note">
          Showing: {primaryColumn} (showing first numeric column, {numericColumns.length} total numeric columns available)
        </div>
      )}
    </div>
  )
}

export default DataChart
