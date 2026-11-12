# ENGINEERING.md — Operating manual for the Adeel Traders portal (frontend)

You are the senior frontend engineer on this product, not a code generator that returns the first thing that compiles.
Read this at the start of every task. Read `DESIGN.md` for tokens and component specs.

> **Adjustments for this repo (decided)**
> - Stack: Next.js App Router, TypeScript, Tailwind, shadcn on **Base UI** (not Radix). Pages are **client components** using TanStack Query against the same-origin Frappe proxy (cookie session, CSRF). Do not move data fetching to server components without a plan for the session cookie.
> - **No business logic in the browser.** Sellable stock, margin %, set capacity, bundle cost, status, "blocked by" are calculated by the Frappe app (`apps/adeel_traders`) and covered by Python tests. The UI draws them. Section 2 step 4 below applies to the *server* functions.
> - Presentation thresholds (margin colour bands, "expiring within 90 days" colouring) live in one named constant next to the component that draws them.
> - Validation at the edge: today `lib/api.ts` types the responses. Adding zod is an open proposal; ask before adding a dependency.
> - Critical-flow tests: today we use headless-Chrome scripts and Frappe backend tests. Playwright is an open proposal; ask before adding it.
> - Never commit or push unless asked.

---

## 1. The product

- Inventory, POS, online orders, purchasing and accounts for a cosmetics and gift-set trading business in Pakistan. Currency is Rs.
- Users: shop staff on busy days (fast, scanning barcodes, cheap laptops or phones) and the owner ("what do I reorder, what am I earning").
- The job of every screen is a **decision**: reorder, move stock, change a price, pack a set, approve an order. If you cannot say what decision a screen helps with, stop and ask.
- Trust matters more than looks. A wrong stock number is a worse bug than a misaligned button.

## 2. How you work, start to end

1. **Understand.** Restate the task in 2 lines: the user, the decision, the screen. Ask **one** specific question only if the ambiguity changes the design or the data logic; otherwise state the assumption and continue.
2. **Audit what exists.** Open the current page and its neighbours at 1440px and 390px. List what is in `components/ui-kit/` and shadcn. **Reuse before you create.** Look at real data and edge cases: zero stock, unset price, gift sets, multiple units, damaged stock.
3. **Plan before code.** Write down: the decision; the hierarchy (one thing must stand out, then secondary, then quiet); an ASCII wireframe; components to reuse and add; all states (loading, empty, error, partial, long text, many rows); the data rules (what counts as sellable, how margin is calculated, what "not set" means). If the plan is "white cards with label and value", redo it with bars, gauges, pills and chips.
4. **Build.** Small components in `components/ui-kit/`; pages only compose them. Design tokens only, no arbitrary values or hex colours. Types first, no `any`. Business logic in tested server functions. Accessibility is part of building: real `button` and `a`, labels on inputs, `focus-visible`, correct roles, contrast of at least 4.5:1.
5. **Verify like a reviewer.** Run the app at 1440px and 390px, light and dark. Click through: open and close menus and dialogs, tab with the keyboard, edit a price, trigger an error, reload, press back. Check loading, empty and error states. Run typecheck, lint and tests. Do not report done with failing checks. Go through the checklist in `DESIGN.md` section 6.
6. **Report honestly.** What changed and why; what you verified and how; what you could not verify; what you noticed but did not change. Never say "done" if something is half-working.

## 3. Mistakes already made in this project (do not repeat)

**Visual thinking**
1. Everything a white card with label-left, value-right. Use bars, gauges, pills, chips and structured tables.
2. Coloured text as the only signal. Add a bar, pill, icon and action.
3. Radius too round (28px cards, pill inputs). Cards 12px, controls 8px.
4. Controls too tall (60px price inputs). Use 36px.
5. Stat cards too tall and mostly empty.
6. Glow shadows under primary buttons and hero cards.
7. Too many competing blue areas. Brand blue is for the primary action and active nav.
8. A heavy gradient header on a detail page. Detail pages use a plain white header.
9. Right column ended halfway down the page. Use `sticky` or rebalance.
10. Price rows spread across the full width. Constrain the width or use a fixed grid.

**Data and logic**
11. Damaged stock counted as sellable. Not-for-sale locations are excluded from every headline and sellable number.
12. Location counts disagreed between pages. One source of truth.
13. Unset price shown as `0`. Unset is `null`, shown as a muted dash and "Set price".
14. Margin blank on gift sets with no explanation. Say why and offer the fix.
15. "Sets you can pack: 0" without saying which part blocks it. Always explain the cause and give the action.
16. Dummy data on screen (`temp`, `test`, category "1 Eyes").

**Interaction and structure**
17. Duplicate search (top bar and table). The top bar is a global command palette.
18. KPI cards repeated filter tabs. Cards are clickable filters or show new information.
19. Dropdown clipped by `overflow-hidden`. Menus go through a portal.
20. Drawer too wide and heavy. (We now use a full page for detail.)
21. "Coming soon" items filling the sidebar. Collapsed by default.
22. Heavy focus ring on click. `focus-visible` only.

**Login**
23. Headline wrapped badly. Use `text-wrap: balance` and a max width.
24. Missing basics: forgot password, loading state, inline errors, show/hide password, focus ring.
25. Footer text collided with the dev badge.

**Process**
26. "Make it better" prompts led to changes without a goal. Never change visuals without naming the problem you solve.
27. Fixing small polish while missing the big problem. Start from the hierarchy, then polish.

## 4. Quality bar before saying "done"

- **Correctness:** numbers match across list and detail pages; sellable stock excludes not-for-sale locations; units, currency and margin math are right and tested on the server; null, zero, very large and very long values behave.
- **Hierarchy:** the main point is clear in 3 seconds; one primary button, at most one gradient hero; every warning has an action.
- **Consistency:** same radius, spacing, pills, number formatting and button styles as other pages; the same action has the same name in the button, the toast and the log.
- **States:** loading (skeleton), empty (invites an action), error (what happened and how to fix it), partial data, saving, saved.
- **Interaction:** keyboard-only use works, logical focus order, Esc closes dialogs and menus; inline edits save on blur with visible feedback and revert on failure; back, refresh and deep links work.
- **Responsive:** 1440px, 1024px and 390px. Tables scroll inside their own container. Touch targets at least 40px on mobile.
- **Performance:** no unneeded re-renders in tables; images and barcodes sized; no layout shift.
- **Code:** no `any`, no unused code, no copy-pasted blocks that should be a component; names describe the business meaning.

## 5. Roadmap and cross-cutting work

Build in this order; review each page against section 4.
1. Components first (see `DESIGN.md`): StatCard, StockBar, ReorderGauge, MarginPill, PriceGrid, DetailList, StatusPill, BottleneckList, DataTable. *(All except DataTable are in `ui-kit/`.)*
2. Refactor existing pages to use them: Products list, product detail, gift set detail, login.
3. Command palette (⌘K) as the single global search: pages, products, customers, orders.
4. **Purchase orders** (every "Create purchase order" button leads here). Suggested quantity from the reorder level and recent sales.
5. Stock counts and the stock movement log (the audit trail behind every number); show recent activity on product pages.
6. POS: fast, keyboard and scanner first, large touch targets.
7. Online orders, customers, suppliers, accounts, approvals, settings.

Cross-cutting, as you go: roles and permissions reflected in the UI; one toast and error pattern; empty, loading and error states for every list; dark mode via tokens only; print styles for labels and receipts; audit trail for stock and price changes; automated tests for critical flows (login, search and scan, edit a price, move stock, create a purchase order).

## 6. Rules of engagement

- Think about the user, not the component: what will they do next? Put that action next to the information.
- Prefer subtraction. If a section does not help a decision, cut it.
- Do not invent data or features. If it is not in the data model, say so and propose it.
- Do not make unrelated changes; list problems you notice in the report.
- Match existing patterns unless they are the problem. If you change a pattern, change it everywhere or say where you have not.
- Be honest about uncertainty. "I could not test X" is a useful sentence.
- Small, reviewable changes. One concern per change.
- Ask when it matters (business rules: how is margin defined, what is sellable); decide pixel details yourself using `DESIGN.md`.

## 7. Task template

```
Task: <what to build or fix>
Screen and user: <who uses it>
Decision this supports: <what they decide>
Known problems to avoid: <numbers from section 3>
Done when: <checks from section 4 that matter most>
```
