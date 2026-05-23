import {
  ShoppingCart,
  Banknote,
  Award,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';

export const AdminDashboard = (): JSX.Element => {
  return (
    <AdminLayout
      title="დაშბორდი"
      subtitle="ადმინი · მთავარი მიმოხილვა"
      trailing={
        <div className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary bg-bg-elevated border border-hairline-strong px-2.5 py-1 rounded-md">
          v0.3.0
        </div>
      }
    >
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          label="დღევანდელი შეკვეთები"
          value="12"
          sub="+3 წინა დღესთან შედარებით"
          trend="up"
          icon={ShoppingCart}
        />
        <KPIStatCard
          label="ამ კვირის გაყიდვები"
          value="45"
          sub="+8.4% წინა კვირაზე"
          trend="up"
          icon={TrendingUp}
        />
        <KPIStatCard
          label="ამ თვის შემოსავალი"
          value="48,250 ₾"
          sub="+12.5% წინა თვეზე"
          trend="up"
          icon={Banknote}
        />
        <KPIStatCard
          label="აქტიური გარანტიები"
          value="184"
          sub="99.2% დაცულობა"
          trend="none"
          icon={Award}
        />
      </div>

      {/* Product Overview Section (Photos Integration) */}
      <section className="mt-8">
        <h2 className="font-headline text-h4 text-fg-primary mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-amber" />
          პროდუქტების მიმოხილვა
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ProductPreviewCard
            title="PVC ფანჯრები"
            desc="გერმანული და თურქული 5/6 კამერიანი პროფილი, ენერგოეფექტური მინაპაკეტი."
            img="/img/modern-pvc-window.png"
            link="/adminpanel/pricing"
          />
          <ProductPreviewCard
            title="ალუმინის კარები"
            desc="სლაიდური და გასაღები სისტემები, თერმოხიდით და პრემიუმ აქსესუარებით."
            img="/img/aluminum-sliding-door.png"
            link="/adminpanel/pricing"
          />
          <ProductPreviewCard
            title="ვიტრაჟული ფასადები"
            desc="საფასადე შუშის კონსტრუქციები, უჩარჩოო და ალუმინის პროფილის სისტემები."
            img="/img/panoramic-facade-vitrage.png"
            link="/adminpanel/pricing"
          />
          <ProductPreviewCard
            title="აქსესუარები & ბადეები"
            desc="პლისე, სტაციონარული და როლეტური ტიპის ბადეები, მაღალი ხარისხის ბადით."
            img="/img/premium-mosquito-net.png"
            link="/adminpanel/pricing"
          />
        </div>
      </section>

      {/* Phase Status List */}
      <section className="mt-8 rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-hairline pb-4">
          <div>
            <h2 className="font-headline text-h4 text-fg-primary">Phase 1 MVP სტატუსი</h2>
            <p className="mt-1 text-caption text-fg-secondary">
              პროექტის ადმინპანელის მოდულების განვითარების ეტაპები
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-caption text-fg-tertiary">პროგრესი:</span>
            <div className="relative w-36 h-2 rounded-full bg-bg-base overflow-hidden border border-hairline">
              <div className="absolute left-0 top-0 h-full bg-accent-amber rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="font-mono text-caption text-accent-amber font-bold">100%</span>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatusRow label="სოციალური · Meta OAuth + პოსტი + Inbox" done />
          <StatusRow label="ფასები · მასალების საბაზო სია" done />
          <StatusRow label="ადმინ შესვლა და პირველადი კონფიგურაცია" done />
          <StatusRow label="მობილური ინტერფეისი და ნავიგაცია" done />
          <StatusRow label="შეკვეთები · სია + სტატუსების workflow" done />
          <StatusRow label="ფასები · inline რედაქტირება" done />
          <StatusRow label="კატალოგი · პროდუქტების CMS" done />
          <StatusRow label="გალერეა · ფოტოები + ვიდეო კონტენტი" done />
          <StatusRow label="გარანტიები · სია + სტატუსის მართვა" done />
          <StatusRow label="რეპორტები · გაყიდვები, კონვერსია" done />
        </ul>
      </section>
    </AdminLayout>
  );
};

function KPIStatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'none';
  icon: React.ComponentType<{ className?: string }>;
}): JSX.Element {
  return (
    <div className="group rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-5 hover:border-accent-amber/40 transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary group-hover:text-fg-secondary transition-colors">
          {label}
        </span>
        <div className="rounded-lg bg-bg-base/60 p-2 border border-hairline group-hover:border-accent-amber/20 group-hover:bg-accent-amber/5 transition-all duration-300">
          <Icon className="h-5 w-5 text-accent-amber" />
        </div>
      </div>
      <div className="mt-3 font-mono text-h2 font-bold tabular-nums text-fg-primary">{value}</div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-tertiary">
        {trend === 'up' && (
          <span className="inline-block rounded bg-system-success/15 px-1.5 py-0.5 text-system-success font-semibold">
            ▲
          </span>
        )}
        {trend === 'down' && (
          <span className="inline-block rounded bg-system-danger/15 px-1.5 py-0.5 text-system-danger font-semibold">
            ▼
          </span>
        )}
        <span>{sub}</span>
      </div>
    </div>
  );
}

function ProductPreviewCard({
  title,
  desc,
  img,
  link,
}: {
  title: string;
  desc: string;
  img: string;
  link: string;
}): JSX.Element {
  return (
    <div className="group overflow-hidden rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm transition-all duration-300 hover:border-accent-amber/50 hover:shadow-lg hover:shadow-accent-amber/5 hover:-translate-y-1">
      <div className="relative h-44 overflow-hidden bg-bg-base/30">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated to-transparent opacity-60" />
      </div>
      <div className="p-4">
        <h3 className="font-headline text-body font-bold text-fg-primary group-hover:text-accent-amber transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-caption text-fg-tertiary line-clamp-2 min-h-[32px]">{desc}</p>
        <a
          href={link}
          className="mt-3.5 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-accent-amber hover:text-accent-amber-h font-semibold"
        >
          ფასების ნახვა
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done?: boolean }): JSX.Element {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        done
          ? 'border-system-success/20 bg-system-success/5 text-fg-primary'
          : 'border-hairline-strong bg-bg-base/20 text-fg-tertiary hover:text-fg-secondary'
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-4.5 w-4.5 text-system-success shrink-0 animate-fade-in" />
      ) : (
        <Circle className="h-4.5 w-4.5 text-fg-disabled shrink-0" />
      )}
      <span className="text-body-sm">{label}</span>
    </li>
  );
}

