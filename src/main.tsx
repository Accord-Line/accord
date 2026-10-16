import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './workspace.css';
import './paper.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
