@AGENTS.md
@DESIGN.md
@ENGINEERING.md

## Owner's standing rules (12 Nov 2026)

**1. Roadmap first.** `../docs/ROADMAP.md` is the source of truth for architecture, features,
business logic and workflows. It outranks DESIGN.md and ENGINEERING.md.
- Never add a feature that conflicts with it, or change business logic to suit a UI design.
- When UI and backend logic, data integrity or the roadmap disagree, keep the core logic.
- Unclear business requirement → ask the owner. Do not assume.

**2. UI must never compromise:** backend logic, database integrity, existing API contracts,
permissions/roles, accounting and stock calculations, roadmap workflows.

**3. Every control works.** No decorative or dead buttons, no fake data, no invented metrics.
Every new screen covers loading, empty, error, success and **permission-denied** states.

**4. ERP UX checks for every screen** (in addition to DESIGN.md):
| Check | Meaning |
|---|---|
| Data density | Lots of data, still calm to read |
| Contextual actions | Actions depend on document, status and the user's permissions |
| Smart filters | Large lists stay easy to narrow down |
| Activity timeline | Document history and who did what |
| Document links | Easy jumps between related documents (PO → Receipt → Invoice → Payment) |
| Workflow visibility | Where the document is, who must approve, what is pending |
| Financial clarity | Amounts, totals, balances, debit/credit clearly distinct |
| Fewer clicks | No needless steps or repeated actions |

**5. Components and dependencies.** Reuse `components/ui-kit/` first, then shadcn (Base UI),
styled to our tokens. Add a library only when it gives real value; watch bundle size.
Use the frontend-design skill for new screens. Desktop first, but responsive.
