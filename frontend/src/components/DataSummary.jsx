import { useState } from 'react'
import './DataSummary.css'

function DataSummary({ summary }) {
  const [showColumns, setShowColumns] = useState(false)
  
  if (!summary) return null

  return (
    <div className="data-summary">
      <div className="summary-header">
        <div>
          <h2>Dataset Summary</h2>
          {summary.source_filename && (
            <div className="source-filename">{summary.source_filename}</div>
          )}
        </div>
        <div className="summary-stats">
          <div className="summary-stat-item">
            <span className="stat-label">Rows:</span>
            <span className="stat-value">{summary.total_rows.toLocaleString()}</span>
          </div>
          <div className="summary-stat-item">
            <span className="stat-label">Columns:</span>
            <span className="stat-value">{summary.columns.length}</span>
          </div>
        </div>
      </div>
      
      <div className="columns-section">
        <button 
          className="columns-toggle"
          onClick={() => setShowColumns(!showColumns)}
        >
          {showColumns ? '▼' : '▶'} Column Schema ({summary.columns.length} columns)
        </button>
        {showColumns && (
          <div className="columns-list">
            {summary.columns.map((col) => (
              <div key={col} className="column-item">
                <span className="column-name">{col}</span>
                <span className="column-type">{summary.column_types[col]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DataSummary
