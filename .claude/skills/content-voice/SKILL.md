# Skill: content-voice

**Trigger:** any user-facing string — buttons, errors, empty states, confirmations, ALT text, SMS bodies, email subjects, page headings.

**Source:** [docs/kickoff.md §9.10](../../../docs/kickoff.md).

---

## Tone

**Calm, confident, craftsperson-like.** We don't shout. We don't use exclamation marks for emphasis. We don't say "უმარტივესი ფასი ბაზარზე!!!" or "გრანდიოზული აქცია!!!". We're a workshop — we make.

The voice is the voice of Roman, the master craftsman. He's been doing this for decades. He's not impressed by his own work, but he's quietly proud. He uses precise language. He explains, doesn't sell.

## Lexicon

### Pronouns
- **შენ** (informal "you") inside the configurator — intimate, helpful, like a master showing an apprentice.
- **თქვენ** (formal "you") on landing, about, contact, warranty pages — respect for a stranger walking into the workshop.
- Switch is intentional. The transition from `/` to `/configurator` is also a transition from polite to collaborative.

### Possession
- ✅ `„შენი ფანჯარა"` (your window)
- ❌ `„თქვენი შეკვეთა"` (your order — sounds like a receipt)

### Action buttons
| Don't | Do |
|---|---|
| `„Submit"`, `„Send"` | `„გავაგზავნოთ"` |
| `„Save"` | `„შევინახოთ"`, `„მზად ვარ"` |
| `„OK"`, `„Confirm"` | `„დიახ, ვაგრძელებთ"`, `„მზადაა"` |
| `„Cancel"` | `„გავაუქმოთ"`, `„უკან"` |
| `„Next step"` | `„შემდეგ ეტაპზე"`, `„გავაგრძელოთ"` |
| `„Try again"` | `„შევეცადოთ თავიდან"` |
| `„Buy now"` | `„შევუკვეთოთ"` |

### Errors
| Don't | Do |
|---|---|
| `„შეცდომა მოხდა"` | `„გავიდა მცირე ხარვეზი"` |
| `„შეცდომა მოხდა, კიდევ სცადეთ"` | `„გავიდა მცირე ხარვეზი. შევეცადოთ თავიდან?"` |
| `„არასწორი მონაცემები"` | `„ეს ნომერი მესმის როგორც არასწორი — შეიძლება გადაამოწმო?"` |
| `„შეცდომა 500"` | `„რაღაც ჩვენს მხარეზე გავიდა მწყობრიდან. წუთით მოგვეცი დრო და სცადე თავიდან."` |

Errors **name the cause** and **suggest action**. They never blame the user.

### Inputs
| Don't | Do |
|---|---|
| `„შეიყვანეთ ნომერი"` (enter number — command) | `„ტელეფონის ნომერი"` (just the label) |
| `„დაწერეთ თქვენი სახელი"` | `„სახელი (არასავალდებულო)"` |

Labels describe the field, not commands.

### Status names (Order workflow)

These are user-facing — soft Georgian, not technical English:

| Internal code | Public Georgian |
|---|---|
| `new` | `„მიღებულია"` |
| `contacted` | `„დაგვირეკეთ"` |
| `measuring` | `„იზომება ობიექტზე"` |
| `in_production` | `„მზადდება სახელოსნოში"` |
| `ready` | `„მზადაა მონტაჟისთვის"` |
| `installing` | `„დღეს მონტირდება"` |
| `installed` | `„დამონტაჟებულია"` |
| `completed` | `„დასრულდა"` |
| `warranty_active` | `„გარანტიის ქვეშ"` |
| `cancelled` | `„გაუქმდა"` |

## Copy patterns

### Empty states — give them personality

```
✅ „ჯერ შეკვეთა არ გაქვს — დროა აიწყო პირველი."
✅ „კონფიგურაცია ცარიელია. დაიწყე ფანჯრის ტიპით."
✅ „აქ ჯერ ფოტო არ ატვირთულა. გადაიღე ან აარჩიე გალერეიდან."

❌ „No data"
❌ „ცარიელია"
```

### Confirmations — name specifically what happened

```
✅ „შეკვეთა №1234 მიღებულია. რომან 1 საათში დარეკავს."
✅ „ფასი განახლდა: 1 240 ₾ → 1 380 ₾"
✅ „ფოტო ატვირთულია. AI ანალიზი 5 წამში დასრულდება."

❌ „გაიგზავნა"
❌ „წარმატებული"
```

### Pricing — always clear

Tell the user **what's included**:

```
✅ „1 240 ₾ — სრული, დღგ-ით"
✅ „1 240 ₾ — მონტაჟის გარეშე"
✅ „+ 80 ₾ მონტაჟი (ქობულეთი)"

❌ „1 240"  (just a number)
❌ „1 240 ₾*"  (asterisk hiding cost — never)
```

### SMS bodies

Short. Direct. One action.

```
✅ „BEQSAN: შეკვეთა №1234 მიღებულია. სტატუსის სანახავად: beqsan.iva.ge/o/abc123"
✅ „BEQSAN: შენი ფანჯრის მონტაჟი ხვალ 11:00-ზე. რომან: 599 12 34 56"
✅ „BEQSAN: კოდი 4827. ვერიფიკაცია 5 წუთში."

❌ „გამარჯობა, კომპანია BEQSAN-სგან თქვენ მიიღეთ შემდეგი შეტყობინება..." (waste)
```

### Email subjects

```
✅ „შეკვეთა №1234 — მზადდება სახელოსნოში"
✅ „გარანტიის შეხსენება — №1234, 2028 წლის მაისი"

❌ „Update from BEQSAN"
```

## Bad copy auto-flags

```
❌ Lorem ipsum ANYWHERE                    → real Georgian copy
❌ ENGLISH PLACEHOLDER COPY                 → fix before commit
❌ ALL CAPS HEADLINES (unless Display 1)    → title case
❌ Multiple !!! in a row                    → max one !
❌ "გრანდიოზული", "უმარტივესი", "უწინაბრო"  → calm + specific instead
❌ Loading: "გთხოვთ მოიცადოთ..." (formal)    → "იტვირთება..." (active voice)
❌ "Submit" / "Send" untranslated           → Georgian action verb
❌ Date in "May 17, 2026" format            → "17 მაისი, 2026"
❌ Time with AM/PM                          → 24-hour
❌ Vague ALT: "image", "photo", "window"    → describe specifically
```

## Microcopy library (reusable, build into i18next)

```
common.actions.continue           → "გავაგრძელოთ"
common.actions.back               → "უკან"
common.actions.cancel             → "გავაუქმოთ"
common.actions.save               → "შევინახოთ"
common.actions.submit             → "გავაგზავნოთ"
common.actions.retry              → "შევეცადოთ თავიდან"
common.actions.close              → "დავხუროთ"
common.actions.edit               → "გავარედაქტიროთ"
common.actions.delete             → "წავშალოთ"
common.actions.confirm            → "მზად ვარ"

common.states.loading             → "იტვირთება..."
common.states.saving              → "ინახება..."
common.states.searching           → "ვეძებთ..."
common.states.error               → "გავიდა მცირე ხარვეზი"
common.states.empty               → "ჯერ არაფერია"
common.states.offline             → "ინტერნეტი არ მუშაობს"

common.units.cm                   → "სმ"
common.units.mm                   → "მმ"
common.units.m                    → "მ"
common.units.sqm                  → "მ²"
common.units.kg                   → "კგ"
common.units.gel                  → "₾"

common.time.today                 → "დღეს"
common.time.yesterday             → "გუშინ"
common.time.tomorrow              → "ხვალ"
common.time.minutes_ago           → "{{n}} წუთის წინ"
common.time.hours_ago             → "{{n}} საათის წინ"
common.time.days_ago              → "{{n}} დღის წინ"
```

## Tone calibration — when in doubt

Read the line out loud as Roman would say it standing in his workshop in dusty work clothes. Does it sound like him? If it sounds like a marketing department, rewrite it.

## Related skills

- [georgian-ux](../georgian-ux/SKILL.md) — number/date/phone formatting, font stack.
- [accessibility](../accessibility/SKILL.md) — ARIA labels, alt text, live region copy.
- [design-system](../design-system/SKILL.md) — copy placement, hierarchy, hero patterns.
