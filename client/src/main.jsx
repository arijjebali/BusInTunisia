import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#800020',
          color: '#fff',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
        },
        success: {
          style: { background: '#166534', color: '#fff' },
        },
        error: {
          style: { background: '#991b1b', color: '#fff' },
        },
      }}
    />
  </React.StrictMode>
)
