# Stage 10 — Known Issues

| Priority | Issue | Mitigation/next action |
|---|---|---|
| P1 release dependency | Clean local database migration and live FMEA/RULA process-information/posture-analysis/report API smoke were not run because MySQL was unavailable. | Start the approved MySQL/MariaDB test instance, deploy migrations `202609050001_fmea_process_information`, `202609050002_fmea_report_actions`, `202609050003_rula_process_information`, `202609050004_rula_posture_analysis` and `202609060001_rula_corrective_action_impact`, then run authenticated catalog, report/action and RULA activity/photo/analysis/report smoke tests. |
| P2 | The exact provider-catalog identifier for the requested alternate Qwen model is not verified in the repository. | Configure any alternate risk model only after confirming its current provider catalog ID; the application does not hard-code an unverified identifier. |
