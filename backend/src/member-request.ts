import { EMAIL_MAX_LENGTH, USERNAME_MAX_LENGTH, isValidEmail, isValidUsername, normalizeEmail, normalizeUsername } from "@nivasafe/domain";

export type MemberRequestIdentifiers = {
  username: string | null;
  email: string | null;
};

function validationError(message: string, code: string) {
  return Object.assign(new Error(message), { statusCode: 400, code });
}

export function normalizeMemberRequestIdentifiers(input: { username?: string | null; email?: string | null }): MemberRequestIdentifiers {
  const rawUsername = input.username?.trim() ?? "";
  const rawEmail = input.email?.trim() ?? "";
  if (!rawUsername && !rawEmail) {
    throw validationError("نام کاربری یا ایمیل را وارد کنید.", "MEMBER_IDENTITY_REQUIRED");
  }

  const username = rawUsername ? normalizeUsername(rawUsername) : null;
  if (username && (username.length > USERNAME_MAX_LENGTH || !isValidUsername(username))) {
    throw validationError("نام کاربری باید انگلیسی، بدون فاصله و بین ۳ تا ۶۴ نویسه باشد.", "INVALID_USERNAME");
  }

  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (email && (email.length > EMAIL_MAX_LENGTH || !isValidEmail(email))) {
    throw validationError("ایمیل معتبر وارد کنید.", "INVALID_EMAIL");
  }

  return { username, email };
}

export function resolveMemberRequestApprovalEmail(requestEmail: string | null, approvalEmail?: string): string {
  if (requestEmail !== null) {
    if (approvalEmail !== undefined) {
      throw validationError("ایمیل این درخواست از قبل ثبت شده است.", "EMAIL_ALREADY_PROVIDED");
    }
    return requestEmail;
  }

  const rawEmail = approvalEmail?.trim() ?? "";
  if (!rawEmail) throw validationError("برای ساخت حساب، ایمیل کاربر را وارد کنید.", "EMAIL_REQUIRED");
  const email = normalizeEmail(rawEmail);
  if (email.length > EMAIL_MAX_LENGTH || !isValidEmail(email)) {
    throw validationError("ایمیل معتبر وارد کنید.", "INVALID_EMAIL");
  }
  return email;
}
