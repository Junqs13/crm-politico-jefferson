import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-semi-condensed/600.css'
import '@fontsource/barlow-semi-condensed/700.css'
import './index.css'
import './layout.css'
import { App } from './App';
import { BarraCarregamento } from './components/BarraCarregamento';
import { iniciarPWA } from './services/pwa';

iniciarPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BarraCarregamento />
    <App />
  </StrictMode>,
)
