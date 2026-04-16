import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function ScreenshotApp() {
  return <div>Screenshot Overlay</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ScreenshotApp />
  </React.StrictMode>
)
