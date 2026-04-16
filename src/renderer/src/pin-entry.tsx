import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function PinApp() {
  return <div>Pin Window</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PinApp />
  </React.StrictMode>
)
