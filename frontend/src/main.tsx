import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './app/App';
import { initGlobalBubbleEffect } from './utils/bubbleEffect';

// Initialize universal interactive bubble feature for all buttons
initGlobalBubbleEffect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

