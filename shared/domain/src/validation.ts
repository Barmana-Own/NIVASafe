/**
 * Input validation shared by the browser and API. These checks deliberately
 * do not claim that an address is owned by the user; ownership still requires
 * an email/SMS verification flow. They only reject malformed or unsafe input
 * before it reaches persistence.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_LOCAL_PART = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/u;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ASCII_DIGITS = "0123456789";

const RESERVED_DISPLAY_NAMES = new Set([
  "admin", "administrator", "root", "support", "security", "owner", "operator", "moderator", "helpdesk",
  "api", "bot", "system", "user", "guest", "test", "demo", "super admin", "superadmin", "nivasafe",
  "ادمین", "مدیر سیستم", "مدیر سامانه", "پشتیبانی", "پشتیبان", "سیستم", "ریشه", "کاربر", "مهمان", "آزمایشی", "تست", "دمو", "ربات", "نیواسیف",
]);

const RESERVED_DISPLAY_TOKENS = new Set([
  "admin", "administrator", "root", "support", "security", "moderator", "helpdesk", "api", "bot", "ادمین", "پشتیبانی", "پشتیبان", "سیستم", "ربات",
]);

const COMMON_PASSWORDS = new Set([
  "password", "password123", "password123!", "1234567890", "qwertyuiop", "qwerty123!", "admin123", "administrator", "letmein", "welcome123", "iloveyou", "demo123!",
]);

export function normalizeDigits(value: string): string {
  return [...value].map((character) => {
    const persian = PERSIAN_DIGITS.indexOf(character);
    if (persian >= 0) return ASCII_DIGITS[persian]!;
    const arabic = ARABIC_DIGITS.indexOf(character);
    if (arabic >= 0) return ASCII_DIGITS[arabic]!;
    return character;
  }).join("");
}

export function normalizeEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = normalizeEmail(value);
  if (!email || email.length > EMAIL_MAX_LENGTH || CONTROL_CHARACTERS.test(email) || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts as [string, string];
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !EMAIL_LOCAL_PART.test(local)) return false;
  if (!domain || domain.length > 253 || domain.startsWith(".") || domain.endsWith(".") || !domain.includes(".")) return false;
  const labels = domain.split(".");
  if (labels.some((label) => !label || label.length > 63 || !DOMAIN_LABEL.test(label))) return false;
  return true;
}

/** Normalize a phone input to the canonical local Iranian mobile format. */
export function normalizePhone(value: string): string {
  return normalizeDigits(value).normalize("NFKC").trim().replace(/[\s().-]/g, "");
}

export function isValidPhone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const phone = normalizePhone(value);
  if (!/^09\d{9}$/.test(phone)) return false;
  return !/^(\d)\1+$/.test(phone);
}

export function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").replace(/[\u200c\u200d]/g, " ").trim().replace(/\s+/g, " ");
}

export function isForbiddenDisplayName(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = normalizeDisplayName(value).toLocaleLowerCase("fa-IR");
  if (!normalized || RESERVED_DISPLAY_NAMES.has(normalized)) return true;
  if (/https?:\/\/|www\.|@/i.test(normalized)) return true;
  const tokens = normalized.split(" ");
  return tokens.some((token) => RESERVED_DISPLAY_TOKENS.has(token));
}

export function isValidDisplayName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = normalizeDisplayName(value);
  if (normalized.length < 2 || normalized.length > DISPLAY_NAME_MAX_LENGTH || CONTROL_CHARACTERS.test(normalized)) return false;
  if (!/\p{L}/u.test(normalized) || !/^[\p{L}\p{M}\p{N} .'-]+$/u.test(normalized)) return false;
  return !isForbiddenDisplayName(normalized);
}

export function isStrongPassword(value: unknown, context: { email?: string; displayName?: string } = {}): value is string {
  if (typeof value !== "string" || value.length < PASSWORD_MIN_LENGTH || value.length > 128 || CONTROL_CHARACTERS.test(value) || /\s/.test(value)) return false;
  if (!/[\p{L}]/u.test(value) || !/\d/.test(normalizeDigits(value)) || !/[^\p{L}\p{N}]/u.test(value)) return false;
  const password = value.normalize("NFKC").toLocaleLowerCase("fa-IR");
  if (COMMON_PASSWORDS.has(password)) return false;
  const emailLocal = context.email ? normalizeEmail(context.email).split("@")[0] : "";
  const name = context.displayName ? normalizeDisplayName(context.displayName).toLocaleLowerCase("fa-IR") : "";
  if (emailLocal && emailLocal.length >= 4 && password.includes(emailLocal)) return false;
  if (name && name.length >= 4 && password.includes(name)) return false;
  return true;
}
