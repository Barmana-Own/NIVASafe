import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { getCurrentRole, getSession, selectOrganization } from "../api/client";
import { Icon, roleLabel } from "../components/UI";
import { useMenuPlacement } from "../components/useMenuPlacement";
import { useI18n } from "../i18n";

export function ProfileMenu() {
  const { locale, t } = useI18n();
  const { session, orgId } = getSession();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const placement = useMenuPlacement(open, root, menu, 320, 8);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  if (!session) return null;
  function keyboard(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const controls = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
    controls[next]?.focus();
  }
  return <div className="profile-menu side-user" ref={root} onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <span className="profile-menu-trigger">
      <Link to="/profile" className="profile-menu-account-link" aria-label={t("nav.profile")} onClick={() => setOpen(false)}><span className="profile-menu-avatar" aria-hidden="true">{session.user.displayName.slice(0, 1)}</span><span className="profile-menu-sidebar-copy"><strong>{session.user.displayName}</strong><small>{roleLabel(getCurrentRole())}</small></span></Link>
      <button type="button" ref={trigger} className="profile-menu-more" aria-label={t("redesign.accountMenu")} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}><Icon name="chevron" size={14}/></button>
    </span>
    {open && <div ref={menu} {...placement} id={id} className="profile-menu-popover" role="menu" aria-label={t("redesign.accountMenu")} onKeyDown={keyboard}>
      <div className="profile-menu-identity"><strong>{session.user.displayName}</strong><small>{roleLabel(getCurrentRole())}</small><bdi>{session.user.email}</bdi></div>
      <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}><Icon name="profile" size={18}/>{t("nav.profile")}</Link>
      <Link to="/activity-log" role="menuitem" onClick={() => setOpen(false)}><Icon name="activity" size={18}/>{t("nav.activityLog")}</Link>
      {session.organizations.length > 1 && <><div className="profile-menu-section">{t("redesign.switchOrganization")}</div>{session.organizations.map((organization) => <button type="button" key={organization.id} role="menuitem" className={organization.id === orgId ? "selected" : ""} onClick={() => { if (organization.id !== orgId && selectOrganization(organization.id)) window.location.reload(); else setOpen(false); }}><Icon name="projects" size={18}/><span>{locale === "en" ? organization.nameEn || organization.nameFa : organization.nameFa || organization.nameEn}</span>{organization.id === orgId && <Icon name="check" size={16}/>}</button>)}</>}
    </div>}
  </div>;
}
