import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
import toneDeskIcon from './assets/tone-desk.png';

// Import through JS so the favicon is embedded in the portable HTML build.
document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href = toneDeskIcon;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
