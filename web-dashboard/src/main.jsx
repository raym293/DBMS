import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthzProvider } from './context/AuthzContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthzProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthzProvider>
  </React.StrictMode>,
)
