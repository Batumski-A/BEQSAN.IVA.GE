# Skill: design-system

**Trigger:** any UI/CSS/component work, any visual change to BEQSAN's public site or admin app.

**Source:** [docs/kickoff.md §9](../../../docs/kickoff.md) — "Industrial Elegance". This skill is the operational distillation. When in doubt, the kickoff doc wins.

---

## Direction (one sentence)

**"Swiss precision meets Black Sea moody light meets Bauhaus material honesty."**

BEQSAN makes physical aluminum and glass in a real Batumi workshop. The site must feel like the workshop — honest, weighty, crafted — not like another AI-generated SaaS template.

## Pre-flight checklist (run mentally before writing UI)

1. Have I aligned with "Industrial Elegance"? Read §9.1.
2. Am I using OKLCH design tokens (`--bg-*`, `--fg-*`, `--accent-*`, `--mat-*`)?
3. **Did I reach for `Inter` / `Roboto`?** STOP — wrong stack.
4. **Is there more than one accent color in this view?** STOP — reduce to one.
5. **Are all corners `rounded-2xl`?** STOP — vary intentionally: sharp / 2px / 8px.
6. **Did I drop a purple/pink gradient?** STOP — that is AI slop.
7. **Are touch targets ≥ 44×44 px?**
8. Is there a single hero animation, or several competing micro-interactions?
9. Does the page respect `prefers-reduced-motion`?
10. Have I checked contrast ratios (≥ 4.5:1)?
11. Did I write **real Georgian copy**, not English placeholders, not lorem ipsum?
12. Have I left at least one **break** in the grid (oversized number, full-bleed image, diagonal element) — *once per page*?

## Design tokens (final, do not improvise)

```css
/* Background — depth through value, not hue */
--bg-base:        oklch(15% 0.01 250);
--bg-elevated:    oklch(19% 0.012 250);
--bg-raised:      oklch(23% 0.014 250);
--bg-overlay:     oklch(27% 0.016 250);

/* Foreground */
--fg-primary:     oklch(96% 0.005 95);
--fg-secondary:   oklch(78% 0.008 95);
--fg-tertiary:    oklch(62% 0.01 250);   /* lifted from 56% to clear 4.5:1 contrast on bg-base */
--fg-disabled:    oklch(38% 0.01 250);

/* Brushed aluminum */
--mat-aluminum:   oklch(72% 0.015 240);
--mat-aluminum-h: oklch(82% 0.015 240);
--mat-aluminum-d: oklch(55% 0.015 240);

/* Signature accent — Batumi amber, SPARINGLY */
--accent-amber:   oklch(74% 0.16 65);
--accent-amber-h: oklch(82% 0.16 65);
--accent-glow:    oklch(74% 0.16 65 / 0.35);

/* System */
--success:        oklch(72% 0.16 145);
--warning:        oklch(78% 0.15 75);
--danger:         oklch(63% 0.22 25);
--info:           oklch(70% 0.13 230);

/* Hairlines, never thick borders */
--hairline:       oklch(96% 0 0 / 0.08);
--hairline-strong:oklch(96% 0 0 / 0.14);
```

**Rules:**
- **One accent per view.** Amber goes on CTA, active state, critical reveal. Never two amber items competing on the same screen.
- **Function-bound colors.** Danger is always red, success always green. Other states are neutral.
- **No flat fills.** Background gets a subtle gradient or noise texture (1-2% opacity grain) — never bare hex.

## Typography (fixed stack — do not substitute)

```
Display (HERO):     "BPG Mrgvlovani Caps" or "BPG Glaho Sans Caps"  — uppercase only, tracking -2%, lh 0.95
Headlines (h1-h3):  "BPG Glaho Sans"                                — title case, tracking -1%, lh 1.1
Body & UI:          "FiraGO"                                        — Georgian/Latin unified, lh 1.55
Mono / Specs:       "JetBrains Mono"                                — tabular-nums, lh 1.4
Editorial (Phase 2):"PP Editorial New" Latin + "BPG Excelsior Caps" Georgian
```

**Scale (modular, ratio 1.25):**
```
Display 1   72/80   hero only
Display 2   56/64   major reveal
H1          40/48
H2          32/40
H3          24/32
H4          20/28
Body lg     18/28   long-form
Body        16/24   default
Body sm     14/20   UI
Caption     12/16   meta
Mono spec   13/18   tabular-nums
```

**Loading:**
- Display fonts: `font-display: optional` (system fallback OK on first paint).
- Body: `font-display: swap` + `<link rel="preload">`.
- Subset to Georgian + Latin essentials via `unicode-range` (60-70% size cut).
- Variable fonts where available (FiraGO has a VF build).

**Detail rules:**
- Numbers are **always** Arabic digits: `1 200 ₾`, never "ერთი ათასი".
- Prices use `tabular-nums` — never let digits dance in a table.
- Georgian quotes: `„გამარჯობა"` (low-9 + high-6), not `"hello"`.
- Units: `მ²`, `მმ`, `კმ` — true Unicode glyphs, not `m^2`.
- Lowercase headlines only as a creative choice, never the default.

## Spacing & grid

**4px base scale:** `4 8 12 16 24 32 48 64 96 128 192`

**Grid:**
- Mobile: 4-col, 16px gutter, 16px margin
- Tablet: 8-col, 20px gutter, 32px margin
- Desktop: 12-col, 24px gutter, 64px margin
- Max content width: **1440px** (readability > showoff)
- "Generous" sections: 96-128px vertical padding
- "Dense" sections (admin): 48px vertical padding

**Composition:**
- **Asymmetry by design.** Hero text is never centered if it can be left-aligned with intent.
- **One grid break per page.** Diagonal, oversized number, full-bleed image — *once*.
- **Negative space is content.** Hero ≥ 60% breathing room.

## Motion language

**Philosophy:** "Weight, not bounce." We move heavy windows for a living.

**Easing curves:**
```ts
standard:   cubic-bezier(0.32, 0.72, 0, 1)   // 240ms — UI default
enter:      cubic-bezier(0, 0, 0.2, 1)        // 320ms — element appearing
exit:       cubic-bezier(0.4, 0, 1, 1)        // 200ms — element leaving
heavy:      cubic-bezier(0.16, 1, 0.3, 1)     // 480ms — modals, sheets, drawers
mechanical: spring({ stiffness: 80, damping: 18, mass: 1.4 })  // 3D door/window hinge
```

**Choreography:**
- **Stagger** siblings 40-60ms on entrance, never simultaneous (unless intentional).
- **One hero animation per page.** Multiple competing motions = visual noise.
- **Hover** responses ≤ 120ms. Should not outrun the cursor.
- **Page transitions:** 240ms crossfade, or slide-in for modal routes.
- **Loading:** skeleton always. Spinners on empty screens are forbidden.
- **Reduced motion:** at `@media (prefers-reduced-motion: reduce)`, collapse all motion to opacity fade ≤ 100ms.

**Signature micro-interactions:**
- Button press: 1px push down + 80ms scale-to-0.98 + haptic on mobile.
- Submitted price: counter-up animation (1.2s, ease-out).
- Configurator step transition: current slides out top, next slides in bottom, children staggered.
- 3D window opening: spring physics with the `mechanical` curve.

## Material honesty

**Photography:**
- Workshop shots → black & white, high contrast, process-focused (welding sparks, aluminum cuts, hands measuring).
- Product shots → color, single-source lighting (workshop window light). **No** stepped white studio backgrounds.
- Hero shots → environmental, installed in real Batumi homes, with Black Sea evening light raking through glass.
- Before/After → muted palette except the new window which catches the light.

**Texture:**
- Background grain noise overlay at 2-3% opacity (SVG turbulence or noise PNG). **Never** a flat surface.
- Material swatches show real textures — brushed aluminum has the actual brushing direction, wood swatches show real oak/wenge grain.

**Decorative honesty:**
- Technical drawing lines (dimension arrows, callouts) at page edges, low opacity. Reinforces "we make real things."
- RAL color codes next to swatches in Mono font: `ფერი № RAL 7016`.
- Workshop coordinates badge on contact page: `41.6168° N, 41.6367° E — სალიბაური, ბათუმი`.

## Signature components

**Hero section:**
- Full-screen dark background, centered black & white workshop video loop (15s, muted, autoplay).
- One Display-1 sentence over it: `„ხელით აწყობილი ფანჯრები ბათუმის ფაბრიკაში."`
- One CTA below: `→ აწყვე შენი ფანჯარა` (amber, oversized, mono `01`-badge).
- Nothing else. One idea per hero.

**Product card:**
- Background `--bg-raised`, hairline border.
- Top: 3D model preview, slow auto-rotate on hover (4s rotation).
- Middle: product name (Display 2) + one Body sentence.
- Bottom: 3 spec lines in Mono: `MATERIAL · ALUMINUM 70mm`, `U-VALUE · 1.2 W/m²K`, `STARTING · 280 ₾/m²`.
- Hover: `translateY(-2px)`, shadow on, label fade-in.

**Configurator step indicator:**
- Not dots/progress-bar. A **vertical ticker** (desktop) or horizontal mini-rail (mobile).
- Active step: amber + numeric (`01`, `02`...). Inactive: hairline + secondary fg.
- Transition: line draws to the next step.

**Pricing breakdown:**
- Receipt-style — Mono font, dashed hairline between rows.
- Total: Display 2, 1px amber underline.
- Format: `₾ 1 240` with Georgian space thousand separator.

**Order status timeline:**
- Vertical timeline, milestones as technical-drawing markers (small circles + lines).
- Active stage: slow pulse, 2.4s, breathe-like.
- Completed: filled checkmark, hairline through to the next.
- Mono labels with timestamps.

## Anti-patterns (auto-flag these)

```
❌ <div className="bg-purple-500 ...">           → no purple as primary
❌ font-family: Inter, sans-serif                 → wrong stack
❌ lorem ipsum                                    → use real Georgian copy
❌ centered everything                            → intentional asymmetry
❌ glassmorphism without semantic reason          → no decorative blur
❌ rounded-2xl applied universally                → vary corners deliberately
❌ multiple amber CTAs on one screen              → one accent per view
❌ flat solid backgrounds                         → always grain or gradient
❌ progress-bar dots for configurator             → use the vertical ticker
❌ AM/PM time format                              → 24-hour only
```

## Related skills

- [content-voice](../content-voice/SKILL.md) — Georgian microcopy, tone, lexicon.
- [georgian-ux](../georgian-ux/SKILL.md) — number/date/price formatting, font loading, phone input.
- [accessibility](../accessibility/SKILL.md) — focus rings, contrast, ARIA.
- [3d-scene-design](../3d-scene-design/SKILL.md) — for 3D-specific material art direction.
