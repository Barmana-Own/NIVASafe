# Stage 02 — Design System

The FMEA process step uses the existing NIVASafe blue enterprise palette, established form controls, semantic required/optional labels and the existing card/radius/shadow scale. AI status uses distinct connected, fallback and unavailable states; status meaning is not conveyed by color alone.

The layout is a two-column desktop process grid that becomes one column below the existing mobile breakpoint. The suggestion board uses three reusable category pickers with consistent icon, chip and add-item patterns; the job combobox also provides a clearly distinguished custom-title action. Text direction follows the active locale; technical identifiers and email-like values retain appropriate LTR handling.

Required fields have visible labels and red required indicators. Error feedback is associated with the form-level alert and does not rely on the browser's default validation bubble. Loading, empty, fallback and unavailable states are represented for catalog, item-suggestion and description-assistance requests; a valid description result replaces the field value directly and remains editable.

The authenticated shell provides two explicit visual themes: blue/dark and white/light. The theme control is keyboard-accessible, localized and persisted as a non-sensitive browser preference. Blue/dark uses the navy shell treatment and a white sidebar NIVASafe mark; white/light uses the light shell treatment and the original blue mark. Content, semantic status colors, RTL behavior and responsive navigation remain unchanged between themes.

## Assessment report documents

FMEA and RULA document exports reuse the report's navy/blue palette, white surfaces, light-blue section bands, bordered information panels, compact KPI cards and semantic risk/status colors. Data tables use a high-contrast navy header, restrained alternating row fills, wrapped multiline values and repeated table headers across pages. Persian output follows RTL visual column order and Persian text alignment; numeric scores remain legible as distinct cells. Excel uses equivalent header/row styling, frozen headings, filters, wrap-aware row heights and RTL worksheets for Persian. Word output remains real editable Office tables. PDF, Word and Excel are static captures of the data/state rendered by the report; browser-only animation is not reproduced in a document.

The RULA posture-image area uses a responsive gallery with a visible 0–4 image count, per-image preview and independent analysis status, plus explicit apply/remove controls. Upload validation and provider errors remain associated with the gallery; the image is never the only means of reviewing or correcting posture scores.
