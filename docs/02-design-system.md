# Stage 02 — Design System

The FMEA process step uses the existing NIVASafe blue enterprise palette, established form controls, semantic required/optional labels and the existing card/radius/shadow scale. AI status uses distinct connected, fallback and unavailable states; status meaning is not conveyed by color alone.

The layout is a two-column desktop process grid that becomes one column below the existing mobile breakpoint. The suggestion board uses three reusable category pickers with consistent icon, chip and add-item patterns; the job combobox also provides a clearly distinguished custom-title action. Text direction follows the active locale; technical identifiers and email-like values retain appropriate LTR handling.

Required fields have visible labels and red required indicators. Error feedback is associated with the form-level alert and does not rely on the browser's default validation bubble. Loading, empty, fallback and unavailable states are represented for catalog, item-suggestion and description-assistance requests; a valid description result replaces the field value directly and remains editable.

The authenticated shell provides two explicit visual themes: blue/dark and white/light. The theme control is keyboard-accessible, localized and persisted as a non-sensitive browser preference. Blue/dark uses the navy shell treatment and a white sidebar NIVASafe mark; white/light uses the light shell treatment and the original blue mark. Content, semantic status colors, RTL behavior and responsive navigation remain unchanged between themes.

## Responsive foundation contract

The responsive contract uses five conceptual ranges: small phone (320–479px), phone (480–767px), tablet (768–1023px), laptop (1024–1279px) and desktop (1280px and above). The stylesheet may keep component-specific legacy breakpoints where behavior requires them, but new foundation rules use these ranges and are ordered so the narrowest overrides are explicit.

The current component inventory is intentionally retained where it expresses a domain-specific transition: `max-width: 360px` handles the smallest topbar controls; `max-width: 390px` handles short login/phone hero spacing; `max-width: 480px` handles single-column score and card layouts; `max-width: 520px` tightens the topbar; `max-width: 720px` handles report density; `max-width: 760px` owns the authenticated drawer, assistant workspace and phone-specific assessment/report behavior; `max-width: 900px` switches public authentication and selected form grids; `max-width: 980px` stacks report panels; `max-width: 1020px` collapses the sidebar and dense desktop grids; and `max-width: 1320px` reduces dashboard and assessment columns. The former contradictory mobile page-action rules were consolidated into `responsive.css` at the 767px/479px foundation breakpoints, and the shell-wide overflow masks were removed.

All layout containers and flex/grid children that contain translated text, controls, charts or tables must be shrink-safe (`min-width: 0`, `max-width: 100%`/`max-inline-size: 100%`, and `minmax(0, 1fr)` where appropriate). The document shell does not hide horizontal overflow globally. Intentional dense-data scrolling belongs to an explicit `.table-wrap`; ordinary pages must resolve overflow at the offending component.

Page-header actions use an auto-fitting grid on phone widths. Controls have a 44px minimum interactive height and may wrap their labels; below 480px they use one column. Login/public layouts use natural document flow with `min-height: 100dvh`, safe-area-aware padding and document scrolling so a mobile keyboard cannot trap the form inside a fixed-height viewport.

## Shared primitive contract

`frontend/src/components/UI.tsx` is the single source of truth for shared interaction and feedback primitives. The primitives preserve the existing class names where compatibility matters, so feature-specific assessment markup can continue to use the established visual language while new work adopts the typed API.

| Primitive | Use | Contract |
| --- | --- | --- |
| `Button` | form and page actions | `primary`, `secondary`, `ghost`, `danger` and `text` variants; defaults to `type="button"`; `loading` disables repeat submission and exposes `aria-busy`. |
| `IconButton` | compact icon-only actions | requires a visible accessible `label`, uses the shared touch target, and supports default, accent and danger tones. |
| `FormField` | new labelled form controls | keeps label, required marker, hint and error presentation together without replacing semantic inputs. |
| `SectionCard` / `Surface` | content surfaces | `SectionCard` remains the canonical card implementation; `Surface` is a semantic alias for reusable feature composition. |
| `LoadingState` / `EmptyState` / `Alert` | async and data states | status semantics are explicit and content can wrap without widening its parent. |
| `Badge` / `StatusBadge` | status and classification | `StatusBadge` preserves existing domain status mappings; `Badge` supplies the generic semantic tone contract. |
| `Modal` / `DialogProvider` | modal workflows | modal semantics, Escape/backdrop handling, focus handoff and action layout are centralized for future dialogs. |
| `PageHeader` / `PageActions` | page-level hierarchy | actions remain semantic children and inherit the responsive auto-fit action layout. |

### Sizing and state tokens

Controls use `--control-height: 48px` for ordinary actions and `--control-height-compact: 44px` for compact actions. `--touch-target: 44px` is the minimum standalone icon hit area; the visible icon can remain smaller. `--control-radius`, `--surface-radius`, `--line`, `--line-strong`, `--shadow-sm`, `--shadow-md` and `--focus-ring` define the shared geometry and interaction feedback. Semantic feedback colors are exposed as `--semantic-success`, `--semantic-warning`, `--semantic-danger` and `--semantic-info`.

Layering is explicit through `--z-sidebar-backdrop`, `--z-sidebar`, `--z-dropdown`, `--z-popover`, `--z-dialog` and `--z-toast`. New overlays should use these tokens instead of introducing a local numeric z-index.

All custom controls receive a visible `:focus-visible` ring, disabled controls remain legible, labels wrap at translated-content boundaries, and the global reduced-motion rule disables non-essential transitions and animations. Both `data-theme="blue"` and `data-theme="white"` retain their theme overrides for controls, menus, badges and overlays.

### Adoption guidance

Use `Button` for an action that submits, mutates or opens a workflow; set `type="submit"` explicitly inside forms. Use `IconButton` only when the icon is the complete action and provide a meaningful label for assistive technology and tooltips. Use a text variant for low-emphasis inline actions, not for primary form submission. Keep navigation as `Link`/`NavLink`, and keep native inputs/selects inside `FormField` rather than making the wrapper clickable.

The first migration pass covers the authenticated shell controls, organization file actions, generic `LoadState` handling, administrative search actions and modal dialog actions. FMEA/RULA-specific control markup remains intentionally unchanged for a later domain-focused refactor; the shared primitives are designed to be adopted there incrementally without changing assessment rules or API behavior.

## Responsive data-table contract

`TableContainer` in `frontend/src/components/UI.tsx` is the shared boundary for application data tables. It preserves semantic `<table>` markup on desktop and tablet, adds bounded inline scrolling with `overscroll-behavior-inline: contain` for dense tablet registers, and switches labelled rows into readable cards below 768px. Each mobile-visible cell carries a `data-label`; the header remains available to assistive technology even when it is visually clipped for the card presentation.

Narrative fields such as hazards, causes, controls, corrective actions, activity descriptions, metadata and AI recommendations wrap naturally. Compact identifiers, scores and token counts retain numeric readability. FMEA and RULA tables keep domain-specific row/card arrangements on phones, while Actions, Activity Log and administrator tables use the same labelled-card contract. Empty, loading, permission-gated operations and row-level controls remain owned by the existing feature components.

## Authenticated shell navigation contract

The authenticated shell has a deliberate mobile information hierarchy: the topbar keeps the drawer trigger, current route title and notifications reachable, while theme, language and subscription utilities move into the scrollable mobile drawer. The drawer is bounded to the viewport, respects safe-area insets, owns its vertical navigation scroll and uses a backdrop without contributing to document-level horizontal overflow. Opening it locks background scrolling and compensates for the scrollbar; Escape, the backdrop and navigation links close it, and focus moves into the drawer and returns to the opener.

Desktop preserves the 272px expanded and 78px collapsed sidebar states, including the existing localStorage preference. Tablet widths use the explicit expanded/collapsed preference rather than an unreadable hybrid state. Utility menus remain bounded by the drawer/viewport in both RTL and LTR layouts, and the page title keeps its complete value available through the native title and accessible label when visual truncation is required.

## Overlay contract

Floating menus and dialogs render through `frontend/src/components/Overlay.tsx` into `#nivasafe-overlay-root`, outside cards, tables and other clipping ancestors. `StyledSelect`, `LocalizedDateInput`, `ThemeSwitcher` and `LanguageSwitcher` use viewport-relative positioning that flips vertically, clamps horizontally, repositions on resize/scroll and constrains long content. `Modal` uses the same root with safe-area margins, internal scrolling, focus trapping, Escape/backdrop dismissal, focus restoration and body-scroll locking. Overlay theme state is mirrored onto the root so blue/dark and white/light menu styles remain consistent after portaling.

## Accessibility interaction contract

Standalone icon actions use the shared 44px touch target and require a contextual accessible name; row actions include the record or assessment name when the visible label alone is ambiguous. The authenticated shell exposes a skip link to `#main-content`, preserves focus handoff for the mobile drawer and overlays, and locks both document roots while the drawer is open. Password visibility controls expose their controlled field and pressed state. Assessment summaries use semantic buttons for keyboard activation, while status and chart summaries retain text or ARIA semantics instead of relying on color alone. Non-essential motion is disabled under `prefers-reduced-motion`.

## CSS architecture

`frontend/src/styles.css` is intentionally a one-line compatibility entry point that imports `frontend/src/styles/index.css`. The index is the only cascade-order authority and imports the stylesheet layers in this order: tokens and base rules, shell/layout and shared controls, forms/data surfaces, feature styles, responsive/theme rules, overlays/accessibility hardening, and print rules.

The modular files under `frontend/src/styles/` own one concern each. Domain-specific FMEA and RULA rules live under `frontend/src/styles/features/`; generic tables, forms, buttons, overlays and shell rules remain outside that directory. This keeps feature styling close to the domain without creating parallel component frameworks.

The CSS contract does not use global overflow clipping to hide child overflow, a universal `nowrap` table rule, or `:has()` overflow escape workarounds for portalized controls. Horizontal scrolling is limited to explicit dense-data containers at tablet/desktop sizes; phone data views use labelled cards. `ui-rules.test.ts` protects the entry point, import order, module presence and removed workarounds, while Playwright visual and overflow suites protect rendered behavior.
