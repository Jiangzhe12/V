import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function ClipboardApp() {
  return <div className="text-white p-4">Clipboard Popup</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClipboardApp />
  </React.StrictMode>
)
