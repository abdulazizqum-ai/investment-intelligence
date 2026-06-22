import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Lightbulb,
  Siren,
  ShieldAlert,
  Newspaper,
  Network,
  Sparkles,
  Building2,
  Layers,
  Cpu,
  Bell,
  Bot,
  Settings,
  Moon,
  Sun,
  Languages,
  LogOut,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { NotificationCenter } from './NotificationCenter';

const navItems = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/recommendations', key: 'recommendations', icon: Lightbulb },
  { to: '/urgent-alerts', key: 'urgentAlerts', icon: Siren },
  { to: '/risk', key: 'risk', icon: ShieldAlert },
  { to: '/news', key: 'news', icon: Newspaper },
  { to: '/causality', key: 'causality', icon: Network },
  { to: '/emerging', key: 'emerging', icon: Sparkles },
  { to: '/company', key: 'company', icon: Building2 },
  { to: '/assets', key: 'assets', icon: Layers },
  { to: '/agents', key: 'agents', icon: Cpu },
  { to: '/alerts', key: 'alerts', icon: Bell },
  { to: '/assistant', key: 'assistant', icon: Bot },
  { to: '/settings', key: 'settings', icon: Settings },
] as const;

export function Layout() {
  const { t } = useTranslation();
  const { toggleLocale, locale, theme, toggleTheme } = useLocale();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-slate-800 bg-slate-950/80">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-100">{t('appName')}</div>
          <div className="text-[11px] text-slate-500">{t('appTagline')}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3 text-[11px] text-slate-600">
        {t('appName')} · MVP
      </div>
    </aside>
  );

  return (
    <div className="app-shell bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 start-0">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
          <button
            className="btn-ghost !px-2 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="ms-auto flex items-center gap-2">
            <button
              className="btn-ghost !px-2.5"
              onClick={toggleLocale}
              title="Language"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold">
                {locale === 'en' ? 'العربية' : 'EN'}
              </span>
            </button>
            <button className="btn-ghost !px-2.5" onClick={toggleTheme} title="Theme">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <NotificationCenter />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/30 text-xs font-bold text-brand-300">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
            </div>
            <button
              className="btn-ghost !px-2.5"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              title={t('common.signOut')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
