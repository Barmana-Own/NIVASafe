# Variable FMEA risk-row generation

Stage-two FMEA detail generation now asks the configured assessment model to determine the relevant hazard count, with an upper bound of 20 distinct rows. Neither the new-assessment process-suggestion flow nor the registered-assessment detail-suggestion flow pads valid short model responses with generic hazards. The browser retains up to 20 generated drafts instead of truncating them to five.

The registered-assessment insertion path persists the actual validated suggestion count, respecting the remaining capacity up to 20 automatic rows and existing duplicate checks. Existing automatic-insertion audit guards, row numbering, calculated RPN, organization scoping, permissions and user-edited records are preserved. Existing five-row assessments are not overwritten or silently regenerated.

Malformed provider output or provider failure retains the explicitly identified fallback path; fallback rows are not represented as connected-model analysis. An explicitly empty JSON row list from the model remains empty and is not padded. The deterministic fallback remains five rows and is not used to pad valid model output. Model scores remain advisory and editable.

Only these larger detail-generation calls select an 8,000-token output budget. Provider adapters clamp explicit server-selected budgets to 128–8,000 tokens. Other calls retain their existing environment/default budgets; this option is not exposed as a client-controlled request field. No new dependency, database migration or production data change is required.

## Verification

- Frontend: 142 tests passed.
- Backend: 193 tests passed, including variable batches of 0/1/2/3/8/20, outputs above 20, no generic padding, duplicate protection, RPN calculation, bounded token budgets and HTTP auto-insertion counts.
- Actual live model response and live database insertion: NOT_RUN. Provider and database boundaries were mocked for deterministic tests; no production service was called.
- Production builds and TypeScript checks are executed separately before handoff. The existing frontend bundle-size warning is unrelated to this change.

Security review: existing authentication and tenant/permission guards remain in place; AI output is bounded and normalized before insertion, scores remain within the existing validated range, and no secrets are introduced. Other uncommitted UI/notification changes are preserved.
