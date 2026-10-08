# RULA corrective progress chart styling

Stage-three RULA reports now reuse the interactive three-state progress chart introduced for FMEA. SVG ring sizing, stroke, legend badges, percentages, hover/focus emphasis, center updates and touch/keyboard selection therefore share the risk-distribution design system. RULA's existing workflow summary remains authoritative for completed, in-progress and remaining counts. No clinical score, selection/completion persistence, backend, permission or API contract is changed.

An accessible completion progressbar is retained in the shared chart, independently of temporary hover selections. Existing RULA overview SSR tests now verify real SVG segment geometry and localized labels, including a grey 100% remaining ring when all three suggestions are unselected. Source-contract tests check the shared component receives all three RULA counts, rather than requiring obsolete inline legend text.

Validation: 175 frontend tests in 24 files passed; frontend production build, lint and typecheck passed with the existing large-bundle warning. Security/regression review: React-escaped text, no new network request, dependency, unsafe HTML or permission change; the shared FMEA chart tests remain passing. Live browser hover/mobile interaction is NOT_RUN. No Git push or production deployment was performed in this task.
