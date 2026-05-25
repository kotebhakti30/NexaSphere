import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx';
import { ThemeProvider } from './context/theme/ThemeProvider.tsx';
import { registerSW } from 'virtual:pwa-register';
import { SocketProvider } from './context/SocketContext';



// Register service worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);

