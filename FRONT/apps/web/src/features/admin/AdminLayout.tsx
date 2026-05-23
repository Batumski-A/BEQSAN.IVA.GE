import { type ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Share2,
  PlusSquare,
  MessageSquare,
  Tag,
  FolderOpen,
  Image as ImageIcon,
  ShieldCheck,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

import { clearAdminToken, getAdminUser } from './api';

const navItems = [
  { to: '/adminpanel', label: 'დაშბორდი', icon: LayoutDashboard },
  { to: '/adminpanel/orders', label: 'შეკვეთები', icon: ShoppingCart },
  { to: '/adminpanel/social', label: 'სოციალური', icon: Share2 },
  { to: '/adminpanel/social/compose', label: 'ახალი პოსტი', icon: PlusSquare, sub: true },
  { to: '/adminpanel/social/inbox', label: 'მიმოწერა', icon: MessageSquare, sub: true },
  { to: '/adminpanel/pricing', label: 'ფასები', icon: Tag },
  { to: '/adminpanel/catalog', label: 'კატალოგი', icon: FolderOpen },
  { to: '/adminpanel/gallery', label: 'გალერეა', icon: ImageIcon },
  { to: '/adminpanel/warranties', label: 'გარანტიები', icon: ShieldCheck },
  { to: '/adminpanel/reports', label: 'რეპორტები', icon: BarChart3 },
];

export type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

export const AdminLayout = ({
  title,
  subtitle,
  trailing,
  children,
}: AdminLayoutProps): JSX.Element => {
  const navigate = useNavigate();
  const username = getAdminUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/adminpanel/login', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-bg-base text-fg-primary bg-grain">
      {/* Mobile Top Header */}
      <header className="flex items-center justify-between border-b border-hairline bg-bg-elevated px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/img/beqsan-logo.png"
            alt="BEQSAN Logo"
            className="h-7 w-7 object-contain rounded-md border border-hairline-strong bg-white/5"
          />
          <div className="flex flex-col">
            <span className="font-display text-body-sm font-bold text-fg-primary leading-tight">BEQSAN</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">ადმინი</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-md border border-hairline-strong p-1.5 text-fg-primary hover:bg-bg-raised transition-colors"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-bg-base/60 backdrop-blur-md"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex w-64 flex-col border-r border-hairline bg-bg-elevated/95 p-4 shadow-2xl backdrop-blur-lg animate-slide-up">
            <div className="flex items-center justify-between pb-6 pt-2">
              <div className="flex items-center gap-2">
                <img
                  src="/img/beqsan-logo.png"
                  alt="BEQSAN Logo"
                  className="h-7 w-7 object-contain rounded-md border border-hairline-strong bg-white/5"
                />
                <span className="font-display text-body-lg font-bold text-fg-primary">BEQSAN</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-md border border-hairline-strong p-1.5 text-fg-primary hover:bg-bg-raised transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/adminpanel'}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-all duration-150 ${
                        item.sub ? 'pl-8 text-fg-secondary' : ''
                      } ${
                        isActive
                          ? 'bg-accent-amber/10 border-l-2 border-accent-amber text-fg-primary font-medium'
                          : 'border-l-2 border-transparent text-fg-secondary hover:bg-bg-raised hover:text-fg-primary'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-hairline pt-4 flex flex-col gap-3">
              {username && (
                <div className="flex items-center gap-3 px-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-accent-amber/35 to-accent-amber/10 border border-accent-amber/40 font-mono text-body-sm text-accent-amber font-bold">
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    {username}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-hairline-strong py-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:border-system-danger hover:text-system-danger transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                გასვლა
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-bg-elevated md:flex md:flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-hairline bg-bg-base/10">
          <img
            src="/img/beqsan-logo.png"
            alt="BEQSAN Logo"
            className="h-8 w-8 object-contain rounded-md border border-hairline-strong bg-white/5 shadow-inner"
          />
          <div className="flex flex-col">
            <span className="font-display text-body-lg font-bold tracking-tight text-fg-primary">BEQSAN</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-fg-tertiary">ადმინ პანელი</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/adminpanel'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-all duration-150 ${
                    item.sub ? 'pl-8 text-fg-secondary' : ''
                  } ${
                    isActive
                      ? 'bg-accent-amber/10 border-l-2 border-accent-amber text-fg-primary font-medium shadow-sm'
                      : 'border-l-2 border-transparent text-fg-secondary hover:bg-bg-raised hover:text-fg-primary'
                  }`
                }
              >
                <Icon className={`h-4 w-4 shrink-0 ${item.sub ? 'opacity-65' : ''}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-hairline px-4 py-4 bg-bg-base/5">
          {username && (
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-accent-amber/20 to-accent-amber/5 border border-accent-amber/35 font-mono text-body-sm text-accent-amber font-bold shadow-sm">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                {username}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-md border border-hairline-strong px-3 py-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary transition-colors hover:border-system-danger hover:text-system-danger"
          >
            <LogOut className="h-3.5 w-3.5" />
            გასვლა
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <h1 className="font-headline text-h2 tracking-tight text-fg-primary">{title}</h1>
            {subtitle ? (
              <p className="mt-1 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
                {subtitle}
              </p>
            ) : null}
          </div>
          {trailing ? <div className="flex items-center gap-2 self-start sm:self-auto">{trailing}</div> : null}
        </header>
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

