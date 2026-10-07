# Production Arvan AI profile

The tracked PM2 configuration sets the chat model to `DeepSeek-V4-Flash` and assessment model to `GPT-5-Mini`, both through `https://api.arvancloudai.ir/v1`. The API and worker receive the same non-secret profile, replacing stale PM2 model/provider values on restart. RULA photos follow Arvan when Arvan is the configured assessment provider; explicit GapGPT deployments remain supported. Photo calls do not fail over to another provider.

Docker defaults and its environment template use the same model names. Docker environment values remain explicit overrides; existing `.env` values must be reconciled if they select another provider/model.

## One-time secret provisioning

Set `ARVAN_API_KEY` through the server's protected runtime environment or an untracked server `.env`. Never put a live key in GitHub, this file, Docker images, frontend code or deployment manifests. Git updates preserve a separately provisioned secret. A repository clone cannot securely obtain a private API key from public tracked code.

The supplied chat credential was not stored or committed. Local persistent storage was rejected by the security reviewer. Rotate the shared key before production use. No live Arvan call was performed, so model availability and credential validity are not claimed.

For the existing Windows PM2 deployment, restart with the tracked ecosystem configuration and `--update-env` after securely provisioning the key. Both model routing and secret availability should then be verified in the application's AI diagnostics. No production server was contacted or changed in this task.
