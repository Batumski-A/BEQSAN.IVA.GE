# Skill: accessibility

**Trigger:** any work involving ARIA, focus management, keyboard navigation, screen-reader testing, color contrast, or before any UI feature ships.

**Source:** [docs/kickoff.md §9.8](../../../docs/kickoff.md).

---

## Compliance target

- **WCAG 2.2 AA minimum.** AAA where feasible (long-form copy, single-color components).
- Tested against **NVDA + Firefox** and **VoiceOver + Safari** as the canonical SR pairs.
- Mobile: **VoiceOver iOS** + **TalkBack Android**.

## Pre-flight checklist

1. Tab through the entire page — can I reach every interactive element?
2. Focus rings visible on **every** focusable element (no `outline:none` without a replacement)?
3. All form fields have visible **and** programmatic labels?
4. All errors are announced (`aria-live="polite"` or `aria-live="assertive"` for critical)?
5. Color is not the only way state is conveyed (icon + label for status)?
6. Contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text?
7. Touch targets ≥ 44×44 px (preferred 48×48)?
8. Heading hierarchy intact (one `<h1>`, no skipped levels)?
9. Images have ALT text describing meaning, not file name?
10. `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast` respected?
11. Skip-link present at the top of every page?
12. 3D canvas has a text-equivalent control panel?

## Keyboard navigation

- **Tab** moves focus forward; **Shift+Tab** moves back. Order matches visual layout.
- **Enter** activates buttons and links; **Space** also activates buttons (not links).
- **Arrow keys** for radio groups, sliders, custom selects, configurator step navigation.
- **Esc** closes modals, dropdowns, and tooltip popovers.
- **Home/End** jump to first/last in lists and grids where applicable.

**Modal focus trap:** when a modal opens, focus moves to the modal; Tab cycles inside; Esc closes; focus returns to the trigger.

## Focus styles

```css
*:focus-visible {
  outline: 2px solid var(--accent-amber);
  outline-offset: 2px;
  border-radius: 2px;
}
```

**Never** ship `outline: none` without a replacement. Even if you replace, ensure the replacement is visible against every background it can appear on.

## Forms

```tsx
<label htmlFor="phone">
  ტელეფონის ნომერი
  <span aria-hidden="true"> *</span>
  <span className="sr-only"> სავალდებულო ველი</span>
</label>
<input
  id="phone"
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  aria-describedby="phone-help phone-error"
  aria-invalid={hasError}
  required
/>
<p id="phone-help" className="text-sm text-fg-tertiary">
  +995 5XX XX XX XX
</p>
{hasError && (
  <p id="phone-error" role="alert" className="text-sm text-danger">
    {errorMessage}
  </p>
)}
```

**Rules:**
- `<label>` always present, programmatically linked.
- Required state shown both visually (`*`) and via `aria-required` or HTML `required`.
- `aria-describedby` links help text + error text.
- `aria-invalid={true}` when in error state.
- Error messages announced via `role="alert"` or `aria-live="polite"`.

## 3D canvas — text-equivalent controls

The 3D scene **shows** the configuration, but it must not be the only way to interact. Below or beside the canvas, render a `role="region" aria-label="კონფიგურაცია"` panel with native controls:

```tsx
<div role="region" aria-label="ფანჯრის კონფიგურაცია">
  <fieldset>
    <legend>გასაღების მხარე</legend>
    <label><input type="radio" name="hinge" value="left" /> მარცხნივ</label>
    <label><input type="radio" name="hinge" value="right" /> მარჯვნივ</label>
  </fieldset>
  <fieldset>
    <legend>გაღების ტიპი</legend>
    {/* ... */}
  </fieldset>
</div>
```

Hide the canvas from screen readers (`aria-hidden="true"` on the `<Canvas>`) — the controls below convey the same information.

## Color contrast

| Token combination | Ratio | Use |
|---|---|---|
| `--fg-primary` on `--bg-base` | ~16:1 | body text |
| `--fg-secondary` on `--bg-base` | ~9:1 | muted text |
| `--fg-tertiary` on `--bg-base` | ~4.7:1 | captions (large only) |
| `--accent-amber` on `--bg-base` | ~7:1 | CTA, links |
| `--danger` on `--bg-base` | ~5:1 | errors |

Run **every** new token combination through a contrast checker before committing. Document any exceptions in the skill.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In React: gate non-essential motion with a `useReducedMotion()` hook (Framer Motion ships one). Replace with opacity fade ≤ 100ms.

## Touch targets

- Minimum 44×44 px hit area. Preferred 48×48.
- Buttons: `min-h-11 min-w-11` (44px) on mobile, `min-h-12 min-w-12` (48px) preferred.
- Icon-only buttons: always paired with `aria-label` in Georgian.

## ALT text — write meaning, not file name

```
❌ alt="image_001.jpg"
❌ alt="window"
❌ alt="" on a meaningful image
✅ alt="ალუმინის შავი ფანჯარა ბათუმის ბინაში, საღამოს მზე"
✅ alt="" on a purely decorative image (with role="presentation")
```

The CMS / admin gallery uploader must require ALT text before save.

## Skip link

```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 ...">
  მთავარ კონტენტზე გადასვლა
</a>
<main id="main">{/* ... */}</main>
```

## Headings

- One `<h1>` per page. The page's primary subject.
- No skipped levels (`<h1>` → `<h3>` is invalid).
- Sections use `<h2>`; subsections `<h3>`; etc.

## Live regions

- `aria-live="polite"` — non-critical updates (price recalculated, draft saved).
- `aria-live="assertive"` — interruptive updates (validation errors, order submission success).
- Don't overuse — too many live regions = chaos for SR users.

## Anti-patterns

```
❌ outline: none without a replacement                  → always have visible focus
❌ <div onClick={...}>                                  → use <button> or add role + keyboard
❌ Color-only status (red dot vs green dot)             → also include icon + text
❌ "Submit" button labeled by an icon only              → aria-label or visible text
❌ Tooltip-only essential info                          → also visible in main flow
❌ Auto-rotating carousel without pause                 → always provide pause control
❌ Hover-only menus on mobile                           → tap-to-open
❌ Trapping focus on a non-modal                        → only modals trap focus
❌ aria-hidden="true" on a focusable element            → unreachable + invisible to SR
❌ Image alt="window" (vague)                           → describe what's specifically shown
```

## Related skills

- [design-system](../design-system/SKILL.md) — token contrast values, focus ring spec.
- [content-voice](../content-voice/SKILL.md) — Georgian ALT, label, error copy.
- [frontend-patterns](../frontend-patterns/SKILL.md) — form structure, error display.
- [3d-scene-design](../3d-scene-design/SKILL.md) — text-equivalent control pattern.
