import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Get root element and ensure it exists
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Create React root and render app in strict mode
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
