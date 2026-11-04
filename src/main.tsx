import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AppUpdateNotice from './components/AppUpdateNotice';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /><AppUpdateNotice /></React.StrictMode>);
