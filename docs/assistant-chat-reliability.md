# Chat reliability and conversation isolation

## Changes

Opening the assistant starts with an empty new conversation. No previous conversation is selected automatically. History remains accessible only through explicit selection; the new-chat button resets selection without creating empty database records. A database conversation is created on the first send. New composer drafts have a unique page-session key; historical composer drafts remain scoped to their conversation, user and organization. The form is remounted on conversation changes to avoid restoring the previous draft into a new chat.

Messages accept up to 32,000 characters, independently enforced by server validation and the multiline composer. The current prompt is forwarded intact. Prior context includes at most twelve turns, 8,000 characters per turn and 24,000 characters total, prioritizing recent turns. Stored offline assistant replies are excluded. History is queried only for the authenticated caller's selected conversation; cross-user/organization and archived conversations cannot receive messages.

Chat output has a server-selected 4,000-token budget rather than relying on the 900-token environment default. GapGPT chat requests have one bounded 60-second attempt rather than multiple timeout windows. The selected chat provider/model is preserved. Supplementary knowledge retrieval failures emit a safe structured diagnostic and no citations, but no longer prevent a reachable chat model from answering. No fabricated knowledge is supplied and risk-analysis knowledge handling is unchanged. Offline fallback wording remains unchanged.

## Verified observations

The local configured provider is GapGPT with `deepseek-v4-flash`. Its authenticated model catalog returned HTTP 200 and contained that exact model. A non-personal short request returned HTTP 200 and non-empty output in approximately 3.8 seconds. A non-personal prompt longer than 10,000 characters through the actual provider adapter correctly followed the final instruction, without fallback, in approximately 13.8 seconds. Keys and prompt content were not printed. These observations concern the local configuration, not the production site's deployment or a latency guarantee.

## Security and validation scope

Existing tenant/user ownership checks, safe text rendering, exact outage response and usage accounting remain. Message submission is limited to twenty requests per minute; input, history and output are bounded. Database message content already uses LongText; no migration is required. No existing conversation, message, permission or route was removed. Tests cover long input boundaries, history bounds, offline-context removal, supplementary knowledge failure and HTTP ownership isolation.

Browser end-to-end UI interaction and production deployment: NOT_RUN. Existing Vite bundle-size warning remains. Synthetic provider tests do not establish that production credentials, proxy timeouts or database connectivity are correct.
