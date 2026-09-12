'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

const DASHBOARD_ROUTES = ['/dashboard', '/report-incident', '/certificate', '/track', '/profile', '/leaderboard', '/notices']
const AUTH_ROUTES = ['/login', '/register']

const nav = [
  ['Services', '/#services'],
  ['Track', '/track'],
  ['Citizens', '/profile'],
  ['Rankings', '/leaderboard'],
]

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = DASHBOARD_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
  const isAuth = AUTH_ROUTES.some(r => pathname === r)

  if (isDashboard || isAuth) {
    return <>{children}</>
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#f7f3ea]/95 backdrop-blur border-b border-[#ded6c9]">
        <div className="gov-strip px-5 py-2 text-[11px] tracking-[.16em] uppercase flex items-center justify-center gap-2">
          <ShieldCheck size={13} /> Official digital portal of the Ministry of Useless Affairs
        </div>
        <div className="gold-rule" />
        <div className="max-w-7xl mx-auto px-5 h-20 flex items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full border-2 border-[#c9a44b] bg-[#10243d] text-[#c9a44b] grid place-items-center font-bold text-lg">MUA</div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-wide truncate">MINISTRY OF USELESS AFFAIRS</div>
              <div className="text-[11px] text-slate-500">Department of Completely Unnecessary Governance</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
            {nav.map(([label, href]) => (
              <Link key={label} href={href} className="hover:text-[#6f1020]">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-primary py-2.5">Citizen Portal</Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 bg-[#10243d] text-white">
        <div className="max-w-7xl mx-auto px-5 py-12 grid md:grid-cols-3 gap-10">
          <div>
            <div className="text-sm font-bold tracking-wide">MINISTRY OF USELESS AFFAIRS</div>
            <p className="text-sm text-slate-300 mt-3 leading-6">Delivering highly official solutions to problems that probably did not need solving.</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#c9a44b] font-bold">Popular services</div>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <Link className="block hover:text-white" href="/login">Report an incident</Link>
              <Link className="block hover:text-white" href="/login">Request a certificate</Link>
              <Link className="block hover:text-white" href="/login">Track an application</Link>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#c9a44b] font-bold">Public notice</div>
            <p className="mt-4 text-sm text-slate-300 leading-6">The Ministry is currently investigating why the office biscuits have disappeared.</p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-5 py-5 text-xs text-slate-400 flex justify-between">
            <span>© 2026 Ministry of Useless Affairs</span>
            <span>All proceedings are unnecessarily official.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
