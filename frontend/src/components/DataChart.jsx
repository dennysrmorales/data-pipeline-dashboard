import { useMemo } from 'react'
import { 
  LineChart, Line, 
  BarChart, Bar, 
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts'
import './DataChart.css'

// Column classification functions
function classifyColumn(columnName, sampleValues, allValues) {
  const nameLower = columnName.toLowerCase()
  
  // Check for identifier patterns
  if (nameLower.includes('id') && nameLower !== 'id') {
    // Could be identifier if unique
    if (new Set(allValues).size === allValues.length) {
      return 'identifier'
    }
  }
  if (nameLower === 'id' || nameLower === 'name') {
    return 'identifier'
  }
  
  // Check for temporal patterns
  const temporalKeywords = ['date', 'time', 'year', 'month', 'day', 'joined', 'created', 'updated']
  if (temporalKeywords.some(kw => nameLower.includes(kw))) {
    return 'temporal'
  }
  
  // Check if values look like dates
  if (sampleValues.length > 0) {
    const firstValue = String(sampleValues[0])
    // Check for date-like patterns (YYYY-MM-DD, MM/DD/YYYY, etc.)
    if (/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|[A-Z][a-z]{2} \d{1,2}, \d{4})/.test(firstValue)) {
      return 'temporal'
    }
  }
  
  // Check if numeric
  const numericCount = sampleValues.filter(v => typeof v === 'number' && !isNaN(v)).length
  if (numericCount === sampleValues.length && sampleValues.length > 0) {
    return 'numeric'
  }
  
  // Check if categorical (low-to-medium cardinality strings)
  const uniqueValues = new Set(sampleValues.map(v => String(v)))
  const cardinality = uniqueValues.size
  const totalRows = allValues.length
  
  // Consider categorical if:
  // - String values
  // - Low cardinality (< 50 unique values, or < 10% of rows)
  if (sampleValues.some(v => typeof v === 'string') && cardinality < Math.max(50, totalRows * 0.1)) {
    return 'categorical'
  }
  
  // Default to numeric if numbers, otherwise categorical
  return numericCount > sampleValues.length / 2 ? 'numeric' : 'categorical'
}

function classifyColumns(data) {
  if (!data || data.length === 0) return {}
  
  const columns = Object.keys(data[0])
  const classifications = {}
  
  columns.forEach(col => {
    const sampleValues = data.slice(0, Math.min(100, data.length)).map(row => row[col])
    const allValues = data.map(row => row[col])
    classifications[col] = classifyColumn(col, sampleValues, allValues)
  })
  
  return classifications
}

// Visualization rule engine - returns array of all applicable visualizations
function selectVisualizations(columns, classifications, data) {
  const identifiers = columns.filter(col => classifications[col] === 'identifier')
  const temporal = columns.filter(col => classifications[col] === 'temporal')
  const categorical = columns.filter(col => classifications[col] === 'categorical')
  const numeric = columns.filter(col => classifications[col] === 'numeric')
  
  const visualizations = []
  
  // Rule #1: Temporal + numeric → Line chart (time series)
  if (temporal.length > 0 && numeric.length > 0) {
    const timeCol = temporal[0]
    const metricCol = numeric[0]
    
    // Sort by temporal column
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[timeCol]
      const bVal = b[timeCol]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal)
      }
      return (aVal || 0) - (bVal || 0)
    })
    
    visualizations.push({
      type: 'line',
      data: sortedData.slice(0, 1000), // Limit for performance
      xAxis: timeCol,
      yAxis: metricCol,
      description: `Time series: ${metricCol} over ${timeCol}`
    })
  }
  
  // Rule: Grouped Aggregations - Categorical × numeric → Bar chart (aggregated)
  if (categorical.length > 0 && numeric.length > 0) {
    const catCol = categorical[0]
    const metricCol = numeric[0]
    
    // Aggregate: group by category and compute average
    const grouped = {}
    data.forEach(row => {
      const key = String(row[catCol] || 'Unknown')
      if (!grouped[key]) {
        grouped[key] = { [catCol]: key, count: 0, sum: 0 }
      }
      grouped[key].count++
      if (typeof row[metricCol] === 'number') {
        grouped[key].sum += row[metricCol]
      }
    })
    
    const aggregated = Object.values(grouped).map(group => ({
      ...group,
      [metricCol]: group.sum / group.count,
      _count: group.count
    }))
    
    // Sort by metric value descending, limit to top 20
    aggregated.sort((a, b) => b[metricCol] - a[metricCol])
    
    visualizations.push({
      type: 'bar',
      data: aggregated.slice(0, 20),
      xAxis: catCol,
      yAxis: metricCol,
      description: `Average ${metricCol} by ${catCol} (top 20)`
    })
  }
  
  // Rule: Distribution Visualization - Numeric column → Histogram
  // Show distribution for any numeric column with sufficient rows
  if (numeric.length > 0 && data.length >= 10) {
    const metricCol = numeric[0]
    const values = data.map(row => row[metricCol]).filter(v => typeof v === 'number' && !isNaN(v))
    
    if (values.length >= 10) {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const bins = 20
      const binWidth = (max - min) / bins
      
      const histogram = Array(bins).fill(0).map((_, i) => ({
        bin: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
        binStart: min + i * binWidth,
        count: 0
      }))
      
      values.forEach(val => {
        const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1)
        histogram[binIndex].count++
      })
      
      visualizations.push({
        type: 'bar',
        data: histogram,
        xAxis: 'bin',
        yAxis: 'count',
        description: `Distribution of ${metricCol} (histogram)`
      })
    }
  }
  
  // Rule: Ranked Comparisons - Numeric + identifier/label → Top-N bar chart
  if (numeric.length > 0 && identifiers.length > 0) {
    const labelCol = identifiers[0]
    const metricCol = numeric[0]
    
    // Create ranked list
    const ranked = data
      .filter(row => typeof row[metricCol] === 'number' && !isNaN(row[metricCol]) && row[labelCol] != null)
      .map(row => ({
        [labelCol]: String(row[labelCol]),
        [metricCol]: row[metricCol]
      }))
      .sort((a, b) => b[metricCol] - a[metricCol])
      .slice(0, 20) // Top 20
    
    if (ranked.length > 0) {
      visualizations.push({
        type: 'bar',
        data: ranked,
        xAxis: labelCol,
        yAxis: metricCol,
        description: `Top ${ranked.length} by ${metricCol}`
      })
    }
  }
  
  // Rule: Category Frequency Analysis - Categorical column → Count bar chart
  if (categorical.length > 0 && numeric.length === 0) {
    const catCol = categorical[0]
    
    // Count frequency of each category
    const frequency = {}
    data.forEach(row => {
      const key = String(row[catCol] || 'Unknown')
      frequency[key] = (frequency[key] || 0) + 1
    })
    
    const frequencyData = Object.entries(frequency)
      .map(([key, count]) => ({
        [catCol]: key,
        count: count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30) // Limit to top 30 categories
    
    if (frequencyData.length > 0) {
      visualizations.push({
        type: 'bar',
        data: frequencyData,
        xAxis: catCol,
        yAxis: 'count',
        description: `Frequency of ${catCol} (count)`
      })
    }
  }
  
  // Rule: Two numeric metrics → Scatter plot
  if (numeric.length >= 2) {
    const xCol = numeric[0]
    const yCol = numeric[1]
    
    const scatterData = data.slice(0, 500).filter(row => 
      typeof row[xCol] === 'number' && typeof row[yCol] === 'number' &&
      !isNaN(row[xCol]) && !isNaN(row[yCol])
    ).map(row => ({
      x: row[xCol],
      y: row[yCol]
    }))
    
    if (scatterData.length > 0) {
      visualizations.push({
        type: 'scatter',
        data: scatterData,
        xAxis: xCol,
        yAxis: yCol,
        description: `${yCol} vs ${xCol}`
      })
    }
  }
  
  return visualizations.length > 0 ? visualizations : null
}

function DataChart({ data }) {
  const visualizations = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const columns = Object.keys(data[0])
    const classifications = classifyColumns(data)
    return selectVisualizations(columns, classifications, data)
  }, [data])
  
  if (!visualizations || visualizations.length === 0) {
    return (
      <div className="chart-container">
        <h2>Data Visualization</h2>
        <div className="chart-placeholder">
          No suitable visualization available. Use the table view to explore the data.
        </div>
      </div>
    )
  }
  
  // Render a single chart
  const renderChart = (viz) => {
    const { type, data: chartData, xAxis, yAxis, description } = viz
    
    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={yAxis} 
              stroke="#667eea" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }
    
    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxis} angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={yAxis} fill="#667eea">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#667eea" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }
    
    if (type === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xAxis} />
            <YAxis type="number" dataKey="y" name={yAxis} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Data Points" data={chartData} fill="#667eea" />
          </ScatterChart>
        </ResponsiveContainer>
      )
    }
    
    return null
  }
  
  return (
    <div className="chart-container">
      <h2>Data Visualization</h2>
      <div className="charts-grid">
        {visualizations.map((viz, index) => (
          <div key={index} className="chart-item">
            <div className="chart-wrapper">
              {renderChart(viz)}
            </div>
            <div className="chart-note">
              {viz.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DataChart
