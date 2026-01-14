import './DataSummary.css'

function DataSummary({ summary }) {
  if (!summary) return null

  return (
    <div className="data-summary">
      <h2>Dataset Summary</h2>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Total Rows</div>
          <div className="summary-value">{summary.total_rows.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Columns</div>
          <div className="summary-value">{summary.columns.length}</div>
        </div>
      </div>
      
      <div className="columns-info">
        <h3>Columns</h3>
        <div className="columns-list">
          {summary.columns.map((col) => (
            <div key={col} className="column-item">
              <span className="column-name">{col}</span>
              <span className="column-type">{summary.column_types[col]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DataSummary
