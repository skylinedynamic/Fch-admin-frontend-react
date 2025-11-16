import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'primereact/datatable', replacement: '/src/components/Table/DataTableWrapper.jsx' },
      { find: '@primereact/datatable', replacement: 'primereact/datatable' },
    ]
  },
  server: {
    port: 5173,
    open: false
  }
})