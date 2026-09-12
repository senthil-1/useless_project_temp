import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { ink:'#171717', paper:'#f7f3ea', burgundy:'#6f1020', navy:'#10243d', gold:'#c9a44b', cream:'#fbf8f0', line:'#ded6c9' },
    boxShadow: { soft:'0 18px 50px rgba(18, 18, 18, 0.08)' },
    fontFamily:{ sans:['Inter','ui-sans-serif','system-ui','sans-serif'], serif:['Georgia','ui-serif','serif'] },
    backgroundImage:{ 'paper-grid':'linear-gradient(rgba(16,36,61,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(16,36,61,.035) 1px, transparent 1px)' }
  }} , plugins: []
}
export default config
