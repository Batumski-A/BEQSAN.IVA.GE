# Skill: georgian-ux

**Trigger:** any user-facing string, any number/date/price formatting, any Georgian content work, font loading, phone input, i18n keys.

**Source:** [docs/kickoff.md §9.3, §13](../../../docs/kickoff.md).

---

## Number formatting

The Georgian convention: **space** as thousand separator, **comma** as decimal. Currency symbol `₾` follows the number after a non-breaking space.

```ts
// shared/lib/format.ts

// ფასი: 1 234,56 ₾
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  // Output: "1 234,56 ₾"
}

// ზომა: "1 200 მმ" or "120 სმ"
export function formatDimension(value: number, unit: 'mm' | 'cm' | 'm'): string {
  const formatted = new Intl.NumberFormat('ka-GE').format(value);
  const unitLabel = { mm: 'მმ', cm: 'სმ', m: 'მ' }[unit];
  return `${formatted} ${unitLabel}`; // non-breaking space
}

// ფართობი: "2,4 მ²"
export function formatArea(squareMeters: number): string {
  const formatted = new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(squareMeters);
  return `${formatted} მ²`;
}

// თარიღი: "17 მაისი, 2026"
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ka-GE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// დრო: "15:42" — 24-hour, never AM/PM
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ka-GE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

// ფარდობითი დრო: "5 წუთის წინ", "გუშინ"
export function formatRelative(date: Date, now = new Date()): string {
  // implement via Intl.RelativeTimeFormat('ka-GE')
}
```

**Always** use `Intl.NumberFormat('ka-GE')` rather than manual string assembly — it handles edge cases (negative numbers, large numbers) correctly.

## Font loading (critical CSS)

```css
@font-face {
  font-family: 'FiraGO';
  src: url('/fonts/firago-vf.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+10A0-10FF, U+2D00-2D2F, U+1C90-1CBF, U+0000-007F;
}

@font-face {
  font-family: 'BPG Glaho Sans';
  src: url('/fonts/bpg-glaho-sans.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+10A0-10FF, U+1C90-1CBF, U+0000-007F;
}

@font-face {
  font-family: 'BPG Glaho Sans Caps';
  src: url('/fonts/bpg-glaho-caps.woff2') format('woff2');
  font-display: optional;
  unicode-range: U+10A0-10FF, U+1C90-1CBF;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/jetbrains-mono-vf.woff2') format('woff2-variations');
  font-weight: 100 800;
  font-display: swap;
  unicode-range: U+0000-007F, U+10A0-10FF;
}
```

**Preload** Body + Display:
```html
<link rel="preload" href="/fonts/firago-vf.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/bpg-glaho-sans.woff2" as="font" type="font/woff2" crossorigin />
```

## i18next — key naming

Use lowercase dot-paths. Group by feature, then by element type.

```
configurator.steps.type.title              # სათაური
configurator.steps.type.description        # აღწერა
configurator.steps.type.options.window     # ფანჯარა
configurator.steps.type.options.door       # კარი
configurator.errors.dimensions.tooSmall    # ვალიდაცია
configurator.actions.next                  # "შემდეგი"
configurator.actions.back                  # "უკან"
common.actions.submit                      # "გავაგზავნოთ"
common.actions.cancel                      # "გავაუქმოთ"
common.units.cm                            # "სმ"
common.units.mm                            # "მმ"
common.units.sqm                           # "მ²"
common.statuses.new                        # "ახალი"
common.statuses.measuring                  # "იზომება"
```

**Always-Georgian-fallback:** the default and fallback locale is `ka`. If `en` or `ru` keys are missing, the user sees Georgian, never English.

## Pluralization

Georgian doesn't morphologically distinguish singular and plural like English. i18next setup:

```json
{
  "ka": {
    "windows": {
      "count_one": "{{count}} ფანჯარა",
      "count_other": "{{count}} ფანჯარა"
    }
  }
}
```

Even though both branches are identical in Georgian, **always** define both keys so the i18next pluralizer doesn't warn and so future en/ru translations have hooks.

## Phone input

**Display mask:** `+995 5XX XX XX XX`

**Normalization (always to E.164):**
```ts
// shared/lib/phone.ts
const GEORGIAN_MOBILE = /^(\+?995)?[\s\-]?5\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}$/;

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!GEORGIAN_MOBILE.test(cleaned)) return null;
  const digits = cleaned.replace(/^\+?995/, '');
  return `+995${digits}`;  // e.g. "+995595123456"
}
```

**Accept paste in any of:** `595123456`, `+995595123456`, `5 95 12 34 56`, `+995 595-123-456`. All normalize to `+995595123456`.

**Validation:** must start with `+995 5` for mobile. Landlines are out of scope for v1 (admin can add manually).

## Quotes & punctuation

- Georgian quotes: `„გამარჯობა"` (low-9 + high-6 / U+201E + U+201C). **Not** `"hello"` or `«hello»`.
- Em-dash: `—` (U+2014). Not `--`.
- Ellipsis: `…` (U+2026). Not `...`.

Wire these as autocomplete in the admin Markdown editor.

## Units

Use **true Unicode** glyphs, never ASCII fallbacks:

| Right | Wrong |
|---|---|
| `მ²` (U+00B2) | `m^2`, `m2` |
| `მ³` (U+00B3) | `m^3` |
| `°C` (U+00B0) | `*C`, `degC` |
| `₾` (U+20BE) | `GEL`, `ლ` |
| `№` (U+2116) | `No.`, `#` |
| `×` (U+00D7) | `x` (for dimensions: `120×140 სმ`) |

## Direction & layout

- Georgian is **LTR**. Don't add `dir="rtl"` ever.
- Georgian letters can be tall — pad list rows by an extra 4px vs. Latin-only baseline.
- BPG fonts have heavy ascenders/descenders; favor `line-height: 1.55` for body text minimum.

## Anti-patterns

```
❌ "1234.56 GEL"                              → "1 234,56 ₾"
❌ "May 17, 2026"                             → "17 მაისი, 2026"
❌ "3:42 PM"                                  → "15:42"
❌ Manual string concat for numbers           → Intl.NumberFormat
❌ font-family: Inter (Latin only)            → BPG + FiraGO stack
❌ "შეიყვანეთ ნომერი"                          → "ტელეფონის ნომერი"
❌ Hardcoded English error strings            → i18next keys
❌ "m^2", "m2"                                 → "მ²"
❌ "hello" with ASCII quotes                  → „გამარჯობა"
❌ Phone stored as "595 12 34 56"             → "+995595123456" (E.164)
```

## Related skills

- [content-voice](../content-voice/SKILL.md) — tone, lexicon, microcopy patterns.
- [design-system](../design-system/SKILL.md) — typography stack, type scale.
- [frontend-patterns](../frontend-patterns/SKILL.md) — forms, validation, error display.
