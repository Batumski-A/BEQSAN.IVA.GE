# Open Questions

Unresolved domain / infrastructure / business decisions that need Roman or Lasha to weigh in. Update this file as new questions surface and as old ones get answered. Date format: `YYYY-MM-DD (asker → asked)`.

Convention: keep answered questions here for one sprint, then move to `decisions/` (ADR-style) and remove from this list.

---

## 🔴 Blocking (decide before Phase 1 scaffold lands)

_(none currently — all blocking infra calls were delegated to Claude on 2026-05-17. Decisions tracked in `docs/adr/`.)_

---

## 🟡 Should-decide-soon (before Phase 1 polish)

### 5. SMS provider: SMSOffice.ge or Magti?

- 2026-05-17 (Claude → Lasha): both listed. Need API access + tested deliverability before Phase 1 ships.
- Roman likely has a preference based on existing relationship.

### 6. Profile system suppliers (Aluprof, ASAŞ, others)

- 2026-05-17 (Claude → Roman): kickoff §4 lists "Aluprof MB-70, ASAŞ" as examples. Need authoritative list of suppliers + product codes for the `ProfileSystem` table seed data.

### 7. Pricing baselines

- 2026-05-17 (Claude → Roman): the `PricingRule` editor needs starter values for: material × profile per m², color modifiers, glass modifiers, accessory absolute prices, region modifiers. We can seed reasonable placeholders, but real numbers must come from Roman before launch.

### 8. Warranty terms (Markdown content)

- 2026-05-17 (Claude → Roman): the kickoff says "minimum 2 years, configurable from admin". Need the actual legal text — written by Roman or his legal contact.

### 9. Admin authentication identity source

- 2026-05-17 (Claude → Roman/Lasha): JWT decided. Question is **who issues the credentials** for Phase 1.
- **Default (decided):** self-contained `Users` table with bcrypt-hashed passwords, seeded with two admins (Lasha + Roman) on first migration. SSO evaluated in Phase 2 if IVA has one.

---

## 🟢 Background (Phase 2+)

### 10. AI room-visualization provider — Replicate vs Black Forest Labs direct

- Decide closer to Phase 2 based on quality + cost benchmarks against real photos.

### 11. Multi-language launch order: en + ru together, or en first?

- Russian content useful for Batumi tourist-property buyers; English helps SEO. Roman's call.

### 12. PWA install prompt timing

- Show immediately vs. after first configurator completion? UX-test in Phase 2.

### 13. Stripe / TBC integration scope

- Deposits-only? Full price? Pay-on-completion? Phase 3 decision.

---

## ✅ Recently answered

(none yet)
