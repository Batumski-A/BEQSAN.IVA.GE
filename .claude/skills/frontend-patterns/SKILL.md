# Skill: frontend-patterns

**Trigger:** any React/TS work in `FRONT/` — components, hooks, queries, forms, routes, error handling, images.

**Source:** [docs/kickoff.md §5, §13](../../../docs/kickoff.md).

---

## TanStack Query — key taxonomy

Keys are tuples ordered from generic → specific. Filters go in a stable object at the tail.

```ts
['catalog', 'products']                              // list
['catalog', 'products', productId]                   // detail
['configurator', 'price', configHash]                // dependent (re-runs on hash change)
['orders', 'by-phone', phoneNormalized]              // tracking
['admin', 'orders', { status, dateRange, page }]     // filtered admin list
['admin', 'pricing-rules']                           // admin CRUD
```

**Rules:**
- Hash configurator state to a stable string before using it as a query key.
- Use `keepPreviousData` for paginated admin lists.
- `staleTime` defaults: public catalog 5 min, admin lists 30s, configurator price 0 (always fresh on input change).
- Mutations invalidate the matching list key, not the whole tree.

## Forms — React Hook Form + Zod

```tsx
const schema = z.object({
  widthCm: z.number().int().min(30).max(400),
  heightCm: z.number().int().min(30).max(400),
});

type FormData = z.infer<typeof schema>;

function DimensionsForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { widthCm: 120, heightCm: 140 },
    mode: 'onChange',
  });
  // ...
}
```

**Conventions:**
- One Zod schema per form. Don't share schemas across forms with different shapes — duplicate is fine.
- `mode: 'onChange'` for inline validation, `'onSubmit'` for short forms.
- Error messages are **Georgian strings** wired through i18next keys, not hardcoded English.
- Phone inputs use the dedicated `<PhoneInput>` component (E.164 normalization, +995 prefix UI).

## Routes — React Router v6

- All routes lazy-loaded:
  ```tsx
  const Configurator = lazy(() => import('@/features/configurator/Page'));
  ```
- One `Suspense` boundary at the **layout** level, with a brand-aware fallback.
- Type-safe params via a `useTypedParams<T>()` helper in `shared/hooks/`.
- Deep links into the configurator: `/configurator?step=4&draft=abc123`.

## Error boundaries

- **Root boundary:** at app root, full-page fallback with `„გადატვირთვა"` button + an error code.
- **Route boundaries:** one per major route (configurator, admin) — local recovery without nuking the session.
- **Inline error states** for predictable failures (network 4xx, validation) — no boundary needed.
- Errors are reported to Sentry (or self-hosted equivalent) with the correlation id from the failing request.

## Images

- **Always** specify `width` and `height` to prevent CLS.
- `<img loading="lazy" decoding="async" />` for below-fold.
- `srcSet` with `1x`, `2x`, `3x` variants; AVIF first, WebP fallback, JPG ultimate fallback via `<picture>`.
- Blurhash placeholder while loading (the workshop has a moody palette — blurhash captures that).

```tsx
<picture>
  <source srcSet={`${url}.avif`} type="image/avif" />
  <source srcSet={`${url}.webp`} type="image/webp" />
  <img
    src={`${url}.jpg`}
    width={1200}
    height={800}
    loading="lazy"
    decoding="async"
    alt="ალუმინის შავი ფანჯარა ბათუმის ბინაში, საღამოს მზე"
  />
</picture>
```

## State management

- **Zustand** for cross-component UI/feature state (configurator store, modal stack, locale).
- **TanStack Query** for **all** server state. Don't sync server data into Zustand.
- **URL state** for things that need to be shareable (current filter, paginator page, configurator step).
- **`useState`** only for component-local ephemeral state.

## API client (axios)

- Single axios instance in `shared/api/client.ts`.
- Interceptor: adds correlation id, attaches admin JWT from `localStorage` (admin app only — public app never holds tokens).
- Errors normalized to `{ code, message, details }` shape before bubbling to TanStack Query.

## Tailwind + cn()

```ts
// shared/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

```tsx
<button
  className={cn(
    'inline-flex items-center justify-center',
    'h-12 px-6 rounded-sm font-mono text-sm',
    'bg-accent-amber text-bg-base',
    'transition-transform duration-100',
    'hover:bg-accent-amber-h active:scale-[0.98]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-amber focus-visible:outline-offset-2',
    disabled && 'opacity-50 pointer-events-none',
  )}
>
  {children}
</button>
```

## Internationalization

- Default locale: `ka`. Fallback to `ka` (not `en`) — if a translation is missing, the user sees Georgian, not English placeholder.
- Translation keys use **lowercase dot-namespaces**: `configurator.steps.type.title`.
- All numbers/dates/prices go through formatters in `shared/lib/format.ts` (see [georgian-ux](../georgian-ux/SKILL.md)).

## Component conventions

- **Function components only.**
- **Named exports** preferred over default.
- Props typed inline if local: `type Props = { ... }` colocated; exported only when reused.
- File name matches component: `ConfiguratorStepIndicator.tsx` exports `ConfiguratorStepIndicator`.
- One component per file. Helpers stay private to the file unless reused.

## Anti-patterns

```
❌ const [data, setData] = useState() for server data → use TanStack Query
❌ Default-exported components                        → named exports
❌ Inline style={{...}}                               → Tailwind classes via cn()
❌ Sharing one massive Zod schema for many forms      → one per form
❌ Spinner on empty screens                           → skeleton (see design-system)
❌ English placeholder copy                           → real Georgian via i18next
❌ Direct fetch() in components                       → use the axios client + Query hook
❌ Storing admin JWT in code                          → localStorage in admin app only
❌ <img> without width/height                         → always specify dimensions
```

## Related skills

- [design-system](../design-system/SKILL.md) — tokens, motion, typography.
- [georgian-ux](../georgian-ux/SKILL.md) — formatters, font loading, phone input.
- [accessibility](../accessibility/SKILL.md) — keyboard, ARIA, focus rings.
- [configurator-architecture](../configurator-architecture/SKILL.md) — store contract.
