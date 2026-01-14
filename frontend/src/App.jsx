import { useState, useEffect } from 'react'
import DataTable from './components/DataTable'
import DataSummary from './components/DataSummary'
import DataChart from './components/DataChart'
import './App.css'

const API_BASE_URL = 'http://localhost:8000/api'

function App() {
  const [data, setData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchData()
    fetchSummary()
  }, [page])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/data?page=${page}&page_size=${pageSize}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const result = await response.json()
      setData(result.data)
      setTotalPages(result.total_pages)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/summary`)
      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }
      const result = await response.json()
      setSummary(result)
    } catch (err) {
      console.error('Error fetching summary:', err)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Data Viewer</h1>
        <p>Visualize processed data from the pipeline</p>
      </header>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <p>Make sure the backend is running and data pipeline has been executed.</p>
        </div>
      )}

      {loading && <div className="loading">Loading data...</div>}

      {summary && <DataSummary summary={summary} />}

      {data.length > 0 && (
        <>
          <DataChart data={data} />
          <DataTable 
            data={data} 
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="no-data">
          <p>No data available. Please run the data pipeline first.</p>
        </div>
      )}
    </div>
  )
}

export default App
