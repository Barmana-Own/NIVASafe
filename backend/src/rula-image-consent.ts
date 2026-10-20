import { createHash } from "node:crypto";

export function rulaImageTransferReceipt(input: { provider: string; bodySide: string; locale: string; image: Buffer }) {
  return {
    provider: input.provider,
    requestedModel: "GPT-5-Mini",
    purpose: "rula-posture",
    bodySide: input.bodySide,
    locale: input.locale,
    imageSha256: createHash("sha256").update(input.image).digest("hex"),
  };
}
