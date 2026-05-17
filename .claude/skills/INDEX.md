# BEQSAN Skill Router

Read the right skill **before** touching the relevant area. Each skill is self-contained — load it the moment its trigger applies.

## When to load which skill

| If you are... | Read this first |
|---|---|
| Writing **any UI** (component, page, Tailwind, animation, copy layout) | [design-system/SKILL.md](design-system/SKILL.md) |
| Writing **any backend** (.NET, EF, Dapper, MediatR, controllers, validators) | [dotnet-clean-arch/SKILL.md](dotnet-clean-arch/SKILL.md) |
| Touching `FRONT/src/features/configurator/` (state, steps, pricing mirror, drafts) | [configurator-architecture/SKILL.md](configurator-architecture/SKILL.md) |
| Editing Three.js / React Three Fiber / GLTF / shaders / materials | [3d-scene-design/SKILL.md](3d-scene-design/SKILL.md) |
| Writing any React component, hook, form, query, route in `FRONT/` | [frontend-patterns/SKILL.md](frontend-patterns/SKILL.md) |
| Writing any user-facing string, formatting numbers/dates/prices, i18next keys | [georgian-ux/SKILL.md](georgian-ux/SKILL.md) |
| Building or debugging `/api/v1/ai/*` endpoints or AI client calls | [ai-integration/SKILL.md](ai-integration/SKILL.md) |
| Running Lighthouse, optimizing bundles, debugging slow pages, before any release | [performance-optimization/SKILL.md](performance-optimization/SKILL.md) |
| Adding ARIA, focus management, screen-reader testing, keyboard nav | [accessibility/SKILL.md](accessibility/SKILL.md) |
| Writing buttons, errors, empty states, confirmations, microcopy | [content-voice/SKILL.md](content-voice/SKILL.md) |
| Writing tests (unit, integration, E2E, visual regression) | [testing-strategy/SKILL.md](testing-strategy/SKILL.md) |
| Touching CI, Docker, deployment, logging, secrets, hosting on IVA infra | [deployment-ops/SKILL.md](deployment-ops/SKILL.md) |

## Skill priority when multiple apply

Process skills (architecture, patterns) before stylistic skills (voice, micro-design). If you're building a configurator step:

1. `configurator-architecture` (state contract)
2. `frontend-patterns` (how components are organized)
3. `design-system` (how it looks)
4. `georgian-ux` + `content-voice` (what it says)
5. `accessibility` (final pass)
6. `performance-optimization` (bundle/runtime audit)

If you're building an admin order-status endpoint:

1. `dotnet-clean-arch` (handler shape, Result, validation)
2. `testing-strategy` (what tests to write)
3. `deployment-ops` (logging, secrets if any)

## Source

All skills here are derived from [docs/kickoff.md §9-§13](../../docs/kickoff.md). If a skill contradicts the kickoff doc, fix the skill — kickoff is the source.

When the kickoff doc says one thing in `docs/kickoff.md §X` and a skill says another, **follow the skill** during implementation and log the conflict to `docs/questions.md` so it gets resolved at the source.
