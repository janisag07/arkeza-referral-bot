import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Selbst gehostete Schriften (DSGVO — kein externes CDN)
import '@fontsource/sora/400.css'
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'

import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
