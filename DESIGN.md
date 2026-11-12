# DESIGN.md — Adeel Traders Business Portal

Read this file before writing or changing any UI. It overrides your defaults.
Currency: Rs. Users: shop staff and the owner, working fast, often scanning barcodes.

> **Adjustments for this repo (decided, do not re-litigate without the owner)**
> - UI primitives are **Base UI via shadcn** (not Radix). Menus and popovers already render through a portal.
> - Shared components live in `apps/staff/components/ui-kit/`.
> - **Business logic stays on the server (Frappe).** The UI only shows what the API returns: sellable stock, margin %, set capacity, bundle cost, "blocked by". Never recompute them in the browser.
> - Product detail is a **full page** (`/products/[code]`), by the owner's decision. The drawer-as-preview in section 4 is not used for now.
> - The "Create purchase order" button and the 30-day movement chart / recent activity need Purchasing and the stock movement log, which are not built. Do not fake them. Add them when those features land.
> - Margin colour bands (section 3, MarginPill) are display defaults, to be confirmed with the owner.
> - Margin stays visible in the product list as a quiet second line (the SRS makes the margin view mandatory).
> - No zod or Playwright yet; see `ENGINEERING.md`.

## 0a. Visual direction (12 Nov 2026, after research: Linear, Stripe, Attio, Vercel)

The owner rejected "a normal page with icons added". The fix is restraint, not more things:

- **Quiet chrome.** Light sidebar in the canvas tone, hairline border, sentence-case group labels (never ALL CAPS). Active item = white pill with a hairline ring and a blue icon, not a solid blue block.
- **Module colours on icons (owner's request, 12 Nov 2026).** Every module has one colour (`components/ui-kit/icon-tile.tsx`: Products cobalt, Prices emerald, Catalogue violet, Stock teal, Counts rose, Roles fuchsia, People lime) used for its icon everywhere: sidebar, table headings, rows (`IconTile`), fact cards. Never grey-only icons.
- **Warning colours keep their meaning.** Cobalt fill is for the one primary button, focus and links. Amber text/tags (`text-warning-ink`) mark things that are hard to undo. Red is for errors and loss.
- **Fewer boxes.** Page titles, descriptions and notes sit on the canvas. A card holds one working surface (a table, a list of rows). Never a box inside a box.
- **Levels as a meter, not pills.** Three small bars plus a word (1 bar = see, 3 = the most the area allows). Solid coloured pills for every value are banned.
- **People look like people.** Avatars use a soft tint chosen from the person's id (`avatarTone`), the same everywhere.
- **Segmented choices** (level pickers): grey track, each option shows the same 3-bar glyph as the tables, the chosen option is a dark ink chip (dark amber when hard to undo). Arrow keys move between options. Read-only pages show the value as a meter, never disabled buttons.
- **Icons:** each area keeps the sidebar's icon everywhere (table headers, rows). Amber only means "hard to undo"; private data uses a neutral lock.
- **Short headers.** Table columns use one word; the long name lives in the row or a tooltip.

## 0. The one problem to fix

Every screen was built the same way: **a white rounded card, a label on the left, a value on the right.**
Stock, prices, details, parts and units all looked identical, so nothing led the eye and the data was not visual.

Rule: **if a number has a meaning (low, blocked, profitable, behind), show that meaning visually, not as coloured text.**
Before you build any section, ask: "what decision does the user make here?" and design for that decision.

## 1. Tokens (use these, no ad-hoc values)

- Radius: cards `rounded-xl` (12px), inputs/buttons/selects `rounded-lg` (8px), chips `rounded-md` (6px), status pills `rounded-full`. **Never more than 16px.**
- Shadow: cards use `border` and no shadow. Only popovers, dropdowns and dialogs get a shadow. No coloured glow under buttons.
- Colour: one brand blue (existing). Neutral = slate scale. Semantic colours only for state: success = emerald, warning = amber, danger = red, info = brand blue.
  Brand blue is for the primary action and the active nav item only. Not decoration.
- Dark gradient: allowed on **one** hero element per page, only on the dashboard or list page. Detail pages use a plain white header.
- Type: keep the current family. Scale: page title 28/600, section title 16/600, body 14/400, caption 12/400. Numbers always `tabular-nums`. Sentence case everywhere. No ALL-CAPS labels.
- Spacing: 4px grid. Card padding 20px. Gap between cards 16px.
- Control height: inputs and buttons 36px (compact tables 32px).

## 2. Hard rules

1. No label/value pair in a card unless it is truly a form or a spec list. Spec lists use `DetailList`.
2. Numbers with a threshold get a **bar, gauge or pill**, not just a coloured number.
3. Empty or unset values are never `0`. Show a muted `—` with a placeholder like "Set price", and an action.
4. Damaged, tester, lost and quarantined stock is never counted as sellable. Headline numbers exclude it.
5. Right-align numeric columns and their headers. Use `tabular-nums`.
6. No duplicate information. If a KPI card repeats a filter tab count, make the card a clickable filter or replace it.
7. Every warning has an action next to it.
8. Each screen has one primary button. Everything else is secondary or ghost.
9. Keyboard focus uses `focus-visible` with a 2px brand ring and 2px offset. No heavy ring on click.
10. Remove dummy data (`temp`, `test`) from anything shown in a demo.
11. No hover lift or fade-up animation on cards. Motion only answers an action.
12. Sidebar: "Coming soon" group collapsed by default.

## 3. Component vocabulary (build once, reuse everywhere, in `components/ui-kit/`)

**StatCard** — label with inline icon (16px), value 24/600, one short caption, and **one visual** (bar, gauge, delta or sparkline). About 96px tall. Optional `onClick` makes it a filter.
**StockBar** — segmented 8px bar: free to sell (emerald), held for orders (amber), not for sale (red). Tooltip and legend show the numbers.
**LocationRow** (`LocationRows`) — name, thin proportional bar, quantity right-aligned. Not-for-sale rows are tinted red with a "Not for sale" chip.
**ReorderGauge** — on hand against the reorder level, marker at the level. "12 of 20. Need 8 more." Secondary: "Suggested order: 60". Button: Create purchase order (when Purchasing exists).
**MarginPill** — `21.2%` plus profit per unit in muted text. Emerald at 35% or more, neutral 25–35%, amber under 25%, red under 10%.
**PriceGrid** — one table: rows = channels (with an icon), columns = units (Piece, Box). Each cell: editable 36px input with `Rs` prefix and a MarginPill beside it. Unset cells show "Set price", never `0`. Fixed max width.
**DetailList** — compact two-column list, 13–14px, label grey, value black, 36px rows, no row borders. Units, category and shade as chips.
**StatusPill** — dot + text. In stock (emerald), Low stock (amber), Out of stock (red), Gift set (blue). Same pill everywhere.
**BottleneckList** (gift sets) — each part has a bar for "enough for N sets"; the scarcest part is flagged "Limiting part".
**DataTable** — 44px rows (32px compact option), sticky header, muted monospace barcode, right-aligned price columns, row click opens the product.

## 4. Page recipes

### Products & stock (list)
- Hero: the dark stock-value card is the only gradient. Bar shows in stock, low, out.
- Right side: compact StatCards that answer a decision: "Needs restocking" (click to filter), "Expiring in 90 days". (A "Stock movement this week" sparkline comes with the movement log.) No "Products" card: it duplicates the tab.
- Table: status, In stock (with mini bar and "Reorder at N"), cost, three channel prices. Margin as a quiet second line, amber only if low.

### Product detail (`/products/[code]`)
- Header: plain white card, avatar, name, SKU and category, StatusPill, shade tag. Actions: Edit (secondary), Move stock (primary), More menu through a portal.
- Row 1: On hand (with StockBar), Reorder (ReorderGauge, double width), Average cost.
- Left: Stock by location (StockBar + LocationRows, batches if tracked), then PriceGrid.
- Right: Details (DetailList), barcode (single number, Print label). Sticky.

### Gift set detail
- A gift set has no stock of its own, so it does not use the product layout.
- Hero StatCard "Sets you can pack" with the reason inline ("Blocked by X (0 in stock)").
- BottleneckList for the parts. PriceGrid for channels.
- Cost of one set = the sum of its parts' costs (server). If a part has no cost, say "Cost not set" and why. Do not leave margin blank without explanation.

## 5. Copy

Plain verbs, sentence case, active voice. Button names say what happens. Errors say what went wrong and how to fix it. Empty states invite an action. The same action keeps the same name in the button, the toast and the log.

## 6. Workflow (every UI task)

1. **Plan first**: the decision the screen supports, the ui-kit components used, an ASCII wireframe.
2. **Reuse before you build.** Missing component? Create it in `ui-kit/`, not inline.
3. **Build** with the tokens above. No arbitrary values like `rounded-[28px]` or `h-[60px]`.
4. **Screenshot and critique** at 1440px and 390px, light and dark. Fix, re-screenshot.
5. **Report** what changed and which checklist items you verified.

### Review checklist

- [ ] No card radius above 16px, no input above 36px tall.
- [ ] No section is only label and value text where a bar, gauge, pill or chip fits.
- [ ] Every number with a threshold has a visual and an action.
- [ ] No `0` for "not set". No dummy data on screen.
- [ ] One gradient hero and one primary button per page.
- [ ] Numbers right-aligned with `tabular-nums`.
- [ ] Damaged stock excluded from headline and sellable totals.
- [ ] Dropdowns, tooltips, popovers not clipped by `overflow-hidden`.
- [ ] Keyboard focus visible with `focus-visible` only.
- [ ] Works at 390px: tables scroll inside their own container, no sideways page scroll.
- [ ] Muted text contrast at least 4.5:1.

## 7. Never do

- Identical rounded cards stacked for every section.
- Coloured text as the only signal.
- Gradient washes or glow as decoration.
- Tall empty stat cards with a big number and a caption.
- Two search boxes doing the same job.
- Placeholder-looking inputs that hold a real value.

## 8. Frozen patterns (2026-11-11) — every new screen follows these

The Products list and product page are the reference screens. Copy their patterns; do not invent new ones.

### Words (use exactly these, everywhere: screens, toasts, reports)

| Term | Meaning |
|---|---|
| **Available to sell** | Stock in sellable locations. Headline numbers use this. |
| **Physically here** | Everything on the shelves = available + not for sale. |
| **Not for sale** | Damaged, Returns - To Check, Testers. Never in headline or sellable totals. |
| **Held for orders** | Reserved for confirmed orders; part of available, not free to sell. |
| **Free to sell** | Available minus held. |
| **Reorder level** / **Usual order** | The level that triggers a reorder / the quantity normally bought (Item reorder qty). |
| **Need N more** | Reorder level minus available. |
| **Gross margin** | (price − cost) ÷ price. Shown as a pill with "+Rs N profit". |
| **Sellable stock at cost** | Value of available stock. Not-for-sale value is shown separately, never mixed in. |
| **Can't pack yet** / **Blocked by X** | Gift set with 0 sets; the page names the limiting part. |

### Layout patterns
- **List page:** title + one primary action; one gradient hero (the money number) + one "action" card beside it (e.g. Needs restocking: top 3 rows with a bar each, a footer with quiet facts); then the table card with status tabs (tooltip explains each tab), search, filters.
- **Detail page:** white header card (avatar, name, code · category, status pill, tags; Edit secondary, one primary, ⋯ menu); a row of StatCards (one may be double width); left column = main sections; right column = Details, sticky.
- **Action cards:** the card's header opens the matching filtered list (with a clearable chip). Rows link to the record.
- **Empty or unknown values:** muted "—" with a tooltip that says why ("No cost yet…"). Never 0.
- **Inline price editing:** PriceGrid; every row the same height; unit columns show "Rs X each, N% less".
- **No disabled "coming soon" buttons.** Add the action when the feature exists.
- **Dialogs and forms** (`ui-kit/form.tsx`): required fields have a red star (`RequiredLabel`); the save button is never greyed out to hide a problem: clicking it shows what is missing under each field and moves focus there (`useFormCheck` + `FieldHint`); money uses `MoneyInput` ("Rs" inside, "Set price" when empty); the description says what will happen; the backdrop is a plain dim, no blur. Scanner fields ignore Enter so a scan never submits the form.

- **Photo:** the avatar is the upload button for people who can edit (hover shows a camera; JPG/PNG/WebP, max 5 MB; Frappe `upload_file`, then `set_product_image`).
- **Part picker** (gift sets): search or scan, one match + Enter adds it; each part has a quantity; "Limiting part" is shown on the page.
- **Stock history:** icon + plain words ("Received", "Moved", "Damaged"), location, date and document, signed quantity, balance left. Words come from the server.
- **Count screen:** big scan box at the top (each scan adds one), editable counted quantity per row, difference pill (OK / ± qty), a manager posts. Counters never see system quantities (blind count).
- **No access:** a page the role may not open shows the lock screen (`NoAccess`) with the reason and a link to the first page the user can open. Menus, buttons and columns hidden by `useCan(capability)` only mirror what the server already refuses; never use a hidden button as the only protection.
- **Permission grid:** areas down the side, actions across the top, a dash where an area does not offer an action (never a disabled box). Ticking Add/Change also ticks See; unticking See clears the area. Built-in roles show the same grid read-only. A fixed save bar appears only when something changed.
- **Settings pages:** simple list cards with Add / Rename; delete only when nothing uses the item.

- **Report page** (`components/reports/report-view.tsx`): icon + title + the dates used; FilterBar (filters live in the link) with Export on the right; DataTable with sort, totals row and paging. Rows and hidden cost columns come from the server.
- **Change history** (`HistoryPanel` / `HistoryCard`): icon per kind, "Name did what", old value struck through → new value, time ago. Words come from the server. The whole-business log is Settings › Change history.
- **Approvals**: inbox rows (title, state pill, asked by, amount, actions); "No" actions are outline and ask for a reason, "Yes" is the primary button. `ApprovalBanner` on document pages.
- **Document actions** (`DocumentActions`): Print · PDF · Email (only when the person may and an email account exists) · WhatsApp link (7 days). A4 carries the letterhead, 80 mm receipts do not.
- **Export** (`ExportButton`): one button, server-built Excel, hidden without "Can export lists".
- **Settings list** (`components/settings/master-list.tsx`): add, rename, switch off, delete only when unused.

### Shared components (`components/ui-kit/`)
StatCard, StatusPill / ExpiringPill, StockBar, LocationRows, ReorderGauge, MarginPill, PriceGrid, DetailList / DetailRow / Chip, BottleneckList, form kit (RequiredLabel, FieldHint, useFormCheck, MoneyInput). Product-specific: `components/products/restock-card.tsx`, `bits.tsx` (HeroCard, HealthBar, StockMeter, ProductThumb).
