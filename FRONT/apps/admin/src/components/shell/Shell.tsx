import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const navItems: Array<{ to: string; label: string }> = [
  { to: '/', label: 'დაშბორდი' },
  { to: '/orders', label: 'შეკვეთები' },
  { to: '/social', label: 'სოციალური' },
  { to: '/social/compose', label: '— ახალი პოსტი' },
  { to: '/social/inbox', label: '— მიმოწერა' },
  { to: '/pricing', label: 'ფასები' },
  { to: '/catalog', label: 'კატალოგი' },
  { to: '/gallery', label: 'გალერეა' },
  { to: '/warranties', label: 'გარანტიები' },
];

type ShellProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

export const Shell = ({ title, subtitle, trailing, children }: ShellProps): JSX.Element => {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-bg-elevated md:flex md:flex-col">
        <div className="px-6 py-6 font-display text-h4 tracking-tight text-fg-primary">
          BEQSAN · ადმინი
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-body-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-bg-raised text-fg-primary'
                    : 'text-fg-secondary hover:bg-bg-raised hover:text-fg-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-headline text-h2 tracking-tight text-fg-primary">{title}</h1>
            {subtitle ? (
              <p className="mt-1 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
                {subtitle}
              </p>
            ) : null}
          </div>
          {trailing}
        </header>
        {children}
      </main>
    </div>
  );
};
