# NIVASafe — Dashboard Navigation Map (Task 04)

The Farsi labels below are the source of truth. English labels are provided by the paired keys in `frontend/src/i18n.tsx`. Entries marked **API pending** are status rows rather than links, unless they point to one of the two existing placeholder URLs. They do not represent implemented workflows.

## Menu tree

```text
مدیریت (Management)
  ├─ نمای کلی / داشبورد — /
  ├─ پروژه و فرآیند — /projects
  └─ گفتگو با هوش مصنوعی — /assistant

ارزیابی‌های ایمنی و بهداشتی (Safety & Occupational Health Assessments)
  ├─ ایجاد ارزیابی جدید [disclosure]
  │   ├─ ریسک ایمنی (FMEA) — /fmea
  │   ├─ پوسچر ارگونومی (RULA) — /rula
  │   └─ ریسک مواد شیمیایی — API pending; no route
  └─ ارزیابی‌های ثبت‌شده [disclosure]
      ├─ ریسک ایمنی (FMEA) — /fmea?view=registered
      ├─ پوسچر ارگونومی (RULA) — /rula?view=results
      └─ ریسک مواد شیمیایی — API pending; no route

برنامه‌های اقدام (Action Programs)
  └─ اقدامات اصلاحی — /actions

مدیریت اسناد (Document Management)
  ├─ پایگاه دانش — /knowledge
  ├─ گزارش‌ها و فایل‌ها — /files
  ├─ چک‌لیست و ممیزها — /checklists; existing placeholder, API pending
  ├─ پرمیت (مجوز کار) — API pending; no route
  ├─ پرسشنامه‌ها — API pending; no route
  └─ پلان و نقشه‌ها — API pending; no route

حوادث (Incidents)
  └─ ثبت و مدیریت حوادث — /incidents; existing placeholder, API pending

عوامل زیان‌آور محیط کار (Occupational Exposure Factors)
  └─ سنجش عوامل زیان‌آور محیط کار [disclosure]
      ├─ ایجاد، ثبت و نتایج — API pending; no route
      └─ راهنما و هوشمندسازی — API pending; no route

سایر (Other)
  ├─ طب کار و پایش سلامت — API pending; administrator-only status item
  └─ تهویه صنعتی — API pending; no route

راهنما (Help)
  ├─ اعلان‌ها — /notifications
  └─ پشتیبانی / ثبت تیکت — /support

مدیریت سازمان و کاربران (Organization and Users)
  ├─ کاربران و نقش‌ها — /members
  ├─ پنل مدیریت — /admin
  ├─ سازمان‌ها — /organizations
  └─ گزارش فعالیت — /activity-log

تنظیمات (Settings)
  ├─ تنظیمات حساب و برنامه — /profile
  └─ سلامت سامانه — /health
```

## Route and permission map

| Destination | Route | Mode / active route | UI visibility |
|---|---|---|---|
| Dashboard | `/` | Exact root | Authenticated users |
| Projects and processes | `/projects` | Exact or nested path | Authenticated users |
| Assistant | `/assistant` | Exact or nested path | Authenticated users |
| New FMEA | `/fmea` | Default create/edit flow; direct `?edit=` continues to open the existing assessment editor | Authenticated users; backend permission checks remain authoritative |
| Saved FMEA | `/fmea?view=registered` | Existing `view=registered`; `/fmea/:id/report` and edit routes stay under this saved item | Authenticated users; report API permissions remain authoritative |
| New RULA | `/rula` | Default create/edit flow; direct `?edit=` continues to open the existing assessment editor | Authenticated users; backend permission checks remain authoritative |
| Saved RULA | `/rula?view=results` | Existing `view=results`; `/rula/:id/report` and edit routes stay under this saved item | Authenticated users; report API permissions remain authoritative |
| Corrective actions | `/actions` | Existing separated FMEA/RULA action workspace | Authenticated users; existing API permission checks remain authoritative |
| Checklists, incidents | `/checklists`, `/incidents` | Existing placeholder routes retained; pages now identify the missing API/permission integration | Authenticated users see only the pending state; no data operations are offered |
| Knowledge, files, notifications, support | `/knowledge`, `/files`, `/notifications`, `/support` | Existing workflows | Authenticated users; backend tenant/role checks remain authoritative |
| Members | `/members` | Existing page | `SUPER_ADMIN`, `ORG_ADMIN`, `HSE_MANAGER` via existing `AccessGuard` |
| Admin, organizations, system health | `/admin`, `/organizations`, `/health` | Existing pages | `SUPER_ADMIN`, `ORG_ADMIN` via existing route guards |
| Activity log | `/activity-log` | Existing page | Existing route/API policy retained; no new UI permission assumption |
| Profile | `/profile` | Existing page | Authenticated users |
| Other Task 05 modules | No route yet | Status rows only; not links | No function or data access is implied |

The UI filters links by the same current role classes already used by the shell. These visual filters are not authorization; existing route guards and backend checks continue to enforce access. In particular, `/audit` continues redirecting to `/activity-log`, and `/choose-path` remains a working legacy assessment chooser.

## Disclosure and responsive behavior

- Each top-level group and each nested assessment/exposure disclosure is an independent native `<button>` with `aria-expanded`, `aria-controls`, and visible keyboard focus.
- Real destinations are links. Contract-blocked capabilities without an existing route are non-interactive status rows. The existing checklist and incident URLs stay routable but carry an API-pending badge and page state.
- The current route's ancestor group and disclosure open automatically. FMEA/RULA saved views are selected by their existing query modes; report deep links remain under the matching saved assessment item.
- Browser back/forward and reload keep the existing React Router URL state. Mobile navigation retains the full-height drawer, background inertness, Escape close, navigation close, focus trap, and trigger focus restoration.
- Desktop sidebar collapse still uses `nivasafe-sidebar-collapsed`. When collapsed, group/disclosure labels become accessible icon controls; activating one expands the sidebar and its group.
- Layout uses direction-aware inline alignment and semantic theme tokens. On mobile, breadcrumbs reduce to the current page label; the selected destination remains highlighted in the navigation tree. Desktop retains the full breadcrumb trail.
