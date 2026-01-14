import { useState } from 'react'
import './DataTable.css'

function DataTable({ data, page, totalPages, onPageChange }) {
  if (!data || data.length === 0) {
    return <div>No data to display</div>
  }

  const columns = Object.keys(data[0])

  return (
    <div className="data-table-container">
      <h2>Data Table</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col}>
                    {typeof row[col] === 'object' 
                      ? JSON.stringify(row[col])
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="pagination">
        <button 
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages}
        </span>
        <button 
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default DataTable
