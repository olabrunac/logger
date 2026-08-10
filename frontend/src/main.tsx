import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import { getStoredLayoutMode } from './hooks/useLayoutMode'

const layoutMode = getStoredLayoutMode();
if (layoutMode === 'mobile') document.documentElement.setAttribute('data-layout', 'mobile');
else if (layoutMode === 'web') document.documentElement.setAttribute('data-layout', 'web');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
