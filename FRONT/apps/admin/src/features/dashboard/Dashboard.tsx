// Admin dashboard shell — dense variant of the design system.
// Real widgets (orders, pricing rules, gallery CMS, warranty claims) land per feature.

export function Dashboard() {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-bg-elevated md:flex md:flex-col">
        <div className="px-6 py-6 font-display text-h4 tracking-tight text-fg-primary">
          BEQSAN · ადმინი
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          <SidebarItem label="დაშბორდი" active />
          <SidebarItem label="შეკვეთები" />
          <SidebarItem label="ფასები" />
          <SidebarItem label="კატალოგი" />
          <SidebarItem label="გალერეა" />
          <SidebarItem label="გარანტიები" />
          <SidebarItem label="გვერდები" />
          <SidebarItem label="რეპორტები" />
        </nav>
      </aside>

      <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="font-headline text-h2 tracking-tight text-fg-primary">დაშბორდი</h1>
            <p className="mt-1 font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              ადმინი · scaffold
            </p>
          </div>
          <div className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
            v0.1.0
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="დღევანდელი" value="0" sub="შეკვეთა" />
          <StatCard label="ეს კვირა" value="0" sub="შეკვეთა" />
          <StatCard label="ეს თვე" value="0" sub="₾" />
          <StatCard label="აქტიური გარანტიები" value="0" sub="ცალი" />
        </div>

        <section className="mt-8 rounded-sm border border-hairline bg-bg-raised p-6">
          <h2 className="font-headline text-h4 text-fg-primary">აქ ფლოუ მზადდება</h2>
          <p className="mt-2 text-body text-fg-secondary">
            შეკვეთების სია, status workflow, ფასების რედაქტორი, კატალოგი — Phase 1 MVP-ის ბოლოს.
          </p>
        </section>
      </main>
    </div>
  );
}

function SidebarItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className={`rounded-sm px-3 py-2 text-body-sm transition-colors duration-120 ${
        active
          ? 'bg-bg-raised text-fg-primary'
          : 'text-fg-secondary hover:bg-bg-raised hover:text-fg-primary'
      }`}
    >
      {label}
    </a>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-bg-raised p-4">
      <div className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
        {label}
      </div>
      <div className="mt-3 font-mono text-h2 tabular-nums text-fg-primary">{value}</div>
      <div className="mt-1 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {sub}
      </div>
    </div>
  );
}
