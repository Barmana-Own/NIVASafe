# RULA priority distribution

## Requested source and counting unit

The report donut now reads the same active-side inventory used by corrective
action progress: selected row/manual actions plus unselected AI recommendations.
The caller already excludes a recommendation when its selected action matches
by identity or normalized title and body side. An action linked to multiple
posture rows is counted once, not once per affected body part.

| Actual action priority | Displayed level |
| --- | --- |
| CRITICAL | Immediate correction |
| HIGH | Investigation and correction |
| MEDIUM | Investigation |
| LOW | Acceptable |

These labels describe the requested priority grouping, not a new clinical risk
classification. The final RULA score and posture-review requirements are unchanged.
The description and center label explicitly identify the action-based source.

## Behavior

- AI suggestions populate counts even while posture review is pending.
- Selected/manual/completed actions retain their current priority grouping.
- Cancelled/rejected actions and malformed priorities are excluded.
- Each percentage is its category count divided by all valid active actions.
- No available priority produces a genuine empty state, not invented results.
- Body-side filtering and recommendation de-duplication remain in the report view.
- Existing FMEA-style donut, hover/focus feedback and responsive styling preserved.
- Existing result-based calculation helper and component input contract retained
  for compatibility; the displayed distribution uses the new priority helper.

## Validation and security

Frontend: 161 tests passed, including all four priority bands, malformed priorities,
empty/cancelled/rejected cases and real React rendering in Persian/English with
three LOW suggestions before posture review (three acceptable actions, 100%).
TypeScript/lint, production build and API contract check passed; existing large
chunk warning remains. No API, database, dependency, permission, external-provider
request or deployment change. Chart labels stay React-escaped and enum lookup
rejects inherited object properties. Authenticated browser QA NOT_RUN.
