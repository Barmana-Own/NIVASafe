import { isValidEmail, isValidUsername, normalizeEmail, normalizeUsername } from "@nivasafe/domain";

export type MemberRequestIdentity = { username: string | null; email: string | null };
export type MemberRequestIdentityError = "required" | "invalidUsername" | "invalidEmail";
export type MemberRequestIdentityResult =
  | { identity: MemberRequestIdentity; error: null }
  | { identity: null; error: MemberRequestIdentityError };

export function validateMemberRequestIdentity(input: { username: string; email: string }): MemberRequestIdentityResult {
  const rawUsername = input.username.trim();
  const rawEmail = input.email.trim();
  if (!rawUsername && !rawEmail) return { identity: null, error: "required" };

  const username = rawUsername ? normalizeUsername(rawUsername) : null;
  if (username && !isValidUsername(username)) return { identity: null, error: "invalidUsername" };

  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (email && !isValidEmail(email)) return { identity: null, error: "invalidEmail" };

  return { identity: { username, email }, error: null };
}
