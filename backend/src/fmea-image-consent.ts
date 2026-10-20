import { createHash } from "node:crypto";

export function fmeaImageTransferReceipt(input: { provider: string; locale: string; image: Buffer }) {
  return {
    provider: input.provider,
    requestedModel: "GPT-5-Mini",
    purpose: "fmea-process",
    locale: input.locale,
    imageSha256: createHash("sha256").update(input.image).digest("hex"),
  };
}
