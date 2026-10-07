# RULA corrective AI API contract

## Draft preview

`POST /api/v1/rula/action-suggestions`

Headers: `Authorization: Bearer <access-token>`, `x-organization-id: <organization-id>`, `Content-Type: application/json`.

Requires authenticated organization membership and `assessments.create`. The existing rate-limit plugin allows eight requests per minute per client IP for this route. No saved assessment or project ID is required. This endpoint generates advisory suggestions without saving an assessment or creating corrective actions.

The JSON body is a strict object:

| Field | Required | Contract |
| --- | --- | --- |
| `bodySide` | Yes | `LEFT`, `RIGHT`, or `BOTH` |
| `inputs` | Yes | Seven body-part scores, each integer 1–6; `muscleUse` boolean; `force` integer 0–3 |
| `postureAnalysis` | Yes | Existing `rulaPostureAnalysisSchema`, described below |
| `activityInfo` | No | Existing `rulaActivityInfoSchema`, described below |
| `locale` | No | `fa` or `en`; defaults to `fa` |

Body-part keys: `upperArm`, `lowerArm`, `wrist`, `wristTwist`, `neck`, `trunk`, `legs`. Each is required in both `inputs` and `postureAnalysis`.

Each posture part is a strict object with `angle` (number −180 through 180 or null), `score` (integer 1–6), `detected` (boolean), and `source` (`AI`, `USER`, or `DEFAULT`). Optional fields: `confirmedByUser` (boolean, defaults to false), `confidence` (number 0–1 or null). Review confirmation is not required for advisory preview.

Optional posture fields: `sideAnalyses`, `imageOverlay`, `sideImageOverlays`. `sideAnalyses` can contain `LEFT` and `RIGHT`, each a complete seven-part analysis without nested side/overlay fields. For `bodySide: BOTH`, both side analyses are mandatory. Overlay objects contain `points`, keyed by `head`, `neck`, `shoulder`, `elbow`, `wrist`, `hip`, `knee`, or `ankle`; each optional point has `x` and `y` in 0–1 and optional nullable `confidence` in 0–1. `sideImageOverlays` contains optional `LEFT`/`RIGHT` overlays. Posture and overlay objects reject unknown fields.

If `activityInfo` is present, it requires `jobTitle` (trimmed, 2–180 characters) and `taskDescription` (trimmed, 2–500 characters). Optional fields:

| Fields | Contract |
| --- | --- |
| `durationPerOccurrence`, `durationUnit` | Positive number ≤1440 and `SECOND`/`MINUTE`/`HOUR`; supplied together |
| `postureHoldDuration`, `postureHoldUnit` | Positive number ≤1440 and `SECOND`/`MINUTE`/`HOUR`; supplied together |
| `repetitionsPerShift` | Integer 1–10000 |
| `postureDescription` | Trimmed string ≤1000 characters or null |
| `loadWeight` | Number 0–10000 or null |
| `loadUnit` | `KG` or `LB` |
| `postureImageAttachmentId` | UUID, null, or empty string normalized to null |

The existing activity schema strips unknown fields. No attachment is fetched for suggestion generation. Job, task, and posture descriptions feed the prompt; numeric posture scores, muscle use, and force feed server scoring. Optional activity measurements are validated but are not additional scoring inputs.

## Saved assessment

`POST /api/v1/rula/:id/report/action-suggestions`

Same headers and eight-per-minute route limit; requires `reports.generate`. `id` must be a UUID and the assessment must belong to the authenticated organization.

Strict JSON body: `{ "locale": "fa", "excludeTitles": [] }`. Both fields are optional; defaults are `fa` and `[]`. `excludeTitles` accepts at most 20 trimmed nonempty strings, each at most 240 characters. The route uses stored inputs/posture/context, recalculates scores, and excludes supplied titles and titles of registered actions except cancelled/rejected actions. It does not create corrective actions.

## Shared response

Both routes return HTTP 200 for completed generation or a handled AI failure:

```ts
{
  data: {
    suggestions: Array<{
      id: string;
      titleFa: string;
      titleEn: string;
      descriptionFa: string;
      descriptionEn: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      scoreReduction: number; // Integer 0–6; advisory estimate
      affectedParts: Array<"upperArm" | "lowerArm" | "wrist" | "wristTwist" | "neck" | "trunk" | "legs">;
      bodySide: "LEFT" | "RIGHT" | "BOTH";
      source: "AI" | "FALLBACK";
    }>;
    provider: string;
    model: string | null;
    aiStatus: "connected" | "fallback" | "unavailable";
    reasonCode: "AI_UNAVAILABLE" | "AI_INVALID_RESPONSE" | null;
    reasonMessage: string | null;
    minimum: 0;
    maximum: 20;
  }
}
```

The provider receives `maxOutputTokens: 6000`, `includeKnowledge: false`, and the selected locale. Scores/action levels are calculated server-side from posture scores plus the supplied/stored muscle-use and force inputs. BOTH assessments include separately calculated side results and use the worse side as the primary score.

Valid nonempty model output is deduplicated by normalized title and side, capped at 20, and returned without local additions. The model chooses the count. Exclusion filtering can legitimately leave zero suggestions; this does not trigger fallback. The parser bounds text to 600 characters, filters body-part names (maximum seven entries), bounds reduction to 0–6, normalizes priority, and resolves body-side labels.

`connected` means usable output from the primary remote provider. A usable remote failover result preserves the provider's `usedFallback` indication as `aiStatus: fallback`, while suggestion `source` remains `AI` and both reason fields remain null.

| Condition | `aiStatus` | `reasonCode` | Suggestions |
| --- | --- | --- | --- |
| Primary remote provider returns usable actions | `connected` | null | Model actions only |
| Remote failover returns usable actions | `fallback` | null | Model actions only |
| Local fallback provider selected | `fallback` | `AI_UNAVAILABLE` | Local advisory actions |
| Provider throws | `unavailable` | `AI_UNAVAILABLE` | Local advisory actions |
| Malformed, empty, or unusable model output | `unavailable` | `AI_INVALID_RESPONSE` | Local advisory actions |

Safe reason messages are fixed strings:

- `AI_UNAVAILABLE`: `AI suggestions are unavailable. Local advisory suggestions are provided for review.`
- `AI_INVALID_RESPONSE`: `AI returned no usable corrective actions. Local advisory suggestions are provided for review.`

No provider exception text, credentials, or raw model response is included in failure reasons or suggestion audit metadata. Provider results, including malformed responses, reach existing usage accounting with `useCase: risk` and source type `RULA_ACTION_SUGGESTIONS`; persistence occurs when valid token usage exists. Audits distinguish `RULA_DRAFT_ACTION_SUGGESTIONS` and `RULA_REPORT_ACTION_SUGGESTIONS` and record use case, provider/model, status, reason code, and count.

Validation errors use the application's error envelope `{ error: { code, message, requestId } }`: HTTP 400 for malformed input/missing organization scope, 401 for invalid authentication or membership, 403 for insufficient permission, 404 for inaccessible saved assessments, and 429 for rate limiting. Existing subscription/organization checks also apply (402/423). Unexpected errors remain subject to the application's centralized error handler.

## Verification scope

Focused tests cover request schemas, authentication/permission denial, organization scoping, static draft routing alongside saved routes, rate limiting, server-side scoring including independent sides, parser deduplication/cap, model-selected counts, exclusion behavior, safe failure reasons, and usage/audit behavior. All AI calls in tests are mocked. FMEA limits and frontend implementation are outside this change.
