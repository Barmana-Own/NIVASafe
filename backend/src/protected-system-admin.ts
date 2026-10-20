export function assertProtectedSystemAdminChange(target: { protectedSystemAdmin?: boolean }, next: { globalRole?: string; active?: boolean }) {
  if (target.protectedSystemAdmin && (next.globalRole === "USER" || next.active === false)) {
    throw Object.assign(new Error("نقش و وضعیت حساب مدیر اصلی سامانه قابل تغییر نیست."), { statusCode: 403, code: "PROTECTED_SYSTEM_ADMIN" });
  }
}
