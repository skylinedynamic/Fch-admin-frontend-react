// vite.config.js points `primereact/calendar` at components/Calendar/CalendarWrapper
// and `@primereact/calendar` at the real package, so the wrapper can still
// reach it. TypeScript does not read Vite's aliases: to it `primereact/calendar`
// is already the package itself, and this tells it the escape hatch is too.
declare module '@primereact/calendar' {
  export * from 'primereact/calendar'
}
