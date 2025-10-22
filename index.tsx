import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PortProvider } from './context/PortContext';
import { InteractionLoggerProvider } from './context/InteractionLoggerContext';
import { Toaster } from 'react-hot-toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <PortProvider>
          <InteractionLoggerProvider>
            <App />
            <Toaster position="bottom-right" toastOptions={{
                style: { background: '#374151', color: '#fff' },
                success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}/>
          </InteractionLoggerProvider>
        </PortProvider>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);