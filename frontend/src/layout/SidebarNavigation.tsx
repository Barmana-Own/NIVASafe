import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/UI";
import { getNavigationHref, isNavigationLinkActive, type NavigationGroup, type NavigationItem, type NavigationLocation } from "./navigation";

type SidebarNavigationProps = {
  groups: readonly NavigationGroup[];
  location: NavigationLocation;
  collapsed: boolean;
  activeIds: ReadonlySet<string>;
  onNavigate: () => void;
  t: (key: string) => string;
};

export function SidebarNavigation({ groups, location, collapsed, activeIds, onNavigate, t }: SidebarNavigationProps) {
  function renderItem(item: NavigationItem): ReactNode {
    if (item.kind === "pending") {
      const label = `${t(item.labelKey)} · ${t(item.statusKey)}`;
      return <div className="side-nav-pending" data-navigation-id={item.id} key={item.id} aria-label={label} title={collapsed ? label : undefined}>
        <Icon name={item.icon} size={18}/><span>{t(item.labelKey)}</span><small>{t(item.statusKey)}</small>
      </div>;
    }
    if (item.kind === "disclosure") {
      const headingId = `nav-heading-${item.id}`;
      return <div className={`nav-disclosure${activeIds.has(item.id) ? " has-active-descendant" : ""}`} data-navigation-id={item.id} key={item.id} role="group" aria-labelledby={headingId}>
        <h3 id={headingId} className="nav-disclosure-title">{t(item.labelKey)}</h3>
        <div className="nav-disclosure-items">{item.children.map(renderItem)}</div>
      </div>;
    }
    const active = isNavigationLinkActive(item, location);
    const label = t(item.labelKey);
    const pendingLabel = item.pendingStatusKey ? ` · ${t(item.pendingStatusKey)}` : "";
    return <Link key={item.id} data-navigation-id={item.id} to={getNavigationHref(item)} className={`side-nav-link${active ? " active" : ""}${item.pendingStatusKey ? " pending-route" : ""}`} aria-current={active ? "page" : undefined} aria-label={collapsed ? `${label}${pendingLabel}` : undefined} title={collapsed ? `${label}${pendingLabel}` : undefined} onClick={onNavigate}>
      <Icon name={item.icon} size={19}/><span>{label}</span>{item.pendingStatusKey && <small>{t(item.pendingStatusKey)}</small>}
    </Link>;
  }

  return groups.map((group) => {
    const headingId = `nav-heading-${group.id}`;
    return <section className={`nav-group${activeIds.has(group.id) ? " has-active-descendant" : ""}`} data-navigation-id={group.id} key={group.id} aria-labelledby={headingId}>
      <h2 id={headingId} className="nav-group-title">{t(group.labelKey)}</h2>
      <div className="nav-group-items">{group.children.map(renderItem)}</div>
    </section>;
  });
}
