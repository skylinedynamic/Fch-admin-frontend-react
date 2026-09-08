import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query'
// PrimeReact styles
import 'primereact/resources/themes/saga-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'

// Load FullCalendar styles dynamically (CDN). This avoids Vite subpath import errors
// while keeping `index.html` unchanged.
const _loadFullCalendarCss = () => {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.20/main.min.css',
    'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.20/main.min.css',
    'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.20/main.min.css',
    'https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.20/main.min.css',
    'https://cdn.jsdelivr.net/npm/@fullcalendar/bootstrap5@6.1.20/main.min.css'
  ];
  if (typeof document !== 'undefined') {
    urls.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
      }
    });
  }
};
_loadFullCalendarCss();

import "../assets/css/bootstrap.min.css"
import "../assets/css/icons.min.css"
import "../assets/css/app.min.css"

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'


import "../assets/css/custom.min.css"
import "../assets/css/custom.css"
import "../assets/css/responsive.css"
import "../assets/css/datepicker.css"
// MUST be the last stylesheet imported. Vite emits JS-imported CSS after the
// <link> tags in index.html, so a brand-tokens.css that is only linked there
// loses to any !important rule in custom.css - which is what pinned the
// sidebar border to the primary colour.
import "../assets/css/brand-tokens.css"

const isLocal = import.meta.env.VITE_DEVELOPMENT_MODE == 'local'

const rootContent = (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>
)

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  isLocal ? rootContent : (
    <React.StrictMode>
      {rootContent}
    </React.StrictMode>
  )
)
