import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'primereact/datatable', replacement: '/src/components/Table/DataTableWrapper.jsx' },
      { find: '@primereact/datatable', replacement: 'primereact/datatable' },
      // Month/year dropdowns in the shared calendar design; see the wrapper.
      { find: 'primereact/calendar', replacement: '/src/components/Calendar/CalendarWrapper.tsx' },
      { find: '@primereact/calendar', replacement: 'primereact/calendar' },
    ]
  },
  server: {
    port: 5174,
    open: false
  },
  preview: {
    // Distinct from the sibling fch-borrower-react repo's preview port
    // (4173, Vite's default) so both apps' E2E suites can run without a
    // port collision if ever run at the same time.
    port: 4174
  }
})